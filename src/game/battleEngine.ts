import {
  BattleBridge,
  BattleIsland,
  BattleMapConfig,
  BattleSettings,
  CustomShipConfig,
  GameMode,
  Particle,
  Projectile,
  ShipEntity,
  Team,
  TrailerEntity,
  VehicleDomain,
  VehicleWeaponMode,
  WaterRipple
} from '../types/ship';
import { BASE_SHIPS, SHIP_MODEL_MAP } from '../data/shipModels';
import { COMPONENT_MAP } from '../data/components';
import { TRAILER_MAP } from '../data/trailers';
import { BATTLE_MAPS, BATTLE_MAP_MAP } from '../data/battleMaps';
import { calculateShipStats, generateNpcShipConfig, getBalancedMatchPlan } from '../utils/shipStats';
import { sounds } from '../audio/soundEffects';
import {
  checkSegmentPolygonIntersection,
  checkShipPolygonCollision,
  constrainLandVehicleToLand,
  getLandClearance,
  getPointPolygonDistance,
  isPointInPolygon,
} from '../utils/polygonCollision';

function distancePointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): { dist: number; projX: number; projY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return { dist: Math.hypot(px - x1, py - y1), projX: x1, projY: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return { dist: Math.hypot(px - projX, py - projY), projX, projY };
}

function initVehicleTrailer(vehicle: ShipEntity): TrailerEntity | undefined {
  // Trailers are strictly restricted to land vehicles only
  if (vehicle.domain !== 'land' || vehicle.model.domain !== 'land') {
    return undefined;
  }
  const trailerId = vehicle.config.trailerId || (vehicle.model.canTowTrailer ? vehicle.model.defaultTrailerId : undefined);
  if (!trailerId || trailerId === 'none') return undefined;

  const def = TRAILER_MAP.get(trailerId);
  if (!def) return undefined;

  const towDistance = (vehicle.model.hullLength * 0.48 + 6) + 16 + (def.length * 0.48);
  return {
    id: `${vehicle.id}-trailer`,
    type: trailerId,
    x: vehicle.x - Math.cos(vehicle.angle) * towDistance,
    y: vehicle.y - Math.sin(vehicle.angle) * towDistance,
    angle: vehicle.angle,
    currentHp: def.hp,
    maxHp: def.hp,
    cooldown: Math.random() * 1.5,
    def,
  };
}

export interface BattleState {
  arenaWidth: number;
  arenaHeight: number;
  ships: ShipEntity[];
  projectiles: Projectile[];
  particles: Particle[];
  ripples: WaterRipple[];
  islands: BattleIsland[];
  bridges: BattleBridge[];
  mapConfig: BattleMapConfig;
  time: number;
  gameOver: boolean;
  winner: Team | null;
  winReason?: 'annihilation' | 'area_control';
  camera: { x: number; y: number; zoom: number };
  mouseWorldPos: { x: number; y: number };
  playerShipId: string;
  combatLog: { id: string; text: string; time: number; team: Team }[];
  stats: {
    damageDealt: number;
    shipsSunk: number;
    shotsFired: number;
    shotsHit: number;
  };
  gameMode: GameMode;
}

export class BattleEngine {
  public state: BattleState;
  public matchSeed: number = Math.floor(Math.random() * 1000000);
  public spectatorTargetId: string | null = null;
  public isFreeCam: boolean = false;
  private settings: BattleSettings;
  private nextId: number = 1;
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private onStateUpdate?: (state: BattleState) => void;

  constructor(
    playerConfig: CustomShipConfig,
    settings: BattleSettings,
    onStateUpdate?: (state: BattleState) => void
  ) {
    this.settings = settings;
    this.onStateUpdate = onStateUpdate;
    this.state = this.initBattle(playerConfig, settings.shipsPerTeam);
  }

  private initBattle(playerConfig: CustomShipConfig, shipsPerTeam: number): BattleState {
    // Retrieve active battle map
    const mapConfig = BATTLE_MAP_MAP.get(this.settings.selectedMapId) || BATTLE_MAPS[0];
    const arenaWidth = mapConfig.dimensions?.width || 4800;
    const arenaHeight = mapConfig.dimensions?.height || 3200;
    const islands: BattleIsland[] = mapConfig.obstacles;
    const bridges: BattleBridge[] = mapConfig.bridges || [];
    const landPolys = [
      ...islands.map(i => i.points),
      ...bridges.map(b => b.points),
    ];

    const ships: ShipEntity[] = [];
    const occupiedSpawns: { x: number; y: number }[] = [];

    // Helper to calculate safe spawn coordinates: guaranteed clearance from water boundaries
    const getSafeSpawn = (
      team: 'player' | 'enemy',
      domain: 'land' | 'water' | 'air',
      slotIndex: number
    ): { x: number; y: number } => {
      const isPlayerTeam = team === 'player';
      const baseX = isPlayerTeam ? 480 : arenaWidth - 480;
      const spreadIdx = Math.floor(slotIndex / 2);
      const sign = slotIndex % 2 === 1 ? -1 : 1;

      // 1. If map defines explicit verified spawn points, prioritize them
      if (mapConfig.spawnPoints) {
        let pool: { x: number; y: number }[] = [];
        if (domain === 'land') {
          pool = isPlayerTeam ? mapConfig.spawnPoints.playerLand : mapConfig.spawnPoints.enemyLand;
        } else if (domain === 'water') {
          pool = isPlayerTeam ? mapConfig.spawnPoints.playerWater : mapConfig.spawnPoints.enemyWater;
        }

        if (pool && pool.length > 0) {
          // Permute pool selection with matchSeed so each session spawns in different points
          const seedOffset = Math.floor(Math.abs(Math.sin(this.matchSeed + (isPlayerTeam ? 23 : 71) + slotIndex * 13)) * pool.length);
          const pt = pool[(slotIndex + seedOffset) % pool.length];
          let cx = pt.x;
          let cy = pt.y;

          // Randomized formation offset per match (except player flagship slot 0)
          if (!isPlayerTeam || slotIndex > 0) {
            const jitterX = Math.sin(this.matchSeed * 0.17 + slotIndex * 2.3) * 45;
            const jitterY = Math.cos(this.matchSeed * 0.19 + slotIndex * 2.7) * 45;
            cx += jitterX;
            cy += jitterY;
          }

          // Apply slight dispersion if multiple units share the spawn zone
          const overflowIdx = Math.floor(slotIndex / pool.length);
          if (overflowIdx > 0) {
            cx += (isPlayerTeam ? -35 : 35) * overflowIdx;
            cy += (slotIndex % 2 === 0 ? 30 : -30) * overflowIdx;
          }

          // Ensure no exact overlapping with previous spawns
          for (const pos of occupiedSpawns) {
            if (Math.hypot(pos.x - cx, pos.y - cy) < 65) {
              cx += (isPlayerTeam ? -30 : 30);
              cy += (slotIndex % 2 === 0 ? 35 : -35);
            }
          }

          occupiedSpawns.push({ x: cx, y: cy });
          return { x: cx, y: cy };
        }
      }

      // 2. Dynamic fallback with clearance verification
      const spreadRandom = Math.sin(this.matchSeed + slotIndex * 3.1);
      let candidateX = baseX + (isPlayerTeam ? -1 : 1) * spreadRandom * 40;
      let candidateY = arenaHeight * 0.5;

      if (domain === 'land') {
        // Sample candidate positions deep inland on west/east continents
        const testPoints = isPlayerTeam
          ? [
              { x: 500, y: 700 },
              { x: 400, y: 900 },
              { x: 500, y: 2500 },
              { x: 400, y: 2300 },
              { x: 300, y: 650 },
              { x: 300, y: 2550 },
              { x: 600, y: 600 },
              { x: 600, y: 2600 },
            ]
          : [
              { x: arenaWidth - 500, y: 700 },
              { x: arenaWidth - 400, y: 900 },
              { x: arenaWidth - 500, y: 2500 },
              { x: arenaWidth - 400, y: 2300 },
              { x: arenaWidth - 300, y: 650 },
              { x: arenaWidth - 300, y: 2550 },
              { x: arenaWidth - 600, y: 600 },
              { x: arenaWidth - 600, y: 2600 },
            ];

        const pIndex = Math.floor(Math.abs(Math.sin(this.matchSeed + slotIndex * 7)) * testPoints.length) % testPoints.length;
        const p = testPoints[pIndex];
        candidateX = p.x;
        candidateY = p.y;

        // Ensure safe clearance from water boundaries (at least 150px into safe land)
        let attempts = 0;
        while (attempts < 20) {
          const clr = getLandClearance(candidateX, candidateY, landPolys);
          if (clr.onLand && clr.distanceToWater >= 140) {
            break;
          }
          if (!clr.onLand) {
            candidateX = clr.closestX + clr.inwardNx * 160;
            candidateY = clr.closestY + clr.inwardNy * 160;
          } else {
            candidateX += clr.inwardNx * 40;
            candidateY += clr.inwardNy * 40;
          }
          attempts++;
        }
      } else if (domain === 'water') {
        // Deep water navigation channel in center/bay with randomized vertical staging
        const yJitter = Math.sin(this.matchSeed + slotIndex * 5.7) * 80;
        candidateY = arenaHeight * 0.5 + sign * (spreadIdx * 125) + yJitter;
        candidateX = baseX + (isPlayerTeam ? 1 : -1) * (spreadIdx * 65);

        let attempts = 0;
        while (attempts < 20) {
          const clr = getLandClearance(candidateX, candidateY, landPolys);
          if (!clr.onLand && Math.abs(clr.distanceToWater) >= 140) {
            break;
          }
          candidateX -= clr.inwardNx * 45;
          candidateY -= clr.inwardNy * 45;
          attempts++;
        }
      } else {
        // Air units: high altitude with randomized patrol spacing
        const airJitter = Math.cos(this.matchSeed + slotIndex * 4.3) * 90;
        candidateY = arenaHeight * 0.5 + sign * (spreadIdx + 1) * 140 + airJitter;
        candidateX = baseX + (isPlayerTeam ? 1 : -1) * (spreadIdx * 65);
      }

      // Avoid exact overlapping with previous spawns
      for (const pos of occupiedSpawns) {
        if (Math.hypot(pos.x - candidateX, pos.y - candidateY) < 65) {
          candidateX += (isPlayerTeam ? -30 : 30);
          candidateY += (slotIndex % 2 === 0 ? 30 : -30);
        }
      }

      occupiedSpawns.push({ x: candidateX, y: candidateY });
      return { x: candidateX, y: candidateY };
    };

    // 1. Create Player Ship (Omega Team Flagship)
    const playerModel = SHIP_MODEL_MAP.get(playerConfig.baseModelId) || BASE_SHIPS[0];
    const playerStats = calculateShipStats(playerModel, playerConfig);

    // Determine initial weapon target mode based on equipped weapons
    let playerHasSurface = false;
    let playerHasAir = false;
    for (const hp of playerModel.hardpoints) {
      const compId = playerConfig.equippedComponents[hp.id];
      const comp = compId ? COMPONENT_MAP.get(compId) : null;
      if (!comp || comp.damage <= 0) continue;
      if (comp.targetDomain === 'surface' || comp.targetDomain === 'both') playerHasSurface = true;
      if (comp.targetDomain === 'air' || comp.targetDomain === 'both') playerHasAir = true;
    }
    const initialPlayerMode: VehicleWeaponMode = (!playerHasSurface && playerHasAir) ? 'air' : 'surface';

    const playerSpawn = getSafeSpawn('player', playerModel.domain || 'land', 0);

    const playerShip: ShipEntity = {
      id: 'player-flagship',
      name: playerConfig.name || 'Flagship Vanguard',
      team: 'player',
      isPlayer: true,
      model: playerModel,
      config: playerConfig,
      stats: playerStats,
      x: playerSpawn.x,
      y: playerSpawn.y,
      angle: 0, // facing right toward center
      vx: 0,
      vy: 0,
      speed: 0,
      targetSpeedLevel: 0,
      rudderAngle: 0,
      currentHp: playerStats.maxHp,
      maxHp: playerStats.maxHp,
      isSunk: false,
      sinkProgress: 0,
      idleTimer: 0,
      fireTimer: 0,
      cooldowns: {},
      tacticalRole: 'attacker',
      domain: playerModel.domain || 'land',
      altitude: playerModel.domain === 'air' ? 65 : 0,
      weaponTargetMode: initialPlayerMode,
      hasSurfaceWeapons: playerHasSurface,
      hasAirWeapons: playerHasAir,
    };
    playerShip.towedTrailer = initVehicleTrailer(playerShip);
    ships.push(playerShip);

    // Pre-calculate session-wide balanced match plan so BOTH teams have the exact same count
    // of land vehicles, combat aircraft, and naval warships, dynamically shuffled per session.
    const matchPlan = getBalancedMatchPlan(shipsPerTeam, playerModel.domain || 'land', this.matchSeed);

    // 2. Create Allied NPC vehicles (Omega Team) with session randomized fleet composition
    for (let i = 1; i < shipsPerTeam; i++) {
      const assignedDomain = matchPlan.allyNpcDomains[i - 1];
      const { model, config } = generateNpcShipConfig(
        i,
        'player',
        shipsPerTeam,
        playerModel.domain || 'land',
        this.matchSeed,
        assignedDomain
      );
      const stats = calculateShipStats(model, config);
      const role: 'defender' | 'attacker' | 'skirmisher' = (i === 1) ? 'defender' : (i === 2 ? 'attacker' : 'skirmisher');

      // Check NPC weapon capabilities
      let npcHasSurface = false;
      let npcHasAir = false;
      for (const hp of model.hardpoints) {
        const compId = config.equippedComponents[hp.id];
        const comp = compId ? COMPONENT_MAP.get(compId) : null;
        if (!comp || comp.damage <= 0) continue;
        if (comp.targetDomain === 'surface' || comp.targetDomain === 'both') npcHasSurface = true;
        if (comp.targetDomain === 'air' || comp.targetDomain === 'both') npcHasAir = true;
      }

      const allySpawn = getSafeSpawn('player', model.domain || 'land', i);

      const npcShip: ShipEntity = {
        id: `allied-npc-${i}`,
        name: config.name,
        team: 'player',
        isPlayer: false,
        model,
        config,
        stats,
        x: allySpawn.x,
        y: allySpawn.y,
        angle: 0,
        vx: 0,
        vy: 0,
        speed: 0,
        targetSpeedLevel: 2,
        rudderAngle: 0,
        currentHp: stats.maxHp,
        maxHp: stats.maxHp,
        isSunk: false,
        sinkProgress: 0,
        idleTimer: 0,
        fireTimer: 0,
        cooldowns: {},
        aiState: role === 'defender' ? 'defend' : 'attack',
        aiDecisionTimer: Math.random() * 1.5,
        tacticalRole: role,
        domain: model.domain || 'land',
        altitude: model.domain === 'air' ? 65 : 0,
        weaponTargetMode: (npcHasAir && !npcHasSurface) ? 'air' : 'surface',
        hasSurfaceWeapons: npcHasSurface,
        hasAirWeapons: npcHasAir,
      };
      npcShip.towedTrailer = initVehicleTrailer(npcShip);
      ships.push(npcShip);
    }

    // 3. Create Hostile Enemy NPC vehicles (Alpha Team) with session randomized composition
    for (let i = 0; i < shipsPerTeam; i++) {
      const assignedDomain = matchPlan.enemyNpcDomains[i];
      const { model, config } = generateNpcShipConfig(
        i,
        'enemy',
        shipsPerTeam,
        playerModel.domain || 'land',
        this.matchSeed,
        assignedDomain
      );
      const stats = calculateShipStats(model, config);

      // Balanced combat roles matching allied force
      let role: 'attacker' | 'defender' | 'skirmisher' = 'attacker';
      if (i === 1) role = 'defender';
      else if (i === 3) role = 'skirmisher';
      else role = 'attacker';

      let npcHasSurface = false;
      let npcHasAir = false;
      for (const hp of model.hardpoints) {
        const compId = config.equippedComponents[hp.id];
        const comp = compId ? COMPONENT_MAP.get(compId) : null;
        if (!comp || comp.damage <= 0) continue;
        if (comp.targetDomain === 'surface' || comp.targetDomain === 'both') npcHasSurface = true;
        if (comp.targetDomain === 'air' || comp.targetDomain === 'both') npcHasAir = true;
      }

      const enemySpawn = getSafeSpawn('enemy', model.domain || 'land', i);

      const enemyShip: ShipEntity = {
        id: `enemy-npc-${i}`,
        name: config.name,
        team: 'enemy',
        isPlayer: false,
        model,
        config,
        stats,
        x: enemySpawn.x,
        y: enemySpawn.y,
        angle: Math.PI, // facing left toward player fleet
        vx: 0,
        vy: 0,
        speed: 0,
        targetSpeedLevel: 2,
        rudderAngle: 0,
        currentHp: stats.maxHp,
        maxHp: stats.maxHp,
        isSunk: false,
        sinkProgress: 0,
        idleTimer: 0,
        fireTimer: 0,
        cooldowns: {},
        aiState: role === 'defender' ? 'defend' : role === 'attacker' ? 'attack' : 'chase',
        aiDecisionTimer: Math.random() * 1.5,
        tacticalRole: role,
        domain: model.domain || 'land',
        altitude: model.domain === 'air' ? 65 : 0,
        weaponTargetMode: (npcHasAir && !npcHasSurface) ? 'air' : 'surface',
        hasSurfaceWeapons: npcHasSurface,
        hasAirWeapons: npcHasAir,
      };
      enemyShip.towedTrailer = initVehicleTrailer(enemyShip);
      ships.push(enemyShip);
    }

    const gameMode: GameMode = 'fleet-battle';

    const initialLogMessage = `Combat units deployed in ${mapConfig.name}! All vehicle cannons, missile pods, and defense systems online.`;

    return {
      arenaWidth,
      arenaHeight,
      ships,
      projectiles: [],
      particles: [],
      ripples: [],
      islands,
      bridges,
      mapConfig,
      time: 0,
      gameOver: false,
      winner: null,
      camera: { x: playerShip.x, y: playerShip.y, zoom: 0.88 },
      mouseWorldPos: { x: arenaWidth * 0.5, y: arenaHeight * 0.5 },
      playerShipId: playerShip.id,
      combatLog: [
        {
          id: 'log-0',
          text: initialLogMessage,
          time: 0,
          team: 'player',
        },
      ],
      stats: {
        damageDealt: 0,
        shipsSunk: 0,
        shotsFired: 0,
        shotsHit: 0,
      },
      gameMode,
    };
  }

  public updateSettings(newSettings: Partial<BattleSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    sounds.enabled = this.settings.soundEnabled;

    // If map changed, update obstacles and map config
    if (newSettings.selectedMapId) {
      const map = BATTLE_MAP_MAP.get(newSettings.selectedMapId);
      if (map) {
        this.state.mapConfig = map;
        this.state.islands = map.obstacles;
      }
    }
  }

  public setMouseWorldPos(worldX: number, worldY: number) {
    if (!isNaN(worldX) && !isNaN(worldY)) {
      this.state.mouseWorldPos = { x: worldX, y: worldY };
    }
  }

  public adjustPlayerThrottle(delta: number) {
    const player = this.getPlayerShip();
    if (!player || player.isSunk) return;
    const current = player.targetSpeedLevel;
    player.targetSpeedLevel = Math.max(-1, Math.min(2, current + delta));
  }

  public setPlayerThrottle(level: number) {
    const player = this.getPlayerShip();
    if (!player || player.isSunk) return;
    player.targetSpeedLevel = Math.max(-1, Math.min(2, Math.round(level)));
  }

  public setPlayerThrottleDirect(level: number) {
    this.setPlayerThrottle(level);
  }

  public setPlayerRudder(angle: number) {
    const player = this.getPlayerShip();
    if (!player || player.isSunk) return;
    player.rudderAngle = Math.max(-1, Math.min(1, angle));
  }

  public firePlayerWeapons(customTargetX?: number, customTargetY?: number): boolean {
    const player = this.getPlayerShip();
    if (!player || player.isSunk) return false;
    const targetX = customTargetX !== undefined && !isNaN(customTargetX) ? customTargetX : this.state.mouseWorldPos.x;
    const targetY = customTargetY !== undefined && !isNaN(customTargetY) ? customTargetY : this.state.mouseWorldPos.y;
    if (isNaN(targetX) || isNaN(targetY)) return false;
    return this.fireShipWeapons(player, targetX, targetY);
  }

  public getPlayerWeaponModeInfo(): {
    hasSurfaceWeapons: boolean;
    hasAirWeapons: boolean;
    canToggle: boolean;
    currentMode: VehicleWeaponMode;
    modeType: 'both' | 'air-only' | 'surface-only' | 'none';
  } {
    const player = this.getPlayerShip();
    if (!player) {
      return {
        hasSurfaceWeapons: true,
        hasAirWeapons: false,
        canToggle: false,
        currentMode: 'surface',
        modeType: 'surface-only',
      };
    }
    let hasSurface = false;
    let hasAir = false;
    for (const hp of player.model.hardpoints) {
      const compId = player.config.equippedComponents[hp.id];
      if (!compId) continue;
      const comp = COMPONENT_MAP.get(compId);
      if (!comp || comp.damage <= 0) continue;
      const coversSurface = comp.targetDomain === 'surface' || comp.targetDomain === 'both' || (!comp.targetDomain && !comp.isAirTargeting);
      const coversAir = comp.targetDomain === 'air' || comp.targetDomain === 'both' || !!comp.isAirTargeting;
      if (coversSurface) hasSurface = true;
      if (coversAir) hasAir = true;
    }

    const canToggle = hasSurface && hasAir;
    let modeType: 'both' | 'air-only' | 'surface-only' | 'none';
    if (canToggle) {
      modeType = 'both';
    } else if (hasAir && !hasSurface) {
      modeType = 'air-only';
    } else if (hasSurface && !hasAir) {
      modeType = 'surface-only';
    } else {
      modeType = 'none';
    }

    let currentMode: VehicleWeaponMode = 'surface';
    if (modeType === 'air-only') {
      currentMode = 'air';
    } else if (modeType === 'surface-only') {
      currentMode = 'surface';
    } else if (player.weaponTargetMode) {
      currentMode = player.weaponTargetMode;
    } else {
      currentMode = 'surface';
    }
    player.weaponTargetMode = currentMode;

    return {
      hasSurfaceWeapons: hasSurface,
      hasAirWeapons: hasAir,
      canToggle,
      currentMode,
      modeType,
    };
  }

  public togglePlayerWeaponMode(): VehicleWeaponMode {
    const player = this.getPlayerShip();
    if (!player) return 'surface';

    const info = this.getPlayerWeaponModeInfo();
    if (!info.canToggle) {
      return info.currentMode;
    }

    player.weaponTargetMode = player.weaponTargetMode === 'surface' ? 'air' : 'surface';

    sounds.playCannonShot('swivel');
    const focusLabel = player.weaponTargetMode === 'air' ? 'AIR FOCUS' : 'SURFACE FOCUS';
    this.addCombatLog(
      `Tactical targeting switched to ${focusLabel}`,
      'player'
    );
    return player.weaponTargetMode;
  }

  public getPlayerShip(): ShipEntity | undefined {
    return this.state.ships.find(s => s.id === this.state.playerShipId);
  }

  public panCamera(deltaX: number, deltaY: number) {
    this.isFreeCam = true;
    this.spectatorTargetId = null;
    const zoom = this.state.camera.zoom || 1;
    this.state.camera.x = Math.max(100, Math.min(this.state.arenaWidth - 100, this.state.camera.x + deltaX / zoom));
    this.state.camera.y = Math.max(100, Math.min(this.state.arenaHeight - 100, this.state.camera.y + deltaY / zoom));
  }

  public zoomCamera(factor: number) {
    const currentZoom = this.state.camera.zoom || 1;
    const newZoom = Math.max(0.35, Math.min(1.85, currentZoom * factor));
    this.state.camera.zoom = newZoom;
  }

  public setSpectatorTarget(unitId: string | null) {
    this.spectatorTargetId = unitId;
    this.isFreeCam = !unitId;
    if (unitId) {
      const ship = this.state.ships.find(s => s.id === unitId);
      if (ship) {
        this.state.camera.x = ship.x;
        this.state.camera.y = ship.y;
      }
    }
  }

  public cycleSpectator(forward: boolean = true) {
    const livingShips = this.state.ships.filter(s => !s.isSunk);
    if (livingShips.length === 0) return;
    const curIdx = livingShips.findIndex(s => s.id === this.spectatorTargetId);
    let nextIdx: number;
    if (curIdx === -1) {
      nextIdx = 0;
    } else {
      nextIdx = (curIdx + (forward ? 1 : -1) + livingShips.length) % livingShips.length;
    }
    this.setSpectatorTarget(livingShips[nextIdx].id);
  }

  public start() {
    this.lastTimestamp = performance.now();
    const loop = (timestamp: number) => {
      const dtMs = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
      const dt = Math.min(0.08, dtMs / 1000) * (this.settings.gameSpeed || 1);

      this.update(dt);
      if (this.onStateUpdate) {
        this.onStateUpdate(this.state);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public update(dt: number) {
    this.state.time += dt;

    // 1. Update Ship Physics, Cooldowns, Repair Systems
    for (const ship of this.state.ships) {
      this.updateShip(ship, dt);
    }

    // 2. Update NPCs AI
    for (const ship of this.state.ships) {
      if (!ship.isPlayer && !ship.isSunk) {
        this.updateNpcAi(ship, dt);
      }
    }

    // 3. Player Auto-fire if enabled
    if (this.settings.autoFire) {
      const player = this.getPlayerShip();
      if (player && !player.isSunk) {
        const enemies = this.state.ships.filter(s => s.team === 'enemy' && !s.isSunk);
        let nearest: ShipEntity | null = null;
        let minDist = Infinity;
        const targetMode = player.weaponTargetMode || 'surface';

        // First seek targets matching player's current focus
        for (const e of enemies) {
          const isTargetAir = e.domain === 'air';
          const matchesFocus = targetMode === 'air' ? isTargetAir : !isTargetAir;
          if (!matchesFocus) continue;
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < minDist && d < (player.stats.effectiveRange || 780)) {
            minDist = d;
            nearest = e;
          }
        }
        // Fallback to any hostile in effective range
        if (!nearest) {
          for (const e of enemies) {
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < minDist && d < (player.stats.effectiveRange || 780)) {
              minDist = d;
              nearest = e;
            }
          }
        }
        if (nearest) {
          this.fireShipWeapons(player, nearest.x, nearest.y);
        }
      }
    }

    // 4. Update Projectiles
    this.updateProjectiles(dt);

    // 5. Update Particles & Ripples
    this.updateParticles(dt);

    // 6. Camera follows player, or spectator target / freecam
    const player = this.getPlayerShip();
    if (player && !player.isSunk && !this.isFreeCam) {
      const targetCamX = player.x;
      const targetCamY = player.y;
      this.state.camera.x += (targetCamX - this.state.camera.x) * 0.1;
      this.state.camera.y += (targetCamY - this.state.camera.y) * 0.1;
    } else if (this.spectatorTargetId) {
      const specShip = this.state.ships.find(s => s.id === this.spectatorTargetId && !s.isSunk);
      if (specShip) {
        this.state.camera.x += (specShip.x - this.state.camera.x) * 0.1;
        this.state.camera.y += (specShip.y - this.state.camera.y) * 0.1;
      }
    }

    // 7. Check Game Over conditions (Elimination / Annihilation)
    if (!this.state.gameOver) {
      const livingPlayers = this.state.ships.filter(s => s.team === 'player' && !s.isSunk);
      const livingEnemies = this.state.ships.filter(s => s.team === 'enemy' && !s.isSunk);

      if (livingPlayers.length === 0) {
        this.state.gameOver = true;
        this.state.winner = 'enemy';
        this.state.winReason = 'annihilation';
        sounds.playDefeat();
        this.addCombatLog('Fleet defeated! All allied warships have been lost.', 'enemy');
      } else if (livingEnemies.length === 0) {
        this.state.gameOver = true;
        this.state.winner = 'player';
        this.state.winReason = 'annihilation';
        sounds.playVictory();
        this.addCombatLog('Victory! Hostile naval force neutralized completely!', 'player');
      }
    }
  }

  private updateShip(ship: ShipEntity, dt: number) {
    if (ship.isSunk) {
      ship.sinkProgress = Math.min(1, ship.sinkProgress + dt * 0.3);
      if (Math.random() < 0.25) {
        this.addParticle({
          x: ship.x + (Math.random() - 0.5) * 30,
          y: ship.y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 15,
          vy: -20 - Math.random() * 20,
          life: 0.8,
          maxLife: 0.8,
          size: 4 + Math.random() * 6,
          color: '#64748b',
          type: 'smoke',
        });
      }
      return;
    }

    // Cooldown timers
    for (const key of Object.keys(ship.cooldowns)) {
      if (ship.cooldowns[key] > 0) {
        ship.cooldowns[key] = Math.max(0, ship.cooldowns[key] - dt);
      }
    }

    // Idle timer and automatic damage control repairs
    ship.idleTimer += dt;
    if (ship.idleTimer > 4.0 && ship.currentHp < ship.maxHp) {
      let repairRate = 4; // base passive crew damage control
      for (const hp of ship.model.hardpoints) {
        const compId = ship.config.equippedComponents[hp.id];
        const comp = compId ? COMPONENT_MAP.get(compId) : null;
        if (comp?.repairRate) {
          repairRate += comp.repairRate;
        }
      }
      ship.currentHp = Math.min(ship.maxHp, ship.currentHp + repairRate * dt);
    }

    // Fire damage over time
    if (ship.fireTimer > 0) {
      ship.fireTimer -= dt;
      ship.currentHp = Math.max(0, ship.currentHp - 8 * dt);
      if (Math.random() < 0.3) {
        this.addParticle({
          x: ship.x + (Math.random() - 0.5) * 20,
          y: ship.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 10,
          vy: -30,
          life: 0.4,
          maxLife: 0.4,
          size: 5,
          color: '#f97316',
          type: 'fire',
        });
      }
      if (ship.currentHp <= 0) {
        this.sinkShip(ship);
        return;
      }
    }

    // Physics: Rudder Steering
    const turnRate = ship.stats.turnRate;
    const speedRatio = ship.domain === 'air'
      ? Math.max(0.65, Math.abs(ship.speed) / Math.max(1, ship.stats.speed))
      : Math.max(0.25, Math.abs(ship.speed) / Math.max(1, ship.stats.speed));
    ship.angle += ship.rudderAngle * turnRate * speedRatio * dt;
    ship.angle = this.normalizeAngle(ship.angle);

    // Physics: Throttle Acceleration
    let targetSpeed = 0;
    if (ship.targetSpeedLevel === 2) targetSpeed = ship.stats.speed;
    else if (ship.targetSpeedLevel === 1) targetSpeed = ship.stats.speed * 0.55;
    else if (ship.targetSpeedLevel === -1) targetSpeed = -ship.stats.speed * 0.35;

    // Domain-tailored acceleration & deceleration:
    // Aircraft surge rapidly with jet/turboprop thrust; ships move with stately naval momentum.
    const accel = ship.domain === 'air' ? 85 : (ship.domain === 'water' ? 16 : 35);
    const decel = ship.domain === 'air' ? 50 : (ship.domain === 'water' ? 12 : 25);
    if (ship.speed < targetSpeed) {
      ship.speed = Math.min(targetSpeed, ship.speed + accel * dt);
    } else if (ship.speed > targetSpeed) {
      ship.speed = Math.max(targetSpeed, ship.speed - decel * dt);
    }

    // Forward velocity components
    ship.vx = Math.cos(ship.angle) * ship.speed;
    ship.vy = Math.sin(ship.angle) * ship.speed;

    const nextX = ship.x + ship.vx * dt;
    const nextY = ship.y + ship.vy * dt;

    // Domain-aware terrain restriction:
    // Land vehicles are restricted to land areas only (mainland/islands).
    // Ships are restricted to water areas only (cannot sail onto land).
    // Aircraft fly unimpeded over all terrain at high altitude.
    const hullLength = ship.model.hullLength;
    const hullWidth = ship.model.hullWidth;
    let hitIsland = false;

    if (ship.domain === 'land') {
      const landPolys = [
        ...this.state.islands.map(i => i.points),
        ...(this.state.bridges || []).map(b => b.points),
      ];
      const res = constrainLandVehicleToLand(
        nextX,
        nextY,
        ship.angle,
        hullLength,
        hullWidth,
        landPolys
      );

      if (res.strayedIntoWater) {
        hitIsland = true;
        // Shift vehicle onto safe land gently without shaking or blinking
        ship.x = nextX + res.pushX;
        ship.y = nextY + res.pushY;

        // Slide along shoreline: cancel velocity directed outward into water
        const outwardNx = -res.inwardNx;
        const outwardNy = -res.inwardNy;
        const velDot = ship.vx * outwardNx + ship.vy * outwardNy;
        if (velDot > 0) {
          ship.vx -= velDot * outwardNx * 1.15;
          ship.vy -= velDot * outwardNy * 1.15;
          ship.speed = (ship.vx * Math.cos(ship.angle) + ship.vy * Math.sin(ship.angle));
        }

        ship.lastCollisionNormalX = res.inwardNx;
        ship.lastCollisionNormalY = res.inwardNy;

        if (velDot > 35) {
          sounds.playHit(false);
        }

        // Steer AI smoothly away using rudderAngle without snapping vehicle angle
        if (!ship.isPlayer) {
          const targetInwardAngle = Math.atan2(res.inwardNy, res.inwardNx);
          const angleDiff = this.normalizeAngle(targetInwardAngle - ship.angle);
          ship.rudderAngle = angleDiff > 0 ? 1 : -1;
          if (ship.targetSpeedLevel > 0 && Math.abs(ship.speed) < 14) {
            ship.stuckTimer = (ship.stuckTimer || 0) + dt * 1.5;
          }
        }
      }
    } else if (ship.domain === 'water') {
      for (const island of this.state.islands) {
        const col = checkShipPolygonCollision(
          nextX,
          nextY,
          ship.angle,
          hullLength,
          hullWidth,
          island.points,
          island.canals
        );

        if (col.collided) {
          hitIsland = true;
          // Shift ship position clear of the obstacle back into water
          ship.x = nextX + col.pushX;
          ship.y = nextY + col.pushY;

          // Slide velocity along polygon surface (remove velocity into obstacle)
          const pushDist = Math.hypot(col.pushX, col.pushY);
          if (pushDist > 0.001) {
            const nx = col.pushX / pushDist;
            const ny = col.pushY / pushDist;
            const dot = ship.vx * nx + ship.vy * ny;
            if (dot < 0) {
              ship.vx -= dot * nx * 1.2;
              ship.vy -= dot * ny * 1.2;
            }
            ship.lastCollisionNormalX = nx;
            ship.lastCollisionNormalY = ny;
          }

          ship.speed *= 0.45;
          if (Math.abs(ship.speed) > 20) {
            sounds.playHit(false);
          }

          // Track collision contact for NPC unstuck recovery
          if (!ship.isPlayer) {
            ship.stuckTimer = (ship.stuckTimer || 0) + dt;
            if (ship.recoveryTimer && ship.recoveryTimer > 0.7 && ship.speed < 0) {
              ship.recoveryTimer = 0.7;
            }
          }
          break;
        }
      }
    }

    // Decay stuck counter when moving freely, or increment if stalled
    if (!hitIsland && !ship.isPlayer) {
      if (Math.abs(ship.speed) > 18) {
        ship.stuckTimer = Math.max(0, (ship.stuckTimer || 0) - dt * 2.5);
      } else if (ship.targetSpeedLevel > 0 && Math.abs(ship.speed) < 10) {
        // Trying to move forward but stuck against an obstacle corner
        ship.stuckTimer = (ship.stuckTimer || 0) + dt * 0.7;
      }
    }

    // Boundary bounce & inward deflection logic
    // Prevents ships from scraping along or getting stuck on edge
    if (!hitIsland) {
      const padding = 85;
      let bounced = false;

      if (nextX < padding) {
        ship.x = padding;
        ship.vx = Math.abs(ship.vx);
        if (Math.cos(ship.angle) < 0) {
          // If heading into left wall, turn inward towards center
          ship.angle = Math.atan2(Math.sin(ship.angle), 0.5);
          ship.rudderAngle = 0;
        }
        bounced = true;
      } else if (nextX > this.state.arenaWidth - padding) {
        ship.x = this.state.arenaWidth - padding;
        ship.vx = -Math.abs(ship.vx);
        if (Math.cos(ship.angle) > 0) {
          // If heading into right wall, turn inward towards center
          ship.angle = Math.atan2(Math.sin(ship.angle), -0.5);
          ship.rudderAngle = 0;
        }
        bounced = true;
      } else {
        ship.x = nextX;
      }

      if (nextY < padding) {
        ship.y = padding;
        ship.vy = Math.abs(ship.vy);
        if (Math.sin(ship.angle) < 0) {
          // If heading into top wall, turn downward towards center
          ship.angle = Math.atan2(0.5, Math.cos(ship.angle));
          ship.rudderAngle = 0;
        }
        bounced = true;
      } else if (nextY > this.state.arenaHeight - padding) {
        ship.y = this.state.arenaHeight - padding;
        ship.vy = -Math.abs(ship.vy);
        if (Math.sin(ship.angle) > 0) {
          // If heading into bottom wall, turn upward towards center
          ship.angle = Math.atan2(-0.5, Math.cos(ship.angle));
          ship.rudderAngle = 0;
        }
        bounced = true;
      } else {
        ship.y = nextY;
      }

      if (bounced) {
        ship.speed = Math.max(30, Math.abs(ship.speed) * 0.7);
      }
    }

    // Domain-specific motion particles (exhaust jet flame, water wake, or ground dust)
    if (Math.abs(ship.speed) > 15) {
      if (ship.domain === 'air' && Math.random() < 0.45) {
        const sternOffset = -ship.model.hullLength * 0.48;
        this.addParticle({
          x: ship.x + Math.cos(ship.angle) * sternOffset,
          y: ship.y + Math.sin(ship.angle) * sternOffset,
          vx: -ship.vx * 0.2 + (Math.random() - 0.5) * 10,
          vy: -ship.vy * 0.2 + (Math.random() - 0.5) * 10,
          life: 0.35,
          maxLife: 0.35,
          size: 4 + Math.random() * 3,
          color: '#94a3b8',
          type: 'smoke',
        });
      } else if (ship.domain === 'water' && Math.random() < 0.35) {
        const sternOffset = -ship.model.hullLength * 0.45;
        this.addParticle({
          x: ship.x + Math.cos(ship.angle) * sternOffset,
          y: ship.y + Math.sin(ship.angle) * sternOffset,
          vx: -ship.vx * 0.1,
          vy: -ship.vy * 0.1,
          life: 0.65,
          maxLife: 0.65,
          size: 6 + Math.random() * 4,
          color: '#e0f2fe',
          type: 'wake',
        });
      } else if (ship.domain === 'land' && Math.random() < 0.4) {
        const sternOffset = -ship.model.hullLength * 0.45;
        const flankOffset = ship.model.hullWidth * 0.38;
        const leftX = ship.x + Math.cos(ship.angle) * sternOffset - Math.sin(ship.angle) * flankOffset;
        const leftY = ship.y + Math.sin(ship.angle) * sternOffset + Math.cos(ship.angle) * flankOffset;
        const rightX = ship.x + Math.cos(ship.angle) * sternOffset + Math.sin(ship.angle) * flankOffset;
        const rightY = ship.y + Math.sin(ship.angle) * sternOffset - Math.cos(ship.angle) * flankOffset;
        const emitX = Math.random() < 0.5 ? leftX : rightX;
        const emitY = Math.random() < 0.5 ? leftY : rightY;

        this.addParticle({
          x: emitX + (Math.random() - 0.5) * 6,
          y: emitY + (Math.random() - 0.5) * 6,
          vx: -ship.vx * 0.15 + (Math.random() - 0.5) * 12,
          vy: -ship.vy * 0.15 + (Math.random() - 0.5) * 12,
          life: 0.55,
          maxLife: 0.55,
          size: 5 + Math.random() * 6,
          color: this.state.mapConfig.waterColors.surface || '#854d0e',
          type: 'dust',
        });
      }
    }

    // Towed Trailer physics and tactical automation
    if (ship.towedTrailer) {
      const trailer = ship.towedTrailer;
      const hitchDist = ship.model.hullLength * 0.48 + 5;
      const hitchX = ship.x - Math.cos(ship.angle) * hitchDist;
      const hitchY = ship.y - Math.sin(ship.angle) * hitchDist;
      const towBarLength = 22 + trailer.def.length * 0.46;

      const dx = hitchX - trailer.x;
      const dy = hitchY - trailer.y;
      trailer.angle = Math.atan2(dy, dx);
      trailer.x = hitchX - Math.cos(trailer.angle) * towBarLength;
      trailer.y = hitchY - Math.sin(trailer.angle) * towBarLength;

      trailer.cooldown = Math.max(0, trailer.cooldown - dt);

      // Support functions (Nanite repair / Electronic Warfare radar)
      if (trailer.def.category === 'support') {
        if (trailer.def.repairRate) {
          // Field repair towing vehicle and allied armor
          ship.currentHp = Math.min(ship.maxHp, ship.currentHp + trailer.def.repairRate * dt);
          const nearbyAllies = this.state.ships.filter(s => s.team === ship.team && !s.isSunk && s.id !== ship.id);
          for (const ally of nearbyAllies) {
            if (Math.hypot(ally.x - trailer.x, ally.y - trailer.y) < 320) {
              ally.currentHp = Math.min(ally.maxHp, ally.currentHp + (trailer.def.repairRate * 0.6) * dt);
            }
          }
          if (Math.random() < 0.18) {
            this.addParticle({
              x: trailer.x + (Math.random() - 0.5) * 22,
              y: trailer.y + (Math.random() - 0.5) * 22,
              vx: (Math.random() - 0.5) * 16,
              vy: -22 - Math.random() * 18,
              life: 0.45,
              maxLife: 0.45,
              size: 3.5,
              color: '#34d399',
              type: 'spark',
            });
          }
        }

        if (trailer.def.electronicWarfare) {
          // EW Countermeasures: jam and detonate enemy incoming missiles
          for (const p of this.state.projectiles) {
            if (p.team !== ship.team && p.type === 'missile') {
              const d = Math.hypot(p.x - trailer.x, p.y - trailer.y);
              if (d < 240 && Math.random() < 0.3) {
                p.life = p.maxLife; // neutralize missile
                this.addParticle({
                  x: p.x,
                  y: p.y,
                  vx: (Math.random() - 0.5) * 45,
                  vy: (Math.random() - 0.5) * 45,
                  life: 0.35,
                  maxLife: 0.35,
                  size: 6,
                  color: '#818cf8',
                  type: 'spark',
                });
              }
            }
          }
        }
      } else if (trailer.def.damage > 0 && trailer.cooldown <= 0) {
        // Trailer weapon automation: auto-target hostiles within range
        const hostiles = this.state.ships.filter(s => s.team !== ship.team && !s.isSunk);
        let bestTarget: ShipEntity | null = null;
        let minDist = trailer.def.range;

        const player = this.getPlayerShip();
        const trailerDistToPlayer = player ? Math.hypot(trailer.x - player.x, trailer.y - player.y) : 0;

        for (const h of hostiles) {
          const d = Math.hypot(h.x - trailer.x, h.y - trailer.y);
          // Fair engagement guard: If hostile trailer is targeting player, enforce visible combat range (<= 600px)
          if (ship.team === 'enemy' && h.isPlayer && (d > 600 || trailerDistToPlayer > 620)) {
            continue;
          }
          if (d < minDist) {
            minDist = d;
            bestTarget = h;
          }
        }

        if (bestTarget) {
          trailer.cooldown = trailer.def.reloadTime;
          const aimAngle = Math.atan2(bestTarget.y - trailer.y, bestTarget.x - trailer.x);
          const vx = Math.cos(aimAngle) * trailer.def.projectileSpeed;
          const vy = Math.sin(aimAngle) * trailer.def.projectileSpeed;
          const projLife = minDist / trailer.def.projectileSpeed;

          this.state.projectiles.push({
            id: `trailer-proj-${this.nextId++}`,
            x: trailer.x,
            y: trailer.y,
            startX: trailer.x,
            startY: trailer.y,
            targetX: bestTarget.x,
            targetY: bestTarget.y,
            vx,
            vy,
            damage: trailer.def.damage,
            splashRadius: trailer.def.splashRadius || 0,
            type: trailer.def.projectileType as Projectile['type'],
            team: ship.team,
            sourceShipId: ship.id,
            life: 0,
            maxLife: Math.max(0.2, projLife),
            color: trailer.def.accentColor,
          });

          this.addParticle({
            x: trailer.x,
            y: trailer.y,
            vx: Math.cos(aimAngle) * 35,
            vy: Math.sin(aimAngle) * 35,
            life: 0.25,
            maxLife: 0.25,
            size: 5,
            color: trailer.def.accentColor,
            type: 'spark',
          });

          if (trailer.def.projectileType === 'missile') {
            sounds.playCannonShot('missile');
          } else if (trailer.def.projectileType === 'flak') {
            sounds.playCannonShot('swivel');
          } else {
            sounds.playCannonShot('heavy');
          }
        }
      }
    }
  }

  private updateNpcAi(ship: ShipEntity, dt: number) {
    ship.aiDecisionTimer = (ship.aiDecisionTimer || 0) - dt;

    // Find valid hostile targets based on vehicle domain and weapon capabilities:
    // Land vehicles and ships can ONLY attack aircraft if equipped with an air-targeting weapon.
    const targetTeam = ship.team === 'player' ? 'enemy' : 'player';
    const allHostiles = this.state.ships.filter(s => s.team === targetTeam && !s.isSunk);

    let canEngageAir = false;
    let canEngageSurface = false;
    if (ship.domain === 'air') {
      canEngageAir = true;
      canEngageSurface = true;
    } else {
      for (const hp of ship.model.hardpoints) {
        const compId = ship.config.equippedComponents[hp.id];
        const comp = compId ? COMPONENT_MAP.get(compId) : null;
        if (!comp || comp.damage <= 0) continue;
        if (comp.targetDomain === 'air' || comp.targetDomain === 'both') canEngageAir = true;
        if (comp.targetDomain === 'surface' || comp.targetDomain === 'both') canEngageSurface = true;
      }
    }

    const hostiles = allHostiles.filter(h => {
      if (h.domain === 'air' && !canEngageAir) return false;
      if (h.domain !== 'air' && !canEngageSurface) return false;
      return true;
    });

    // =========================================================================
    // 0. ACTIVE OBSTACLE RECOVERY (REVERSE & PIVOT UNSTUCK MANEUVER)
    // =========================================================================
    if (ship.avoidanceLockTimer && ship.avoidanceLockTimer > 0) {
      ship.avoidanceLockTimer -= dt;
    }

    if (ship.recoveryTimer && ship.recoveryTimer > 0) {
      ship.recoveryTimer -= dt;

      if (ship.recoveryTimer > 0.65) {
        // Phase 1: Firm reverse gear to back away from obstacle face
        ship.targetSpeedLevel = -1;
        ship.rudderAngle = ship.recoverySteer || 1;
      } else {
        // Phase 2: Shift into forward gear and steer sharply away into open ground
        ship.targetSpeedLevel = 1;
        ship.rudderAngle = -(ship.recoverySteer || 1);
      }

      if (ship.recoveryTimer <= 0) {
        ship.recoveryTimer = 0;
        ship.stuckTimer = 0;
        ship.avoidanceLockTimer = 1.8; // Maintain turn away from obstacle for 1.8s
      }

      // Check for opportunistic combat shots while maneuvering
      if (hostiles.length > 0) {
        let nearestHostile: ShipEntity | null = null;
        let minDistHostile = Infinity;
        for (const h of hostiles) {
          const d = Math.hypot(h.x - ship.x, h.y - ship.y);
          if (d < minDistHostile) {
            minDistHostile = d;
            nearestHostile = h;
          }
        }
        if (nearestHostile && minDistHostile <= 580) {
          this.executeNpcGunnery(ship, nearestHostile, minDistHostile, dt);
        }
      }
      return;
    }

    // If still in post-recovery avoidance lock, keep steering smoothly along safe escape direction
    if (ship.avoidanceLockTimer && ship.avoidanceLockTimer > 0) {
      ship.targetSpeedLevel = 1;
      const escapeAngle = Math.atan2(ship.lastCollisionNormalY || 0, ship.lastCollisionNormalX || 0);
      if (Math.hypot(ship.lastCollisionNormalX || 0, ship.lastCollisionNormalY || 0) > 0.1) {
        const diff = this.normalizeAngle(escapeAngle - ship.angle);
        ship.rudderAngle = diff > 0 ? 0.75 : -0.75;
      }
      return;
    }

    // Temporal progress tracking: detects if vehicle has forward throttle but fails to make progress
    ship.stuckCheckTimer = (ship.stuckCheckTimer || 0) + dt;
    if (ship.stuckCheckTimer >= 0.4) {
      ship.stuckCheckTimer = 0;
      const lastX = ship.prevCheckX ?? ship.x;
      const lastY = ship.prevCheckY ?? ship.y;
      const distProgress = Math.hypot(ship.x - lastX, ship.y - lastY);
      ship.prevCheckX = ship.x;
      ship.prevCheckY = ship.y;

      if (ship.targetSpeedLevel !== 0 && distProgress < 7) {
        ship.stuckTimer = (ship.stuckTimer || 0) + 0.35;
      } else if (distProgress >= 14) {
        ship.stuckTimer = Math.max(0, (ship.stuckTimer || 0) - 0.25);
      }
    }

    if (hostiles.length === 0) {
      // No targets left, return to gentle center cruise
      const centerX = this.state.arenaWidth * 0.5;
      const centerY = this.state.arenaHeight * 0.5;
      const toCenter = Math.atan2(centerY - ship.y, centerX - ship.x);
      const diff = this.normalizeAngle(toCenter - ship.angle);
      ship.rudderAngle = Math.max(-0.5, Math.min(0.5, diff));
      ship.targetSpeedLevel = 1;
      return;
    }

    // Target selection with tactical scoring (focus fire on vulnerable ships or objective threats)
    let bestScore = -Infinity;
    let target: ShipEntity | null = null;
    let minDist = Infinity;

    for (const h of hostiles) {
      const d = Math.hypot(h.x - ship.x, h.y - ship.y);
      const hpLossRatio = 1 - Math.max(0, h.currentHp / h.maxHp);
      let domainBonus = 0;
      // If NPC has only surface weapons, penalize aircraft
      if (!ship.hasAirWeapons && h.domain === 'air') {
        domainBonus -= 1500;
      }
      // If NPC has only anti-air weapons, penalize surface targets
      if (!ship.hasSurfaceWeapons && h.domain !== 'air') {
        domainBonus -= 1500;
      }
      // Base score: closer ships + damaged ships (focus fire) + domain compatibility
      const score = -d * 0.8 + (hpLossRatio * 320) + domainBonus;

      if (score > bestScore) {
        bestScore = score;
        target = h;
        minDist = d;
      }
    }

    if (!target) return;

    // =========================================================================
    // OBSTACLE STUCK DETECTION & UNSTUCK TRIGGER
    // =========================================================================
    const isStuckByTimer = (ship.stuckTimer || 0) > 0.35;

    // Proximity check directly ahead of front bumper
    let immediateBlocked = false;
    let nearestNormX = 0;
    let nearestNormY = 0;
    const noseDist = ship.model.hullLength * 0.5 + 16;
    const noseX = ship.x + Math.cos(ship.angle) * noseDist;
    const noseY = ship.y + Math.sin(ship.angle) * noseDist;

    if (ship.domain === 'land') {
      const landPolys = [
        ...this.state.islands.map(i => i.points),
        ...(this.state.bridges || []).map(b => b.points),
      ];
      const noseClr = getLandClearance(noseX, noseY, landPolys);
      if (!noseClr.onLand || noseClr.distanceToWater < 14) {
        immediateBlocked = true;
        nearestNormX = noseClr.inwardNx;
        nearestNormY = noseClr.inwardNy;
      }
    } else if (ship.domain === 'water') {
      for (const island of this.state.islands) {
        const pDist = getPointPolygonDistance(noseX, noseY, island.points);
        if (pDist.isInside || pDist.distance < 18) {
          immediateBlocked = true;
          nearestNormX = pDist.normalX;
          nearestNormY = pDist.normalY;
          break;
        }
      }
    }

    if (isStuckByTimer || (immediateBlocked && Math.abs(ship.speed) < 16 && ship.targetSpeedLevel > 0)) {
      // Trigger Unstuck Reverse Recovery Maneuver!
      ship.recoveryTimer = 2.0; // ~1.2s reverse, ~0.8s turn forward
      ship.stuckTimer = 0;

      const normX = nearestNormX || ship.lastCollisionNormalX || -Math.cos(ship.angle);
      const normY = nearestNormY || ship.lastCollisionNormalY || -Math.sin(ship.angle);
      const pushAngle = Math.atan2(normY, normX);
      const relAngle = this.normalizeAngle(pushAngle - ship.angle);

      // Rudder direction chosen to pivot rear away from the collision obstacle
      ship.recoverySteer = relAngle >= 0 ? 1 : -1;
      ship.targetSpeedLevel = -1; // Put vehicle into REVERSE
      ship.rudderAngle = ship.recoverySteer;
      return;
    }

    const centerX = this.state.arenaWidth * 0.5;
    const centerY = this.state.arenaHeight * 0.5;

    // 1. ARENA BOUNDARY REPULSION (TOP PRIORITY)
    const boundarySafetyMargin = 320;
    let avoidX = 0;
    let avoidY = 0;

    if (ship.x < boundarySafetyMargin) {
      avoidX += (boundarySafetyMargin - ship.x) / boundarySafetyMargin;
    } else if (ship.x > this.state.arenaWidth - boundarySafetyMargin) {
      avoidX -= (ship.x - (this.state.arenaWidth - boundarySafetyMargin)) / boundarySafetyMargin;
    }

    if (ship.y < boundarySafetyMargin) {
      avoidY += (boundarySafetyMargin - ship.y) / boundarySafetyMargin;
    } else if (ship.y > this.state.arenaHeight - boundarySafetyMargin) {
      avoidY -= (ship.y - (this.state.arenaHeight - boundarySafetyMargin)) / boundarySafetyMargin;
    }

    // Look-ahead probe directly forward
    const forwardProbeDist = 240;
    const probeX = ship.x + Math.cos(ship.angle) * forwardProbeDist;
    const probeY = ship.y + Math.sin(ship.angle) * forwardProbeDist;

    if (probeX < 140) avoidX += 1.8;
    else if (probeX > this.state.arenaWidth - 140) avoidX -= 1.8;
    if (probeY < 140) avoidY += 1.8;
    else if (probeY > this.state.arenaHeight - 140) avoidY -= 1.8;

    const avoidMag = Math.hypot(avoidX, avoidY);
    if (avoidMag > 0.15) {
      const safeAngle = Math.atan2(avoidY, avoidX);
      const diff = this.normalizeAngle(safeAngle - ship.angle);

      ship.rudderAngle = diff > 0 ? 1 : -1;
      ship.targetSpeedLevel = 2;
      return;
    }

    // 1b. PROACTIVE SHORELINE, CORNER & DEAD-END DETECTION FOR LAND VEHICLES
    if (ship.domain === 'land') {
      const landPolys = [
        ...this.state.islands.map(i => i.points),
        ...(this.state.bridges || []).map(b => b.points),
      ];
      const forwardProbeDist = 135;
      const probeX = ship.x + Math.cos(ship.angle) * forwardProbeDist;
      const probeY = ship.y + Math.sin(ship.angle) * forwardProbeDist;

      const fwdClr = getLandClearance(probeX, probeY, landPolys);
      const curClr = getLandClearance(ship.x, ship.y, landPolys);

      // Evaluate fan of rays to detect corners and dead-end spits of land
      if (!fwdClr.onLand || curClr.distanceToWater < 22) {
        const leftProbeAngle = ship.angle - 0.58;
        const rightProbeAngle = ship.angle + 0.58;
        const leftProbeX = ship.x + Math.cos(leftProbeAngle) * 110;
        const leftProbeY = ship.y + Math.sin(leftProbeAngle) * 110;
        const rightProbeX = ship.x + Math.cos(rightProbeAngle) * 110;
        const rightProbeY = ship.y + Math.sin(rightProbeAngle) * 110;

        const leftClr = getLandClearance(leftProbeX, leftProbeY, landPolys);
        const rightClr = getLandClearance(rightProbeX, rightProbeY, landPolys);

        const wideLeftAngle = ship.angle - 1.15;
        const wideRightAngle = ship.angle + 1.15;
        const wideLeftX = ship.x + Math.cos(wideLeftAngle) * 90;
        const wideLeftY = ship.y + Math.sin(wideLeftAngle) * 90;
        const wideRightX = ship.x + Math.cos(wideRightAngle) * 90;
        const wideRightY = ship.y + Math.sin(wideRightAngle) * 90;

        const wideLeftClr = getLandClearance(wideLeftX, wideLeftY, landPolys);
        const wideRightClr = getLandClearance(wideRightX, wideRightY, landPolys);

        // DEAD END / TRAPPED CORNER: Center, left, and right all reach water
        if (!fwdClr.onLand && !leftClr.onLand && !rightClr.onLand) {
          ship.recoveryTimer = 2.0;
          ship.stuckTimer = 0;
          ship.targetSpeedLevel = -1; // Reverse gear to back out of corner
          ship.recoverySteer = wideLeftClr.onLand ? -1 : (wideRightClr.onLand ? 1 : 1);
          ship.rudderAngle = ship.recoverySteer;
          return;
        }

        // Steer toward the safest open land
        if (leftClr.onLand && !rightClr.onLand) {
          ship.rudderAngle = -1;
        } else if (rightClr.onLand && !leftClr.onLand) {
          ship.rudderAngle = 1;
        } else if (leftClr.distanceToWater > rightClr.distanceToWater + 10) {
          ship.rudderAngle = -1;
        } else if (rightClr.distanceToWater > leftClr.distanceToWater + 10) {
          ship.rudderAngle = 1;
        } else {
          // Both shallow: use wide probes
          ship.rudderAngle = wideLeftClr.distanceToWater >= wideRightClr.distanceToWater ? -1 : 1;
        }
        ship.targetSpeedLevel = curClr.distanceToWater < 15 ? 1 : 2;
        return;
      }
    }

    // 2. MULTI-RAY PROACTIVE OBSTACLE & CUL-DE-SAC AVOIDANCE (FOR WATER SHIPS)
    if (ship.domain === 'water') {
      const islandLookAhead = 280;
      const centerProbeX = ship.x + Math.cos(ship.angle) * islandLookAhead;
      const centerProbeY = ship.y + Math.sin(ship.angle) * islandLookAhead;

      const leftProbeAngle = ship.angle - 0.50;
      const leftProbeX = ship.x + Math.cos(leftProbeAngle) * 210;
      const leftProbeY = ship.y + Math.sin(leftProbeAngle) * 210;

      const rightProbeAngle = ship.angle + 0.50;
      const rightProbeX = ship.x + Math.cos(rightProbeAngle) * 210;
      const rightProbeY = ship.y + Math.sin(rightProbeAngle) * 210;

      let obstacleAvoidAngle: number | null = null;
      let obstacleCloseDistance = Infinity;

      for (const island of this.state.islands) {
        const distCenter = getPointPolygonDistance(centerProbeX, centerProbeY, island.points);
        const safetyDist = Math.max(70, ship.model.hullWidth * 1.25);

        if (distCenter.isInside || distCenter.distance < safetyDist) {
          obstacleCloseDistance = distCenter.distance;
          const distLeft = getPointPolygonDistance(leftProbeX, leftProbeY, island.points);
          const distRight = getPointPolygonDistance(rightProbeX, rightProbeY, island.points);

          // DEAD END / CUL-DE-SAC: If both left and right directions are blocked by island coastlines
          if (
            (distLeft.isInside || distLeft.distance < safetyDist * 0.75) &&
            (distRight.isInside || distRight.distance < safetyDist * 0.75)
          ) {
            ship.recoveryTimer = 2.2;
            ship.stuckTimer = 0;
            ship.targetSpeedLevel = -1; // Reverse gear to back out of cul-de-sac
            ship.recoverySteer = distLeft.distance > distRight.distance ? -1 : 1;
            ship.rudderAngle = ship.recoverySteer;
            return;
          }

          if (distLeft.distance > distRight.distance + 15) {
            obstacleAvoidAngle = -1; // Steer left into open waterway
          } else if (distRight.distance > distLeft.distance + 15) {
            obstacleAvoidAngle = 1; // Steer right into open waterway
          } else {
            const normalAngle = Math.atan2(distCenter.normalY, distCenter.normalX);
            const diff = this.normalizeAngle(normalAngle - ship.angle);
            obstacleAvoidAngle = diff > 0 ? 1 : -1;
          }
          break;
        }
      }

      if (obstacleAvoidAngle !== null) {
        ship.rudderAngle = obstacleAvoidAngle;
        if (obstacleCloseDistance < 50) {
          ship.targetSpeedLevel = 0;
        } else {
          ship.targetSpeedLevel = 1;
        }
        return;
      }
    }

    // 3. TACTICAL ENGAGEMENT NAVIGATION & PATHFINDING AROUND OBSTACLES
    let navTargetX = target.x;
    let navTargetY = target.y;

    if (ship.domain === 'water') {
      // Intelligent island bypass waypoint
      let nearestIsland: BattleIsland | null = null;
      let minIslandDist = Infinity;

      for (const island of this.state.islands) {
        const dSeg = distancePointToSegment(island.x, island.y, ship.x, ship.y, navTargetX, navTargetY);
        if (dSeg.dist < island.radius + 75) {
          const dShip = Math.hypot(island.x - ship.x, island.y - ship.y);
          if (dShip < minIslandDist) {
            minIslandDist = dShip;
            nearestIsland = island;
          }
        }
      }

      if (nearestIsland) {
        // Calculate tangent waypoints around the island
        const angleToIsland = Math.atan2(nearestIsland.y - ship.y, nearestIsland.x - ship.x);
        const bypassRadius = nearestIsland.radius + Math.max(140, ship.model.hullWidth * 2.2);

        const p1x = nearestIsland.x + Math.cos(angleToIsland + Math.PI * 0.55) * bypassRadius;
        const p1y = nearestIsland.y + Math.sin(angleToIsland + Math.PI * 0.55) * bypassRadius;
        const p2x = nearestIsland.x + Math.cos(angleToIsland - Math.PI * 0.55) * bypassRadius;
        const p2y = nearestIsland.y + Math.sin(angleToIsland - Math.PI * 0.55) * bypassRadius;

        const d1 = Math.hypot(target.x - p1x, target.y - p1y) + Math.hypot(ship.x - p1x, ship.y - p1y);
        const d2 = Math.hypot(target.x - p2x, target.y - p2y) + Math.hypot(ship.x - p2x, ship.y - p2y);

        const chosenP = d1 < d2 ? { x: p1x, y: p1y } : { x: p2x, y: p2y };
        navTargetX = chosenP.x;
        navTargetY = chosenP.y;
      }
    } else if (ship.domain === 'land') {
      // Bridge routing for land vehicles navigating across water
      const landPolys = [
        ...this.state.islands.map(i => i.points),
        ...(this.state.bridges || []).map(b => b.points),
      ];
      // Multi-sample line to target: detect invalid paths crossing water
      let crossesWater = false;
      const samples = 6;
      for (let s = 1; s < samples; s++) {
        const ratio = s / samples;
        const testX = ship.x + (target.x - ship.x) * ratio;
        const testY = ship.y + (target.y - ship.y) * ratio;
        const testClr = getLandClearance(testX, testY, landPolys);
        if (!testClr.onLand) {
          crossesWater = true;
          break;
        }
      }

      if (crossesWater && this.state.bridges && this.state.bridges.length > 0) {
        let bestBridge: BattleBridge | null = null;
        let bestBridgeScore = Infinity;
        for (const bridge of this.state.bridges) {
          const dToB1 = Math.hypot(ship.x - bridge.x1, ship.y - bridge.y1);
          const dToB2 = Math.hypot(ship.x - bridge.x2, ship.y - bridge.y2);
          const closerEntrance = dToB1 < dToB2 ? { x: bridge.x1, y: bridge.y1 } : { x: bridge.x2, y: bridge.y2 };
          const furtherEntrance = dToB1 < dToB2 ? { x: bridge.x2, y: bridge.y2 } : { x: bridge.x1, y: bridge.y1 };

          const routeDist = Math.hypot(ship.x - closerEntrance.x, ship.y - closerEntrance.y) +
                            Math.hypot(target.x - furtherEntrance.x, target.y - furtherEntrance.y);
          if (routeDist < bestBridgeScore) {
            bestBridgeScore = routeDist;
            bestBridge = bridge;
          }
        }

        if (bestBridge) {
          const d1 = Math.hypot(ship.x - bestBridge.x1, ship.y - bestBridge.y1);
          const d2 = Math.hypot(ship.x - bestBridge.x2, ship.y - bestBridge.y2);
          if (Math.min(d1, d2) < 110) {
            const exit = d1 < d2 ? { x: bestBridge.x2, y: bestBridge.y2 } : { x: bestBridge.x1, y: bestBridge.y1 };
            navTargetX = exit.x;
            navTargetY = exit.y;
          } else {
            const entrance = d1 < d2 ? { x: bestBridge.x1, y: bestBridge.y1 } : { x: bestBridge.x2, y: bestBridge.y2 };
            navTargetX = entrance.x;
            navTargetY = entrance.y;
          }
        }
      }
    }

    // Tactical escort and screening behavior
    if (ship.tacticalRole === 'defender') {
      const friendlyLead = this.state.ships.find(s => s.team === ship.team && s.id !== ship.id && !s.isSunk);
      if (friendlyLead && Math.hypot(friendlyLead.x - ship.x, friendlyLead.y - ship.y) > 380) {
        // Form up into screening formation
        navTargetX = (friendlyLead.x + target.x) * 0.5;
        navTargetY = (friendlyLead.y + target.y) * 0.5;
      }
    }

    // 4. COMBAT MANEUVERING & TACTICAL ENGAGEMENT
    const dx = navTargetX - ship.x;
    const dy = navTargetY - ship.y;
    const angleToTarget = Math.atan2(dy, dx);
    const angleDiff = this.normalizeAngle(angleToTarget - ship.angle);
    const hasBroadsides = ship.model.hardpoints.some(hp => hp.allowedArc.startsWith('broadside'));
    const idealRange = hasBroadsides ? 360 : 280;

    if (minDist > idealRange + 140) {
      ship.targetSpeedLevel = 2;
      ship.rudderAngle = Math.max(-1, Math.min(1, angleDiff * 2));
    } else if (minDist < idealRange - 90) {
      // Aircraft maintain high flight speed and break away; surface units slow to maneuver
      ship.targetSpeedLevel = ship.domain === 'air' ? 2 : 1;
      ship.rudderAngle = angleDiff > 0 ? -1 : 1;
    } else {
      if (hasBroadsides) {
        const portAngle = this.normalizeAngle(ship.angle - Math.PI / 2);
        const starboardAngle = this.normalizeAngle(ship.angle + Math.PI / 2);

        const portProbeDist = Math.hypot(
          ship.x + Math.cos(portAngle) * 150 - centerX,
          ship.y + Math.sin(portAngle) * 150 - centerY
        );
        const starProbeDist = Math.hypot(
          ship.x + Math.cos(starboardAngle) * 150 - centerX,
          ship.y + Math.sin(starboardAngle) * 150 - centerY
        );

        const diffPort = Math.abs(this.normalizeAngle(angleToTarget - portAngle));
        const diffStar = Math.abs(this.normalizeAngle(angleToTarget - starboardAngle));

        const scorePort = diffPort + (portProbeDist > starProbeDist ? 0.7 : 0);
        const scoreStar = diffStar + (starProbeDist > portProbeDist ? 0.7 : 0);

        const chosenBroadside = scorePort < scoreStar ? portAngle : starboardAngle;
        const broadsideDiff = this.normalizeAngle(angleToTarget - chosenBroadside);

        ship.rudderAngle = Math.max(-0.85, Math.min(0.85, broadsideDiff * 2));
        ship.targetSpeedLevel = ship.domain === 'air' ? 2 : 1;
      } else {
        ship.rudderAngle = Math.max(-1, Math.min(1, angleDiff * 2));
        ship.targetSpeedLevel = ship.domain === 'air' ? 2 : (minDist > 200 ? 1 : 0);
      }
    }

    // 5. Deliberate NPC gunnery & firing with velocity lead & fair visible engagement guard
    this.executeNpcGunnery(ship, target, minDist, dt);
  }

  private executeNpcGunnery(ship: ShipEntity, target: ShipEntity, minDist: number, dt: number) {
    ship.aiFireTimer = (ship.aiFireTimer || 0) - dt;
    if (ship.aiFireTimer > 0) return;

    // Check weapon effective range
    const maxRange = ship.stats.effectiveRange || 580;
    if (minDist > maxRange * 1.1) {
      ship.aiFireTimer = 0.25;
      return;
    }

    const projSpeed = 500;
    const travelTime = Math.min(1.2, minDist / projSpeed);

    // Balanced accuracy and predictive lead for both allied and enemy NPCs
    const leadFactor = 0.65;
    const jitter = 16;
    const aimX = target.x + target.vx * travelTime * leadFactor + (Math.random() - 0.5) * jitter;
    const aimY = target.y + target.vy * travelTime * leadFactor + (Math.random() - 0.5) * jitter;

    const didFire = this.fireShipWeapons(ship, aimX, aimY);
    if (didFire) {
      ship.aiFireTimer = 0.45 + Math.random() * 0.35;
    } else {
      // Rapid retry if waiting for turret turn or arc alignment
      ship.aiFireTimer = 0.15 + Math.random() * 0.15;
    }
  }

  public fireShipWeapons(ship: ShipEntity, targetX: number, targetY: number): boolean {
    if (ship.isSunk) return false;
    if (isNaN(targetX) || isNaN(targetY)) return false;

    let firedAny = false;

    // Determine target category
    const targetTeam = ship.team === 'player' ? 'enemy' : 'player';
    const hostiles = this.state.ships.filter(s => s.team === targetTeam && !s.isSunk);
    let nearestHostile: ShipEntity | null = null;
    let minD = Infinity;
    for (const h of hostiles) {
      const d = Math.hypot(h.x - targetX, h.y - targetY);
      if (d < minD && d < 220) {
        minD = d;
        nearestHostile = h;
      }
    }

    const targetIsAirborne = nearestHostile ? nearestHostile.domain === 'air' : false;

    for (const hardpoint of ship.model.hardpoints) {
      const compId = ship.config.equippedComponents[hardpoint.id];
      if (!compId) continue;

      const comp = COMPONENT_MAP.get(compId);
      if (!comp || comp.damage <= 0 || comp.reloadTime <= 0) continue;

      // NPC target domain gating: NPCs only fire air weapons at airborne targets and surface weapons at surface targets
      if (!ship.isPlayer) {
        const compDomain = comp.targetDomain || 'surface';
        if (targetIsAirborne && compDomain === 'surface' && ship.hasAirWeapons) {
          continue;
        }
        if (!targetIsAirborne && compDomain === 'air' && ship.hasSurfaceWeapons) {
          continue;
        }
      } else if (ship.isPlayer && ship.hasAirWeapons && ship.hasSurfaceWeapons && ship.weaponTargetMode) {
        // Player focus gating when vehicle carries mixed weapons (dual-capable vehicles)
        const coversSurface = comp.targetDomain === 'surface' || comp.targetDomain === 'both' || (!comp.targetDomain && !comp.isAirTargeting);
        const coversAir = comp.targetDomain === 'air' || comp.targetDomain === 'both' || !!comp.isAirTargeting;

        // When in Air Focus, hold fire on surface-only weapons
        if (ship.weaponTargetMode === 'air' && !coversAir) {
          continue;
        }
        // When in Surface Focus, hold fire on air-only weapons
        if (ship.weaponTargetMode === 'surface' && !coversSurface) {
          continue;
        }
      }

      const remainingCd = ship.cooldowns[hardpoint.id] || 0;
      if (remainingCd > 0) continue;

      const localForward = hardpoint.x * (ship.model.hullLength * 0.5);
      const localSide = hardpoint.y * (ship.model.hullWidth * 0.5);

      const cos = Math.cos(ship.angle);
      const sin = Math.sin(ship.angle);
      const hpWorldX = ship.x + localForward * cos - localSide * sin;
      const hpWorldY = ship.y + localForward * sin + localSide * cos;

      const rawDist = Math.hypot(targetX - hpWorldX, targetY - hpWorldY);
      if (rawDist < 1) continue;

      const angleToTarget = Math.atan2(targetY - hpWorldY, targetX - hpWorldX);
      const relAngle = this.normalizeAngle(angleToTarget - ship.angle);

      let inArc = false;
      if (ship.isPlayer) {
        // Generous, responsive player firing arcs so turrets and weapon mounts can track and fire freely
        if (hardpoint.allowedArc === 'all') {
          inArc = true;
        } else if (hardpoint.allowedArc === 'bow') {
          inArc = Math.abs(relAngle) <= Math.PI * 0.88; // 316-degree forward sweep
        } else if (hardpoint.allowedArc === 'stern') {
          inArc = Math.abs(relAngle) >= Math.PI * 0.12; // wide rear hemisphere
        } else if (hardpoint.allowedArc === 'broadside-left') {
          inArc = relAngle < 0.15; // port hemisphere + forward overlap
        } else if (hardpoint.allowedArc === 'broadside-right') {
          inArc = relAngle > -0.15; // starboard hemisphere + forward overlap
        } else {
          inArc = true;
        }
      } else {
        if (hardpoint.allowedArc === 'all') {
          inArc = true;
        } else if (hardpoint.allowedArc === 'bow') {
          inArc = Math.abs(relAngle) <= Math.PI * 0.80;
        } else if (hardpoint.allowedArc === 'stern') {
          inArc = Math.abs(relAngle) >= Math.PI * 0.20;
        } else if (hardpoint.allowedArc === 'broadside-left') {
          inArc = relAngle < 0.10 && relAngle > -Math.PI * 0.95;
        } else if (hardpoint.allowedArc === 'broadside-right') {
          inArc = relAngle > -0.10 && relAngle < Math.PI * 0.95;
        } else {
          inArc = true;
        }
      }

      if (!inArc) continue;

      // NPCs don't waste shots beyond effective weapon range
      if (!ship.isPlayer && rawDist > comp.range * 1.15) {
        continue;
      }

      // Trajectory calculation: projectiles fire outward toward the target up to maximum weapon range.
      const isArcedMortar = comp.projectileType === 'mortar';
      const flightDist = isArcedMortar ? Math.max(160, Math.min(rawDist, comp.range)) : comp.range;
      const endTargetX = hpWorldX + Math.cos(angleToTarget) * flightDist;
      const endTargetY = hpWorldY + Math.sin(angleToTarget) * flightDist;

      // Weapon fired! Reset cooldown
      ship.cooldowns[hardpoint.id] = comp.reloadTime;
      firedAny = true;

      const count = comp.projectilesPerShot || 1;

      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * (comp.spreadAngle || 0.05);
        const fireAngle = angleToTarget + spread;
        const vx = Math.cos(fireAngle) * comp.projectileSpeed;
        const vy = Math.sin(fireAngle) * comp.projectileSpeed;

        const projLife = flightDist / comp.projectileSpeed;
        // Projectiles spawn directly from the hardpoint turret with minimal muzzle offset
        const muzzleOffset = 10;
        const spawnX = hpWorldX + Math.cos(fireAngle) * muzzleOffset;
        const spawnY = hpWorldY + Math.sin(fireAngle) * muzzleOffset;

        this.state.projectiles.push({
          id: `proj-${this.nextId++}`,
          x: spawnX,
          y: spawnY,
          startX: spawnX,
          startY: spawnY,
          targetX: endTargetX,
          targetY: endTargetY,
          vx,
          vy,
          damage: comp.damage,
          splashRadius: comp.splashRadius || 0,
          type: comp.projectileType as Projectile['type'],
          team: ship.team,
          sourceShipId: ship.id,
          life: 0,
          maxLife: Math.max(0.4, projLife),
          color: comp.color,
          targetDomain: comp.targetDomain || 'surface',
          altitude: ship.domain === 'air' ? 65 : (comp.targetDomain === 'air' ? 50 : 0),
        });

        if (ship.isPlayer) {
          this.state.stats.shotsFired++;
        }
      }

      // Muzzle flash particle effect right at the weapon hardpoint
      const muzzleX = hpWorldX + Math.cos(angleToTarget) * 12;
      const muzzleY = hpWorldY + Math.sin(angleToTarget) * 12;
      this.addParticle({
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(angleToTarget) * 40 + (Math.random() - 0.5) * 15,
        vy: Math.sin(angleToTarget) * 40 + (Math.random() - 0.5) * 15,
        life: 0.25,
        maxLife: 0.25,
        size: 6 + Math.random() * 4,
        color: comp.projectileType === 'railgun' ? '#93c5fd' : '#fdba74',
        type: 'spark',
      });

      // Sound dispatch
      if (comp.projectileType === 'railgun') sounds.playCannonShot('railgun');
      else if (comp.projectileType === 'missile') sounds.playCannonShot('missile');
      else if (comp.projectileType === 'swivel' || comp.projectileType === 'flak') sounds.playCannonShot('swivel');
      else if (comp.projectileType === 'torpedo') sounds.playCannonShot('torpedo');
      else sounds.playCannonShot('heavy');
    }

    return firedAny;
  }

  private updateProjectiles(dt: number) {
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const p = this.state.projectiles[i];
      p.life += dt;

      const prevX = p.x;
      const prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Missile rocket exhaust trail
      if (p.type === 'missile' && Math.random() < 0.7) {
        this.addParticle({
          x: p.x - p.vx * 0.02,
          y: p.y - p.vy * 0.02,
          vx: -p.vx * 0.1 + (Math.random() - 0.5) * 20,
          vy: -p.vy * 0.1 + (Math.random() - 0.5) * 20,
          life: 0.35,
          maxLife: 0.35,
          size: 4 + Math.random() * 4,
          color: '#f97316',
          type: 'smoke',
        });
      }

      // Railgun plasma discharge trail
      if (p.type === 'railgun') {
        this.addParticle({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 25,
          vy: (Math.random() - 0.5) * 25,
          life: 0.25,
          maxLife: 0.25,
          size: 3,
          color: '#60a5fa',
          type: 'plasma',
        });
      }

      // Torpedo water wake
      if (p.type === 'torpedo' && Math.random() < 0.6) {
        this.addParticle({
          x: p.x,
          y: p.y,
          vx: -p.vx * 0.1,
          vy: -p.vy * 0.1,
          life: 0.45,
          maxLife: 0.45,
          size: 3,
          color: '#ffffff',
          type: 'wake',
        });
      }

      // Check collision with ships
      let collided = false;
      for (const ship of this.state.ships) {
        if (ship.team === p.team || ship.isSunk) continue;

        // Torpedoes are strictly water weapons and cannot hit aircraft or land vehicles
        if (p.type === 'torpedo' && ship.domain !== 'water') {
          continue;
        }

        // Mortar / slow low-angle ground artillery cannot hit high-speed high-altitude aircraft
        if (p.type === 'mortar' && ship.domain === 'air') {
          continue;
        }

        // Swept line-segment collision from previous frame position to current frame position
        const seg = distancePointToSegment(ship.x, ship.y, prevX, prevY, p.x, p.y);
        const dist = Math.min(seg.dist, Math.hypot(ship.x - p.x, ship.y - p.y));

        // Generous physical hit radius based on vehicle dimensions
        const hitRadius = Math.max(30, Math.max(ship.model.hullLength, ship.model.hullWidth) * 0.48);

        if (dist <= hitRadius || (p.splashRadius > 0 && p.life >= p.maxLife && dist <= p.splashRadius + hitRadius)) {
          collided = true;
          this.applyHit(ship, p);
          break;
        }

        // Check collision against attached trailer
        if (ship.towedTrailer && ship.domain === 'land') {
          const tr = ship.towedTrailer;
          const trSeg = distancePointToSegment(tr.x, tr.y, prevX, prevY, p.x, p.y);
          const trDist = Math.min(trSeg.dist, Math.hypot(tr.x - p.x, tr.y - p.y));
          const trRadius = Math.max(22, tr.def.length * 0.48);
          if (trDist <= trRadius || (p.splashRadius > 0 && p.life >= p.maxLife && trDist <= p.splashRadius + trRadius)) {
            collided = true;
            tr.currentHp = Math.max(0, tr.currentHp - p.damage);
            this.addParticle({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 60,
              vy: (Math.random() - 0.5) * 60,
              life: 0.35,
              maxLife: 0.35,
              size: 5,
              color: '#f59e0b',
              type: 'spark',
            });
            sounds.playHit(false);
            if (tr.currentHp <= 0) {
              this.state.combatLog.unshift({
                id: `log-${this.nextId++}`,
                text: `${ship.name}'s towed trailer was destroyed in combat!`,
                time: this.state.time,
                team: ship.team,
              });
              ship.towedTrailer = undefined;
            }
            break;
          }
        }
      }

      // Check collision with islands:
      // Aerial, ballistic, and missile projectiles fly through the air above ground and water.
      // Underwater torpedoes cannot navigate across dry land; they detonate upon hitting an island shoreline.
      if (!collided && p.type === 'torpedo') {
        for (const island of this.state.islands) {
          if (isPointInPolygon(p.x, p.y, island.points)) {
            collided = true;
            this.addParticle({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 35,
              vy: (Math.random() - 0.5) * 35,
              life: 0.5,
              maxLife: 0.5,
              size: 6,
              color: '#64748b',
              type: 'spark',
            });
            sounds.playWaterSplash();
            break;
          }
        }
      }

      // Expired without hit or exploded
      if (p.life >= p.maxLife || collided) {
        if (!collided) {
          this.state.ripples.push({
            x: p.x,
            y: p.y,
            radius: 4,
            maxRadius: 30,
            alpha: 0.8,
          });
          sounds.playWaterSplash();
        }
        this.state.projectiles.splice(i, 1);
      }
    }
  }

  private applyHit(ship: ShipEntity, projectile: Projectile) {
    const reduction = Math.min(0.65, ship.stats.armorRating / 100);
    const finalDamage = Math.round(projectile.damage * (1 - reduction));

    ship.currentHp = Math.max(0, ship.currentHp - finalDamage);
    ship.idleTimer = 0; // reset repair countdown

    if (projectile.sourceShipId === this.state.playerShipId) {
      this.state.stats.damageDealt += finalDamage;
      this.state.stats.shotsHit++;
    }

    const fatal = ship.currentHp <= 0;
    sounds.playHit(fatal);

    const debrisCount = fatal ? 18 : 8;
    for (let i = 0; i < debrisCount; i++) {
      this.addParticle({
        x: projectile.x,
        y: projectile.y,
        vx: (Math.random() - 0.5) * 140,
        vy: (Math.random() - 0.5) * 140,
        life: 0.6,
        maxLife: 0.6,
        size: 3 + Math.random() * 5,
        color: Math.random() < 0.6 ? '#475569' : '#f97316',
        type: 'spark',
      });
    }

    this.state.ripples.push({
      x: projectile.x,
      y: projectile.y,
      radius: 6,
      maxRadius: 45,
      alpha: 0.9,
    });

    if (fatal) {
      this.sinkShip(ship, projectile.sourceShipId);
    }
  }

  private sinkShip(ship: ShipEntity, killerId?: string) {
    if (ship.isSunk) return;
    ship.isSunk = true;
    ship.speed = 0;
    ship.targetSpeedLevel = 0;

    const killer = this.state.ships.find(s => s.id === killerId);
    const killerName = killer ? killer.name : 'Concentrated Fire';

    if (killer?.isPlayer) {
      this.state.stats.shipsSunk++;
    }

    this.addCombatLog(
      `${ship.name} (${ship.team === 'player' ? 'Allied' : 'Hostile'}) was destroyed by ${killerName}!`,
      ship.team === 'player' ? 'enemy' : 'player'
    );

    this.state.ripples.push({
      x: ship.x,
      y: ship.y,
      radius: 15,
      maxRadius: 90,
      alpha: 1.0,
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const part = this.state.particles[i];
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;

      if (part.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }

    for (let i = this.state.ripples.length - 1; i >= 0; i--) {
      const r = this.state.ripples[i];
      r.radius += 25 * dt;
      r.alpha -= 0.6 * dt;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.state.ripples.splice(i, 1);
      }
    }
  }

  public addParticle(particle: Particle) {
    if (this.state.particles.length > 250) {
      this.state.particles.shift();
    }
    this.state.particles.push(particle);
  }

  public addCombatLog(text: string, team: Team) {
    this.state.combatLog.unshift({
      id: `log-${this.nextId++}`,
      text,
      time: Math.round(this.state.time),
      team,
    });
    if (this.state.combatLog.length > 15) {
      this.state.combatLog.pop();
    }
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}
