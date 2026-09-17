import React from 'react';
import { BattleMapConfig } from '../types/ship';
import { BATTLE_MAPS } from '../data/battleMaps';
import { Compass, Globe, MapPin, Mountain, Shield, Waves, Wind } from 'lucide-react';
import { sounds } from '../audio/soundEffects';

interface MapSelectorProps {
  selectedMapId: string;
  onSelectMap: (mapId: string) => void;
}

export const MapSelector: React.FC<MapSelectorProps> = ({
  selectedMapId,
  onSelectMap,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 lg:p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 text-xs flex items-center justify-center font-bold">4</span>
            <span>Select Combat Theater (Battlefield Map)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deploy to diverse tactical theaters. Blast walls, sandstone ridges, collapsed city blocks, hangars, and rock terraces provide vital line-of-sight cover from incoming shells and ATGM missiles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {BATTLE_MAPS.map((map) => {
          const isSelected = map.id === selectedMapId;

          return (
            <div
              key={map.id}
              onClick={() => {
                onSelectMap(map.id);
                sounds.playCannonShot('swivel');
              }}
              className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                isSelected
                  ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/40 ring-1 ring-amber-500'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
              }`}
            >
              {/* Map Water Color Preview Banner */}
              <div
                className="h-14 -mx-3 -mt-3 mb-2.5 relative flex items-center justify-center overflow-hidden border-b border-slate-700/50"
                style={{
                  background: `linear-gradient(135deg, ${map.waterColors.deep} 0%, ${map.waterColors.surface} 100%)`,
                }}
              >
                {/* Environmental styling hint */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-sm border border-slate-700/60 text-[10px] text-slate-200 font-mono">
                  {map.islandStyle === 'ice' && <Wind className="w-3 h-3 text-sky-300" />}
                  {map.islandStyle === 'rock' && <Mountain className="w-3 h-3 text-amber-400" />}
                  {map.islandStyle === 'harbor' && <Shield className="w-3 h-3 text-slate-300" />}
                  {map.islandStyle === 'sand' && <Waves className="w-3 h-3 text-emerald-300" />}
                  {map.islandStyle === 'industrial' && <Shield className="w-3 h-3 text-amber-500" />}
                  {map.islandStyle === 'reef' && <Globe className="w-3 h-3 text-teal-300" />}
                  <span>{map.theme}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-100">{map.name}</h4>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {map.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Obstacles: {map.obstacles.length}</span>
                <span className="text-amber-400 uppercase">{map.ambientWeather || 'Clear'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
