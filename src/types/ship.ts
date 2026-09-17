export type WeaponArc = 'all' | 'broadside-left' | 'broadside-right' | 'bow' | 'stern';

export type VehicleDomain = 'land' | 'water' | 'air';
export type VehicleWeaponMode = 'surface' | 'air';

export type ComponentCategory =
  | 'cannon'
  | 'special-weapon'
  | 'defensive'
  | 'mobility'
  | 'support'
  | 'artillery'
  | 'missile'
  | 'electronic';

export type VehicleRole =
  | 'close-combat'
  | 'sniper-missile'
  | 'main-battle-tank'
  | 'heavy-artillery'
  | 'support-tow'
  | 'recon-skirmisher';

export type ChassisType =
  | 'tracked'
  | 'wheeled-8x8'
  | 'wheeled-6x6'
  | 'wheeled-4x4'
  | 'technical-pickup'
  | 'car-patrol'
  | 'truck-flatbed'
  | 'half-track'
  | 'dune-buggy'
  | 'armored-van';

export type VehicleBodyStyle =
  | 'tank'
  | 'pickup'
  | 'car'
  | 'flatbed'
  | 'buggy'
  | 'halftrack'
  | 'apc'
  | 'ifv'
  | 'mlrs'
  | 'sph'
  | 'recon'
  // Naval ship body styles
  | 'cutter'
  | 'corvette'
  | 'frigate'
  | 'destroyer'
  | 'cruiser'
  | 'battleship'
  | 'carrier'
  | 'submarine'
  // Aircraft airframe body styles
  | 'fighter-raptor'
  | 'fighter-lightning'
  | 'attacker-warthog'
  | 'chopper-apache'
  | 'bomber-spirit'
  | 'gunship-spectre'
  | 'bomber-lancer'
  | 'drone-reaper'
  | 'chopper';

export type TrailerType =
  | 'none'
  | 'missile-battery'     // Heavy long-range MLRS trailer
  | 'howitzer-artillery'   // 155mm field artillery trailer
  | 'ciws-gatling'        // Automated close-in Gatling defense trailer
  | 'repair-drone-rig'    // Support & field repair trailer
  | 'radar-ew-jammer';    // Electronic warfare & missile decoy trailer

export interface TrailerDef {
  id: TrailerType;
  name: string;
  category: 'missile' | 'artillery' | 'defense' | 'support';
  description: string;
  length: number;
  width: number;
  hp: number;
  color: string;
  accentColor: string;
  damage: number;
  reloadTime: number;
  range: number;
  projectileType: 'missile' | 'shell' | 'flak' | 'none';
  projectileSpeed: number;
  splashRadius?: number;
  repairRate?: number;
  electronicWarfare?: boolean;
  speedPenalty: number; // multiplier e.g. 0.88
  iconName: string;
}

export interface TrailerEntity {
  id: string;
  type: TrailerType;
  x: number;
  y: number;
  angle: number;
  currentHp: number;
  maxHp: number;
  cooldown: number;
  def: TrailerDef;
  targetAngle?: number;
}

export interface ShipComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  iconName: string;
  // Combat stats
  damage: number;          // Damage per shot/tick
  reloadTime: number;      // Seconds between shots
  range: number;           // Max firing range in pixels
  projectileSpeed: number; // Pixels per second
  projectileType: 'shell' | 'missile' | 'torpedo' | 'railgun' | 'flak' | 'cannonball' | 'mortar' | 'swivel' | 'fire' | 'none';
  spreadAngle?: number;    // In radians
  splashRadius?: number;   // Splash damage radius
  projectilesPerShot?: number;
  homing?: boolean;
  
  // Passive bonuses to ship/vehicle
  bonusHp?: number;
  bonusSpeed?: number;
  bonusTurnRate?: number;
  damageReduction?: number; // e.g. 0.15 = 15% reduction
  repairRate?: number;     // HP repaired per sec when idle
  
  // Exclusive domain restrictions and target type
  allowedDomains?: VehicleDomain[];
  targetDomain?: 'surface' | 'air' | 'both'; // 'surface' (land/water), 'air' (aircraft only), or 'both'
  isAirTargeting?: boolean;

  color: string;
}

export type VehicleComponent = ShipComponent;

export interface HardpointSlot {
  id: string;
  name: string;
  x: number; // -1 to 1 normalized offset relative to vehicle center (x = forward/stern or left/right)
  y: number; // -1 to 1 normalized offset relative to vehicle center
  allowedArc: WeaponArc;
  defaultComponentId?: string;
}

export interface BaseShipModel {
  id: string;
  name: string;
  type: string;
  domain: VehicleDomain;
  hullClass: 'DDG' | 'FFG' | 'CGN' | 'SSN' | 'BBG' | 'FSG' | 'FAC' | 'BB' | 'HSV' | 'BM' | string;
  description: string;
  hullLength: number; // length in px
  hullWidth: number;  // width in px
  baseHp: number;
  baseSpeed: number;
  baseTurnRate: number; // rad/s
  baseArmor: number;
  hardpoints: HardpointSlot[];
  svgHullPath: string;
  canTowTrailer?: boolean;
  defaultTrailerId?: TrailerType;
  chassisType?: ChassisType;
  combatRole?: VehicleRole;
  spriteStyle: {
    deckColor: string;
    hullColor: string;
    accentColor: string;
    details: string;
    bodyStyle?: VehicleBodyStyle;
    stealthFacets?: boolean;
    hasHelipad?: boolean;
    treadColor?: string;
    wheelCount?: number;
    hasTurretRing?: boolean;
    camoPattern?: 'camo' | 'solid' | 'desert' | 'urban';
  };
}

export type BaseVehicleModel = BaseShipModel;

export interface CustomShipConfig {
  name: string;
  baseModelId: string;
  primaryColor: string;
  accentColor: string;
  // Mapping hardpoint slot ID -> component ID
  equippedComponents: Record<string, string>;
  trailerId?: TrailerType;
}

export type CustomVehicleConfig = CustomShipConfig;

export interface SavedShipProfile {
  id: string;
  name: string;
  savedAt: number;
  config: CustomShipConfig;
  notes?: string;
}

export interface ShipStats {
  maxHp: number;
  speed: number;
  turnRate: number;
  firepowerDps: number;
  effectiveRange: number;
  armorRating: number;
  componentCount: number;
  towingCapacity?: boolean;
}

export type VehicleStats = ShipStats;

export type Team = 'player' | 'enemy';

export interface Projectile {
  id: string;
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  startX: number;
  startY: number;
  targetX?: number;
  targetY?: number;
  vx: number;
  vy: number;
  damage: number;
  splashRadius: number;
  type: 'shell' | 'missile' | 'torpedo' | 'railgun' | 'flak' | 'cannonball' | 'mortar' | 'swivel' | 'fire';
  team: Team;
  sourceShipId: string;
  life: number;
  maxLife: number;
  altitude?: number;
  targetDomain?: 'surface' | 'air' | 'both';
  color: string;
  homing?: boolean;
}

export interface ShipEntity {
  id: string;
  name: string;
  team: Team;
  isPlayer: boolean;
  model: BaseShipModel;
  config: CustomShipConfig;
  stats: ShipStats;
  domain: VehicleDomain;
  altitude?: number;
  weaponTargetMode?: VehicleWeaponMode;
  hasSurfaceWeapons?: boolean;
  hasAirWeapons?: boolean;
  
  // Physics & Transform
  x: number;
  y: number;
  angle: number; // in radians (0 = pointing right)
  vx: number;
  vy: number;
  speed: number;
  targetSpeedLevel: number; // -1 (reverse), 0 (stopped), 1 (standard/half), 2 (full flank speed)
  rudderAngle: number; // -1 (left) to 1 (right) steer
  
  // Combat state
  currentHp: number;
  maxHp: number;
  isSunk: boolean; // destroyed/wrecked
  sinkProgress: number; // 0 to 1 (wreck/burn progress)
  idleTimer: number;    // seconds since last taken damage (for repair)
  fireTimer: number;    // seconds on fire
  
  // Weapon cooldowns mapped by hardpointId -> remaining cooldown in seconds
  cooldowns: Record<string, number>;
  
  // Trailer system
  towedTrailer?: TrailerEntity;
  
  // AI state for NPCs
  aiTargetId?: string;
  aiState?: 'patrol' | 'chase' | 'broadside' | 'flee' | 'defend' | 'attack';
  aiDecisionTimer?: number;
  aiFireTimer?: number;
  aiWaypoint?: { x: number; y: number };
  tacticalRole?: 'attacker' | 'defender' | 'skirmisher';
  
  // Obstacle collision & unstuck reverse maneuver state
  stuckTimer?: number;
  recoveryTimer?: number;
  recoveryPhase?: 'reverse' | 'turn';
  recoverySteer?: number;
  avoidanceLockTimer?: number;
  lastCollisionNormalX?: number;
  lastCollisionNormalY?: number;
  prevCheckX?: number;
  prevCheckY?: number;
  stuckCheckTimer?: number;
}

export type VehicleEntity = ShipEntity;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'water' | 'smoke' | 'fire' | 'spark' | 'wake' | 'wood' | 'plasma' | 'exhaust' | 'rain' | 'snow' | 'ember' | 'dust';
}

export interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export type BridgeStyle =
  | 'suspension'
  | 'cable-stayed'
  | 'truss'
  | 'arch-stone'
  | 'concrete-highway'
  | 'military-pontoon'
  | 'timber-trestle'
  | 'drawbridge';

export interface BattleBridge {
  id: string;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  points: { x: number; y: number }[];
  style?: BridgeStyle;
}

export interface IslandLake {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  name?: string;
  waterColor?: string;
  points?: { x: number; y: number }[];
}

export interface IslandCanal {
  id?: string;
  name?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  waterColor?: string;
  bankColor?: string;
  points?: { x: number; y: number }[];
}

export interface BattleIsland {
  x: number;
  y: number;
  radius: number;
  points: { x: number; y: number }[];
  foliage: { x: number; y: number; radius: number; color: string; type?: 'tree' | 'ice' | 'bunker' | 'buoy' | 'vent' | 'rock' | 'crane' | 'building' | 'tower' | 'radar' }[];
  style?: 'sand' | 'ice' | 'rock' | 'harbor' | 'volcano' | 'industrial' | 'reef';
  name?: string;
  category?: 'mainland' | 'peninsula' | 'fortress' | 'spit' | 'atoll' | 'skerry' | 'delta';
  lake?: IslandLake;
  lakes?: IslandLake[];
  canals?: IslandCanal[];
}

export interface MapSpawnPoints {
  playerLand: { x: number; y: number }[];
  playerWater: { x: number; y: number }[];
  enemyLand: { x: number; y: number }[];
  enemyWater: { x: number; y: number }[];
}

export interface BattleMapConfig {
  id: string;
  name: string;
  theme: string;
  description: string;
  dimensions?: { width: number; height: number };
  waterColors: {
    deep: string;
    mid: string;
    surface: string;
    wave: string;
    boundary: string;
  };
  islandStyle: 'sand' | 'ice' | 'rock' | 'harbor' | 'volcano' | 'industrial' | 'reef';
  obstacles: BattleIsland[];
  bridges?: BattleBridge[];
  spawnPoints?: MapSpawnPoints;
  ambientWeather?: 'clear' | 'snow' | 'storm' | 'harbor' | 'magma' | 'dusk';
}

export type GameMode = 'fleet-battle';

export interface BattleSettings {
  shipsPerTeam: number; // 1 to 8
  autoFire: boolean;
  soundEnabled: boolean;
  gameSpeed: number; // 1, 1.5, 2
  selectedMapId: string;
  gameMode?: GameMode; // 'fleet-battle'
}

export interface SavedShipProfile {
  id: string;
  name: string;
  savedAt: number;
  config: CustomShipConfig;
  notes?: string;
}
