import { BaseShipModel, CustomShipConfig, ShipStats, TrailerType, VehicleDomain } from '../types/ship';
import { BASE_SHIPS, SHIP_MODEL_MAP } from '../data/shipModels';
import { COMPONENT_MAP } from '../data/components';
import { TRAILER_MAP } from '../data/trailers';

export function calculateShipStats(model: BaseShipModel, config: CustomShipConfig): ShipStats {
  let maxHp = model.baseHp;
  let speed = model.baseSpeed;
  let turnRate = model.baseTurnRate;
  let armorRating = model.baseArmor;
  let totalDps = 0;
  let maxRange = 0;
  let componentCount = 0;

  // 1. Calculate stats from equipped components
  for (const hardpoint of model.hardpoints) {
    const compId = config.equippedComponents[hardpoint.id];
    if (!compId) continue;
    const comp = COMPONENT_MAP.get(compId);
    if (!comp) continue;

    componentCount++;

    if (comp.bonusHp) maxHp += comp.bonusHp;
    if (comp.bonusSpeed) speed += comp.bonusSpeed;
    if (comp.bonusTurnRate) turnRate += comp.bonusTurnRate;
    if (comp.damageReduction) armorRating += Math.round(comp.damageReduction * 100);

    if (comp.damage > 0 && comp.reloadTime > 0) {
      const shotsPerSec = 1 / comp.reloadTime;
      const count = comp.projectilesPerShot || 1;
      totalDps += comp.damage * count * shotsPerSec;
      if (comp.range > maxRange) {
        maxRange = comp.range;
      }
    }
  }

  // 2. Calculate trailer influence (land vehicles only)
  const trailerId = config.trailerId || (model.canTowTrailer ? model.defaultTrailerId : undefined);
  if (trailerId && trailerId !== 'none') {
    const trailer = TRAILER_MAP.get(trailerId);
    if (trailer) {
      componentCount++;
      if (model.id !== 'hauler-mammoth') {
        speed = speed * trailer.speedPenalty;
      }
      if (trailer.damage > 0 && trailer.reloadTime > 0) {
        totalDps += (trailer.damage / trailer.reloadTime);
        if (trailer.range > maxRange) {
          maxRange = trailer.range;
        }
      }
    }
  }

  return {
    maxHp: Math.round(maxHp),
    speed: Math.round(speed),
    turnRate: Number(turnRate.toFixed(2)),
    firepowerDps: Math.round(totalDps),
    effectiveRange: Math.round(maxRange),
    armorRating: Math.round(armorRating),
    componentCount,
    towingCapacity: model.canTowTrailer ?? (model.domain === 'land'),
  };
}

export const SHIP_PRESETS: { name: string; domain: 'land' | 'water' | 'air'; description: string; config: CustomShipConfig }[] = [
  // --- LAND PRESETS ---
  {
    name: 'M1A2 Vanguard Heavy Battle Tank (Land)',
    domain: 'land',
    description: 'Heavy battle tank armed with 120mm smoothbore cannon and roof anti-air SAM pod for dual-threat engagement, towing an MLRS battery.',
    config: {
      name: 'Vanguard Titan',
      baseModelId: 'mbt-vanguard',
      primaryColor: '#3f4537',
      accentColor: '#8a9a6b',
      trailerId: 'missile-battery',
      equippedComponents: {
        'hp-turret-main': 'm256-120mm-cannon',
        'hp-coax-gun': 'bushmaster-30mm',
        'hp-roof-aps': 'land-sam-patriot',
        'hp-side-missile': 'tow-atgm-missile',
        'hp-side-smoke': 'smoke-grenade-discharger',
        'hp-engine-powerpack': 'diesel-v12-turbo',
      },
    },
  },
  {
    name: 'Stryker-30 Dragoon Wheeled IFV (Land)',
    domain: 'land',
    description: 'Rapid 8x8 wheeled fighting vehicle with 30mm chain gun and anti-air flak autocannon, towing an automated Gatling defense trailer.',
    config: {
      name: 'Stryker Striker',
      baseModelId: 'ifv-stryker',
      primaryColor: '#334155',
      accentColor: '#60a5fa',
      trailerId: 'ciws-gatling',
      equippedComponents: {
        'hp-front-bushmaster': 'bushmaster-30mm',
        'hp-port-tow': 'land-gepard-flak',
        'hp-starboard-trophy': 'trophy-aps',
        'hp-rear-repairs': 'tactical-field-repairs',
        'hp-skid-suspension': 'independent-suspension',
      },
    },
  },
  {
    name: 'Hilux-D Desert Gun Truck (Land)',
    domain: 'land',
    description: 'Fast 4x4 tactical technical pickup with truck-bed minigun and passenger TOW missile, towing a field repair rig.',
    config: {
      name: 'Hilux Desert Raider',
      baseModelId: 'pickup-technical',
      primaryColor: '#5c452d',
      accentColor: '#d97706',
      trailerId: 'repair-drone-rig',
      equippedComponents: {
        'hp-bed-turret': 'm134-minigun',
        'hp-passenger-atgm': 'tow-atgm-missile',
        'hp-front-bullbar': 'chobham-reactive-armor',
        'hp-engine-turbo': 'diesel-v12-turbo',
      },
    },
  },

  // --- WATER PRESETS ---
  {
    name: 'Arleigh Burke Aegis Destroyer (Water)',
    domain: 'water',
    description: 'Premier guided missile destroyer with bow 127mm naval gun, SM-2 anti-air SAM array, and Harpoon anti-ship batteries.',
    config: {
      name: 'Aegis Sentinel',
      baseModelId: 'water-destroyer-aegis',
      primaryColor: '#334155',
      accentColor: '#60a5fa',
      equippedComponents: {
        'hp-bow-gun': 'naval-127mm-gun',
        'hp-vls-forward': 'naval-standard-sam',
        'hp-mid-harpoon': 'naval-harpoon-battery',
        'hp-aft-vls': 'naval-tomahawk-vls',
        'hp-aft-ciws': 'naval-phalanx-ciws',
        'hp-engine': 'diesel-v12-turbo',
      },
    },
  },
  {
    name: 'Iowa Dreadnought Heavy Battleship (Water)',
    domain: 'water',
    description: 'Colossal heavy battleship with triple 16-inch naval batteries, secondary 5-inch cannons, and Phalanx anti-air point defense.',
    config: {
      name: 'Dreadnought Sovereign',
      baseModelId: 'water-battleship-dread',
      primaryColor: '#292524',
      accentColor: '#f97316',
      equippedComponents: {
        'hp-turret-one': 'naval-battleship-triple',
        'hp-turret-two': 'naval-battleship-triple',
        'hp-port-secondary': 'naval-127mm-gun',
        'hp-starboard-ciws': 'naval-phalanx-ciws',
        'hp-turret-three': 'naval-battleship-triple',
        'hp-aft-sam': 'naval-standard-sam',
        'hp-boilers': 'diesel-v12-turbo',
      },
    },
  },
  {
    name: 'Visby Stealth Guided Missile Corvette (Water)',
    domain: 'water',
    description: 'Radar-absorbent angular stealth warship with concealed Harpoon missiles, Phalanx CIWS AA Gatling, and radar jamming.',
    config: {
      name: 'Visby Ghost',
      baseModelId: 'water-corvette-missile',
      primaryColor: '#1e293b',
      accentColor: '#06b6d4',
      equippedComponents: {
        'hp-bow-deckgun': 'naval-127mm-gun',
        'hp-cell-harpoon': 'naval-harpoon-battery',
        'hp-phalanx-aa': 'naval-phalanx-ciws',
        'hp-ew-stealth': 'smoke-grenade-discharger',
        'hp-turbine': 'diesel-v12-turbo',
      },
    },
  },

  // --- AIR PRESETS ---
  {
    name: 'F-22 Apex Raptor Stealth Fighter (Air)',
    domain: 'air',
    description: 'Mach 2.2 air superiority stealth jet with internal Sidewinder dogfight missiles, long-range AMRAAMs, and 30mm rotary gun.',
    config: {
      name: 'Apex Raptor',
      baseModelId: 'air-fighter-interceptor',
      primaryColor: '#475569',
      accentColor: '#38bdf8',
      equippedComponents: {
        'hp-nose-cannon': 'air-gau8-avenger',
        'hp-side-bay-left': 'air-sidewinder-aam',
        'hp-side-bay-right': 'air-sidewinder-aam',
        'hp-main-bay-amraam': 'air-amraam-bvr',
        'hp-afterburner': 'diesel-v12-turbo',
      },
    },
  },
  {
    name: 'A-10C Thunderbolt II "Warthog" (Air)',
    domain: 'air',
    description: 'Armored tank-buster armed with devastating 30mm GAU-8 Avenger Gatling, triple Hellfire racks, and heavy JDAM precision bomb.',
    config: {
      name: 'Warthog Thunder',
      baseModelId: 'air-attack-warthog',
      primaryColor: '#365314',
      accentColor: '#84cc16',
      equippedComponents: {
        'hp-nose-gau8': 'air-gau8-avenger',
        'hp-wing-hellfire-l': 'air-hellfire-rack',
        'hp-wing-hellfire-r': 'air-hellfire-rack',
        'hp-wing-jdam': 'air-jdam-heavy-bomb',
        'hp-wingtip-sidewinder': 'air-sidewinder-aam',
        'hp-twin-turbofans': 'diesel-v12-turbo',
      },
    },
  },
  {
    name: 'AH-64D Apache Combat Helicopter (Air)',
    domain: 'air',
    description: 'Tandem-seat combat gunship with chin-mounted 30mm chain gun, quad Hellfire racks, Stinger anti-air missiles, and Longbow radar.',
    config: {
      name: 'Apache Longbow',
      baseModelId: 'air-attack-helicopter',
      primaryColor: '#27272a',
      accentColor: '#f59e0b',
      equippedComponents: {
        'hp-chin-chain-gun': 'air-gau8-avenger',
        'hp-stub-wing-hellfire': 'air-hellfire-rack',
        'hp-stub-wing-aa': 'air-sidewinder-aam',
        'hp-mast-radar': 'laser-rangefinder-fcs',
        'hp-twin-turboshaft': 'diesel-v12-turbo',
      },
    },
  },
  {
    name: 'B-2 Spirit Flying Wing Stealth Bomber (Air)',
    domain: 'air',
    description: 'Heavy stealth flying wing bomber armed with twin heavy JDAM precision demolition bombs and Hellfire stand-off racks.',
    config: {
      name: 'Spirit Spectre',
      baseModelId: 'air-bomber-stealth',
      primaryColor: '#18181b',
      accentColor: '#94a3b8',
      equippedComponents: {
        'hp-bay-jdam-one': 'air-jdam-heavy-bomb',
        'hp-bay-jdam-two': 'air-jdam-heavy-bomb',
        'hp-bay-hellfire': 'air-hellfire-rack',
        'hp-bay-defense-aam': 'air-amraam-bvr',
        'hp-quad-turbofans': 'diesel-v12-turbo',
      },
    },
  },
];

const COMBINED_ARMS_NAMES = [
  'Vanguard', 'Apex', 'Titan', 'Ghost',
  'Thunderbolt', 'Wolverine', 'Aegis', 'Sovereign',
  'Raptor', 'Warthog', 'Apache', 'Spectre',
  'Cyclone', 'Seawolf', 'Lancer', 'Reaper',
  'Paladin', 'Centurion', 'Striker', 'Crusader'
];

export interface VehiclePalette {
  name: string;
  primary: string;
  accent: string;
  description?: string;
}

// Exclusive Ground Vehicle Armor Coatings (realistic, grounded camouflage and matte paints)
export const LAND_PALETTES: VehiclePalette[] = [
  { name: 'NATO 3-Color Woodland', primary: '#3d4737', accent: '#5c4b3a', description: 'Standard temperate forest camouflage' },
  { name: 'CARC Desert Coyote Tan', primary: '#8a7356', accent: '#b09675', description: 'Arid sand & desert operations' },
  { name: 'Muted Olive Drab', primary: '#444e3d', accent: '#2d3429', description: 'Classic matte field olive' },
  { name: 'Arid Steppe Sand', primary: '#796850', accent: '#958269', description: 'Dry dust & rocky scrub' },
  { name: 'Urban Armored Charcoal', primary: '#343a42', accent: '#23272d', description: 'Metropolitan low-profile tactical finish' },
  { name: 'Feldgrau Armor Slate', primary: '#495258', accent: '#2e3438', description: 'Heavy industrial panzer gray' },
  { name: 'Taiga Brushwood & Mud', primary: '#473a30', accent: '#404938', description: 'Boreal bog & mud warfare' },
  { name: 'Winter Tundra Ash', primary: '#697277', accent: '#8b9499', description: 'Subarctic permafrost & frost camo' },
];

// Exclusive Naval Warship Finishes (grounded haze gray, sea slate, anechoic black)
export const WATER_PALETTES: VehiclePalette[] = [
  { name: 'USN Standard Haze Gray', primary: '#5f6872', accent: '#3f464d', description: 'Navy fleet haze camouflage' },
  { name: 'Admiralty Pale Sea Gray', primary: '#747d86', accent: '#4d545b', description: 'North Atlantic light maritime gray' },
  { name: 'Modern Low-Vis Warship Slate', primary: '#4d565f', accent: '#353b42', description: 'Deep water low-reflectivity finish' },
  { name: 'Atlantic Deep Sea Blue-Gray', primary: '#414e5c', accent: '#2b3540', description: 'Offshore maritime deep water camo' },
  { name: 'Baltic Stealth Carbon', primary: '#272b30', accent: '#3d444b', description: 'Radar-absorbent stealth carbon finish' },
  { name: 'Arctic Coastal Frost Gray', primary: '#7f8992', accent: '#59626a', description: 'Sub-zero glacial and ice patrol' },
  { name: 'Submersible Anechoic Black', primary: '#1d1f23', accent: '#2f343a', description: 'Acoustic-dampening rubberized hull' },
  { name: 'Coastal Marine Kelp Slate', primary: '#3d4b4d', accent: '#2b3537', description: 'Shallow littoral waters camouflage' },
];

// Exclusive Combat Aircraft Finishes (grounded low-visibility tactical aviation coatings)
export const AIR_PALETTES: VehiclePalette[] = [
  { name: 'Compass Ghost Air Gray', primary: '#596570', accent: '#778390', description: 'Air superiority low-visibility haze' },
  { name: 'F-35 / F-22 RAM Stealth Charcoal', primary: '#373d44', accent: '#262a2f', description: 'Radar-absorbent stealth matrix' },
  { name: 'Euro-1 Tactical Forest Green', primary: '#394434', accent: '#433d35', description: 'Low-altitude ground support camouflage' },
  { name: 'Gunship Night Ops Slate', primary: '#2a2e33', accent: '#41474e', description: 'Special operations nocturnal matte finish' },
  { name: 'Maritime Recon Ocean Gray', primary: '#656f7b', accent: '#464f58', description: 'Naval patrol and ASW over-water gray' },
  { name: 'Aggressor Muted Desert Khaki', primary: '#6f6353', accent: '#53493e', description: 'Two-tone arid terrain combat scheme' },
  { name: 'Strategic Bomber Dark Slate', primary: '#40474f', accent: '#3b4038', description: 'High-altitude standoff strategic camo' },
  { name: 'High-Altitude Matte Black', primary: '#191b1e', accent: '#33373c', description: 'Stratospheric reconnaissance non-reflective' },
];

export function getDomainPalettes(domain: VehicleDomain): VehiclePalette[] {
  if (domain === 'land') return LAND_PALETTES;
  if (domain === 'water') return WATER_PALETTES;
  return AIR_PALETTES;
}

// Retain alias for backwards compatibility
export const MODERN_PALETTES = LAND_PALETTES;

const TRAILER_OPTIONS: TrailerType[] = [
  'missile-battery',
  'howitzer-artillery',
  'ciws-gatling',
  'repair-drone-rig',
  'radar-ew-jammer'
];

// Domain-specific model rosters
const LAND_ROSTER: string[] = [
  'mbt-vanguard',      // M1A2 Vanguard MBT
  'ifv-stryker',       // Stryker-30 Dragoon Wheeled IFV
  'pickup-technical',  // Hilux-D Desert Gun Truck
  'truck-flatbed-6x6', // Oshkosh 6x6 Heavy Logistics Truck
  'sph-crusader',      // Crusader 155mm Heavy Artillery SPH
  'apc-bearcat',       // BearCat Tactical Armored Carrier (APC)
  'car-sedan-patrol',  // Vanguard Patrol Cruiser (Armored Car)
  'buggy-osprey',      // Scorpion Fast Attack UTV Buggy
];

const AIR_ROSTER: string[] = [
  'air-fighter-interceptor', // F-22 Raptor
  'air-attack-warthog',      // A-10 Thunderbolt II
  'air-attack-helicopter',   // AH-64 Apache Gunship
  'air-fighter-multirole',   // F-35 Lightning II
  'air-drone-reaper',        // MQ-9 Reaper Drone
  'air-gunship-spectre',     // AC-130 Ghostrider
  'air-bomber-stealth',      // B-2 Spirit Stealth Bomber
  'air-bomber-supersonic',   // B-1B Lancer
];

const WATER_ROSTER: string[] = [
  'water-patrol-cutter',    // Cyclone Mark-V Interceptor Cutter
  'water-corvette-missile', // Visby Stealth Guided Missile Corvette
  'water-frigate-guided',   // Constellation Multi-Mission Guided Frigate
  'water-destroyer-aegis',  // Arleigh Burke Aegis Destroyer
  'water-cruiser-missile',  // Ticonderoga Heavy Guided Strike Cruiser
  'water-battleship-dread', // Iowa Dreadnought Heavy Battleship
  'water-carrier-assault',  // Wasp Amphibious Assault Carrier
  'water-submarine-hunter', // Seawolf Hunter-Killer Submersible
];

/**
 * Calculates domain distribution for a team of size N:
 * Balanced evenly (~1:1:1) across Land vehicles, Naval warships, and Combat aircraft.
 */
export function getTeamDomainDistribution(
  teamSize: number,
  teamSeed: number = 0
): ('land' | 'air' | 'water')[] {
  const clampedSize = Math.max(1, Math.min(8, teamSize));

  let landCount = 0;
  let shipCount = 0;
  let airCount = 0;

  switch (clampedSize) {
    case 1: {
      const domains: ('land' | 'water' | 'air')[] = ['land', 'water', 'air'];
      const pick = domains[teamSeed % 3];
      if (pick === 'land') landCount = 1;
      else if (pick === 'water') shipCount = 1;
      else airCount = 1;
      break;
    }

    case 2:
      // 1 Land, 1 Water (or alternating 1 Water, 1 Air / 1 Land, 1 Air)
      if (teamSeed % 3 === 0) {
        landCount = 1;
        shipCount = 1;
      } else if (teamSeed % 3 === 1) {
        shipCount = 1;
        airCount = 1;
      } else {
        landCount = 1;
        airCount = 1;
      }
      break;

    case 3:
      // Exact 1:1:1 parity: 1 Land, 1 Water, 1 Air
      landCount = 1;
      shipCount = 1;
      airCount = 1;
      break;

    case 4:
      // Balanced: 1 Land, 1 Water, 1 Air + 1 rotating
      if (teamSeed % 3 === 0) {
        landCount = 2;
        shipCount = 1;
        airCount = 1;
      } else if (teamSeed % 3 === 1) {
        landCount = 1;
        shipCount = 2;
        airCount = 1;
      } else {
        landCount = 1;
        shipCount = 1;
        airCount = 2;
      }
      break;

    case 5:
      // Even balance (2, 2, 1) rotating:
      if (teamSeed % 3 === 0) {
        landCount = 2;
        shipCount = 2;
        airCount = 1;
      } else if (teamSeed % 3 === 1) {
        landCount = 2;
        shipCount = 1;
        airCount = 2;
      } else {
        landCount = 1;
        shipCount = 2;
        airCount = 2;
      }
      break;

    case 6:
      // Perfect 1:1:1 parity: 2 Land, 2 Water, 2 Air
      landCount = 2;
      shipCount = 2;
      airCount = 2;
      break;

    case 7:
      // (3, 2, 2) rotating
      if (teamSeed % 3 === 0) {
        landCount = 3;
        shipCount = 2;
        airCount = 2;
      } else if (teamSeed % 3 === 1) {
        landCount = 2;
        shipCount = 3;
        airCount = 2;
      } else {
        landCount = 2;
        shipCount = 2;
        airCount = 3;
      }
      break;

    case 8:
      // (3, 3, 2) rotating
      if (teamSeed % 3 === 0) {
        landCount = 3;
        shipCount = 3;
        airCount = 2;
      } else if (teamSeed % 3 === 1) {
        landCount = 3;
        shipCount = 2;
        airCount = 3;
      } else {
        landCount = 2;
        shipCount = 3;
        airCount = 3;
      }
      break;

    default: {
      const base = Math.floor(clampedSize / 3);
      let rem = clampedSize % 3;
      landCount = base;
      shipCount = base;
      airCount = base;
      const order: ('land' | 'water' | 'air')[] = ['land', 'water', 'air'];
      let oIdx = teamSeed % 3;
      while (rem > 0) {
        if (order[oIdx] === 'land') landCount++;
        else if (order[oIdx] === 'water') shipCount++;
        else airCount++;
        oIdx = (oIdx + 1) % 3;
        rem--;
      }
      break;
    }
  }

  // Safety normalization to match clampedSize
  while (landCount + shipCount + airCount > clampedSize) {
    if (landCount > shipCount && landCount > airCount) landCount--;
    else if (shipCount > airCount) shipCount--;
    else airCount--;
  }
  while (landCount + shipCount + airCount < clampedSize) {
    if (landCount <= shipCount && landCount <= airCount) landCount++;
    else if (shipCount <= airCount) shipCount++;
    else airCount++;
  }

  // Assemble list with smooth interleaved distribution [land, water, air, land, water, air]
  const list: ('land' | 'air' | 'water')[] = [];
  let l = landCount;
  let s = shipCount;
  let a = airCount;

  // Interleave domains based on seed offset
  const domains: ('land' | 'water' | 'air')[] = ['land', 'water', 'air'];
  const startIdx = Math.abs(teamSeed) % 3;
  const orderedDomains = [
    domains[startIdx],
    domains[(startIdx + 1) % 3],
    domains[(startIdx + 2) % 3],
  ];

  while (l > 0 || s > 0 || a > 0) {
    for (const d of orderedDomains) {
      if (d === 'land' && l > 0) { list.push('land'); l--; }
      else if (d === 'water' && s > 0) { list.push('water'); s--; }
      else if (d === 'air' && a > 0) { list.push('air'); a--; }
    }
  }

  // Deterministically shuffle list based on teamSeed so order varies per session
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor((Math.abs(Math.sin(teamSeed + i * 3.7)) * 10000)) % (i + 1);
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }

  return list;
}

export interface BalancedMatchPlan {
  targetDistribution: { land: number; water: number; air: number };
  allyNpcDomains: ('land' | 'water' | 'air')[];
  enemyNpcDomains: ('land' | 'water' | 'air')[];
}

/**
 * Calculates a strictly balanced match composition for both teams:
 * Both the player team and enemy team receive the EXACT same number of Land, Water, and Air units.
 * The distribution shuffles and rotates between sessions (e.g. 2L/2W/1A vs 2L/1W/2A vs 1L/2W/2A).
 */
export function getBalancedMatchPlan(
  teamSize: number,
  playerDomain: VehicleDomain = 'land',
  sessionSeed: number = 0
): BalancedMatchPlan {
  const clampedSize = Math.max(1, Math.min(8, teamSize));

  let landCount = 0;
  let waterCount = 0;
  let airCount = 0;

  if (clampedSize === 1) {
    if (playerDomain === 'water') waterCount = 1;
    else if (playerDomain === 'air') airCount = 1;
    else landCount = 1;
  } else if (clampedSize === 2) {
    const domains: ('land' | 'water' | 'air')[] = ['land', 'water', 'air'];
    const otherDomains = domains.filter(d => d !== playerDomain);
    const companion = otherDomains[Math.abs(sessionSeed) % otherDomains.length];
    const counts = { land: 0, water: 0, air: 0 };
    counts[playerDomain]++;
    counts[companion]++;
    landCount = counts.land;
    waterCount = counts.water;
    airCount = counts.air;
  } else {
    // teamSize >= 3: Every game has a balanced combined-arms mix across all 3 domains
    const base = Math.floor(clampedSize / 3);
    const rem = clampedSize % 3;

    landCount = base;
    waterCount = base;
    airCount = base;

    // Distribute remainder evenly across domains, rotating across sessions
    const seedRot = Math.abs(sessionSeed);
    if (rem === 1) {
      const rot = seedRot % 3;
      if (rot === 0) landCount++;
      else if (rot === 1) waterCount++;
      else airCount++;
    } else if (rem === 2) {
      const rot = seedRot % 3;
      if (rot === 0) {
        landCount++;
        waterCount++;
      } else if (rot === 1) {
        landCount++;
        airCount++;
      } else {
        waterCount++;
        airCount++;
      }
    }
  }

  // Exact Enemy Team distribution (matches target counts 1:1)
  const enemyList: ('land' | 'water' | 'air')[] = [];
  for (let i = 0; i < landCount; i++) enemyList.push('land');
  for (let i = 0; i < waterCount; i++) enemyList.push('water');
  for (let i = 0; i < airCount; i++) enemyList.push('air');

  // Deterministically shuffle enemy array order for organic formation
  for (let i = enemyList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(sessionSeed + 888 + i * 4.3)) * 10000) % (i + 1);
    const temp = enemyList[i];
    enemyList[i] = enemyList[j];
    enemyList[j] = temp;
  }

  // Player Team: The player takes 1 slot in playerDomain.
  // Allied NPCs fill the exact remainder so the total player team count strictly matches enemy team!
  const neededLand = Math.max(0, landCount - (playerDomain === 'land' ? 1 : 0));
  const neededWater = Math.max(0, waterCount - (playerDomain === 'water' ? 1 : 0));
  const neededAir = Math.max(0, airCount - (playerDomain === 'air' ? 1 : 0));

  const allyList: ('land' | 'water' | 'air')[] = [];
  for (let i = 0; i < neededLand; i++) allyList.push('land');
  for (let i = 0; i < neededWater; i++) allyList.push('water');
  for (let i = 0; i < neededAir; i++) allyList.push('air');

  // Safety fill if clamping resulted in any offset
  while (allyList.length < clampedSize - 1) {
    const currentTotal = {
      land: (playerDomain === 'land' ? 1 : 0),
      water: (playerDomain === 'water' ? 1 : 0),
      air: (playerDomain === 'air' ? 1 : 0)
    };
    for (const d of allyList) currentTotal[d]++;
    if (currentTotal.land <= currentTotal.water && currentTotal.land <= currentTotal.air) allyList.push('land');
    else if (currentTotal.water <= currentTotal.air) allyList.push('water');
    else allyList.push('air');
  }

  // Deterministically shuffle ally array order
  for (let i = allyList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(sessionSeed + 333 + i * 2.7)) * 10000) % (i + 1);
    const temp = allyList[i];
    allyList[i] = allyList[j];
    allyList[j] = temp;
  }

  return {
    targetDistribution: { land: landCount, water: waterCount, air: airCount },
    allyNpcDomains: allyList,
    enemyNpcDomains: enemyList,
  };
}

// Generates varied NPC combat units with balanced combined-arms across Land, Water, and Air,
// fully randomized per game session.
export function generateNpcShipConfig(
  index: number,
  team: 'player' | 'enemy',
  teamSize: number = 5,
  playerDomain: VehicleDomain = 'land',
  sessionSeed?: number,
  assignedDomain?: 'land' | 'water' | 'air'
): { model: BaseShipModel; config: CustomShipConfig } {
  const matchRandom = sessionSeed !== undefined ? sessionSeed : Math.floor(Math.random() * 100000);
  const seed = matchRandom + (team === 'enemy' ? 5431 : 1987) + index * 37;

  let targetDomain: 'land' | 'air' | 'water';

  if (assignedDomain) {
    targetDomain = assignedDomain;
  } else {
    const plan = getBalancedMatchPlan(teamSize, playerDomain, matchRandom);
    if (team === 'player') {
      const allyIdx = Math.max(0, index - 1);
      targetDomain = plan.allyNpcDomains[allyIdx % Math.max(1, plan.allyNpcDomains.length)] || 'land';
    } else {
      targetDomain = plan.enemyNpcDomains[index % Math.max(1, plan.enemyNpcDomains.length)] || 'land';
    }
  }

  // Select varied model from domain roster randomized by session seed
  let targetModelId: string;
  const rosterOffset = Math.floor(Math.abs(Math.sin(seed * 1.3)) * 100);
  if (targetDomain === 'land') {
    targetModelId = LAND_ROSTER[(rosterOffset + index * 3 + (team === 'enemy' ? 2 : 0)) % LAND_ROSTER.length];
  } else if (targetDomain === 'air') {
    targetModelId = AIR_ROSTER[(rosterOffset + index * 2 + (team === 'enemy' ? 1 : 0)) % AIR_ROSTER.length];
  } else {
    targetModelId = WATER_ROSTER[(rosterOffset + index + (team === 'enemy' ? 1 : 0)) % WATER_ROSTER.length];
  }

  const model = SHIP_MODEL_MAP.get(targetModelId) || BASE_SHIPS[0];

  const domainPalettes = getDomainPalettes(targetDomain);
  const paletteIdx = Math.floor(Math.abs(Math.sin(seed * 2.7)) * domainPalettes.length) % domainPalettes.length;
  const palette = domainPalettes[paletteIdx];
  const callsignIdx = Math.floor(Math.abs(Math.sin(seed * 4.1)) * COMBINED_ARMS_NAMES.length) % COMBINED_ARMS_NAMES.length;
  const callsign = COMBINED_ARMS_NAMES[callsignIdx];
  const name = `${team === 'player' ? 'Allied' : 'Hostile'} ${callsign} [${model.domain.toUpperCase()}]`;

  const equippedComponents: Record<string, string> = {};

  // Equip weapons and modules compatible with model domain
  model.hardpoints.forEach((hp) => {
    if (hp.defaultComponentId) {
      equippedComponents[hp.id] = hp.defaultComponentId;
    } else {
      if (model.domain === 'land') {
        equippedComponents[hp.id] = hp.allowedArc === 'stern' ? 'diesel-v12-turbo' : 'bushmaster-30mm';
      } else if (model.domain === 'water') {
        equippedComponents[hp.id] = hp.allowedArc === 'stern' ? 'diesel-v12-turbo' : 'naval-127mm-gun';
      } else {
        equippedComponents[hp.id] = hp.allowedArc === 'stern' ? 'diesel-v12-turbo' : 'air-gau8-avenger';
      }
    }
  });

  // Assign trailer for land vehicles with towing capacity
  const trailerIdx = Math.floor(Math.abs(Math.sin(seed * 3.3)) * TRAILER_OPTIONS.length) % TRAILER_OPTIONS.length;
  const trailerId: TrailerType = (model.domain === 'land' && model.canTowTrailer)
    ? TRAILER_OPTIONS[trailerIdx]
    : 'none';

  return {
    model,
    config: {
      name,
      baseModelId: model.id,
      primaryColor: palette.primary,
      accentColor: palette.accent,
      trailerId,
      equippedComponents,
    },
  };
}
