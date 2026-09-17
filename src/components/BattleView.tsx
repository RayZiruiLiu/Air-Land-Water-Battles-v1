import React, { useEffect, useRef, useState } from 'react';
import { BattleSettings, CustomShipConfig, ShipEntity, Team } from '../types/ship';
import { BattleEngine, BattleState } from '../game/battleEngine';
import { renderBattle } from '../game/battleRenderer';
import { COMPONENT_MAP } from '../data/components';
import {
  ArrowLeft,
  Crosshair,
  Gauge,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Swords,
  Target,
  Volume2,
  VolumeX,
  Zap,
  Truck,
  Rocket,
  Bomb,
  Wrench,
  Radio,
  ShieldAlert,
  Plane
} from 'lucide-react';
import { sounds } from '../audio/soundEffects';

interface BattleViewProps {
  playerConfig: CustomShipConfig;
  settings: BattleSettings;
  onUpdateSettings: (newSettings: Partial<BattleSettings>) => void;
  onReturnToShipyard: () => void;
}

export const BattleView: React.FC<BattleViewProps> = ({
  playerConfig,
  settings,
  onUpdateSettings,
  onReturnToShipyard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [spectatorDismissed, setSpectatorDismissed] = useState(false);
  const [spectatorTargetUnit, setSpectatorTargetUnit] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize and run Battle Engine
  useEffect(() => {
    const engine = new BattleEngine(playerConfig, settings, (updatedState) => {
      setBattleState({ ...updatedState });
    });
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [playerConfig, settings.shipsPerTeam, settings.selectedMapId, settings.gameMode]);

  // Handle Canvas Rendering & Resize
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (canvas && engine) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderBattle(ctx, engine.state, canvas.width, canvas.height);
        }
      }

      // Render Tactical Minimap
      const miniCanvas = minimapCanvasRef.current;
      if (miniCanvas && engine) {
        renderMinimap(miniCanvas, engine.state);
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || isPaused) return;

      const player = engine.getPlayerShip();
      const isDead = !player || player.isSunk;

      if (isDead) {
        // Free camera / Spectator keyboard navigation when dead
        const panSpeed = 60;
        if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'W') {
          engine.panCamera(0, -panSpeed);
          setSpectatorTargetUnit(null);
        } else if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'S') {
          engine.panCamera(0, panSpeed);
          setSpectatorTargetUnit(null);
        } else if (e.key === 'a' || e.key === 'ArrowLeft' || e.key === 'A') {
          engine.panCamera(-panSpeed, 0);
          setSpectatorTargetUnit(null);
        } else if (e.key === 'd' || e.key === 'ArrowRight' || e.key === 'D') {
          engine.panCamera(panSpeed, 0);
          setSpectatorTargetUnit(null);
        } else if (e.key === '[' || e.key === 'Tab') {
          e.preventDefault();
          engine.cycleSpectator(false);
          setSpectatorTargetUnit(engine.spectatorTargetId);
        } else if (e.key === ']') {
          e.preventDefault();
          engine.cycleSpectator(true);
          setSpectatorTargetUnit(engine.spectatorTargetId);
        } else if (e.key === '+' || e.key === '=') {
          engine.zoomCamera(1.15);
        } else if (e.key === '-' || e.key === '_') {
          engine.zoomCamera(0.85);
        } else if (e.key === 'p' || e.key === 'P') {
          setIsPaused(prev => !prev);
        }
        return;
      }

      if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'W') {
        if (!e.repeat) engine.adjustPlayerThrottle(1);
      } else if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'S') {
        if (!e.repeat) engine.adjustPlayerThrottle(-1);
      } else if (e.key === '1') {
        engine.setPlayerThrottle(1); // Half speed
      } else if (e.key === '2') {
        engine.setPlayerThrottle(2); // Full speed
      } else if (e.key === '0') {
        engine.setPlayerThrottle(0); // Stop
      } else if (e.key === 'r' || e.key === 'R') {
        engine.setPlayerThrottle(-1); // Reverse
      } else if (e.key === 'a' || e.key === 'ArrowLeft' || e.key === 'A') {
        engine.setPlayerRudder(-1);
      } else if (e.key === 'd' || e.key === 'ArrowRight' || e.key === 'D') {
        engine.setPlayerRudder(1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        engine.firePlayerWeapons();
      } else if (e.key === 't' || e.key === 'T') {
        const info = engine.getPlayerWeaponModeInfo();
        if (info.canToggle) {
          engine.togglePlayerWeaponMode();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPaused(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (
        e.key === 'a' || e.key === 'd' ||
        e.key === 'A' || e.key === 'D' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight'
      ) {
        engine.setPlayerRudder(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused]);

  // Mouse aim, fire & camera drag
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragLastPosRef.current.x;
      const dy = e.clientY - dragLastPosRef.current.y;
      dragLastPosRef.current = { x: e.clientX, y: e.clientY };
      engine.panCamera(-dx, -dy);
      setSpectatorTargetUnit(engine.spectatorTargetId);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates based on camera
    const zoom = engine.state.camera.zoom;
    const worldX = (mouseScreenX - canvas.width / 2) / zoom + engine.state.camera.x;
    const worldY = (mouseScreenY - canvas.height / 2) / zoom + engine.state.camera.y;

    engine.setMouseWorldPos(worldX, worldY);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const player = engine.getPlayerShip();
    const isDead = !player || player.isSunk;

    if (isDead || e.button === 1 || e.button === 2) {
      // Begin panning camera
      isDraggingRef.current = true;
      dragLastPosRef.current = { x: e.clientX, y: e.clientY };

      if (e.button === 0 && isDead) {
        // If clicking on or near a living ship, focus spectator on that unit
        const rect = canvas.getBoundingClientRect();
        const mouseScreenX = e.clientX - rect.left;
        const mouseScreenY = e.clientY - rect.top;
        const zoom = engine.state.camera.zoom;
        const worldX = (mouseScreenX - canvas.width / 2) / zoom + engine.state.camera.x;
        const worldY = (mouseScreenY - canvas.height / 2) / zoom + engine.state.camera.y;

        const clickedShip = engine.state.ships.find(s => !s.isSunk && Math.hypot(s.x - worldX, s.y - worldY) < 55);
        if (clickedShip) {
          engine.setSpectatorTarget(clickedShip.id);
          setSpectatorTargetUnit(clickedShip.id);
        }
      }
      return;
    }

    if (e.button === 0) {
      // Left click fire towards clicked world point
      const rect = canvas.getBoundingClientRect();
      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;

      const zoom = engine.state.camera.zoom;
      const worldX = (mouseScreenX - canvas.width / 2) / zoom + engine.state.camera.x;
      const worldY = (mouseScreenY - canvas.height / 2) / zoom + engine.state.camera.y;

      engine.setMouseWorldPos(worldX, worldY);
      engine.firePlayerWeapons(worldX, worldY);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.zoomCamera(e.deltaY < 0 ? 1.12 : 0.89);
  };

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const miniCanvas = minimapCanvasRef.current;
    const engine = engineRef.current;
    if (!miniCanvas || !engine) return;

    const rect = miniCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetWorldX = (clickX / miniCanvas.width) * engine.state.arenaWidth;
    const targetWorldY = (clickY / miniCanvas.height) * engine.state.arenaHeight;

    engine.panCamera(0, 0); // Sets isFreeCam = true
    engine.state.camera.x = Math.max(100, Math.min(engine.state.arenaWidth - 100, targetWorldX));
    engine.state.camera.y = Math.max(100, Math.min(engine.state.arenaHeight - 100, targetWorldY));
    setSpectatorTargetUnit(null);
  };

  const handleCycleSpectator = (forward: boolean) => {
    if (engineRef.current) {
      engineRef.current.cycleSpectator(forward);
      setSpectatorTargetUnit(engineRef.current.spectatorTargetId);
    }
  };

  const handleFreeRoam = () => {
    if (engineRef.current) {
      engineRef.current.setSpectatorTarget(null);
      setSpectatorTargetUnit(null);
    }
  };

  const handleRestartBattle = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      const newEngine = new BattleEngine(playerConfig, settings, (updatedState) => {
        setBattleState({ ...updatedState });
      });
      engineRef.current = newEngine;
      newEngine.start();
      setIsPaused(false);
      setSpectatorDismissed(false);
      setSpectatorTargetUnit(null);
      sounds.playCannonShot('mortar');
    }
  };

  const playerShip = battleState?.ships.find(s => s.id === battleState.playerShipId);
  const alliedShips = battleState?.ships.filter(s => s.team === 'player') || [];
  const enemyShips = battleState?.ships.filter(s => s.team === 'enemy') || [];

  const aliveAllies = alliedShips.filter(s => !s.isSunk).length;
  const aliveEnemies = enemyShips.filter(s => !s.isSunk).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Main Ocean Battle Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full h-full block ${playerShip?.isSunk ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
      />

      {/* Spectator Mode Banner when Player is Sunk */}
      {playerShip?.isSunk && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/60 shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold text-amber-300 font-mono tracking-wider">SPECTATOR MODE</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCycleSpectator(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition flex items-center gap-1"
              title="Previous surviving unit ([ or Tab)"
            >
              ◀ Prev Unit
            </button>
            <button
              onClick={() => handleCycleSpectator(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition flex items-center gap-1"
              title="Next surviving unit (])"
            >
              Next Unit ▶
            </button>
            <button
              onClick={handleFreeRoam}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                engineRef.current?.isFreeCam
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Free camera roam mode"
            >
              Free Roam
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => engineRef.current?.zoomCamera(1.15)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold cursor-pointer"
              title="Zoom In (+)"
            >
              +
            </button>
            <button
              onClick={() => engineRef.current?.zoomCamera(0.85)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold cursor-pointer"
              title="Zoom Out (-)"
            >
              -
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden md:inline-block">
            WASD / Drag mouse to scroll map • Wheel to zoom
          </span>
        </div>
      )}

      {/* Top HUD: Armored Divisions status, timer, controls */}
      <header className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Blue Team Division Roster */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-emerald-900/60 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
              <span>Allied Division</span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
                {aliveAllies}/{alliedShips.length}
              </span>
            </div>
            {/* Health indicators */}
            <div className="flex items-center gap-1.5 mt-1">
              {alliedShips.map((ship) => {
                const hpRatio = Math.max(0, ship.currentHp / ship.maxHp);
                return (
                  <div
                    key={ship.id}
                    className="w-6 h-2 rounded bg-slate-800 border border-slate-700 overflow-hidden"
                    title={`${ship.name}: ${Math.round(ship.currentHp)}/${ship.maxHp} HP`}
                  >
                    <div
                      className={`h-full transition-all ${ship.isSunk ? 'bg-slate-600' : 'bg-emerald-400'}`}
                      style={{ width: `${hpRatio * 100}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Match Info & Timer */}
        <div className="pointer-events-auto flex items-center gap-4 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 shadow-lg">
          <div className="text-center">
            <span className="text-[10px] uppercase font-mono text-cyan-400 block truncate max-w-[150px]">
              {battleState?.mapConfig?.name || 'Armored Battle'}
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-sm font-mono font-bold text-slate-100">
                {Math.floor((battleState?.time || 0) / 60)}:
                {Math.floor((battleState?.time || 0) % 60).toString().padStart(2, '0')}
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                battleState?.gameMode === 'area-control'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {battleState?.gameMode === 'area-control' ? 'SECTOR CONTROL' : 'ARMORED CLASH'}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Quick Settings Bar */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title={settings.soundEnabled ? 'Mute' : 'Unmute'}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => onUpdateSettings({ autoFire: !settings.autoFire })}
              className={`px-2 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1 cursor-pointer ${
                settings.autoFire
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle automatic firing at in-range enemies"
            >
              <Crosshair className="w-3 h-3" />
              <span>Auto-Fire</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ gameSpeed: settings.gameSpeed === 1 ? 1.5 : settings.gameSpeed === 1.5 ? 2 : 1 })}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition cursor-pointer"
              title="Game Speed"
            >
              {settings.gameSpeed}x
            </button>

            <button
              onClick={() => setShowControlsModal(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Show Tactical Controls"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onReturnToShipyard}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Motor Pool</span>
            </button>
          </div>
        </div>

        {/* Red Team Division Roster */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-rose-900/60 shadow-lg">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-rose-200">
              <span className="font-mono text-[10px] text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded">
                {aliveEnemies}/{enemyShips.length}
              </span>
              <span>Hostile Battlegroup</span>
            </div>
            {/* Health indicators */}
            <div className="flex items-center justify-end gap-1.5 mt-1">
              {enemyShips.map((ship) => {
                const hpRatio = Math.max(0, ship.currentHp / ship.maxHp);
                return (
                  <div
                    key={ship.id}
                    className="w-6 h-2 rounded bg-slate-800 border border-slate-700 overflow-hidden"
                    title={`${ship.name}: ${Math.round(ship.currentHp)}/${ship.maxHp} HP`}
                  >
                    <div
                      className={`h-full transition-all ${ship.isSunk ? 'bg-slate-600' : 'bg-rose-500'}`}
                      style={{ width: `${hpRatio * 100}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
        </div>
      </header>

      {/* Top-Right Tactical Radar / Minimap */}
      <div className="absolute top-16 right-4 z-20 pointer-events-auto bg-stone-900/90 backdrop-blur-md p-2 rounded-2xl border border-stone-700/80 shadow-2xl flex flex-col items-center">
        <div className="flex items-center justify-between w-full px-1 pb-1 text-[10px] font-mono text-stone-400">
          <span>RADAR</span>
          <span className="text-amber-400 font-semibold">Tactical Map</span>
        </div>
        <canvas
          ref={minimapCanvasRef}
          width={180}
          height={140}
          onClick={handleMinimapClick}
          className="rounded-xl border border-stone-800 bg-stone-950 block cursor-pointer hover:border-amber-500/60 transition"
          title="Click anywhere on the radar to pan camera to sector"
        />
        <span className="text-[9px] font-mono text-stone-400 mt-1">Click to jump camera</span>
      </div>

      {/* Bottom-Left Armored Vehicle Control Console */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex flex-col gap-2 max-w-sm">
        {playerShip && (
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-3.5 shadow-2xl flex flex-col gap-3">
            {/* Command Vehicle Title & Health */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-100 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-400">🎖️</span>
                  <span>{playerShip.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {playerShip.model.chassisType}
                  </span>
                </span>
                <span className="font-mono text-cyan-400">
                  {Math.round(playerShip.currentHp)} / {playerShip.maxHp} HP
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    playerShip.currentHp / playerShip.maxHp < 0.25
                      ? 'bg-rose-500 animate-pulse'
                      : playerShip.currentHp / playerShip.maxHp < 0.6
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.max(0, (playerShip.currentHp / playerShip.maxHp) * 100)}%` }}
                />
              </div>
            </div>

            {/* Towed Trailer Status Card if attached */}
            {playerShip.towedTrailer && (
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Truck className="w-3.5 h-3.5" />
                    <span>{playerShip.towedTrailer.def.name}</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    playerShip.towedTrailer.currentHp <= 0
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {playerShip.towedTrailer.currentHp <= 0 ? 'DESTROYED' : 'TOWED / ENGAGED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Trailer Integrity</span>
                  <span>{Math.round(Math.max(0, playerShip.towedTrailer.currentHp))} / {playerShip.towedTrailer.maxHp} HP</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      playerShip.towedTrailer.currentHp <= 0
                        ? 'bg-slate-600'
                        : playerShip.towedTrailer.currentHp / playerShip.towedTrailer.maxHp < 0.3
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, (playerShip.towedTrailer.currentHp / playerShip.towedTrailer.maxHp) * 100))}%`
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {playerShip.towedTrailer.def.description}
                </div>
              </div>
            )}

            {/* Throttle & Rudder Controls */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              {/* Transmission / Speed Level */}
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1">TRANSMISSION (W/S)</span>
                <div className="flex items-center gap-1">
                  {[
                    { level: -1, label: 'REV' },
                    { level: 0, label: 'STOP' },
                    { level: 1, label: 'HALF' },
                    { level: 2, label: 'MAX' },
                  ].map(btn => (
                    <button
                      key={btn.level}
                      onClick={() => engineRef.current?.setPlayerThrottle(btn.level)}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition cursor-pointer ${
                        playerShip.targetSpeedLevel === btn.level
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/50'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed gauge in km/h */}
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">GROUND SPEED</span>
                <span className="text-sm font-mono font-bold text-amber-300">
                  {Math.round(playerShip.speed * 1.5)} <span className="text-[10px] font-normal text-slate-400">km/h</span>
                </span>
              </div>
            </div>

            {/* Steering buttons for touch/mouse */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <button
                onMouseDown={() => engineRef.current?.setPlayerRudder(-1)}
                onMouseUp={() => engineRef.current?.setPlayerRudder(0)}
                className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] active:bg-emerald-600 transition cursor-pointer"
              >
                ◀ PIVOT LEFT (A)
              </button>
              <button
                onClick={() => engineRef.current?.setPlayerRudder(0)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono text-[10px] cursor-pointer"
              >
                CENTER
              </button>
              <button
                onMouseDown={() => engineRef.current?.setPlayerRudder(1)}
                onMouseUp={() => engineRef.current?.setPlayerRudder(0)}
                className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] active:bg-emerald-600 transition cursor-pointer"
              >
                PIVOT RIGHT (D) ▶
              </button>
            </div>
          </div>
        )}

        {/* Combat Log */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-2.5 max-h-24 overflow-hidden flex flex-col gap-1 text-[11px] font-mono">
          {battleState?.combatLog.slice(0, 3).map(log => (
            <div
              key={log.id}
              className={`leading-tight ${log.team === 'player' ? 'text-sky-300' : 'text-rose-300'}`}
            >
              • {log.text}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-Right Weapons Status Console */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto flex flex-col gap-2 max-w-xs">
        {playerShip && (
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-3.5 shadow-2xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span>Battery Hardpoints</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Aim: Mouse Reticle</span>
            </div>

            {/* Targeting Interface: For aircraft, land vehicles, and ships based on equipped weapons */}
            {(() => {
              const modeInfo = engineRef.current?.getPlayerWeaponModeInfo() || {
                hasSurfaceWeapons: true,
                hasAirWeapons: false,
                canToggle: false,
                currentMode: 'surface' as const,
                modeType: 'surface-only' as const,
              };

              // 1. Vehicle equipped with weapons covering both air and surface: Show toggle between Air Focus and Surface Focus
              if (modeInfo.canToggle) {
                const isAirFocus = playerShip.weaponTargetMode === 'air';
                return (
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isAirFocus 
                      ? 'bg-sky-950/40 border-sky-600/60 shadow-lg shadow-sky-950/30' 
                      : 'bg-amber-950/40 border-amber-600/60 shadow-lg shadow-amber-950/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isAirFocus ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {isAirFocus ? (
                          <Plane className="w-4 h-4" />
                        ) : (
                          <Target className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                          Targeting Focus
                        </div>
                        <div className={`text-xs font-bold font-sans ${isAirFocus ? 'text-sky-300' : 'text-amber-300'}`}>
                          {isAirFocus ? 'Air Focus' : 'Surface Focus'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => engineRef.current?.togglePlayerWeaponMode()}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isAirFocus
                          ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border-sky-500/40'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40'
                      }`}
                      title="Switch targeting focus between Air Focus and Surface Focus (Hotkey: T)"
                    >
                      <span>Switch [T]</span>
                    </button>
                  </div>
                );
              }

              // 2. Vehicle equipped ONLY with air-targeted weapons: Show Air-Targeted Only indicator (NO toggle)
              if (modeInfo.modeType === 'air-only') {
                return (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-950/30 border border-sky-800/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                        <Plane className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                          Targeting Doctrine
                        </div>
                        <div className="text-xs font-bold font-sans text-sky-300">
                          Air-Targeted Only
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-1 rounded-md bg-sky-900/40 border border-sky-700/50 text-sky-300">
                      Air Only
                    </span>
                  </div>
                );
              }

              // 3. Vehicle equipped ONLY with surface-targeted weapons: Show Surface-Targeted Only indicator (NO toggle)
              if (modeInfo.modeType === 'surface-only') {
                return (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                          Targeting Doctrine
                        </div>
                        <div className="text-xs font-bold font-sans text-amber-300">
                          Surface-Targeted Only
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-1 rounded-md bg-amber-900/40 border border-amber-700/50 text-amber-300">
                      Surface Only
                    </span>
                  </div>
                );
              }

              // 4. Fallback if no offensive weapons are equipped
              return (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-xs text-slate-400 font-mono">No Offensive Weapons Mounted</span>
                </div>
              );
            })()}

            {/* Weapon Hardpoints Battery List */}
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              {playerShip.model.hardpoints.map(hp => {
                const compId = playerShip.config.equippedComponents[hp.id];
                const comp = compId ? COMPONENT_MAP.get(compId) : null;
                const cd = playerShip.cooldowns[hp.id] || 0;
                const totalCd = comp?.reloadTime || 1;
                const progress = totalCd > 0 ? (totalCd - cd) / totalCd : 1;
                const isReady = cd <= 0;
                const isAntiAir = comp?.targetDomain === 'air' || !!comp?.isAirTargeting;
                const isDual = comp?.targetDomain === 'both';
                const isSurface = comp?.targetDomain === 'surface' || (!isAntiAir && !isDual);
                const modeInfo = engineRef.current?.getPlayerWeaponModeInfo();
                const isModeActive = modeInfo?.canToggle
                  ? (playerShip.weaponTargetMode === 'air' ? (isAntiAir || isDual) : (isSurface || isDual))
                  : true;

                return (
                  <div
                    key={hp.id}
                    className={`p-1.5 rounded-lg border flex items-center justify-between text-[11px] transition ${
                      isModeActive
                        ? 'bg-slate-800/80 border-slate-700/80'
                        : 'bg-slate-900/50 border-slate-800/60 opacity-65'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: comp?.color || '#64748b' }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200 leading-none">
                            {comp ? comp.name : 'Empty Slot'}
                          </span>
                          {comp && comp.damage > 0 && (
                            <span className={`text-[8px] font-mono px-1 py-0.2 rounded border font-bold ${
                              isDual
                                ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                                : isAntiAir
                                ? 'bg-sky-950/60 text-sky-300 border-sky-800/50'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                            }`}>
                              {isDual ? 'DUAL' : isAntiAir ? 'AA' : 'SURFACE'}
                            </span>
                          )}
                          {!isModeActive && comp && comp.damage > 0 && (
                            <span className="text-[9px] font-mono font-semibold text-amber-400/90 bg-amber-950/40 px-1 py-0.2 rounded border border-amber-800/50">
                              Standby
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {hp.name} {!isModeActive && comp && comp.damage > 0 && '(Standby)'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {comp && comp.damage > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full ${isReady ? (isModeActive ? 'bg-cyan-400' : 'bg-slate-400') : 'bg-amber-400'}`}
                              style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono font-bold ${isReady ? (isModeActive ? 'text-cyan-400' : 'text-slate-400') : 'text-slate-400'}`}>
                            {isReady ? (isModeActive ? 'READY' : 'STBY') : `${cd.toFixed(1)}s`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-mono">PASSIVE</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fire Button */}
            <button
              onClick={() => engineRef.current?.firePlayerWeapons()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>FIRE SALVO (Space / Left Click)</span>
            </button>
          </div>
        )}
      </div>

      {/* Game Over / Victory Modal */}
      {battleState?.gameOver && !spectatorDismissed && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-xl mb-4 ${
                battleState.winner === 'player'
                  ? 'bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-emerald-600/30'
                  : 'bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-rose-600/30'
              }`}
            >
              {battleState.winner === 'player' ? '🏆' : '💀'}
            </div>

            <h2 className="text-2xl font-black text-stone-100 tracking-tight">
              {battleState.winner === 'player'
                ? 'COMBAT VICTORY — ENEMY NEUTRALIZED!'
                : 'FORCES LOST IN ACTION'}
            </h2>
            <p className="text-xs text-stone-300 mt-1 mb-6 leading-relaxed">
              {battleState.winner === 'player'
                ? 'All hostile combat units have been neutralized. Your combined arms fleet demonstrated tactical superiority across the battlefield!'
                : 'All allied combat units have been neutralized. You can freely spectate the battlefield, or return to Motor Pool to refit and redeploy.'}
            </p>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono text-slate-400 block">DAMAGE DEALT</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {battleState.stats.damageDealt}
                </span>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono text-slate-400 block">VEHICLES DESTROYED</span>
                <span className="text-base font-bold font-mono text-amber-400">
                  {battleState.stats.shipsSunk}
                </span>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono text-slate-400 block">SALVOS FIRED</span>
                <span className="text-base font-bold font-mono text-slate-200">
                  {battleState.stats.shotsFired}
                </span>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono text-slate-400 block">ACCURACY</span>
                <span className="text-base font-bold font-mono text-cyan-400">
                  {battleState.stats.shotsFired > 0
                    ? `${Math.round((battleState.stats.shotsHit / battleState.stats.shotsFired) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={handleRestartBattle}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again (Rematch)</span>
                </button>

                <button
                  onClick={onReturnToShipyard}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Return to Motor Pool</span>
                </button>
              </div>

              <button
                onClick={() => setSpectatorDismissed(true)}
                className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
                title="Free roam camera across the entire battlefield"
              >
                <span>🔭</span>
                <span>Spectate Battlefield (Free Roam & Scroll Map)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Reopen Battle Debrief Pill when Spectating */}
      {battleState?.gameOver && spectatorDismissed && (
        <button
          onClick={() => setSpectatorDismissed(false)}
          className="absolute bottom-4 right-4 z-40 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-2xl cursor-pointer transition flex items-center gap-2 border border-amber-400/40"
        >
          <span>{battleState.winner === 'player' ? '🏆' : '💀'}</span>
          <span>Open Battle Debrief</span>
        </button>
      )}

      {/* Controls Help Modal */}
      {showControlsModal && (
        <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>Armored Vehicle Tactical Controls</span>
              </h3>
              <button
                onClick={() => setShowControlsModal(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5 my-4 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-300">Throttle (Transmission)</span>
                <span className="font-mono text-emerald-400 font-bold">W / S (or Up / Down)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-300">Steering & Track Traverse</span>
                <span className="font-mono text-emerald-400 font-bold">A / D (or Left / Right)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-300">Aim Weapon Turrets</span>
                <span className="font-mono text-emerald-400 font-bold">Mouse Reticle</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-300">Fire Armaments</span>
                <span className="font-mono text-emerald-400 font-bold">Left Click or Spacebar</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-300">Targeting Focus (Air / Surface)</span>
                <span className="font-mono text-cyan-400 font-bold">T (Dual-Capable Vehicles)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-300">Towed Equipment Trailer</span>
                <span className="font-mono text-amber-400 font-bold">Auto-Hitched & Towed</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-[11px] text-emerald-200">
                <span className="font-bold text-emerald-300 block mb-0.5">Sector Control Rules:</span>
                Drive into enemy Sector Omega to capture and hold it to 100% while defending Sector Alpha against advancing hostile armor.
              </div>
            </div>

            <button
              onClick={() => setShowControlsModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Back to Battle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Render mini tactical radar
function renderMinimap(canvas: HTMLCanvasElement, state: BattleState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const scaleX = w / state.arenaWidth;
  const scaleY = h / state.arenaHeight;

  // Background: deep water channel
  ctx.fillStyle = state.mapConfig?.waterColors.deep || '#031934';
  ctx.fillRect(0, 0, w, h);

  // Landmasses, islands, mesas, bunkers
  for (const island of state.islands) {
    const style = island.style || 'sand';
    ctx.fillStyle =
      style === 'ice'
        ? '#bae6fd'
        : style === 'volcano'
        ? '#78350f'
        : style === 'harbor'
        ? '#475569'
        : style === 'rock'
        ? '#57534e'
        : '#785437';
    ctx.beginPath();
    island.points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x * scaleX, pt.y * scaleY);
      else ctx.lineTo(pt.x * scaleX, pt.y * scaleY);
    });
    ctx.closePath();
    ctx.fill();

    // Render lake on minimap if present
    if (island.lake) {
      const lk = island.lake;
      ctx.save();
      ctx.fillStyle = state.mapConfig?.waterColors.deep || '#0284c7';
      ctx.beginPath();
      if (lk.points && lk.points.length > 2) {
        lk.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x * scaleX, pt.y * scaleY);
          else ctx.lineTo(pt.x * scaleX, pt.y * scaleY);
        });
        ctx.closePath();
      } else {
        ctx.ellipse(lk.x * scaleX, lk.y * scaleY, lk.radiusX * scaleX, lk.radiusY * scaleY, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  // Bridges spanning waterways
  if (state.bridges) {
    for (const bridge of state.bridges) {
      ctx.save();
      ctx.beginPath();
      bridge.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x * scaleX, pt.y * scaleY);
        else ctx.lineTo(pt.x * scaleX, pt.y * scaleY);
      });
      ctx.closePath();
      ctx.fillStyle = '#475569';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Vehicles and towed trailers
  for (const ship of state.ships) {
    if (ship.isSunk) continue;

    const sx = ship.x * scaleX;
    const sy = ship.y * scaleY;

    // Draw trailer behind vehicle on minimap if present
    if (ship.towedTrailer && ship.towedTrailer.currentHp > 0) {
      const tx = ship.towedTrailer.x * scaleX;
      const ty = ship.towedTrailer.y * scaleY;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.fillStyle = ship.isPlayer ? '#f59e0b' : ship.team === 'player' ? '#cbd5e1' : '#fca5a5';
      ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ship.angle);

    if (ship.isPlayer) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      // Heading line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
    } else if (ship.team === 'player') {
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Camera viewport box
  const camScreenW = (window.innerWidth / state.camera.zoom) * scaleX;
  const camScreenH = (window.innerHeight / state.camera.zoom) * scaleY;
  const camScreenX = (state.camera.x * scaleX) - camScreenW / 2;
  const camScreenY = (state.camera.y * scaleY) - camScreenH / 2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(camScreenX, camScreenY, camScreenW, camScreenH);
}
