import React, { useState, useEffect } from 'react';
import { ComponentCategory, HardpointSlot, ShipComponent, VehicleDomain } from '../types/ship';
import { SHIP_COMPONENTS } from '../data/components';
import {
  Bomb,
  Compass,
  Crosshair,
  Flame,
  Gauge,
  Rocket,
  Shield,
  ShieldAlert,
  Target,
  Wrench,
  Zap,
  Check,
  Truck,
  Anchor,
  Plane,
  Lock,
  CloudFog
} from 'lucide-react';

interface ComponentPickerProps {
  selectedHardpoint: HardpointSlot | null;
  currentlyEquippedId: string | null;
  vehicleDomain?: VehicleDomain;
  onEquipComponent: (componentId: string) => void;
  onUnequipComponent: () => void;
}

export const ComponentPicker: React.FC<ComponentPickerProps> = ({
  selectedHardpoint,
  currentlyEquippedId,
  vehicleDomain = 'land',
  onEquipComponent,
  onUnequipComponent,
}) => {
  const [armoryDomain, setArmoryDomain] = useState<VehicleDomain>(vehicleDomain);
  const [filter, setFilter] = useState<'all' | ComponentCategory>('all');

  // Synchronize active armory domain whenever active vehicle domain changes
  useEffect(() => {
    setArmoryDomain(vehicleDomain);
  }, [vehicleDomain]);

  const renderIcon = (iconName: string) => {
    const props = { className: 'w-4 h-4' };
    switch (iconName) {
      case 'Bomb': return <Bomb {...props} />;
      case 'Crosshair': return <Crosshair {...props} />;
      case 'Target': return <Target {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Rocket': return <Rocket {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'Shield': return <Shield {...props} />;
      case 'ShieldAlert': return <ShieldAlert {...props} />;
      case 'Gauge': return <Gauge {...props} />;
      case 'Compass': return <Compass {...props} />;
      case 'Wrench': return <Wrench {...props} />;
      case 'Anchor': return <Anchor {...props} />;
      case 'CloudFog': return <CloudFog {...props} />;
      default: return <Zap {...props} />;
    }
  };

  // Filter components by Armory Domain & Subcategory
  const filteredComponents = SHIP_COMPONENTS.filter(comp => {
    // Check domain restriction: component must either belong to this domain or be shared
    const isDomainMatch = comp.allowedDomains ? comp.allowedDomains.includes(armoryDomain) : true;
    if (!isDomainMatch) return false;

    if (filter === 'all') return true;
    return comp.category === filter;
  });

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-700/70 p-4 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Exclusive Tactical Armory</span>
              {selectedHardpoint && (
                <span className="text-xs font-mono font-normal text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Slot: {selectedHardpoint.name}
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Distinct armaments for Land, Water, and Air vehicles. Surface and Anti-Air combat payloads.
          </p>
        </div>

        {currentlyEquippedId && (
          <button
            onClick={onUnequipComponent}
            className="self-start sm:self-auto text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-800/40 transition cursor-pointer"
          >
            Clear Hardpoint Slot
          </button>
        )}
      </div>

      {/* Step 1: Armory Domain Tabs (Land, Water, Air Exclusive) */}
      <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-800/80">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider hidden sm:inline">
          Armory:
        </span>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setArmoryDomain('land')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              armoryDomain === 'land'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Land Armory</span>
            {vehicleDomain === 'land' && <span className="text-[10px] opacity-75 font-mono">(Active)</span>}
          </button>

          <button
            onClick={() => setArmoryDomain('water')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              armoryDomain === 'water'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" />
            <span>Water Armory</span>
            {vehicleDomain === 'water' && <span className="text-[10px] opacity-75 font-mono">(Active)</span>}
          </button>

          <button
            onClick={() => setArmoryDomain('air')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              armoryDomain === 'air'
                ? 'bg-sky-400 text-slate-950 font-bold shadow-md shadow-sky-400/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Air Armory</span>
            {vehicleDomain === 'air' && <span className="text-[10px] opacity-75 font-mono">(Active)</span>}
          </button>
        </div>
      </div>

      {/* Armory Domain notice if inspecting another domain */}
      {armoryDomain !== vehicleDomain && (
        <div className="my-2 p-2 rounded-lg bg-amber-950/40 border border-amber-700/40 text-[11px] text-amber-300 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Viewing <strong>{armoryDomain.toUpperCase()}</strong> armory. Weapons exclusive to {armoryDomain} cannot be equipped on your active {vehicleDomain} vehicle.
          </span>
        </div>
      )}

      {/* Subcategory Filter Pills */}
      <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto scrollbar-none text-xs">
        {(['all', 'artillery', 'missile', 'special-weapon', 'defensive', 'mobility', 'support'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2.5 py-1 rounded-lg font-medium capitalize whitespace-nowrap transition cursor-pointer ${
              filter === cat
                ? 'bg-slate-200 text-slate-950 font-bold shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat === 'all' ? 'All Weapons & Systems' : cat.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 overflow-y-auto max-h-[380px] pr-1 py-1">
        {filteredComponents.map(comp => {
          const isEquipped = currentlyEquippedId === comp.id;
          const isDomainCompatible = comp.allowedDomains ? (comp.allowedDomains as readonly VehicleDomain[]).includes(vehicleDomain as VehicleDomain) : true;

          return (
            <div
              key={comp.id}
              onClick={() => {
                if (isDomainCompatible) {
                  onEquipComponent(comp.id);
                }
              }}
              className={`group relative p-3 rounded-xl border transition-all flex flex-col justify-between ${
                !isDomainCompatible
                  ? 'opacity-55 bg-slate-900/40 border-slate-800 cursor-not-allowed'
                  : isEquipped
                    ? 'bg-amber-950/30 border-amber-500 shadow-md shadow-amber-950/30 ring-1 ring-amber-400 cursor-pointer'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 cursor-pointer'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-lg text-white shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: comp.color }}
                  >
                    {renderIcon(comp.iconName)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition">
                      {comp.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] uppercase font-mono text-slate-400">
                        {comp.category.replace('-', ' ')}
                      </span>
                      {/* Targeting Capability Badges */}
                      {comp.targetDomain === 'air' && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                          ✈️ ANTI-AIR ONLY
                        </span>
                      )}
                      {comp.targetDomain === 'both' && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                          🎯 AIR & SURFACE
                        </span>
                      )}
                      {comp.targetDomain === 'surface' && comp.damage > 0 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                          SURFACE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isEquipped ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-700/50">
                    <Check className="w-3 h-3" /> Equipped
                  </span>
                ) : !isDomainCompatible ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
                    <Lock className="w-2.5 h-2.5" /> Incompatible
                  </span>
                ) : null}
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-300 my-2 leading-relaxed line-clamp-2">
                {comp.description}
              </p>

              {/* Stats Bar */}
              <div className="pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-300">
                {comp.damage > 0 && (
                  <span className="bg-slate-900/70 px-1.5 py-0.5 rounded text-amber-300">
                    Dmg: {comp.damage}{comp.projectilesPerShot && comp.projectilesPerShot > 1 ? `x${comp.projectilesPerShot}` : ''}
                  </span>
                )}
                {comp.reloadTime > 0 && (
                  <span className="bg-slate-900/70 px-1.5 py-0.5 rounded text-sky-300">
                    Reload: {comp.reloadTime}s
                  </span>
                )}
                {comp.range > 0 && (
                  <span className="bg-slate-900/70 px-1.5 py-0.5 rounded text-emerald-300">
                    Rng: {comp.range}m
                  </span>
                )}
                {comp.bonusHp && (
                  <span className="bg-slate-900/70 px-1.5 py-0.5 rounded text-green-400">
                    +{comp.bonusHp} HP
                  </span>
                )}
                {comp.bonusSpeed && (
                  <span className="bg-slate-900/70 px-1.5 py-0.5 rounded text-yellow-400">
                    +{comp.bonusSpeed} Spd
                  </span>
                )}
                {comp.bonusTurnRate && (
                  <span className="bg-slate-900/70 px-1.5 py-0.5 rounded text-cyan-300">
                    +{Math.round(comp.bonusTurnRate * 100)}% Turn
                  </span>
                )}
                {comp.damageReduction && (
                  <span className="bg-slate-900/70 px-1.5 py-0.5 rounded text-purple-300">
                    +{Math.round(comp.damageReduction * 100)}% Armor
                  </span>
                )}
                {comp.repairRate && (
                  <span className="bg-slate-900/70 px-1.5 py-0.5 rounded text-emerald-400">
                    +{comp.repairRate} HP/s Repair
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
