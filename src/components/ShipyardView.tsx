import React, { useState, useEffect } from 'react';
import { BaseShipModel, CustomShipConfig, GameMode, SavedShipProfile, TrailerType } from '../types/ship';
import { BASE_SHIPS, SHIP_MODEL_MAP } from '../data/shipModels';
import { calculateShipStats, SHIP_PRESETS, getDomainPalettes } from '../utils/shipStats';
import { getSavedShips, saveShipProfile, deleteSavedShipProfile } from '../utils/savedShips';
import { TRAILERS, TRAILER_MAP } from '../data/trailers';
import { ShipDeckBlueprint } from './ShipDeckBlueprint';
import { ComponentPicker } from './ComponentPicker';
import { MapSelector } from './MapSelector';
import { SavedShipsModal } from './SavedShipsModal';
import {
  Bookmark,
  Compass,
  Crosshair,
  Flag,
  Gauge,
  Play,
  Radio,
  Save,
  Shield,
  Swords,
  Users,
  Volume2,
  VolumeX,
  Zap,
  Check,
  Truck,
  Rocket,
  Bomb,
  Wrench,
  ShieldAlert,
  Plane,
  Anchor
} from 'lucide-react';
import { sounds } from '../audio/soundEffects';

interface ShipyardViewProps {
  playerConfig: CustomShipConfig;
  onUpdateConfig: (newConfig: CustomShipConfig) => void;
  shipsPerTeam: number;
  onChangeShipsPerTeam: (count: number) => void;
  selectedMapId: string;
  onSelectMap: (mapId: string) => void;
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  onLaunchBattle: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ShipyardView: React.FC<ShipyardViewProps> = ({
  playerConfig,
  onUpdateConfig,
  shipsPerTeam,
  onChangeShipsPerTeam,
  selectedMapId,
  onSelectMap,
  gameMode,
  onSelectGameMode,
  onLaunchBattle,
  soundEnabled,
  onToggleSound,
}) => {
  const currentModel = SHIP_MODEL_MAP.get(playerConfig.baseModelId) || BASE_SHIPS[0];
  const [selectedHardpointId, setSelectedHardpointId] = useState<string | null>(
    currentModel.hardpoints[0]?.id || null
  );
  const [savedShips, setSavedShips] = useState<SavedShipProfile[]>(() => getSavedShips());
  const [isSavedFleetModalOpen, setIsSavedFleetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<'all' | 'land' | 'water' | 'air'>('all');

  const stats = calculateShipStats(currentModel, playerConfig);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectModel = (model: BaseShipModel) => {
    // Retain or initialize hardpoints
    const newEquipped: Record<string, string> = {};
    model.hardpoints.forEach(hp => {
      newEquipped[hp.id] = playerConfig.equippedComponents[hp.id] || hp.defaultComponentId || 'm256-120mm-cannon';
    });

    const targetPalettes = getDomainPalettes(model.domain);
    const hasCurrentPalette = targetPalettes.some(p => p.primary.toLowerCase() === playerConfig.primaryColor?.toLowerCase());
    const nextPrimary = hasCurrentPalette ? playerConfig.primaryColor : targetPalettes[0].primary;
    const nextAccent = hasCurrentPalette ? playerConfig.accentColor : targetPalettes[0].accent;

    onUpdateConfig({
      ...playerConfig,
      baseModelId: model.id,
      primaryColor: nextPrimary,
      accentColor: nextAccent,
      equippedComponents: newEquipped,
      trailerId: model.domain === 'land' ? (playerConfig.trailerId || model.defaultTrailerId || 'none') : 'none',
    });
    setSelectedHardpointId(model.hardpoints[0]?.id || null);
    sounds.playCannonShot('swivel');
  };

  const handleSelectTrailer = (trailerId: TrailerType) => {
    if (currentModel.domain !== 'land') {
      showToast('Trailers are exclusively available for Land Vehicles.');
      return;
    }
    onUpdateConfig({
      ...playerConfig,
      trailerId,
    });
    sounds.playCannonShot('swivel');
    const tr = TRAILER_MAP.get(trailerId);
    showToast(tr ? `Equipped: ${tr.name}` : 'Trailer detached (Max Speed)');
  };

  const handleEquipComponent = (componentId: string) => {
    if (!selectedHardpointId) return;
    onUpdateConfig({
      ...playerConfig,
      equippedComponents: {
        ...playerConfig.equippedComponents,
        [selectedHardpointId]: componentId,
      },
    });
    sounds.playCannonShot('swivel');
  };

  const handleUnequipComponent = () => {
    if (!selectedHardpointId) return;
    const updated = { ...playerConfig.equippedComponents };
    delete updated[selectedHardpointId];
    onUpdateConfig({
      ...playerConfig,
      equippedComponents: updated,
    });
  };

  const handleApplyPreset = (preset: typeof SHIP_PRESETS[0]) => {
    onUpdateConfig({
      ...preset.config,
    });
    const model = SHIP_MODEL_MAP.get(preset.config.baseModelId) || BASE_SHIPS[0];
    setSelectedHardpointId(model.hardpoints[0]?.id || null);
    sounds.playCannonShot('mortar');
    showToast(`Loaded preset: ${preset.name}`);
  };

  // Save / Load ship configuration handlers
  const handleQuickSaveShip = () => {
    const name = playerConfig.name || 'Custom Armored Vehicle';
    const updated = saveShipProfile(playerConfig, name);
    setSavedShips(updated);
    sounds.playCannonShot('swivel');
    showToast(`Saved "${name}" to your garage!`);
  };

  const handleSaveShipWithName = (customName?: string) => {
    const updated = saveShipProfile(playerConfig, customName);
    setSavedShips(updated);
    showToast(`Saved "${customName || playerConfig.name}" to your garage!`);
  };

  const handleLoadSavedShip = (config: CustomShipConfig) => {
    onUpdateConfig(config);
    const model = SHIP_MODEL_MAP.get(config.baseModelId) || BASE_SHIPS[0];
    setSelectedHardpointId(model.hardpoints[0]?.id || null);
    showToast(`Loaded "${config.name}" into Motor Pool!`);
  };

  const handleDeleteSavedShip = (profileId: string) => {
    const updated = deleteSavedShipProfile(profileId);
    setSavedShips(updated);
  };

  const selectedHardpoint = currentModel.hardpoints.find(h => h.id === selectedHardpointId) || null;
  const currentlyEquippedId = selectedHardpoint ? playerConfig.equippedComponents[selectedHardpoint.id] || null : null;
  const activeTrailerId: TrailerType = playerConfig.trailerId || (currentModel.canTowTrailer ? (currentModel.defaultTrailerId || 'none') : 'none');

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-600 selection:text-stone-950">
      {/* Top Navbar */}
      <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 text-stone-950 shadow-md border border-amber-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 fill-stone-950 stroke-stone-950" />
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-100 flex items-center gap-2 tracking-tight">
                <span>Air-Land-Water Battles</span>
                <span className="text-[10px] uppercase font-mono font-bold bg-stone-900 text-amber-400 px-2 py-0.5 rounded border border-stone-700">
                  Command HQ
                </span>
              </h1>
              <p className="text-xs text-stone-400">
                Design, arm, and command land vehicles, naval warships, and combat aircraft in combined arms warfare
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Saved Vehicles Garage Button */}
            <button
              onClick={() => setIsSavedFleetModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
              title="View and load your saved combat vehicles"
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>Saved Garage</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-amber-300">
                {savedShips.length}
              </span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center gap-1.5 text-xs cursor-pointer"
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>

            {/* Launch Battle Primary Action */}
            <button
              onClick={onLaunchBattle}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>Deploy Division</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-amber-500/80 text-amber-200 text-xs font-medium shadow-2xl flex items-center gap-2 backdrop-blur-md">
          <Check className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col gap-6">
        
        {/* Step 1: Base Modern Vehicle Models Row */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 lg:p-5 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
                <span>Select Combat Vehicle Chassis & Role</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Diverse designs: Main battle tanks, HIMARS missile carriers, agile recon buggies, armed technical pickups, patrol cruisers, self-propelled howitzers, IFVs, and heavy prime movers.
              </p>
            </div>

            {/* Quick Presets Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline">Build Presets:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
                {SHIP_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => handleApplyPreset(preset)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition whitespace-nowrap cursor-pointer"
                  >
                    {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Domain Filter Pills */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800 overflow-x-auto">
            <span className="text-xs font-mono text-zinc-400">Domain:</span>
            <button
              onClick={() => setDomainFilter('all')}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                domainFilter === 'all'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <span>All Spheres</span>
              <span className="text-[10px] opacity-75 font-mono">({BASE_SHIPS.length})</span>
            </button>
            <button
              onClick={() => setDomainFilter('land')}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                domainFilter === 'land'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Land Armor</span>
              <span className="text-[10px] opacity-75 font-mono">({BASE_SHIPS.filter(m => m.domain === 'land').length})</span>
            </button>
            <button
              onClick={() => setDomainFilter('water')}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                domainFilter === 'water'
                  ? 'bg-cyan-500 text-zinc-950 font-bold shadow'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <Anchor className="w-3.5 h-3.5" />
              <span>Naval Warships</span>
              <span className="text-[10px] opacity-75 font-mono">({BASE_SHIPS.filter(m => m.domain === 'water').length})</span>
            </button>
            <button
              onClick={() => setDomainFilter('air')}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                domainFilter === 'air'
                  ? 'bg-sky-400 text-zinc-950 font-bold shadow'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Combat Aircraft</span>
              <span className="text-[10px] opacity-75 font-mono">({BASE_SHIPS.filter(m => m.domain === 'air').length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8 gap-2.5">
            {BASE_SHIPS.filter(m => domainFilter === 'all' || m.domain === domainFilter).map(model => {
              const isSelected = model.id === currentModel.id;
              return (
                <div
                  key={model.id}
                  onClick={() => handleSelectModel(model)}
                  className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-100 line-clamp-1">{model.name}</span>
                      <span className="text-[10px] font-mono text-amber-400 px-1.5 py-0.5 bg-zinc-950 rounded border border-zinc-800">
                        {model.hardpoints.length} Slots
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                      <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${
                        model.domain === 'air'
                          ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                          : model.domain === 'water'
                          ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
                          : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      }`}>
                        {model.domain === 'air' ? '✈ AIR' : model.domain === 'water' ? '⚓ WATER' : '🪖 LAND'}
                      </span>
                      <span className="text-[9px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {model.chassisType?.toUpperCase() || (model.domain === 'air' ? 'AIRFRAME' : 'HULL')}
                      </span>
                      {model.canTowTrailer && (
                        <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                          TOW HITCH
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-300">
                    <span>HP: {model.baseHp}</span>
                    <span>{model.baseSpeed} km/h</span>
                    <span>Arm: {model.baseArmor}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 2: Customization Grid (Blueprint + Armory + Stats) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left / Center: Interactive Modern Vehicle Blueprint (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
              {/* Vehicle Name, Save Button & Camo Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Command Vehicle Callout
                    </label>
                    <button
                      type="button"
                      onClick={handleQuickSaveShip}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Save this customized vehicle"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Build</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={playerConfig.name}
                      onChange={(e) => onUpdateConfig({ ...playerConfig, name: e.target.value })}
                      maxLength={28}
                      placeholder="e.g. M1A2 Vanguard..."
                      className="w-full bg-zinc-800/90 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      {currentModel.domain === 'land' ? 'Armor Camouflage (Land)' : currentModel.domain === 'water' ? 'Naval Coating (Water)' : 'Tactical Livery (Air)'}
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {getDomainPalettes(currentModel.domain).find(p => p.primary.toLowerCase() === playerConfig.primaryColor?.toLowerCase())?.name || 'Custom Service Paint'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                    {getDomainPalettes(currentModel.domain).map(p => {
                      const isSelected = playerConfig.primaryColor?.toLowerCase() === p.primary.toLowerCase();
                      return (
                        <button
                          key={p.name}
                          onClick={() => onUpdateConfig({ ...playerConfig, primaryColor: p.primary, accentColor: p.accent })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer relative ${
                            isSelected ? 'scale-115 border-white shadow-md ring-2 ring-amber-500/50' : 'border-zinc-700/60 hover:scale-105'
                          }`}
                          style={{ backgroundColor: p.primary }}
                          title={`${p.name}${p.description ? ` - ${p.description}` : ''}`}
                        >
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/90">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Interactive Modern Vehicle Chassis Blueprint Canvas */}
              <ShipDeckBlueprint
                model={currentModel}
                config={playerConfig}
                selectedHardpointId={selectedHardpointId}
                onSelectHardpoint={setSelectedHardpointId}
              />
            </div>
          </div>

          {/* Right: Armory & Component Picker (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Real-time Vehicle Performance Overview Cards */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono mb-3 flex items-center justify-between">
                <span>Vehicle Combat Capabilities & Ballistics</span>
                <span className="text-emerald-400 lowercase font-mono">{currentModel.name} chassis</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Armor HP</span>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-300">{stats.maxHp}</div>
                  <div className="text-[9px] text-slate-500 font-mono">base {currentModel.baseHp}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>Top Speed</span>
                  </div>
                  <div className="text-base font-bold font-mono text-amber-300">{stats.speed} <span className="text-xs font-normal">km/h</span></div>
                  <div className="text-[9px] text-slate-500 font-mono">base {currentModel.baseSpeed}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Traverse</span>
                  </div>
                  <div className="text-base font-bold font-mono text-cyan-300">{stats.turnRate} <span className="text-xs font-normal">rad/s</span></div>
                  <div className="text-[9px] text-slate-500 font-mono">pivot agility</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                    <Zap className="w-3.5 h-3.5 text-rose-400" />
                    <span>Firepower</span>
                  </div>
                  <div className="text-base font-bold font-mono text-rose-300">{stats.firepowerDps} <span className="text-xs font-normal">DPS</span></div>
                  <div className="text-[9px] text-slate-500 font-mono">all batteries</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                    <Crosshair className="w-3.5 h-3.5 text-purple-400" />
                    <span>Max Reach</span>
                  </div>
                  <div className="text-base font-bold font-mono text-purple-300">{stats.effectiveRange} <span className="text-xs font-normal">m</span></div>
                  <div className="text-[9px] text-slate-500 font-mono">artillery radius</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>ERA Armor</span>
                  </div>
                  <div className="text-base font-bold font-mono text-sky-300">{stats.armorRating}%</div>
                  <div className="text-[9px] text-slate-500 font-mono">ballistic absorb</div>
                </div>
              </div>
            </div>

            {/* Component Picker List */}
            <div className="flex-1">
              <ComponentPicker
                selectedHardpoint={selectedHardpoint}
                currentlyEquippedId={currentlyEquippedId}
                vehicleDomain={currentModel.domain}
                onEquipComponent={handleEquipComponent}
                onUnequipComponent={handleUnequipComponent}
              />
            </div>
          </div>
        </div>

        {/* Step 3: Towed Tactical Trailer Equipment (Exclusive to Land Vehicles) */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 text-xs flex items-center justify-center font-bold">3</span>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Tactical Towed Trailer Equipment</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                    {currentModel.domain === 'land' ? 'Land Vehicle Hitching' : 'Land Vehicles Exclusive'}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {currentModel.domain === 'land'
                  ? 'Attach an automated support trailer towed behind your land vehicle. Trailers follow via physics hitching and automatically fire heavy weapons or provide support auras.'
                  : 'Trailers are exclusively engineered for Land Combat Vehicles. Aircraft and naval vessels operate with specialized internal propulsors and aeronaval weapons without rear tow bars.'}
              </p>
            </div>

            {currentModel.domain === 'land' ? (
              <div className="text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                Active Hitch:{' '}
                <strong className="text-amber-400">
                  {activeTrailerId === 'none' ? 'No Trailer (Max Speed)' : TRAILER_MAP.get(activeTrailerId)?.name}
                </strong>
              </div>
            ) : (
              <div className="text-xs font-mono text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800/50">
                Tow Hitch: <strong className="text-amber-300">Unavailable for {currentModel.domain.toUpperCase()}</strong>
              </div>
            )}
          </div>

          {currentModel.domain === 'land' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Option 0: No Trailer */}
            <div
              onClick={() => handleSelectTrailer('none')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                activeTrailerId === 'none'
                  ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/40 ring-1 ring-amber-500'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">No Trailer</span>
                  </div>
                  {activeTrailerId === 'none' && (
                    <span className="text-[9px] font-mono font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  No towed payload. Retains 100% engine speed and optimal agility for close-range maneuvering.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/50 text-[10px] font-mono text-emerald-400">
                +0% Speed Penalty
              </div>
            </div>

            {/* Trailer Options */}
            {TRAILERS.map(trailer => {
              const isSelected = activeTrailerId === trailer.id;
              const renderTrailerIcon = () => {
                switch (trailer.category) {
                  case 'missile': return <Rocket className="w-4 h-4 text-orange-400" />;
                  case 'artillery': return <Bomb className="w-4 h-4 text-amber-400" />;
                  case 'defense': return <ShieldAlert className="w-4 h-4 text-emerald-400" />;
                  case 'support': return trailer.repairRate ? <Wrench className="w-4 h-4 text-teal-400" /> : <Radio className="w-4 h-4 text-indigo-400" />;
                  default: return <Truck className="w-4 h-4 text-cyan-400" />;
                }
              };

              return (
                <div
                  key={trailer.id}
                  onClick={() => handleSelectTrailer(trailer.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/40 ring-1 ring-amber-500'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                          {renderTrailerIcon()}
                        </div>
                        <span className="text-xs font-bold text-slate-200 line-clamp-1">{trailer.name.split(' ')[0]}</span>
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-mono font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                          TOWING
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 block w-fit mb-1.5">
                      {trailer.category}
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                      {trailer.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 flex flex-col gap-1 text-[10px] font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>HP: {trailer.hp}</span>
                      {trailer.damage > 0 ? (
                        <span className="text-rose-400">{trailer.damage} Dmg</span>
                      ) : (
                        <span className="text-teal-400">{trailer.repairRate ? `+${trailer.repairRate} HP/s` : 'Radar/ECM'}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Range: {trailer.range}m</span>
                      <span className="text-amber-400">-{Math.round((1 - trailer.speedPenalty) * 100)}% Spd</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

        {/* Step 4: Combat Theater (Map Selector) */}
        <MapSelector
          selectedMapId={selectedMapId}
          onSelectMap={onSelectMap}
        />

        {/* Step 5: Mission Rules of Engagement */}
        <section className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">5</span>
              <h3 className="text-sm font-bold text-stone-100">Mission Rules of Engagement</h3>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-stone-800 px-2.5 py-0.5 rounded border border-stone-700">
              Combined Arms Annihilation
            </span>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/60 bg-stone-900/80 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500 text-stone-950">
                  <Swords className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-100">Combined Arms Tactical Annihilation</h4>
                  <span className="text-[10px] text-amber-400 font-mono">Standard Combat Engagement</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded">
                ACTIVE DIRECTIVE
              </span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Full-spectrum combined arms engagement. Command your forces across bridges, water passages, and land masses. Coordinate air support, direct naval fire, flank hostile armor, and destroy all enemy combatants.
            </p>

            <div className="mt-3 pt-2.5 border-t border-stone-800 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>Objective: Neutralize Hostile Battlegroup</span>
              <span className="text-amber-400">100% Hostiles Destroyed = Victory</span>
            </div>
          </div>
        </section>

        {/* Step 6: Battle Formation & Launch Banner */}
        <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-zinc-800 text-amber-400 border border-zinc-700 mt-1">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">6</span>
                <h3 className="text-sm font-bold text-zinc-100">Armored Formation & Team Size</h3>
              </div>
              <p className="text-xs text-zinc-300 mt-1 max-w-xl leading-relaxed">
                Both forces field symmetrical armored divisions. Your custom vehicle commands Allied Team Blue, accompanied by varied modern NPC armored fighting vehicles and towed artillery against a hostile battlegroup.
              </p>

              {/* Team Size Selector Buttons */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-zinc-400 font-mono">Vehicles per team:</span>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <button
                    key={num}
                    onClick={() => onChangeShipsPerTeam(num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      shipsPerTeam === num
                        ? 'bg-amber-600 text-zinc-950 shadow-md font-bold'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                    }`}
                  >
                    {num} vs {num} ({num * 2} vehicles)
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-end gap-2">
            <button
              onClick={onLaunchBattle}
              className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-zinc-950 font-bold text-base shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                Deploy {gameMode === 'area-control' ? 'Sector Assault' : 'Armored Clash'} ({shipsPerTeam}v{shipsPerTeam})
              </span>
            </button>
            <span className="text-[11px] text-zinc-400 font-mono">
              {gameMode === 'area-control' ? 'Capture & Hold Enemy Sector Omega' : 'Eliminate All Hostile Vehicles'}
            </span>
          </div>
        </section>

      </main>

      {/* Saved Ships Management Drawer / Modal */}
      <SavedShipsModal
        isOpen={isSavedFleetModalOpen}
        onClose={() => setIsSavedFleetModalOpen(false)}
        currentConfig={playerConfig}
        savedShips={savedShips}
        onLoadShip={handleLoadSavedShip}
        onSaveShip={handleSaveShipWithName}
        onDeleteShip={handleDeleteSavedShip}
      />
    </div>
  );
};
