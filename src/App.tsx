/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BattleSettings, CustomShipConfig } from './types/ship';
import { SHIP_PRESETS } from './utils/shipStats';
import { ShipyardView } from './components/ShipyardView';
import { BattleView } from './components/BattleView';
import { sounds } from './audio/soundEffects';

const STORAGE_KEY_CONFIG = 'naval_architect_custom_ship';
const STORAGE_KEY_SETTINGS = 'naval_architect_settings';

export default function App() {
  const [view, setView] = useState<'shipyard' | 'battle'>('shipyard');

  // Load custom ship from localStorage or default to Broadside Sovereign
  const [playerConfig, setPlayerConfig] = useState<CustomShipConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SHIP_PRESETS[0].config;
  });

  // Battle settings (shipsPerTeam, autoFire, sound, etc.)
  const [settings, setSettings] = useState<BattleSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      shipsPerTeam: 3, // 3 vs 3 by default (equal ships per team)
      autoFire: false,
      soundEnabled: true,
      gameSpeed: 1,
      selectedMapId: 'strait-archipelago',
      gameMode: 'fleet-battle',
    };
  });

  // Persist config
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(playerConfig));
    } catch {
      // ignore
    }
  }, [playerConfig]);

  // Persist settings and sync audio
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
    sounds.enabled = settings.soundEnabled;
  }, [settings]);

  const handleUpdateConfig = (newConfig: CustomShipConfig) => {
    setPlayerConfig(newConfig);
  };

  const handleUpdateSettings = (partial: Partial<BattleSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  const handleChangeShipsPerTeam = (count: number) => {
    const clamped = Math.max(1, Math.min(8, count));
    handleUpdateSettings({ shipsPerTeam: clamped });
    sounds.playCannonShot('swivel');
  };

  const handleLaunchBattle = () => {
    setView('battle');
    sounds.playCannonShot('mortar');
  };

  const handleReturnToShipyard = () => {
    setView('shipyard');
  };

  const handleToggleSound = () => {
    handleUpdateSettings({ soundEnabled: !settings.soundEnabled });
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 font-sans text-slate-100">
      {view === 'shipyard' ? (
        <ShipyardView
          playerConfig={playerConfig}
          onUpdateConfig={handleUpdateConfig}
          shipsPerTeam={settings.shipsPerTeam}
          onChangeShipsPerTeam={handleChangeShipsPerTeam}
          selectedMapId={settings.selectedMapId || 'solomon-atoll'}
          onSelectMap={(mapId) => handleUpdateSettings({ selectedMapId: mapId })}
          gameMode={settings.gameMode || 'fleet-battle'}
          onSelectGameMode={(mode) => handleUpdateSettings({ gameMode: mode })}
          onLaunchBattle={handleLaunchBattle}
          soundEnabled={settings.soundEnabled}
          onToggleSound={handleToggleSound}
        />
      ) : (
        <BattleView
          playerConfig={playerConfig}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onReturnToShipyard={handleReturnToShipyard}
        />
      )}
    </div>
  );
}
