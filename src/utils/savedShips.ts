import { CustomShipConfig, SavedShipProfile } from '../types/ship';
import { BASE_SHIPS } from '../data/shipModels';

const STORAGE_KEY_SAVED_SHIPS = 'naval_architect_saved_ships';

// Initial pre-saved modern warship configurations so the user has immediate variety
export const DEFAULT_SAVED_SHIPS: SavedShipProfile[] = [
  {
    id: 'profile-arleigh-aegis',
    name: 'USS Aegis Sentinel',
    savedAt: 1715000000000,
    notes: 'Multi-mission guided-missile destroyer with Tomahawk VLS and Phalanx CIWS.',
    config: {
      name: 'USS Aegis Sentinel',
      baseModelId: 'destroyer-aegis',
      primaryColor: '#1e293b',
      accentColor: '#38bdf8',
      equippedComponents: {
        'ddg-bow-gun': 'mk45-naval-gun',
        'ddg-fwd-vls': 'vls-tomahawk',
        'ddg-mid-ssm': 'harpoon-missile',
        'ddg-mid-torp': 'mk48-torpedo',
        'ddg-mid-ciws': 'phalanx-ciws',
        'ddg-aft-ciws': 'phalanx-ciws',
        'ddg-hull-armor': 'composite-armor',
        'ddg-hull-engine': 'gas-turbine',
      },
    },
  },
  {
    id: 'profile-stealth-trimaran',
    name: 'Ghost Trimaran',
    savedAt: 1715000100000,
    notes: 'High-speed wave-piercing stealth frigate with SeaRAM missile pod and hydro-jet agility.',
    config: {
      name: 'Ghost Trimaran',
      baseModelId: 'frigate-stealth',
      primaryColor: '#0f172a',
      accentColor: '#22d3ee',
      equippedComponents: {
        'ffg-bow-gun': 'mk45-naval-gun',
        'ffg-fwd-vls': 'vls-tomahawk',
        'ffg-port-torp': 'mk48-torpedo',
        'ffg-starboard-torp': 'mk48-torpedo',
        'ffg-aft-ciws': 'searam-launcher',
        'ffg-aux-prop': 'azipod-propulsor',
      },
    },
  },
  {
    id: 'profile-hyperion-railgun',
    name: 'Hyperion Railgun Dreadnought',
    savedAt: 1715000200000,
    notes: 'Super-dreadnought fielding Mach 7 dual electromagnetic railguns and 64 VLS missile cells.',
    config: {
      name: 'Hyperion Railgun Dreadnought',
      baseModelId: 'battlecruiser-hyperion',
      primaryColor: '#111827',
      accentColor: '#818cf8',
      equippedComponents: {
        'bbg-turret-1': 'em-railgun',
        'bbg-turret-2': 'em-railgun',
        'bbg-fwd-vls': 'vls-tomahawk',
        'bbg-mid-vls': 'vls-tomahawk',
        'bbg-port-ciws': 'phalanx-ciws',
        'bbg-starboard-ciws': 'phalanx-ciws',
        'bbg-aft-ciws': 'searam-launcher',
        'bbg-aft-turret': 'em-railgun',
        'bbg-mod-armor': 'composite-armor',
        'bbg-mod-radar': 'aegis-radar',
      },
    },
  },
  {
    id: 'profile-typhoon-corvette',
    name: 'Typhoon Strike Boat',
    savedAt: 1715000300000,
    notes: 'Agile fast-attack strike craft equipped with rapid Phalanx CIWS and Harpoon anti-ship missiles.',
    config: {
      name: 'Typhoon Strike Boat',
      baseModelId: 'corvette-fast',
      primaryColor: '#1e3a8a',
      accentColor: '#60a5fa',
      equippedComponents: {
        'fac-bow-gun': 'mk45-naval-gun',
        'fac-mid-ssm': 'harpoon-missile',
        'fac-aft-ciws': 'phalanx-ciws',
        'fac-mod-engine': 'gas-turbine',
      },
    },
  },
  {
    id: 'profile-abyssal-sub',
    name: 'Leviathan Raider',
    savedAt: 1715000400000,
    notes: 'Nuclear-powered hunter-killer attack submarine with heavy Mk 48 torpedoes and Tomahawk strike missiles.',
    config: {
      name: 'Leviathan Raider',
      baseModelId: 'sub-raider',
      primaryColor: '#030712',
      accentColor: '#10b981',
      equippedComponents: {
        'ssn-bow-torp-1': 'mk48-torpedo',
        'ssn-bow-torp-2': 'mk48-torpedo',
        'ssn-mid-vls': 'vls-tomahawk',
        'ssn-aft-torp': 'mk48-torpedo',
        'ssn-hull-sonar': 'aegis-radar',
      },
    },
  },
];

export function getSavedShips(): SavedShipProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_SHIPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load saved ships from localStorage:', err);
  }

  // If none saved yet, initialize with default modern profiles
  try {
    localStorage.setItem(STORAGE_KEY_SAVED_SHIPS, JSON.stringify(DEFAULT_SAVED_SHIPS));
  } catch {
    // ignore
  }
  return DEFAULT_SAVED_SHIPS;
}

export function saveShipProfile(
  config: CustomShipConfig,
  customName?: string
): SavedShipProfile[] {
  const current = getSavedShips();
  const profileName = (customName && customName.trim()) || config.name || 'Custom Modern Warship';

  // Check if updating existing with exact same name
  const existingIdx = current.findIndex(p => p.name.toLowerCase() === profileName.toLowerCase());

  const newProfile: SavedShipProfile = {
    id: existingIdx >= 0 ? current[existingIdx].id : `ship-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: profileName,
    savedAt: Date.now(),
    config: {
      ...config,
      name: profileName,
    },
  };

  let updated: SavedShipProfile[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = newProfile;
  } else {
    updated = [newProfile, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY_SAVED_SHIPS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save ship profile:', err);
  }

  return updated;
}

export function deleteSavedShipProfile(profileId: string): SavedShipProfile[] {
  const current = getSavedShips();
  const updated = current.filter(p => p.id !== profileId);
  try {
    localStorage.setItem(STORAGE_KEY_SAVED_SHIPS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete ship profile:', err);
  }
  return updated;
}
