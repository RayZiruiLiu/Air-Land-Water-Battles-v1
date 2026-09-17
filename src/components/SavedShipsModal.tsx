import React, { useState } from 'react';
import { CustomShipConfig, SavedShipProfile } from '../types/ship';
import { SHIP_MODEL_MAP } from '../data/shipModels';
import { COMPONENT_MAP } from '../data/components';
import { calculateShipStats } from '../utils/shipStats';
import {
  Bookmark,
  Check,
  Download,
  FileCheck,
  FolderOpen,
  Plus,
  Shield,
  Trash2,
  Upload,
  X,
  Zap
} from 'lucide-react';
import { sounds } from '../audio/soundEffects';

interface SavedShipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: CustomShipConfig;
  savedShips: SavedShipProfile[];
  onLoadShip: (config: CustomShipConfig) => void;
  onSaveShip: (customName?: string) => void;
  onDeleteShip: (profileId: string) => void;
}

export const SavedShipsModal: React.FC<SavedShipsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  savedShips,
  onLoadShip,
  onSaveShip,
  onDeleteShip,
}) => {
  const [newShipName, setNewShipName] = useState(currentConfig.name || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipName.trim()) return;
    onSaveShip(newShipName.trim());
    setSaveSuccessMsg(`"${newShipName.trim()}" saved to your fleet!`);
    sounds.playCannonShot('swivel');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleLoad = (profile: SavedShipProfile) => {
    onLoadShip(profile.config);
    sounds.playCannonShot('mortar');
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, profileId: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Remove "${name}" from saved ships?`)) {
      onDeleteShip(profileId);
      sounds.playCannonShot('swivel');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-cyan-950/50 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-800/40">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Saved Warship Fleet</span>
                <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {savedShips.length} profiles
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Save and recall your customized modern warship configurations anytime
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Current Ship Form */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40">
          <form onSubmit={handleSaveCurrent} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Save Current Configuration
              </label>
              <input
                type="text"
                value={newShipName}
                onChange={(e) => setNewShipName(e.target.value)}
                placeholder="Name your warship build..."
                maxLength={32}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="mt-auto sm:mt-0 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Ship</span>
            </button>
          </form>

          {saveSuccessMsg && (
            <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Saved Ships List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {savedShips.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No saved ships found. Customize your warship and click "Save Ship" above!
            </div>
          ) : (
            savedShips.map((profile) => {
              const model = SHIP_MODEL_MAP.get(profile.config.baseModelId);
              const stats = model ? calculateShipStats(model, profile.config) : null;
              const isCurrentlyActive = currentConfig.name === profile.name && currentConfig.baseModelId === profile.config.baseModelId;
              const equippedCount = Object.keys(profile.config.equippedComponents).length;

              return (
                <div
                  key={profile.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCurrentlyActive
                      ? 'bg-cyan-950/30 border-cyan-500/80 ring-1 ring-cyan-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Camo color preview badge */}
                    <div
                      className="w-10 h-10 rounded-xl border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                      style={{
                        backgroundColor: profile.config.primaryColor || '#1e293b',
                        borderColor: profile.config.accentColor || '#38bdf8',
                      }}
                    >
                      <Shield className="w-4 h-4 opacity-80" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{profile.name}</h4>
                        {isCurrentlyActive && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                            Active in Yard
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-amber-400 font-mono text-[11px]">{model?.name || 'Modern Warship'}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-slate-300">{equippedCount} systems fitted</span>
                        {stats && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-mono text-[11px]">{stats.maxHp} HP</span>
                            <span>•</span>
                            <span className="text-rose-400 font-mono text-[11px]">{stats.firepowerDps} DPS</span>
                          </>
                        )}
                      </div>
                      {profile.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                          {profile.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                    <button
                      onClick={() => handleLoad(profile)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Deploy / Load</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, profile.id, profile.name)}
                      className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-800/50 transition cursor-pointer"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 px-5">
          <span>Saved profiles are preserved in your browser storage</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
