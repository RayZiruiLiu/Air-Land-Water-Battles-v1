import { BattleBridge, BattleIsland, BattleMapConfig, BridgeStyle } from '../types/ship';

/**
 * Generates an organic, natural island polygon using multi-frequency harmonic perturbations.
 * Produces smooth, non-spiky, realistic coastlines, headlands, and coves.
 */
function createNaturalIslandPolygon(
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  steps: number = 32,
  seed: number = 1.0,
  roughness: number = 0.16
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const s = seed || 1.0;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Multi-octave natural coastal perturbation: smooth continuous curves
    const wobble =
      1 +
      Math.sin(angle * 2 + s * 1.3) * (roughness * 0.48) +
      Math.cos(angle * 3 + s * 2.1) * (roughness * 0.32) +
      Math.sin(angle * 4 + s * 3.4) * (roughness * 0.16);
    const clampedWobble = Math.max(0.82, Math.min(1.18, wobble));
    points.push({
      x: Math.round(cx + Math.cos(angle) * radiusX * clampedWobble),
      y: Math.round(cy + Math.sin(angle) * radiusY * clampedWobble),
    });
  }
  return points;
}

/**
 * Generates massive, sophisticated continental landmasses with deep bays,
 * rounded capes, and curving organic coastlines (44 vertices, zero sharp spikes).
 */
function createContinentalPolygon(
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  seed: number = 1.0,
  steps: number = 44
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const s = seed || 1.0;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Smooth, rolling continental topography with natural indentations and bays
    const wobble =
      1 +
      Math.sin(angle * 2 + s * 1.2) * 0.13 +
      Math.cos(angle * 3 + s * 2.2) * 0.09 +
      Math.sin(angle * 4 + s * 3.1) * 0.05;
    const clampedWobble = Math.max(0.82, Math.min(1.18, wobble));
    points.push({
      x: Math.round(cx + Math.cos(angle) * radiusX * clampedWobble),
      y: Math.round(cy + Math.sin(angle) * radiusY * clampedWobble),
    });
  }
  return points;
}

/**
 * Generates an elongated, smoothly curving coastal barrier spit or sandbar with rounded tip.
 */
function createSpitPolygon(
  cx: number,
  cy: number,
  length: number,
  width: number,
  headingAngle: number = 0,
  curvature: number = 0.22,
  seed: number = 1.0
): { x: number; y: number }[] {
  const steps = 36;
  const points: { x: number; y: number }[] = [];
  const cosH = Math.cos(headingAngle);
  const sinH = Math.sin(headingAngle);
  const s = seed || 1.0;

  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const localX = Math.cos(a) * (length * 0.46);
    // Smooth natural parabolic curve along lateral axis
    const lateralCurve = (1 - Math.cos(a)) * (length * curvature * 0.14);
    const localY = Math.sin(a) * (width * 0.44) + lateralCurve;
    const wobble = 1 + Math.sin(a * 2 + s * 1.7) * 0.07 + Math.cos(a * 3 + s * 2.5) * 0.04;

    const rx = localX * wobble;
    const ry = localY * wobble;
    const wx = cx + rx * cosH - ry * sinH;
    const wy = cy + rx * sinH + ry * cosH;
    points.push({ x: Math.round(wx), y: Math.round(wy) });
  }
  return points;
}

/**
 * Generates an organic, natural fortified coastal headland / bluff with rounded promontories.
 * Replaces sharp geometric star polygons with smooth natural topography.
 */
function createBastionPolygon(
  cx: number,
  cy: number,
  radius: number,
  facets: number = 5,
  pointiness: number = 0.12,
  seed: number = 1.0
): { x: number; y: number }[] {
  const steps = 36;
  const points: { x: number; y: number }[] = [];
  const s = seed || 1.0;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Gentle undulating coastal lobes instead of sharp straight-line star spikes
    const wave =
      Math.sin(angle * Math.min(4, Math.max(3, facets)) + s * 1.5) * 0.09 +
      Math.cos(angle * 2 + s * 2.2) * 0.07;
    const r = radius * (1 + wave);
    points.push({
      x: Math.round(cx + Math.cos(angle) * r),
      y: Math.round(cy + Math.sin(angle) * r),
    });
  }
  return points;
}

/**
 * Generates smooth, rounded organic rocky cays and islets.
 * Replaces sharp needle spikes with natural curving contours.
 */
function createSkerryPolygon(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number = 1.0
): { x: number; y: number }[] {
  const steps = 28;
  const points: { x: number; y: number }[] = [];
  const s = seed || 1.0;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Soft organic contour with natural gentle curvature
    const wobble = 1 + Math.sin(angle * 2 + s * 1.8) * 0.10 + Math.cos(angle * 3 + s * 2.5) * 0.07;
    points.push({
      x: Math.round(cx + Math.cos(angle) * rx * wobble),
      y: Math.round(cy + Math.sin(angle) * ry * wobble),
    });
  }
  return points;
}

/**
 * Creates a wide, deeply anchored bridge with flared ramp bridgeheads.
 * The 8-point flared polygon penetrates 85-110px deep into the landmasses,
 * forming a wide funnel mouth that guarantees land vehicles enter and cross seamlessly
 * without catching on shoreline vertices or slipping into water.
 */
function createBridge(
  id: string,
  name: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  style: BridgeStyle = 'suspension'
): BattleBridge {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const hw = width * 0.5;

  // Deep extension (90px) into land on both ends with a 1.45x flared funnel mouth
  const rampLen = 90;
  const rampFw = width * 0.72;

  const sx1 = x1 - (dx / len) * rampLen;
  const sy1 = y1 - (dy / len) * rampLen;
  const sx2 = x2 + (dx / len) * rampLen;
  const sy2 = y2 + (dy / len) * rampLen;

  // 8-point polygon: flared entrance -> shoreline neck -> bridge span -> shoreline neck -> flared exit
  const points = [
    { x: Math.round(sx1 + nx * rampFw), y: Math.round(sy1 + ny * rampFw) },
    { x: Math.round(x1 + nx * hw), y: Math.round(y1 + ny * hw) },
    { x: Math.round(x2 + nx * hw), y: Math.round(y2 + ny * hw) },
    { x: Math.round(sx2 + nx * rampFw), y: Math.round(sy2 + ny * rampFw) },
    { x: Math.round(sx2 - nx * rampFw), y: Math.round(sy2 - ny * rampFw) },
    { x: Math.round(x2 - nx * hw), y: Math.round(y2 - ny * hw) },
    { x: Math.round(x1 - nx * hw), y: Math.round(y1 - ny * hw) },
    { x: Math.round(sx1 - nx * rampFw), y: Math.round(sy1 - ny * rampFw) },
  ];

  return {
    id,
    name,
    x1,
    y1,
    x2,
    y2,
    width,
    points,
    style,
  };
}

/**
 * Connects two islands with a bridge that is guaranteed to be 100% attached
 * with zero gaps on both ends.
 * It places the endpoints (x1, y1) and (x2, y2) well INSIDE the solid core
 * of each island (penetrating 38-45% towards the center). The flared ramp bridgeheads
 * extend even deeper, ensuring zero shoreline gaps.
 */
function connectIslands(
  id: string,
  name: string,
  islandA: BattleIsland,
  islandB: BattleIsland,
  width: number,
  style: BridgeStyle
): BattleBridge {
  const dx = islandB.x - islandA.x;
  const dy = islandB.y - islandA.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;

  const penA = Math.min(islandA.radius * 0.42, Math.max(40, islandA.radius - 75));
  const penB = Math.min(islandB.radius * 0.42, Math.max(40, islandB.radius - 75));

  const x1 = Math.round(islandA.x + ux * penA);
  const y1 = Math.round(islandA.y + uy * penA);
  const x2 = Math.round(islandB.x - ux * penB);
  const y2 = Math.round(islandB.y - uy * penB);

  return createBridge(id, name, x1, y1, x2, y2, width, style);
}

// Basic helper to create an organic island
function createIsland(
  x: number,
  y: number,
  rx: number,
  ry: number,
  style: BattleIsland['style'],
  seed: number,
  foliage: BattleIsland['foliage'] = [],
  lake?: BattleIsland['lake']
): BattleIsland {
  const effRx = Math.round(rx * 0.85);
  const effRy = Math.round(ry * 0.85);
  return {
    x,
    y,
    radius: Math.max(effRx, effRy),
    points: createNaturalIslandPolygon(x, y, effRx, effRy, 32, seed, 0.16),
    style,
    foliage,
    lake,
  };
}

// Advanced helper to create diverse landforms of any scale, shape, and internal water features
function createIslandEx(params: {
  x: number;
  y: number;
  rx: number;
  ry: number;
  shape?: 'natural' | 'continent' | 'spit' | 'bastion' | 'skerry';
  style?: BattleIsland['style'];
  seed?: number;
  headingAngle?: number;
  curvature?: number;
  facets?: number;
  pointiness?: number;
  foliage?: BattleIsland['foliage'];
  lake?: BattleIsland['lake'];
  lakes?: BattleIsland['lakes'];
  canals?: BattleIsland['canals'];
  name?: string;
  category?: BattleIsland['category'];
}): BattleIsland {
  const {
    x,
    y,
    rx,
    ry,
    shape = 'natural',
    style = 'sand',
    seed = 1.0,
    headingAngle = 0,
    curvature = 0.22,
    facets = 5,
    pointiness = 0.12,
    foliage = [],
    lake,
    lakes,
    canals,
    name,
    category,
  } = params;

  // Scale island footprints slightly to ensure wide, navigable waterways between adjacent landmasses
  const effRx = Math.round(rx * 0.70);
  const effRy = Math.round(ry * 0.70);

  let points: { x: number; y: number }[];
  if (shape === 'continent') {
    points = createContinentalPolygon(x, y, effRx, effRy, seed, 44);
  } else if (shape === 'spit') {
    points = createSpitPolygon(x, y, effRx * 2, effRy * 2, headingAngle, curvature, seed);
  } else if (shape === 'bastion') {
    points = createBastionPolygon(x, y, Math.max(effRx, effRy), facets, pointiness, seed);
  } else if (shape === 'skerry') {
    points = createSkerryPolygon(x, y, effRx, effRy, seed);
  } else {
    points = createNaturalIslandPolygon(x, y, effRx, effRy, 32, seed, 0.16);
  }

  return {
    x,
    y,
    radius: Math.max(effRx, effRy),
    points,
    style,
    foliage,
    lake,
    lakes,
    canals,
    name,
    category,
  };
}

// =========================================================================
// 1. STRAITS OF GIBRALTAR: BROKEN ARCHIPELAGO (4800 x 3200)
// Mediterranean archipelago with 18 scattered islands, 2 inland lakes,
// open outer water border, and connected exclusively by Stone Arch & Timber Trestle bridges.
// =========================================================================
const GIBRALTAR_ISLANDS: BattleIsland[] = [
  // 0: Western Iberian Mainland (Massive Continental Headland with Rio Guadiaro canal)
  createIslandEx({
    x: 720,
    y: 750,
    rx: 520,
    ry: 380,
    shape: 'continent',
    style: 'harbor',
    seed: 1.2,
    foliage: [
      { x: 680, y: 700, radius: 26, color: '#334155', type: 'bunker' },
      { x: 800, y: 820, radius: 22, color: '#475569', type: 'radar' },
      { x: 620, y: 800, radius: 20, color: '#15803d', type: 'tree' },
      { x: 740, y: 640, radius: 24, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 1: Southwest Coastal Promontory (Jagged coastal ridge)
  createIslandEx({
    x: 760,
    y: 1600,
    rx: 440,
    ry: 320,
    shape: 'continent',
    style: 'rock',
    seed: 2.4,
    foliage: [
      { x: 740, y: 1550, radius: 22, color: '#166534', type: 'tree' },
      { x: 840, y: 1680, radius: 24, color: '#334155', type: 'bunker' },
      { x: 700, y: 1660, radius: 20, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 2: Tarifa Barrier Spit (Curved sandbar spit shielding southern bight)
  createIslandEx({
    x: 800,
    y: 2450,
    rx: 460,
    ry: 140,
    shape: 'spit',
    style: 'sand',
    headingAngle: -0.15,
    curvature: 0.35,
    seed: 3.7,
    foliage: [
      { x: 820, y: 2400, radius: 22, color: '#15803d', type: 'tree' },
      { x: 730, y: 2480, radius: 20, color: '#166534', type: 'tree' },
      { x: 920, y: 2430, radius: 18, color: '#15803d', type: 'tree' },
    ],
  }),
  // 3: Northern Bastion Outpost (Fortified 5-point star bastion)
  createIslandEx({
    x: 1520,
    y: 680,
    rx: 310,
    ry: 250,
    shape: 'bastion',
    style: 'harbor',
    facets: 5,
    pointiness: 0.35,
    seed: 4.1,
    foliage: [
      { x: 1500, y: 640, radius: 24, color: '#334155', type: 'bunker' },
      { x: 1600, y: 730, radius: 22, color: '#475569', type: 'radar' },
      { x: 1460, y: 720, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 4: West Channel Cay (Small sandy cay)
  createIslandEx({
    x: 1340,
    y: 1200,
    rx: 150,
    ry: 130,
    shape: 'natural',
    style: 'sand',
    seed: 5.3,
    foliage: [
      { x: 1340, y: 1200, radius: 18, color: '#15803d', type: 'tree' },
    ],
  }),
  // 5: Isla Luna (Major Island with Lago de la Luna inland lake and canal)
  createIslandEx({
    x: 1580,
    y: 1820,
    rx: 440,
    ry: 360,
    shape: 'continent',
    style: 'sand',
    seed: 6.8,
    foliage: [
      { x: 1420, y: 1720, radius: 26, color: '#334155', type: 'bunker' },
      { x: 1740, y: 1920, radius: 22, color: '#15803d', type: 'tree' },
      { x: 1480, y: 1940, radius: 20, color: '#166534', type: 'tree' },
    ],
    lake: {
      x: 1580,
      y: 1820,
      radiusX: 140,
      radiusY: 100,
      name: 'Lago de la Luna',
      waterColor: '#173d59',
      points: createNaturalIslandPolygon(1580, 1820, 140, 100, 18, 9.2, 0.2),
    },
  }),
  // 6: South Channel Shoal (Narrow curving barrier reef)
  createIslandEx({
    x: 1480,
    y: 2460,
    rx: 260,
    ry: 120,
    shape: 'spit',
    style: 'reef',
    headingAngle: 0.25,
    curvature: 0.25,
    seed: 7.5,
    foliage: [
      { x: 1480, y: 2460, radius: 18, color: '#15803d', type: 'tree' },
    ],
  }),
  // 7: North Sound Skerry (Sharp craggy needle rock)
  createIslandEx({
    x: 2140,
    y: 620,
    rx: 110,
    ry: 85,
    shape: 'skerry',
    style: 'rock',
    seed: 8.2,
    foliage: [
      { x: 2140, y: 620, radius: 16, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 8: Fortress Citadel Isle (Faceted 6-point star bastion fortress)
  createIslandEx({
    x: 2120,
    y: 1260,
    rx: 310,
    ry: 260,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.38,
    seed: 9.6,
    foliage: [
      { x: 2120, y: 1240, radius: 28, color: '#334155', type: 'bunker' },
      { x: 2200, y: 1320, radius: 24, color: '#475569', type: 'radar' },
      { x: 2060, y: 1300, radius: 20, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 9: Mid-Strait Bastion (Fortified hex-bastion naval station)
  createIslandEx({
    x: 2180,
    y: 1960,
    rx: 290,
    ry: 250,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.3,
    seed: 10.4,
    foliage: [
      { x: 2180, y: 1940, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2240, y: 2010, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 10: South Strait Key (Rocky islet pinnacle)
  createIslandEx({
    x: 2160,
    y: 2580,
    rx: 120,
    ry: 95,
    shape: 'skerry',
    style: 'rock',
    seed: 11.8,
    foliage: [
      { x: 2160, y: 2580, radius: 18, color: '#475569', type: 'rock' },
    ],
  }),
  // 11: North Channel Barrier Spit
  createIslandEx({
    x: 2780,
    y: 740,
    rx: 280,
    ry: 130,
    shape: 'spit',
    style: 'sand',
    headingAngle: 0.18,
    curvature: 0.28,
    seed: 12.3,
    foliage: [
      { x: 2780, y: 740, radius: 20, color: '#15803d', type: 'tree' },
    ],
  }),
  // 12: Grand Alboran Island (Massive mainland with Laguna de Alborán and Rio Arroyo canal)
  createIslandEx({
    x: 2860,
    y: 1520,
    rx: 460,
    ry: 370,
    shape: 'continent',
    style: 'reef',
    seed: 13.7,
    foliage: [
      { x: 2740, y: 1440, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2980, y: 1600, radius: 22, color: '#15803d', type: 'tree' },
      { x: 2820, y: 1650, radius: 22, color: '#475569', type: 'radar' },
    ],
    lake: {
      x: 2860,
      y: 1520,
      radiusX: 130,
      radiusY: 95,
      name: 'Laguna de Alborán',
      waterColor: '#173d59',
      points: createNaturalIslandPolygon(2860, 1520, 130, 95, 18, 14.5, 0.2),
    },
  }),
  // 13: Southeast Shoal (Jagged needle skerry)
  createIslandEx({
    x: 2820,
    y: 2380,
    rx: 130,
    ry: 100,
    shape: 'skerry',
    style: 'rock',
    seed: 15.1,
    foliage: [
      { x: 2820, y: 2380, radius: 18, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 14: North Gateway Shore
  createIslandEx({
    x: 3460,
    y: 720,
    rx: 340,
    ry: 270,
    shape: 'continent',
    style: 'sand',
    seed: 16.4,
    foliage: [
      { x: 3460, y: 700, radius: 24, color: '#334155', type: 'bunker' },
      { x: 3540, y: 780, radius: 20, color: '#15803d', type: 'tree' },
    ],
  }),
  // 15: East Lagoon Barrier Spit
  createIslandEx({
    x: 3520,
    y: 1580,
    rx: 320,
    ry: 130,
    shape: 'spit',
    style: 'sand',
    headingAngle: -0.22,
    curvature: 0.32,
    seed: 17.8,
    foliage: [
      { x: 3500, y: 1550, radius: 22, color: '#15803d', type: 'tree' },
      { x: 3580, y: 1640, radius: 24, color: '#334155', type: 'bunker' },
    ],
  }),
  // 16: Northeast Bastion Mainland (Massive Fortified Dockyard)
  createIslandEx({
    x: 4120,
    y: 880,
    rx: 480,
    ry: 370,
    shape: 'continent',
    style: 'harbor',
    seed: 18.6,
    foliage: [
      { x: 4100, y: 840, radius: 28, color: '#334155', type: 'bunker' },
      { x: 4180, y: 940, radius: 24, color: '#475569', type: 'radar' },
      { x: 4260, y: 830, radius: 22, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 17: Southeast Continental Shore (Huge rocky cliffs)
  createIslandEx({
    x: 4080,
    y: 2220,
    rx: 510,
    ry: 390,
    shape: 'continent',
    style: 'rock',
    seed: 19.9,
    foliage: [
      { x: 4060, y: 2180, radius: 28, color: '#334155', type: 'bunker' },
      { x: 4150, y: 2290, radius: 22, color: '#166534', type: 'tree' },
      { x: 4200, y: 2150, radius: 20, color: '#38bdf8', type: 'tower' },
    ],
  }),
];

// Map 1 Bridges: Stone Arch & Timber Trestle exclusively
const GIBRALTAR_BRIDGES: BattleBridge[] = [
  connectIslands('gib-b01', 'West Coast Stone Viaduct', GIBRALTAR_ISLANDS[0], GIBRALTAR_ISLANDS[1], 120, 'arch-stone'),
  connectIslands('gib-b02', 'Southern Shore Masonry Arch', GIBRALTAR_ISLANDS[1], GIBRALTAR_ISLANDS[2], 120, 'arch-stone'),
  connectIslands('gib-b03', 'North Peninsula Causeway', GIBRALTAR_ISLANDS[0], GIBRALTAR_ISLANDS[3], 125, 'arch-stone'),
  connectIslands('gib-b04', 'West Channel Timber Trestle', GIBRALTAR_ISLANDS[1], GIBRALTAR_ISLANDS[4], 115, 'timber-trestle'),
  connectIslands('gib-b05', 'Luna Channel Timber Trestle', GIBRALTAR_ISLANDS[4], GIBRALTAR_ISLANDS[5], 115, 'timber-trestle'),
  connectIslands('gib-b06', 'South Shoal Trestle', GIBRALTAR_ISLANDS[2], GIBRALTAR_ISLANDS[6], 115, 'timber-trestle'),
  connectIslands('gib-b07', 'Luna South Canal Arch', GIBRALTAR_ISLANDS[5], GIBRALTAR_ISLANDS[6], 120, 'arch-stone'),
  connectIslands('gib-b08', 'North Skerry Trestle', GIBRALTAR_ISLANDS[3], GIBRALTAR_ISLANDS[7], 110, 'timber-trestle'),
  connectIslands('gib-b09', 'Citadel West Arch', GIBRALTAR_ISLANDS[4], GIBRALTAR_ISLANDS[8], 120, 'arch-stone'),
  connectIslands('gib-b10', 'Central Strait Stone Viaduct', GIBRALTAR_ISLANDS[5], GIBRALTAR_ISLANDS[9], 130, 'arch-stone'),
  connectIslands('gib-b11', 'South Strait Trestle', GIBRALTAR_ISLANDS[6], GIBRALTAR_ISLANDS[10], 115, 'timber-trestle'),
  connectIslands('gib-b12', 'North Strait Masonry Arch', GIBRALTAR_ISLANDS[7], GIBRALTAR_ISLANDS[11], 120, 'arch-stone'),
  connectIslands('gib-b13', 'Alboran North Crossing', GIBRALTAR_ISLANDS[8], GIBRALTAR_ISLANDS[12], 125, 'arch-stone'),
  connectIslands('gib-b14', 'Mid-Strait Grand Viaduct', GIBRALTAR_ISLANDS[9], GIBRALTAR_ISLANDS[12], 130, 'arch-stone'),
  connectIslands('gib-b15', 'Southeast Passage Trestle', GIBRALTAR_ISLANDS[10], GIBRALTAR_ISLANDS[13], 115, 'timber-trestle'),
  connectIslands('gib-b16', 'North Gateway Arch', GIBRALTAR_ISLANDS[11], GIBRALTAR_ISLANDS[14], 120, 'arch-stone'),
  connectIslands('gib-b17', 'Alboran East Trestle', GIBRALTAR_ISLANDS[12], GIBRALTAR_ISLANDS[15], 115, 'timber-trestle'),
  connectIslands('gib-b18', 'South Gateway Trestle', GIBRALTAR_ISLANDS[13], GIBRALTAR_ISLANDS[15], 115, 'timber-trestle'),
  connectIslands('gib-b19', 'North Citadel Stone Viaduct', GIBRALTAR_ISLANDS[14], GIBRALTAR_ISLANDS[16], 125, 'arch-stone'),
  connectIslands('gib-b20', 'East Shore Stone Viaduct', GIBRALTAR_ISLANDS[15], GIBRALTAR_ISLANDS[17], 125, 'arch-stone'),
  connectIslands('gib-b21', 'East Coastline Masonry Arch', GIBRALTAR_ISLANDS[16], GIBRALTAR_ISLANDS[17], 125, 'arch-stone'),
];

// =========================================================================
// 2. SUNDARBANS DELTA: BRAIDED MANGROVE ARCHIPELAGO (4800 x 3200)
// Tropical river delta with 18 mangrove islands, 2 delta lakes,
// open outer water border, and connected exclusively by Military Pontoon & Through-Truss bridges.
// =========================================================================
const DELTA_ISLANDS: BattleIsland[] = [
  // 0: Northwest Delta Ridge (Massive alluvial headland with Sundarbans River Canal)
  createIslandEx({
    x: 700,
    y: 780,
    rx: 520,
    ry: 370,
    shape: 'continent',
    style: 'sand',
    seed: 21.3,
    foliage: [
      { x: 700, y: 750, radius: 26, color: '#166534', type: 'tree' },
      { x: 780, y: 840, radius: 22, color: '#14532d', type: 'tree' },
      { x: 630, y: 810, radius: 24, color: '#334155', type: 'bunker' },
      { x: 800, y: 720, radius: 20, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 1: Western Mangrove Marsh (Broad wetland promontory)
  createIslandEx({
    x: 740,
    y: 1620,
    rx: 440,
    ry: 330,
    shape: 'continent',
    style: 'reef',
    seed: 22.7,
    foliage: [
      { x: 720, y: 1580, radius: 24, color: '#14532d', type: 'tree' },
      { x: 810, y: 1690, radius: 22, color: '#166534', type: 'tree' },
      { x: 670, y: 1650, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
  // 2: Southwest Alluvial Shore (Long curving silt barrier spit)
  createIslandEx({
    x: 780,
    y: 2440,
    rx: 480,
    ry: 140,
    shape: 'spit',
    style: 'sand',
    headingAngle: -0.12,
    curvature: 0.32,
    seed: 23.9,
    foliage: [
      { x: 760, y: 2400, radius: 22, color: '#166534', type: 'tree' },
      { x: 840, y: 2500, radius: 24, color: '#14532d', type: 'tree' },
      { x: 920, y: 2420, radius: 20, color: '#166534', type: 'tree' },
    ],
  }),
  // 3: Northern River Island
  createIslandEx({
    x: 1480,
    y: 660,
    rx: 320,
    ry: 240,
    shape: 'natural',
    style: 'sand',
    seed: 24.5,
    foliage: [
      { x: 1480, y: 660, radius: 22, color: '#14532d', type: 'tree' },
      { x: 1540, y: 620, radius: 20, color: '#334155', type: 'bunker' },
    ],
  }),
  // 4: West Braided Bank (Small alluvial cay)
  createIslandEx({
    x: 1320,
    y: 1180,
    rx: 150,
    ry: 130,
    shape: 'natural',
    style: 'sand',
    seed: 25.1,
    foliage: [
      { x: 1320, y: 1180, radius: 18, color: '#166534', type: 'tree' },
    ],
  }),
  // 5: Emerald Mangrove Island (Massive island with Emerald Delta Lake)
  createIslandEx({
    x: 1560,
    y: 1800,
    rx: 450,
    ry: 360,
    shape: 'continent',
    style: 'reef',
    seed: 26.8,
    foliage: [
      { x: 1420, y: 1720, radius: 24, color: '#14532d', type: 'tree' },
      { x: 1720, y: 1900, radius: 22, color: '#166534', type: 'tree' },
      { x: 1500, y: 1940, radius: 22, color: '#334155', type: 'bunker' },
    ],
    lake: {
      x: 1560,
      y: 1800,
      radiusX: 135,
      radiusY: 95,
      name: 'Emerald Delta Lake',
      waterColor: '#133a30',
      points: createNaturalIslandPolygon(1560, 1800, 135, 95, 18, 27.2, 0.22),
    },
  }),
  // 6: South Estuary Shoal (Curved mangrove spit)
  createIslandEx({
    x: 1460,
    y: 2480,
    rx: 270,
    ry: 120,
    shape: 'spit',
    style: 'sand',
    headingAngle: 0.2,
    curvature: 0.25,
    seed: 28.4,
    foliage: [
      { x: 1460, y: 2480, radius: 18, color: '#14532d', type: 'tree' },
    ],
  }),
  // 7: North Sandbar Skerry (Small delta islet)
  createIslandEx({
    x: 2120,
    y: 600,
    rx: 115,
    ry: 85,
    shape: 'skerry',
    style: 'sand',
    seed: 29.1,
    foliage: [
      { x: 2120, y: 600, radius: 16, color: '#166534', type: 'tree' },
    ],
  }),
  // 8: Central Delta Stronghold (Faceted star-bastion river fort)
  createIslandEx({
    x: 2100,
    y: 1240,
    rx: 310,
    ry: 260,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.35,
    seed: 30.5,
    foliage: [
      { x: 2100, y: 1220, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2170, y: 1300, radius: 22, color: '#475569', type: 'radar' },
      { x: 2040, y: 1280, radius: 20, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 9: Braided Channel Outpost (Faceted fortified redoubt)
  createIslandEx({
    x: 2160,
    y: 1940,
    rx: 290,
    ry: 240,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.3,
    seed: 31.8,
    foliage: [
      { x: 2160, y: 1920, radius: 24, color: '#334155', type: 'bunker' },
      { x: 2220, y: 2000, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 10: South Mudflat Key (Skerry needle in the estuary)
  createIslandEx({
    x: 2140,
    y: 2560,
    rx: 120,
    ry: 90,
    shape: 'skerry',
    style: 'sand',
    seed: 32.6,
    foliage: [
      { x: 2140, y: 2560, radius: 18, color: '#14532d', type: 'tree' },
    ],
  }),
  // 11: East Braided Barrier Spit
  createIslandEx({
    x: 2760,
    y: 720,
    rx: 280,
    ry: 130,
    shape: 'spit',
    style: 'sand',
    headingAngle: 0.15,
    curvature: 0.25,
    seed: 33.2,
    foliage: [
      { x: 2760, y: 720, radius: 20, color: '#166534', type: 'tree' },
    ],
  }),
  // 12: Heron Lagoon Island (Massive island with Heron Lagoon and tributary canal)
  createIslandEx({
    x: 2840,
    y: 1500,
    rx: 460,
    ry: 370,
    shape: 'continent',
    style: 'reef',
    seed: 34.7,
    foliage: [
      { x: 2720, y: 1420, radius: 24, color: '#14532d', type: 'tree' },
      { x: 2960, y: 1580, radius: 22, color: '#166534', type: 'tree' },
      { x: 2800, y: 1640, radius: 22, color: '#475569', type: 'radar' },
    ],
    lake: {
      x: 2840,
      y: 1500,
      radiusX: 130,
      radiusY: 90,
      name: 'Heron Lagoon',
      waterColor: '#133a30',
      points: createNaturalIslandPolygon(2840, 1500, 130, 90, 18, 35.5, 0.22),
    },
  }),
  // 13: Southeast Mangrove Cay (Small islet)
  createIslandEx({
    x: 2800,
    y: 2360,
    rx: 130,
    ry: 95,
    shape: 'skerry',
    style: 'sand',
    seed: 36.1,
    foliage: [
      { x: 2800, y: 2360, radius: 18, color: '#14532d', type: 'tree' },
    ],
  }),
  // 14: Northeast River Bank
  createIslandEx({
    x: 3440,
    y: 700,
    rx: 340,
    ry: 260,
    shape: 'continent',
    style: 'sand',
    seed: 37.4,
    foliage: [
      { x: 3440, y: 680, radius: 22, color: '#14532d', type: 'tree' },
      { x: 3510, y: 760, radius: 20, color: '#166534', type: 'tree' },
    ],
  }),
  // 15: East Marshland Barrier Spit
  createIslandEx({
    x: 3500,
    y: 1560,
    rx: 330,
    ry: 130,
    shape: 'spit',
    style: 'sand',
    headingAngle: -0.18,
    curvature: 0.3,
    seed: 38.8,
    foliage: [
      { x: 3480, y: 1530, radius: 22, color: '#166534', type: 'tree' },
      { x: 3560, y: 1620, radius: 20, color: '#14532d', type: 'tree' },
    ],
  }),
  // 16: East Delta Mainland (Large continental fortress)
  createIslandEx({
    x: 4100,
    y: 860,
    rx: 480,
    ry: 370,
    shape: 'continent',
    style: 'harbor',
    seed: 39.6,
    foliage: [
      { x: 4080, y: 820, radius: 26, color: '#334155', type: 'bunker' },
      { x: 4160, y: 920, radius: 22, color: '#14532d', type: 'tree' },
      { x: 4220, y: 800, radius: 22, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 17: Southeast Estuary Mainland (Massive delta landmass)
  createIslandEx({
    x: 4060,
    y: 2200,
    rx: 510,
    ry: 390,
    shape: 'continent',
    style: 'sand',
    seed: 40.9,
    foliage: [
      { x: 4040, y: 2160, radius: 26, color: '#334155', type: 'bunker' },
      { x: 4130, y: 2270, radius: 22, color: '#166534', type: 'tree' },
      { x: 4200, y: 2130, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
];

// Map 2 Bridges: Military Pontoon & Through-Truss exclusively
const DELTA_BRIDGES: BattleBridge[] = [
  connectIslands('del-b01', 'West Shore Ribbon Pontoon', DELTA_ISLANDS[0], DELTA_ISLANDS[1], 120, 'military-pontoon'),
  connectIslands('del-b02', 'Southwest Marsh Truss Bridge', DELTA_ISLANDS[1], DELTA_ISLANDS[2], 125, 'truss'),
  connectIslands('del-b03', 'North River Bailey Truss', DELTA_ISLANDS[0], DELTA_ISLANDS[3], 125, 'truss'),
  connectIslands('del-b04', 'West Braided Pontoon', DELTA_ISLANDS[1], DELTA_ISLANDS[4], 115, 'military-pontoon'),
  connectIslands('del-b05', 'Emerald Delta Ribbon Pontoon', DELTA_ISLANDS[4], DELTA_ISLANDS[5], 115, 'military-pontoon'),
  connectIslands('del-b06', 'South Alluvial Pontoon', DELTA_ISLANDS[2], DELTA_ISLANDS[6], 115, 'military-pontoon'),
  connectIslands('del-b07', 'Emerald South Channel Truss', DELTA_ISLANDS[5], DELTA_ISLANDS[6], 125, 'truss'),
  connectIslands('del-b08', 'North Sandbar Ribbon Pontoon', DELTA_ISLANDS[3], DELTA_ISLANDS[7], 110, 'military-pontoon'),
  connectIslands('del-b09', 'Central Delta Bailey Truss', DELTA_ISLANDS[4], DELTA_ISLANDS[8], 125, 'truss'),
  connectIslands('del-b10', 'Mid-Channel Tactical Pontoon', DELTA_ISLANDS[5], DELTA_ISLANDS[9], 130, 'military-pontoon'),
  connectIslands('del-b11', 'South Mudflat Ribbon Pontoon', DELTA_ISLANDS[6], DELTA_ISLANDS[10], 115, 'military-pontoon'),
  connectIslands('del-b12', 'North Channel Bailey Truss', DELTA_ISLANDS[7], DELTA_ISLANDS[11], 125, 'truss'),
  connectIslands('del-b13', 'Heron West Crossing Truss', DELTA_ISLANDS[8], DELTA_ISLANDS[12], 125, 'truss'),
  connectIslands('del-b14', 'Main Estuary Ribbon Pontoon', DELTA_ISLANDS[9], DELTA_ISLANDS[12], 130, 'military-pontoon'),
  connectIslands('del-b15', 'Southeast Cay Ribbon Pontoon', DELTA_ISLANDS[10], DELTA_ISLANDS[13], 115, 'military-pontoon'),
  connectIslands('del-b16', 'North Gateway Bailey Truss', DELTA_ISLANDS[11], DELTA_ISLANDS[14], 125, 'truss'),
  connectIslands('del-b17', 'Heron East Ribbon Pontoon', DELTA_ISLANDS[12], DELTA_ISLANDS[15], 115, 'military-pontoon'),
  connectIslands('del-b18', 'South Gateway Ribbon Pontoon', DELTA_ISLANDS[13], DELTA_ISLANDS[15], 115, 'military-pontoon'),
  connectIslands('del-b19', 'Northeast River Bailey Truss', DELTA_ISLANDS[14], DELTA_ISLANDS[16], 125, 'truss'),
  connectIslands('del-b20', 'East Mainland Ribbon Pontoon', DELTA_ISLANDS[15], DELTA_ISLANDS[17], 125, 'military-pontoon'),
  connectIslands('del-b21', 'East Delta Coastline Truss', DELTA_ISLANDS[16], DELTA_ISLANDS[17], 125, 'truss'),
];

// =========================================================================
// 3. NORDIC FJORDS: GLACIAL SOUND & SKERRIES (4800 x 3200)
// Sub-zero arctic fjord with 18 granite skerries, 2 meltwater lakes,
// open outer water border, and connected exclusively by Suspension & Bascule Drawbridge bridges.
// =========================================================================
const FJORD_ISLANDS: BattleIsland[] = [
  // 0: Western Glacial Bluff (Huge continental crag with Glacial Sound Canal)
  createIslandEx({
    x: 710,
    y: 770,
    rx: 530,
    ry: 380,
    shape: 'continent',
    style: 'ice',
    seed: 41.2,
    foliage: [
      { x: 690, y: 730, radius: 24, color: '#94a3b8', type: 'ice' },
      { x: 770, y: 830, radius: 24, color: '#334155', type: 'bunker' },
      { x: 620, y: 790, radius: 22, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 1: Southwest Permafrost Cape (Curved glacial spit)
  createIslandEx({
    x: 750,
    y: 1610,
    rx: 460,
    ry: 150,
    shape: 'spit',
    style: 'ice',
    headingAngle: -0.15,
    curvature: 0.28,
    seed: 42.6,
    foliage: [
      { x: 730, y: 1570, radius: 24, color: '#94a3b8', type: 'ice' },
      { x: 820, y: 1680, radius: 24, color: '#334155', type: 'bunker' },
    ],
  }),
  // 2: Southern Fjord Shore (Broad continental headland)
  createIslandEx({
    x: 790,
    y: 2430,
    rx: 470,
    ry: 340,
    shape: 'continent',
    style: 'ice',
    seed: 43.8,
    foliage: [
      { x: 770, y: 2390, radius: 22, color: '#94a3b8', type: 'ice' },
      { x: 850, y: 2490, radius: 22, color: '#94a3b8', type: 'ice' },
      { x: 710, y: 2460, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
  // 3: Northern Fjord Ridge
  createIslandEx({
    x: 1500,
    y: 670,
    rx: 310,
    ry: 240,
    shape: 'natural',
    style: 'ice',
    seed: 44.4,
    foliage: [
      { x: 1500, y: 650, radius: 24, color: '#334155', type: 'bunker' },
    ],
  }),
  // 4: West Sound Skerry (Small granite needle)
  createIslandEx({
    x: 1330,
    y: 1190,
    rx: 130,
    ry: 95,
    shape: 'skerry',
    style: 'rock',
    seed: 45.1,
    foliage: [
      { x: 1330, y: 1190, radius: 18, color: '#94a3b8', type: 'ice' },
    ],
  }),
  // 5: Blue Glacier Island (Massive island with Blue Glacier Meltwater Lake)
  createIslandEx({
    x: 1570,
    y: 1810,
    rx: 460,
    ry: 360,
    shape: 'continent',
    style: 'ice',
    seed: 46.8,
    foliage: [
      { x: 1430, y: 1730, radius: 26, color: '#334155', type: 'bunker' },
      { x: 1730, y: 1910, radius: 22, color: '#94a3b8', type: 'ice' },
      { x: 1510, y: 1950, radius: 22, color: '#38bdf8', type: 'tower' },
    ],
    lake: {
      x: 1570,
      y: 1810,
      radiusX: 135,
      radiusY: 95,
      name: 'Blue Glacier Meltwater',
      waterColor: '#0e2f47',
      points: createNaturalIslandPolygon(1570, 1810, 135, 95, 18, 47.3, 0.2),
    },
  }),
  // 6: South Channel Skerry (Spit promontory)
  createIslandEx({
    x: 1470,
    y: 2470,
    rx: 260,
    ry: 120,
    shape: 'spit',
    style: 'ice',
    headingAngle: 0.18,
    curvature: 0.22,
    seed: 48.5,
    foliage: [
      { x: 1470, y: 2470, radius: 18, color: '#94a3b8', type: 'ice' },
    ],
  }),
  // 7: North Sound Islet (Skerry pinnacle)
  createIslandEx({
    x: 2130,
    y: 610,
    rx: 110,
    ry: 85,
    shape: 'skerry',
    style: 'rock',
    seed: 49.2,
    foliage: [
      { x: 2130, y: 610, radius: 16, color: '#94a3b8', type: 'ice' },
    ],
  }),
  // 8: Arctic Citadel Skerry (Hexagonal ice bastion fort)
  createIslandEx({
    x: 2110,
    y: 1250,
    rx: 310,
    ry: 260,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.35,
    seed: 50.6,
    foliage: [
      { x: 2110, y: 1230, radius: 28, color: '#334155', type: 'bunker' },
      { x: 2180, y: 1310, radius: 20, color: '#475569', type: 'radar' },
    ],
  }),
  // 9: Mid-Fjord Bastion (Faceted naval redoubt)
  createIslandEx({
    x: 2170,
    y: 1950,
    rx: 290,
    ry: 240,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.3,
    seed: 51.9,
    foliage: [
      { x: 2170, y: 1930, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2230, y: 2010, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 10: South Glacial Key (Small skerry)
  createIslandEx({
    x: 2150,
    y: 2570,
    rx: 115,
    ry: 90,
    shape: 'skerry',
    style: 'ice',
    seed: 52.7,
    foliage: [
      { x: 2150, y: 2570, radius: 18, color: '#94a3b8', type: 'ice' },
    ],
  }),
  // 11: North Glacier Spit Barrier
  createIslandEx({
    x: 2770,
    y: 730,
    rx: 280,
    ry: 130,
    shape: 'spit',
    style: 'ice',
    headingAngle: 0.15,
    curvature: 0.25,
    seed: 53.3,
    foliage: [
      { x: 2770, y: 730, radius: 20, color: '#94a3b8', type: 'ice' },
    ],
  }),
  // 12: Frost Tarn Island (Massive island with Frost Tarn inland lake and ice canal)
  createIslandEx({
    x: 2850,
    y: 1510,
    rx: 460,
    ry: 370,
    shape: 'continent',
    style: 'ice',
    seed: 54.8,
    foliage: [
      { x: 2730, y: 1430, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2970, y: 1590, radius: 22, color: '#94a3b8', type: 'ice' },
      { x: 2810, y: 1650, radius: 22, color: '#475569', type: 'radar' },
    ],
    lake: {
      x: 2850,
      y: 1510,
      radiusX: 130,
      radiusY: 90,
      name: 'Frost Tarn',
      waterColor: '#0e2f47',
      points: createNaturalIslandPolygon(2850, 1510, 130, 90, 18, 55.6, 0.2),
    },
  }),
  // 13: Southeast Skerry Shoal (Small pinnacle)
  createIslandEx({
    x: 2810,
    y: 2370,
    rx: 120,
    ry: 90,
    shape: 'skerry',
    style: 'ice',
    seed: 56.2,
    foliage: [
      { x: 2810, y: 2370, radius: 18, color: '#94a3b8', type: 'ice' },
    ],
  }),
  // 14: Northeast Glacial Bank
  createIslandEx({
    x: 3450,
    y: 710,
    rx: 330,
    ry: 250,
    shape: 'continent',
    style: 'ice',
    seed: 57.5,
    foliage: [
      { x: 3450, y: 690, radius: 24, color: '#334155', type: 'bunker' },
      { x: 3520, y: 770, radius: 20, color: '#94a3b8', type: 'ice' },
    ],
  }),
  // 15: East Sound Barrier Spit
  createIslandEx({
    x: 3510,
    y: 1570,
    rx: 340,
    ry: 130,
    shape: 'spit',
    style: 'ice',
    headingAngle: -0.15,
    curvature: 0.28,
    seed: 58.9,
    foliage: [
      { x: 3490, y: 1540, radius: 22, color: '#94a3b8', type: 'ice' },
      { x: 3570, y: 1630, radius: 24, color: '#334155', type: 'bunker' },
    ],
  }),
  // 16: Northeast Fjord Mainland (Massive ice crag)
  createIslandEx({
    x: 4110,
    y: 870,
    rx: 490,
    ry: 370,
    shape: 'continent',
    style: 'harbor',
    seed: 59.7,
    foliage: [
      { x: 4090, y: 830, radius: 28, color: '#334155', type: 'bunker' },
      { x: 4170, y: 930, radius: 22, color: '#94a3b8', type: 'ice' },
      { x: 4230, y: 810, radius: 22, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 17: Southeast Permafrost Mainland (Massive landmass)
  createIslandEx({
    x: 4070,
    y: 2210,
    rx: 520,
    ry: 390,
    shape: 'continent',
    style: 'ice',
    seed: 60.9,
    foliage: [
      { x: 4050, y: 2170, radius: 28, color: '#334155', type: 'bunker' },
      { x: 4140, y: 2280, radius: 22, color: '#94a3b8', type: 'ice' },
      { x: 4210, y: 2140, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
];

// Map 3 Bridges: Suspension & Drawbridge exclusively
const FJORD_BRIDGES: BattleBridge[] = [
  connectIslands('fjo-b01', 'West Bluff Suspension Span', FJORD_ISLANDS[0], FJORD_ISLANDS[1], 125, 'suspension'),
  connectIslands('fjo-b02', 'South Sound Bascule Drawbridge', FJORD_ISLANDS[1], FJORD_ISLANDS[2], 120, 'drawbridge'),
  connectIslands('fjo-b03', 'North Ridge Suspension Span', FJORD_ISLANDS[0], FJORD_ISLANDS[3], 125, 'suspension'),
  connectIslands('fjo-b04', 'West Skerry Bascule Drawbridge', FJORD_ISLANDS[1], FJORD_ISLANDS[4], 115, 'drawbridge'),
  connectIslands('fjo-b05', 'Blue Glacier Suspension Span', FJORD_ISLANDS[4], FJORD_ISLANDS[5], 125, 'suspension'),
  connectIslands('fjo-b06', 'South Channel Drawbridge', FJORD_ISLANDS[2], FJORD_ISLANDS[6], 115, 'drawbridge'),
  connectIslands('fjo-b07', 'Blue Glacier South Suspension', FJORD_ISLANDS[5], FJORD_ISLANDS[6], 125, 'suspension'),
  connectIslands('fjo-b08', 'North Sound Bascule Drawbridge', FJORD_ISLANDS[3], FJORD_ISLANDS[7], 115, 'drawbridge'),
  connectIslands('fjo-b09', 'Arctic Citadel Suspension Span', FJORD_ISLANDS[4], FJORD_ISLANDS[8], 125, 'suspension'),
  connectIslands('fjo-b10', 'Mid-Fjord Grand Suspension Span', FJORD_ISLANDS[5], FJORD_ISLANDS[9], 130, 'suspension'),
  connectIslands('fjo-b11', 'South Glacial Bascule Drawbridge', FJORD_ISLANDS[6], FJORD_ISLANDS[10], 115, 'drawbridge'),
  connectIslands('fjo-b12', 'North Channel Suspension Span', FJORD_ISLANDS[7], FJORD_ISLANDS[11], 125, 'suspension'),
  connectIslands('fjo-b13', 'Frost Tarn West Bascule Drawbridge', FJORD_ISLANDS[8], FJORD_ISLANDS[12], 120, 'drawbridge'),
  connectIslands('fjo-b14', 'Main Fjord Shipping Drawbridge', FJORD_ISLANDS[9], FJORD_ISLANDS[12], 130, 'drawbridge'),
  connectIslands('fjo-b15', 'Southeast Skerry Drawbridge', FJORD_ISLANDS[10], FJORD_ISLANDS[13], 115, 'drawbridge'),
  connectIslands('fjo-b16', 'North Gateway Suspension Span', FJORD_ISLANDS[11], FJORD_ISLANDS[14], 125, 'suspension'),
  connectIslands('fjo-b17', 'Frost Tarn East Drawbridge', FJORD_ISLANDS[12], FJORD_ISLANDS[15], 115, 'drawbridge'),
  connectIslands('fjo-b18', 'South Gateway Bascule Drawbridge', FJORD_ISLANDS[13], FJORD_ISLANDS[15], 115, 'drawbridge'),
  connectIslands('fjo-b19', 'Northeast Sound Suspension Span', FJORD_ISLANDS[14], FJORD_ISLANDS[16], 125, 'suspension'),
  connectIslands('fjo-b20', 'East Mainland Bascule Drawbridge', FJORD_ISLANDS[15], FJORD_ISLANDS[17], 120, 'drawbridge'),
  connectIslands('fjo-b21', 'East Fjord Suspension Span', FJORD_ISLANDS[16], FJORD_ISLANDS[17], 125, 'suspension'),
];

// =========================================================================
// 4. SECTOR CALDERA: SUNKEN VOLCANIC RING & CORE CITADEL (4800 x 3200)
// Volcanic caldera rim with 18 basalt islands, 2 crater lakes,
// open outer water border, and connected exclusively by Cable-Stayed & Highway Viaduct bridges.
// =========================================================================
const CALDERA_ISLANDS: BattleIsland[] = [
  // 0: Western Caldera Rim Bastion (Huge basalt continental bluff with Magma Canal)
  createIslandEx({
    x: 710,
    y: 760,
    rx: 520,
    ry: 370,
    shape: 'continent',
    style: 'rock',
    seed: 61.2,
    foliage: [
      { x: 690, y: 720, radius: 26, color: '#334155', type: 'bunker' },
      { x: 770, y: 820, radius: 22, color: '#475569', type: 'rock' },
      { x: 630, y: 800, radius: 22, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 1: Southwest Basalt Headland (Curved volcanic ridge spit)
  createIslandEx({
    x: 750,
    y: 1600,
    rx: 460,
    ry: 150,
    shape: 'spit',
    style: 'rock',
    headingAngle: -0.12,
    curvature: 0.28,
    seed: 62.6,
    foliage: [
      { x: 730, y: 1560, radius: 24, color: '#334155', type: 'bunker' },
      { x: 820, y: 1670, radius: 20, color: '#475569', type: 'rock' },
    ],
  }),
  // 2: Southern Caldera Shore (Broad continental rim landmass)
  createIslandEx({
    x: 790,
    y: 2420,
    rx: 470,
    ry: 340,
    shape: 'continent',
    style: 'rock',
    seed: 63.8,
    foliage: [
      { x: 770, y: 2380, radius: 22, color: '#475569', type: 'rock' },
      { x: 850, y: 2480, radius: 24, color: '#334155', type: 'bunker' },
      { x: 710, y: 2450, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
  // 3: Northern Volcanic Ridge
  createIslandEx({
    x: 1500,
    y: 660,
    rx: 310,
    ry: 240,
    shape: 'natural',
    style: 'rock',
    seed: 64.4,
    foliage: [
      { x: 1500, y: 640, radius: 24, color: '#334155', type: 'bunker' },
    ],
  }),
  // 4: West Caldera Cay (Basalt skerry needle)
  createIslandEx({
    x: 1330,
    y: 1180,
    rx: 130,
    ry: 95,
    shape: 'skerry',
    style: 'rock',
    seed: 65.1,
    foliage: [
      { x: 1330, y: 1180, radius: 18, color: '#475569', type: 'rock' },
    ],
  }),
  // 5: Obsidian Crater Island (Massive island with Obsidian Magma Vent Lake)
  createIslandEx({
    x: 1570,
    y: 1800,
    rx: 460,
    ry: 360,
    shape: 'continent',
    style: 'rock',
    seed: 66.8,
    foliage: [
      { x: 1430, y: 1720, radius: 26, color: '#334155', type: 'bunker' },
      { x: 1730, y: 1900, radius: 22, color: '#475569', type: 'rock' },
      { x: 1500, y: 1940, radius: 22, color: '#334155', type: 'bunker' },
    ],
    lake: {
      x: 1570,
      y: 1800,
      radiusX: 135,
      radiusY: 95,
      name: 'Obsidian Magma Vent Lake',
      waterColor: '#1d192b',
      points: createNaturalIslandPolygon(1570, 1800, 135, 95, 18, 67.3, 0.2),
    },
  }),
  // 6: South Magma Skerry (Spit spur)
  createIslandEx({
    x: 1470,
    y: 2460,
    rx: 270,
    ry: 120,
    shape: 'spit',
    style: 'rock',
    headingAngle: 0.18,
    curvature: 0.22,
    seed: 68.5,
    foliage: [
      { x: 1470, y: 2460, radius: 18, color: '#475569', type: 'rock' },
    ],
  }),
  // 7: North Rim Islet (Volcanic pinnacle)
  createIslandEx({
    x: 2130,
    y: 600,
    rx: 110,
    ry: 85,
    shape: 'skerry',
    style: 'rock',
    seed: 69.2,
    foliage: [
      { x: 2130, y: 600, radius: 16, color: '#475569', type: 'rock' },
    ],
  }),
  // 8: Core Citadel Island (Faceted octagonal ring fortress)
  createIslandEx({
    x: 2110,
    y: 1240,
    rx: 310,
    ry: 260,
    shape: 'bastion',
    style: 'harbor',
    facets: 8,
    pointiness: 0.35,
    seed: 70.6,
    foliage: [
      { x: 2110, y: 1220, radius: 28, color: '#334155', type: 'bunker' },
      { x: 2180, y: 1300, radius: 22, color: '#475569', type: 'radar' },
      { x: 2040, y: 1280, radius: 20, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 9: Central Caldera Redoubt (Faceted star bastion)
  createIslandEx({
    x: 2170,
    y: 1940,
    rx: 290,
    ry: 240,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.3,
    seed: 71.9,
    foliage: [
      { x: 2170, y: 1920, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2230, y: 2000, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 10: South Caldera Key (Basalt pinnacle)
  createIslandEx({
    x: 2150,
    y: 2560,
    rx: 120,
    ry: 90,
    shape: 'skerry',
    style: 'rock',
    seed: 72.7,
    foliage: [
      { x: 2150, y: 2560, radius: 18, color: '#475569', type: 'rock' },
    ],
  }),
  // 11: Northeast Caldera Spit Barrier
  createIslandEx({
    x: 2770,
    y: 720,
    rx: 280,
    ry: 130,
    shape: 'spit',
    style: 'rock',
    headingAngle: 0.15,
    curvature: 0.25,
    seed: 73.3,
    foliage: [
      { x: 2770, y: 720, radius: 20, color: '#475569', type: 'rock' },
    ],
  }),
  // 12: Sulfur Atoll Island (Massive island with Sulfur Pool inland lake and canal)
  createIslandEx({
    x: 2850,
    y: 1500,
    rx: 460,
    ry: 370,
    shape: 'continent',
    style: 'rock',
    seed: 74.8,
    foliage: [
      { x: 2730, y: 1420, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2970, y: 1580, radius: 22, color: '#475569', type: 'rock' },
      { x: 2810, y: 1640, radius: 22, color: '#475569', type: 'radar' },
    ],
    lake: {
      x: 2850,
      y: 1500,
      radiusX: 130,
      radiusY: 90,
      name: 'Sulfur Pool',
      waterColor: '#1d192b',
      points: createNaturalIslandPolygon(2850, 1500, 130, 90, 18, 75.6, 0.2),
    },
  }),
  // 13: Southeast Rim Shoal (Small rock needle)
  createIslandEx({
    x: 2810,
    y: 2360,
    rx: 130,
    ry: 95,
    shape: 'skerry',
    style: 'rock',
    seed: 76.2,
    foliage: [
      { x: 2810, y: 2360, radius: 18, color: '#475569', type: 'rock' },
    ],
  }),
  // 14: Northeast Caldera Shore
  createIslandEx({
    x: 3450,
    y: 700,
    rx: 340,
    ry: 260,
    shape: 'continent',
    style: 'rock',
    seed: 77.5,
    foliage: [
      { x: 3450, y: 680, radius: 24, color: '#334155', type: 'bunker' },
      { x: 3520, y: 760, radius: 20, color: '#475569', type: 'rock' },
    ],
  }),
  // 15: East Caldera Lagoon Barrier Spit
  createIslandEx({
    x: 3510,
    y: 1560,
    rx: 330,
    ry: 130,
    shape: 'spit',
    style: 'rock',
    headingAngle: -0.15,
    curvature: 0.28,
    seed: 78.9,
    foliage: [
      { x: 3490, y: 1530, radius: 22, color: '#475569', type: 'rock' },
      { x: 3570, y: 1620, radius: 24, color: '#334155', type: 'bunker' },
    ],
  }),
  // 16: East Caldera Mainland (Large basalt rim fortress)
  createIslandEx({
    x: 4110,
    y: 860,
    rx: 480,
    ry: 370,
    shape: 'continent',
    style: 'harbor',
    seed: 79.7,
    foliage: [
      { x: 4090, y: 820, radius: 28, color: '#334155', type: 'bunker' },
      { x: 4170, y: 920, radius: 22, color: '#475569', type: 'rock' },
      { x: 4230, y: 800, radius: 22, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 17: Southeast Caldera Mainland (Massive volcanic landmass)
  createIslandEx({
    x: 4070,
    y: 2200,
    rx: 520,
    ry: 390,
    shape: 'continent',
    style: 'rock',
    seed: 80.9,
    foliage: [
      { x: 4050, y: 2160, radius: 28, color: '#334155', type: 'bunker' },
      { x: 4140, y: 2270, radius: 22, color: '#475569', type: 'rock' },
      { x: 4210, y: 2130, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
];

// Map 4 Bridges: Cable-Stayed & Modern Concrete Highway exclusively
const CALDERA_BRIDGES: BattleBridge[] = [
  connectIslands('cal-b01', 'West Rim Concrete Viaduct', CALDERA_ISLANDS[0], CALDERA_ISLANDS[1], 125, 'concrete-highway'),
  connectIslands('cal-b02', 'Southwest Lagoon Highway', CALDERA_ISLANDS[1], CALDERA_ISLANDS[2], 125, 'concrete-highway'),
  connectIslands('cal-b03', 'North Rim Cable-Stayed Span', CALDERA_ISLANDS[0], CALDERA_ISLANDS[3], 130, 'cable-stayed'),
  connectIslands('cal-b04', 'West Lagoon Concrete Viaduct', CALDERA_ISLANDS[1], CALDERA_ISLANDS[4], 120, 'concrete-highway'),
  connectIslands('cal-b05', 'Obsidian Core Cable-Stayed Bridge', CALDERA_ISLANDS[4], CALDERA_ISLANDS[5], 130, 'cable-stayed'),
  connectIslands('cal-b06', 'South Rim Highway Viaduct', CALDERA_ISLANDS[2], CALDERA_ISLANDS[6], 120, 'concrete-highway'),
  connectIslands('cal-b07', 'Obsidian South Highway', CALDERA_ISLANDS[5], CALDERA_ISLANDS[6], 125, 'concrete-highway'),
  connectIslands('cal-b08', 'North Rim Highway Viaduct', CALDERA_ISLANDS[3], CALDERA_ISLANDS[7], 120, 'concrete-highway'),
  connectIslands('cal-b09', 'Core Citadel Cable-Stayed Bridge', CALDERA_ISLANDS[4], CALDERA_ISLANDS[8], 130, 'cable-stayed'),
  connectIslands('cal-b10', 'Grand Central Cable-Stayed Viaduct', CALDERA_ISLANDS[5], CALDERA_ISLANDS[9], 135, 'cable-stayed'),
  connectIslands('cal-b11', 'South Caldera Concrete Viaduct', CALDERA_ISLANDS[6], CALDERA_ISLANDS[10], 120, 'concrete-highway'),
  connectIslands('cal-b12', 'North Channel Concrete Viaduct', CALDERA_ISLANDS[7], CALDERA_ISLANDS[11], 120, 'concrete-highway'),
  connectIslands('cal-b13', 'Citadel East Highway Viaduct', CALDERA_ISLANDS[8], CALDERA_ISLANDS[12], 125, 'concrete-highway'),
  connectIslands('cal-b14', 'Lagoon Express Cable-Stayed Bridge', CALDERA_ISLANDS[9], CALDERA_ISLANDS[12], 135, 'cable-stayed'),
  connectIslands('cal-b15', 'Southeast Rim Concrete Viaduct', CALDERA_ISLANDS[10], CALDERA_ISLANDS[13], 120, 'concrete-highway'),
  connectIslands('cal-b16', 'North Gateway Cable-Stayed Span', CALDERA_ISLANDS[11], CALDERA_ISLANDS[14], 130, 'cable-stayed'),
  connectIslands('cal-b17', 'Sulfur East Concrete Viaduct', CALDERA_ISLANDS[12], CALDERA_ISLANDS[15], 125, 'concrete-highway'),
  connectIslands('cal-b18', 'South Gateway Concrete Viaduct', CALDERA_ISLANDS[13], CALDERA_ISLANDS[15], 120, 'concrete-highway'),
  connectIslands('cal-b19', 'Northeast Mainland Cable-Stayed Bridge', CALDERA_ISLANDS[14], CALDERA_ISLANDS[16], 130, 'cable-stayed'),
  connectIslands('cal-b20', 'East Rim Highway Viaduct', CALDERA_ISLANDS[15], CALDERA_ISLANDS[17], 125, 'concrete-highway'),
  connectIslands('cal-b21', 'East Coastline Concrete Viaduct', CALDERA_ISLANDS[16], CALDERA_ISLANDS[17], 125, 'concrete-highway'),
];

// =========================================================================
// 5. PANAMA ISTHMUS: CONTINENTAL CANAL & LAKE GATUN (4800 x 3200)
// Continental jungle isthmus with 18 varied landmasses, Gatun Lake reservoir,
// lock basin canals, and connected by Concrete Highway & Truss bridges.
// =========================================================================
const PANAMA_ISLANDS: BattleIsland[] = [
  // 0: Colón Atlantic Mainland (Massive continental jungle with Chagres River Canal)
  createIslandEx({
    x: 710,
    y: 770,
    rx: 520,
    ry: 370,
    shape: 'continent',
    style: 'reef',
    seed: 81.4,
    foliage: [
      { x: 700, y: 740, radius: 26, color: '#166534', type: 'tree' },
      { x: 780, y: 830, radius: 22, color: '#14532d', type: 'tree' },
      { x: 630, y: 800, radius: 24, color: '#334155', type: 'bunker' },
      { x: 800, y: 710, radius: 20, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 1: West Miraflores Cape (Curving coastal spit)
  createIslandEx({
    x: 750,
    y: 1610,
    rx: 460,
    ry: 150,
    shape: 'spit',
    style: 'sand',
    headingAngle: -0.15,
    curvature: 0.3,
    seed: 82.8,
    foliage: [
      { x: 730, y: 1570, radius: 24, color: '#14532d', type: 'tree' },
      { x: 820, y: 1680, radius: 22, color: '#166534', type: 'tree' },
    ],
  }),
  // 2: Southwest Pacific Shore (Broad continental headland)
  createIslandEx({
    x: 790,
    y: 2430,
    rx: 470,
    ry: 340,
    shape: 'continent',
    style: 'reef',
    seed: 83.9,
    foliage: [
      { x: 770, y: 2390, radius: 22, color: '#166534', type: 'tree' },
      { x: 850, y: 2490, radius: 24, color: '#14532d', type: 'tree' },
      { x: 710, y: 2450, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
  // 3: North Gatun Dam Isle
  createIslandEx({
    x: 1500,
    y: 670,
    rx: 310,
    ry: 240,
    shape: 'natural',
    style: 'sand',
    seed: 84.5,
    foliage: [
      { x: 1500, y: 650, radius: 22, color: '#14532d', type: 'tree' },
      { x: 1560, y: 610, radius: 20, color: '#334155', type: 'bunker' },
    ],
  }),
  // 4: Gatun Spillway Cay (Small barrier cay)
  createIslandEx({
    x: 1330,
    y: 1190,
    rx: 130,
    ry: 95,
    shape: 'skerry',
    style: 'sand',
    seed: 85.2,
    foliage: [
      { x: 1330, y: 1190, radius: 18, color: '#166534', type: 'tree' },
    ],
  }),
  // 5: Lake Gatun Grand Island (Massive island with Lake Gatun Reservoir)
  createIslandEx({
    x: 1570,
    y: 1810,
    rx: 460,
    ry: 360,
    shape: 'continent',
    style: 'reef',
    seed: 86.7,
    foliage: [
      { x: 1430, y: 1730, radius: 24, color: '#14532d', type: 'tree' },
      { x: 1730, y: 1910, radius: 22, color: '#166534', type: 'tree' },
      { x: 1510, y: 1950, radius: 22, color: '#334155', type: 'bunker' },
    ],
    lake: {
      x: 1570,
      y: 1810,
      radiusX: 140,
      radiusY: 100,
      name: 'Lake Gatun Reservoir',
      waterColor: '#0a3536',
      points: createNaturalIslandPolygon(1570, 1810, 140, 100, 18, 87.3, 0.22),
    },
  }),
  // 6: Culebra Cut Barrier Spit
  createIslandEx({
    x: 1470,
    y: 2470,
    rx: 270,
    ry: 120,
    shape: 'spit',
    style: 'sand',
    headingAngle: 0.18,
    curvature: 0.24,
    seed: 88.4,
    foliage: [
      { x: 1470, y: 2470, radius: 18, color: '#14532d', type: 'tree' },
    ],
  }),
  // 7: North Spillway Skerry (Small islet)
  createIslandEx({
    x: 2130,
    y: 610,
    rx: 110,
    ry: 85,
    shape: 'skerry',
    style: 'sand',
    seed: 89.1,
    foliage: [
      { x: 2130, y: 610, radius: 16, color: '#166534', type: 'tree' },
    ],
  }),
  // 8: Miraflores Locks Bastion (Faceted lock fortress)
  createIslandEx({
    x: 2110,
    y: 1250,
    rx: 310,
    ry: 260,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.35,
    seed: 90.5,
    foliage: [
      { x: 2110, y: 1230, radius: 28, color: '#334155', type: 'bunker' },
      { x: 2180, y: 1310, radius: 20, color: '#475569', type: 'radar' },
      { x: 2040, y: 1280, radius: 20, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 9: Pedro Miguel Lock Fort (Faceted star redoubt)
  createIslandEx({
    x: 2170,
    y: 1950,
    rx: 290,
    ry: 240,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.3,
    seed: 91.8,
    foliage: [
      { x: 2170, y: 1930, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2230, y: 2010, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 10: South Causeway Key (Skerry needle)
  createIslandEx({
    x: 2150,
    y: 2570,
    rx: 120,
    ry: 90,
    shape: 'skerry',
    style: 'sand',
    seed: 92.6,
    foliage: [
      { x: 2150, y: 2570, radius: 18, color: '#14532d', type: 'tree' },
    ],
  }),
  // 11: East Gatun Spit Barrier
  createIslandEx({
    x: 2770,
    y: 730,
    rx: 280,
    ry: 130,
    shape: 'spit',
    style: 'sand',
    headingAngle: 0.15,
    curvature: 0.25,
    seed: 93.3,
    foliage: [
      { x: 2770, y: 730, radius: 20, color: '#166534', type: 'tree' },
    ],
  }),
  // 12: Ancon Continental Mainland (Massive island with Laguna Ancon and Gamboa Cut)
  createIslandEx({
    x: 2850,
    y: 1510,
    rx: 460,
    ry: 370,
    shape: 'continent',
    style: 'reef',
    seed: 94.7,
    foliage: [
      { x: 2730, y: 1430, radius: 24, color: '#14532d', type: 'tree' },
      { x: 2970, y: 1590, radius: 22, color: '#166534', type: 'tree' },
      { x: 2810, y: 1650, radius: 22, color: '#475569', type: 'radar' },
    ],
    lake: {
      x: 2850,
      y: 1510,
      radiusX: 130,
      radiusY: 90,
      name: 'Laguna Ancon',
      waterColor: '#0a3536',
      points: createNaturalIslandPolygon(2850, 1510, 130, 90, 18, 95.5, 0.22),
    },
  }),
  // 13: Flamenco Island Key (Small islet)
  createIslandEx({
    x: 2810,
    y: 2370,
    rx: 130,
    ry: 95,
    shape: 'skerry',
    style: 'sand',
    seed: 96.1,
    foliage: [
      { x: 2810, y: 2370, radius: 18, color: '#14532d', type: 'tree' },
    ],
  }),
  // 14: Northeast Atlantic Headland
  createIslandEx({
    x: 3450,
    y: 710,
    rx: 340,
    ry: 260,
    shape: 'continent',
    style: 'sand',
    seed: 97.4,
    foliage: [
      { x: 3450, y: 690, radius: 22, color: '#14532d', type: 'tree' },
      { x: 3520, y: 770, radius: 20, color: '#166534', type: 'tree' },
    ],
  }),
  // 15: East Breakwater Spit
  createIslandEx({
    x: 3510,
    y: 1570,
    rx: 330,
    ry: 130,
    shape: 'spit',
    style: 'sand',
    headingAngle: -0.16,
    curvature: 0.28,
    seed: 98.8,
    foliage: [
      { x: 3490, y: 1540, radius: 22, color: '#166534', type: 'tree' },
      { x: 3570, y: 1630, radius: 20, color: '#14532d', type: 'tree' },
    ],
  }),
  // 16: Panama City Atlantic Terminal (Continental harbor)
  createIslandEx({
    x: 4110,
    y: 870,
    rx: 490,
    ry: 370,
    shape: 'continent',
    style: 'harbor',
    seed: 99.6,
    foliage: [
      { x: 4090, y: 830, radius: 26, color: '#334155', type: 'bunker' },
      { x: 4170, y: 930, radius: 22, color: '#14532d', type: 'tree' },
      { x: 4230, y: 810, radius: 22, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 17: Balboa Pacific Terminal (Massive continental landmass)
  createIslandEx({
    x: 4070,
    y: 2210,
    rx: 520,
    ry: 390,
    shape: 'continent',
    style: 'sand',
    seed: 100.9,
    foliage: [
      { x: 4050, y: 2170, radius: 26, color: '#334155', type: 'bunker' },
      { x: 4140, y: 2280, radius: 22, color: '#166534', type: 'tree' },
      { x: 4210, y: 2140, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
];

// Map 5 Bridges: Concrete Highway Viaducts & Steel Truss bridges
const PANAMA_BRIDGES: BattleBridge[] = [
  connectIslands('pan-b01', 'Atlantic Canal Express Viaduct', PANAMA_ISLANDS[0], PANAMA_ISLANDS[1], 125, 'concrete-highway'),
  connectIslands('pan-b02', 'Miraflores Approach Highway', PANAMA_ISLANDS[1], PANAMA_ISLANDS[2], 125, 'concrete-highway'),
  connectIslands('pan-b03', 'Gatun Dam Bailey Truss', PANAMA_ISLANDS[0], PANAMA_ISLANDS[3], 125, 'truss'),
  connectIslands('pan-b04', 'West Canal Highway Viaduct', PANAMA_ISLANDS[1], PANAMA_ISLANDS[4], 120, 'concrete-highway'),
  connectIslands('pan-b05', 'Lake Gatun Express Causeway', PANAMA_ISLANDS[4], PANAMA_ISLANDS[5], 125, 'concrete-highway'),
  connectIslands('pan-b06', 'South Pacific Highway Viaduct', PANAMA_ISLANDS[2], PANAMA_ISLANDS[6], 120, 'concrete-highway'),
  connectIslands('pan-b07', 'Gatun South Channel Truss', PANAMA_ISLANDS[5], PANAMA_ISLANDS[6], 125, 'truss'),
  connectIslands('pan-b08', 'North Spillway Highway Viaduct', PANAMA_ISLANDS[3], PANAMA_ISLANDS[7], 120, 'concrete-highway'),
  connectIslands('pan-b09', 'Miraflores Central Truss Bridge', PANAMA_ISLANDS[4], PANAMA_ISLANDS[8], 125, 'truss'),
  connectIslands('pan-b10', 'Mid-Canal Grand Express Viaduct', PANAMA_ISLANDS[5], PANAMA_ISLANDS[9], 130, 'concrete-highway'),
  connectIslands('pan-b11', 'South Causeway Highway Viaduct', PANAMA_ISLANDS[6], PANAMA_ISLANDS[10], 120, 'concrete-highway'),
  connectIslands('pan-b12', 'North Channel Highway Viaduct', PANAMA_ISLANDS[7], PANAMA_ISLANDS[11], 120, 'concrete-highway'),
  connectIslands('pan-b13', 'Pedro Miguel Lock Truss Bridge', PANAMA_ISLANDS[8], PANAMA_ISLANDS[12], 125, 'truss'),
  connectIslands('pan-b14', 'Culebra Cut Grand Viaduct', PANAMA_ISLANDS[9], PANAMA_ISLANDS[12], 130, 'concrete-highway'),
  connectIslands('pan-b15', 'Southeast Causeway Viaduct', PANAMA_ISLANDS[10], PANAMA_ISLANDS[13], 120, 'concrete-highway'),
  connectIslands('pan-b16', 'North Gateway Truss Bridge', PANAMA_ISLANDS[11], PANAMA_ISLANDS[14], 125, 'truss'),
  connectIslands('pan-b17', 'Ancon East Highway Viaduct', PANAMA_ISLANDS[12], PANAMA_ISLANDS[15], 125, 'concrete-highway'),
  connectIslands('pan-b18', 'South Gateway Highway Viaduct', PANAMA_ISLANDS[13], PANAMA_ISLANDS[15], 120, 'concrete-highway'),
  connectIslands('pan-b19', 'Northeast Atlantic Viaduct', PANAMA_ISLANDS[14], PANAMA_ISLANDS[16], 125, 'concrete-highway'),
  connectIslands('pan-b20', 'East Coastline Express Viaduct', PANAMA_ISLANDS[15], PANAMA_ISLANDS[17], 125, 'concrete-highway'),
  connectIslands('pan-b21', 'Pacific Coastline Truss Bridge', PANAMA_ISLANDS[16], PANAMA_ISLANDS[17], 125, 'truss'),
];

// =========================================================================
// 6. BALTIC IRON STRAITS: BASTION CITADELS & SEA FORTS (4800 x 3200)
// Cold war naval fortresses and bastions, submarine pens, radar skerries,
// and connected exclusively by Heavy Through-Truss & Bascule Drawbridges.
// =========================================================================
const BALTIC_ISLANDS: BattleIsland[] = [
  // 0: Kronstadt Western Naval Citadel (Massive octagonal naval bastion with basin canal)
  createIslandEx({
    x: 710,
    y: 770,
    rx: 520,
    ry: 380,
    shape: 'bastion',
    style: 'industrial',
    facets: 8,
    pointiness: 0.35,
    seed: 101.3,
    foliage: [
      { x: 690, y: 730, radius: 26, color: '#334155', type: 'bunker' },
      { x: 770, y: 830, radius: 22, color: '#f59e0b', type: 'crane' },
      { x: 620, y: 790, radius: 22, color: '#38bdf8', type: 'tower' },
    ],
  }),
  // 1: Fort Alexander Naval Redoubt (Hexagonal bastion fortress)
  createIslandEx({
    x: 750,
    y: 1610,
    rx: 450,
    ry: 330,
    shape: 'bastion',
    style: 'industrial',
    facets: 6,
    pointiness: 0.32,
    seed: 102.7,
    foliage: [
      { x: 730, y: 1570, radius: 26, color: '#334155', type: 'bunker' },
      { x: 820, y: 1680, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
  // 2: South Bastion Seawall Spit (Long concrete breakwater spit)
  createIslandEx({
    x: 790,
    y: 2430,
    rx: 480,
    ry: 140,
    shape: 'spit',
    style: 'harbor',
    headingAngle: -0.14,
    curvature: 0.28,
    seed: 103.9,
    foliage: [
      { x: 770, y: 2390, radius: 22, color: '#334155', type: 'bunker' },
      { x: 850, y: 2490, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 3: Peter the Great Fort
  createIslandEx({
    x: 1500,
    y: 670,
    rx: 320,
    ry: 250,
    shape: 'bastion',
    style: 'industrial',
    facets: 6,
    pointiness: 0.3,
    seed: 104.5,
    foliage: [
      { x: 1500, y: 650, radius: 24, color: '#334155', type: 'bunker' },
      { x: 1560, y: 610, radius: 20, color: '#475569', type: 'radar' },
    ],
  }),
  // 4: Fairway Beacon Skerry (Small granite needle)
  createIslandEx({
    x: 1330,
    y: 1190,
    rx: 130,
    ry: 95,
    shape: 'skerry',
    style: 'rock',
    seed: 105.1,
    foliage: [
      { x: 1330, y: 1190, radius: 18, color: '#475569', type: 'rock' },
    ],
  }),
  // 5: Suomenlinna Central Star Fortress (Massive bastion fortress with interior harbor moat)
  createIslandEx({
    x: 1570,
    y: 1810,
    rx: 460,
    ry: 360,
    shape: 'bastion',
    style: 'harbor',
    facets: 8,
    pointiness: 0.38,
    seed: 106.8,
    foliage: [
      { x: 1430, y: 1730, radius: 28, color: '#334155', type: 'bunker' },
      { x: 1730, y: 1910, radius: 22, color: '#f59e0b', type: 'crane' },
      { x: 1510, y: 1950, radius: 22, color: '#38bdf8', type: 'tower' },
    ],
    lake: {
      x: 1570,
      y: 1810,
      radiusX: 135,
      radiusY: 95,
      name: 'Fortress Inner Moat',
      waterColor: '#0a1d2e',
      points: createNaturalIslandPolygon(1570, 1810, 135, 95, 18, 107.3, 0.2),
    },
  }),
  // 6: Torpedo Station Spit
  createIslandEx({
    x: 1470,
    y: 2470,
    rx: 270,
    ry: 120,
    shape: 'spit',
    style: 'harbor',
    headingAngle: 0.18,
    curvature: 0.22,
    seed: 108.5,
    foliage: [
      { x: 1470, y: 2470, radius: 20, color: '#334155', type: 'bunker' },
    ],
  }),
  // 7: North Beacon Skerry (Needle rock)
  createIslandEx({
    x: 2130,
    y: 610,
    rx: 110,
    ry: 85,
    shape: 'skerry',
    style: 'rock',
    seed: 109.2,
    foliage: [
      { x: 2130, y: 610, radius: 16, color: '#475569', type: 'rock' },
    ],
  }),
  // 8: Admiral Nelson Bastion (Faceted star redoubt)
  createIslandEx({
    x: 2110,
    y: 1250,
    rx: 310,
    ry: 260,
    shape: 'bastion',
    style: 'industrial',
    facets: 6,
    pointiness: 0.35,
    seed: 110.6,
    foliage: [
      { x: 2110, y: 1230, radius: 28, color: '#334155', type: 'bunker' },
      { x: 2180, y: 1310, radius: 22, color: '#475569', type: 'radar' },
    ],
  }),
  // 9: Mid-Sound Citadel (Faceted naval fortress)
  createIslandEx({
    x: 2170,
    y: 1950,
    rx: 290,
    ry: 240,
    shape: 'bastion',
    style: 'harbor',
    facets: 6,
    pointiness: 0.3,
    seed: 111.9,
    foliage: [
      { x: 2170, y: 1930, radius: 26, color: '#334155', type: 'bunker' },
      { x: 2230, y: 2000, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 10: South Minefield Skerry (Small rock)
  createIslandEx({
    x: 2150,
    y: 2570,
    rx: 120,
    ry: 90,
    shape: 'skerry',
    style: 'rock',
    seed: 112.7,
    foliage: [
      { x: 2150, y: 2570, radius: 18, color: '#475569', type: 'rock' },
    ],
  }),
  // 11: Submarine Pen Spit Barrier
  createIslandEx({
    x: 2770,
    y: 730,
    rx: 280,
    ry: 130,
    shape: 'spit',
    style: 'industrial',
    headingAngle: 0.15,
    curvature: 0.25,
    seed: 113.3,
    foliage: [
      { x: 2770, y: 730, radius: 22, color: '#334155', type: 'bunker' },
    ],
  }),
  // 12: Gustavsvärn Fortress Island (Massive island with Gustavsvärn Basin and iron canal)
  createIslandEx({
    x: 2850,
    y: 1510,
    rx: 460,
    ry: 370,
    shape: 'continent',
    style: 'industrial',
    seed: 114.8,
    foliage: [
      { x: 2730, y: 1430, radius: 28, color: '#334155', type: 'bunker' },
      { x: 2970, y: 1590, radius: 22, color: '#f59e0b', type: 'crane' },
      { x: 2810, y: 1650, radius: 22, color: '#475569', type: 'radar' },
    ],
    lake: {
      x: 2850,
      y: 1510,
      radiusX: 130,
      radiusY: 90,
      name: 'Gustavsvärn Basin',
      waterColor: '#0a1d2e',
      points: createNaturalIslandPolygon(2850, 1510, 130, 90, 18, 115.6, 0.2),
    },
  }),
  // 13: Radar Mast Skerry (Needle rock)
  createIslandEx({
    x: 2810,
    y: 2370,
    rx: 120,
    ry: 90,
    shape: 'skerry',
    style: 'rock',
    seed: 116.2,
    foliage: [
      { x: 2810, y: 2370, radius: 18, color: '#475569', type: 'radar' },
    ],
  }),
  // 14: North Gate Coastal Battery
  createIslandEx({
    x: 3450,
    y: 710,
    rx: 340,
    ry: 260,
    shape: 'continent',
    style: 'industrial',
    seed: 117.5,
    foliage: [
      { x: 3450, y: 690, radius: 26, color: '#334155', type: 'bunker' },
      { x: 3520, y: 770, radius: 20, color: '#475569', type: 'radar' },
    ],
  }),
  // 15: East Breakwater Spit
  createIslandEx({
    x: 3510,
    y: 1570,
    rx: 330,
    ry: 130,
    shape: 'spit',
    style: 'harbor',
    headingAngle: -0.15,
    curvature: 0.28,
    seed: 118.9,
    foliage: [
      { x: 3490, y: 1540, radius: 22, color: '#334155', type: 'bunker' },
      { x: 3570, y: 1630, radius: 20, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 16: East Bastion Shipyard Mainland (Huge naval industrial shipyard)
  createIslandEx({
    x: 4110,
    y: 870,
    rx: 490,
    ry: 370,
    shape: 'continent',
    style: 'industrial',
    seed: 119.7,
    foliage: [
      { x: 4090, y: 830, radius: 28, color: '#334155', type: 'bunker' },
      { x: 4170, y: 930, radius: 22, color: '#f59e0b', type: 'crane' },
      { x: 4230, y: 810, radius: 22, color: '#f59e0b', type: 'crane' },
    ],
  }),
  // 17: South Fortified Headland (Massive coastal bastion)
  createIslandEx({
    x: 4070,
    y: 2210,
    rx: 520,
    ry: 390,
    shape: 'continent',
    style: 'rock',
    seed: 120.9,
    foliage: [
      { x: 4050, y: 2170, radius: 28, color: '#334155', type: 'bunker' },
      { x: 4140, y: 2280, radius: 22, color: '#475569', type: 'radar' },
      { x: 4210, y: 2140, radius: 22, color: '#38bdf8', type: 'tower' },
    ],
  }),
];

// Map 6 Bridges: Heavy Through-Truss & Bascule Drawbridges
const BALTIC_BRIDGES: BattleBridge[] = [
  connectIslands('bal-b01', 'Kronstadt Western Truss Viaduct', BALTIC_ISLANDS[0], BALTIC_ISLANDS[1], 125, 'truss'),
  connectIslands('bal-b02', 'South Seawall Bascule Drawbridge', BALTIC_ISLANDS[1], BALTIC_ISLANDS[2], 120, 'drawbridge'),
  connectIslands('bal-b03', 'Peter Fort Heavy Truss Span', BALTIC_ISLANDS[0], BALTIC_ISLANDS[3], 125, 'truss'),
  connectIslands('bal-b04', 'Fairway Bascule Drawbridge', BALTIC_ISLANDS[1], BALTIC_ISLANDS[4], 115, 'drawbridge'),
  connectIslands('bal-b05', 'Suomenlinna Grand Truss Bridge', BALTIC_ISLANDS[4], BALTIC_ISLANDS[5], 125, 'truss'),
  connectIslands('bal-b06', 'South Torpedo Station Drawbridge', BALTIC_ISLANDS[2], BALTIC_ISLANDS[6], 115, 'drawbridge'),
  connectIslands('bal-b07', 'Suomenlinna South Channel Truss', BALTIC_ISLANDS[5], BALTIC_ISLANDS[6], 125, 'truss'),
  connectIslands('bal-b08', 'North Beacon Bascule Drawbridge', BALTIC_ISLANDS[3], BALTIC_ISLANDS[7], 115, 'drawbridge'),
  connectIslands('bal-b09', 'Admiral Nelson Bastion Truss', BALTIC_ISLANDS[4], BALTIC_ISLANDS[8], 125, 'truss'),
  connectIslands('bal-b10', 'Mid-Sound Heavy Truss Viaduct', BALTIC_ISLANDS[5], BALTIC_ISLANDS[9], 130, 'truss'),
  connectIslands('bal-b11', 'South Minefield Bascule Drawbridge', BALTIC_ISLANDS[6], BALTIC_ISLANDS[10], 115, 'drawbridge'),
  connectIslands('bal-b12', 'North Channel Heavy Truss', BALTIC_ISLANDS[7], BALTIC_ISLANDS[11], 125, 'truss'),
  connectIslands('bal-b13', 'Gustavsvärn West Drawbridge', BALTIC_ISLANDS[8], BALTIC_ISLANDS[12], 120, 'drawbridge'),
  connectIslands('bal-b14', 'Main Iron Strait Maritime Drawbridge', BALTIC_ISLANDS[9], BALTIC_ISLANDS[12], 130, 'drawbridge'),
  connectIslands('bal-b15', 'Southeast Skerry Drawbridge', BALTIC_ISLANDS[10], BALTIC_ISLANDS[13], 115, 'drawbridge'),
  connectIslands('bal-b16', 'North Gateway Heavy Truss Span', BALTIC_ISLANDS[11], BALTIC_ISLANDS[14], 125, 'truss'),
  connectIslands('bal-b17', 'Gustavsvärn East Bascule Drawbridge', BALTIC_ISLANDS[12], BALTIC_ISLANDS[15], 115, 'drawbridge'),
  connectIslands('bal-b18', 'South Gateway Bascule Drawbridge', BALTIC_ISLANDS[13], BALTIC_ISLANDS[15], 115, 'drawbridge'),
  connectIslands('bal-b19', 'Northeast Battery Heavy Truss', BALTIC_ISLANDS[14], BALTIC_ISLANDS[16], 125, 'truss'),
  connectIslands('bal-b20', 'East Mainland Bascule Drawbridge', BALTIC_ISLANDS[15], BALTIC_ISLANDS[17], 120, 'drawbridge'),
  connectIslands('bal-b21', 'East Coastline Heavy Truss Span', BALTIC_ISLANDS[16], BALTIC_ISLANDS[17], 125, 'truss'),
];

export const BATTLE_MAPS: BattleMapConfig[] = [
  // =========================================================================
  // 1. STRAITS OF GIBRALTAR: BROKEN ARCHIPELAGO
  // =========================================================================
  {
    id: 'strait-archipelago',
    name: 'Straits of Gibraltar: Broken Archipelago',
    theme: 'Mediterranean Archipelago • Stone Arch & Timber Trestle Bridges',
    description: '18 scattered, organic islands forming an intricate Mediterranean archipelago with two inland lakes (Lago de la Luna & Laguna de Alborán). All land areas are fully connected by Roman stone arches and heavy timber canal trestles, surrounded by an open perimeter sea.',
    dimensions: { width: 4800, height: 3200 },
    waterColors: {
      deep: '#0f2942',
      mid: '#153b5c',
      surface: '#1d507d',
      wave: 'rgba(210, 230, 250, 0.14)',
      boundary: 'rgba(100, 140, 180, 0.35)',
    },
    islandStyle: 'sand',
    ambientWeather: 'clear',
    spawnPoints: {
      playerLand: [
        { x: 720, y: 750 },
        { x: 650, y: 850 },
        { x: 760, y: 1600 },
        { x: 680, y: 1700 },
        { x: 800, y: 2450 },
        { x: 720, y: 2550 },
        { x: 800, y: 680 },
        { x: 840, y: 1520 },
      ],
      playerWater: [
        { x: 280, y: 1200 },
        { x: 280, y: 1600 },
        { x: 280, y: 2000 },
        { x: 450, y: 1100 },
        { x: 450, y: 2100 },
        { x: 550, y: 1600 },
      ],
      enemyLand: [
        { x: 4120, y: 880 },
        { x: 4200, y: 980 },
        { x: 4080, y: 2220 },
        { x: 4160, y: 2320 },
        { x: 3460, y: 720 },
        { x: 3520, y: 1580 },
        { x: 4050, y: 800 },
        { x: 4020, y: 2120 },
      ],
      enemyWater: [
        { x: 4520, y: 1200 },
        { x: 4520, y: 1600 },
        { x: 4520, y: 2000 },
        { x: 4350, y: 1100 },
        { x: 4350, y: 2100 },
        { x: 4250, y: 1600 },
      ],
    },
    obstacles: GIBRALTAR_ISLANDS,
    bridges: GIBRALTAR_BRIDGES,
  },

  // =========================================================================
  // 2. SUNDARBANS DELTA: BRAIDED MANGROVE ARCHIPELAGO
  // =========================================================================
  {
    id: 'estuary-delta',
    name: 'Sundarbans Delta: Braided Mangrove Archipelago',
    theme: 'Tropical River Delta • Military Pontoon & Steel Truss Bridges',
    description: '18 lush mangrove islands and alluvial banks framing winding delta canals and two inland lakes (Emerald Delta Lake & Heron Lagoon). All land areas are fully linked by tactical ribbon pontoons and riveted steel through-truss spans.',
    dimensions: { width: 4800, height: 3200 },
    waterColors: {
      deep: '#0f2b24',
      mid: '#163f35',
      surface: '#1e5447',
      wave: 'rgba(180, 225, 200, 0.12)',
      boundary: 'rgba(90, 150, 125, 0.35)',
    },
    islandStyle: 'sand',
    ambientWeather: 'storm',
    spawnPoints: {
      playerLand: [
        { x: 700, y: 780 },
        { x: 630, y: 880 },
        { x: 740, y: 1620 },
        { x: 670, y: 1720 },
        { x: 780, y: 2440 },
        { x: 700, y: 2540 },
        { x: 780, y: 700 },
        { x: 820, y: 1540 },
      ],
      playerWater: [
        { x: 280, y: 1200 },
        { x: 280, y: 1600 },
        { x: 280, y: 2000 },
        { x: 450, y: 1100 },
        { x: 450, y: 2100 },
        { x: 550, y: 1600 },
      ],
      enemyLand: [
        { x: 4100, y: 860 },
        { x: 4180, y: 960 },
        { x: 4060, y: 2200 },
        { x: 4140, y: 2300 },
        { x: 3440, y: 700 },
        { x: 3500, y: 1560 },
        { x: 4020, y: 800 },
        { x: 4000, y: 2120 },
      ],
      enemyWater: [
        { x: 4520, y: 1200 },
        { x: 4520, y: 1600 },
        { x: 4520, y: 2000 },
        { x: 4350, y: 1100 },
        { x: 4350, y: 2100 },
        { x: 4250, y: 1600 },
      ],
    },
    obstacles: DELTA_ISLANDS,
    bridges: DELTA_BRIDGES,
  },

  // =========================================================================
  // 3. NORDIC FJORDS: GLACIAL SOUND & SKERRIES
  // =========================================================================
  {
    id: 'polar-fjord',
    name: 'Nordic Fjords: Glacial Sound & Skerries',
    theme: 'Sub-Zero Sound • High-Span Suspension & Bascule Drawbridges',
    description: '18 jagged granite skerries and permafrost bluffs flanking deep navigable glacial sounds and two meltwater tarns. Seamlessly bridged by soaring cable suspension towers and heavy counterweighted maritime bascule drawbridges.',
    dimensions: { width: 4800, height: 3200 },
    waterColors: {
      deep: '#0b1f2e',
      mid: '#122c40',
      surface: '#1b3c54',
      wave: 'rgba(220, 240, 255, 0.16)',
      boundary: 'rgba(120, 160, 195, 0.35)',
    },
    islandStyle: 'ice',
    ambientWeather: 'snow',
    spawnPoints: {
      playerLand: [
        { x: 710, y: 770 },
        { x: 640, y: 870 },
        { x: 750, y: 1610 },
        { x: 680, y: 1710 },
        { x: 790, y: 2430 },
        { x: 710, y: 2530 },
        { x: 790, y: 700 },
        { x: 830, y: 1530 },
      ],
      playerWater: [
        { x: 280, y: 1200 },
        { x: 280, y: 1600 },
        { x: 280, y: 2000 },
        { x: 450, y: 1100 },
        { x: 450, y: 2100 },
        { x: 550, y: 1600 },
      ],
      enemyLand: [
        { x: 4110, y: 870 },
        { x: 4190, y: 970 },
        { x: 4070, y: 2210 },
        { x: 4150, y: 2310 },
        { x: 3450, y: 710 },
        { x: 3510, y: 1570 },
        { x: 4030, y: 810 },
        { x: 4010, y: 2130 },
      ],
      enemyWater: [
        { x: 4520, y: 1200 },
        { x: 4520, y: 1600 },
        { x: 4520, y: 2000 },
        { x: 4350, y: 1100 },
        { x: 4350, y: 2100 },
        { x: 4250, y: 1600 },
      ],
    },
    obstacles: FJORD_ISLANDS,
    bridges: FJORD_BRIDGES,
  },

  // =========================================================================
  // 4. SECTOR CALDERA: SUNKEN VOLCANIC RING & CORE CITADEL
  // =========================================================================
  {
    id: 'volcano-atoll',
    name: 'Sector Caldera: Sunken Volcanic Ring & Core Citadel',
    theme: 'Volcanic Atoll • Concrete Highway Viaducts & Cable-Stayed Bridges',
    description: '18 scattered basalt islands and ramparts encircling an expansive inner caldera sea with dual breached sea gates and two volcanic vent lakes. Engineered with modern multi-lane concrete highway viaducts and high-capacity cable-stayed spans.',
    dimensions: { width: 4800, height: 3200 },
    waterColors: {
      deep: '#121a22',
      mid: '#1a2632',
      surface: '#243444',
      wave: 'rgba(195, 210, 225, 0.10)',
      boundary: 'rgba(110, 130, 150, 0.30)',
    },
    islandStyle: 'rock',
    ambientWeather: 'magma',
    spawnPoints: {
      playerLand: [
        { x: 710, y: 760 },
        { x: 640, y: 860 },
        { x: 750, y: 1600 },
        { x: 680, y: 1700 },
        { x: 790, y: 2420 },
        { x: 710, y: 2520 },
        { x: 790, y: 690 },
        { x: 830, y: 1520 },
      ],
      playerWater: [
        { x: 280, y: 1200 },
        { x: 280, y: 1600 },
        { x: 280, y: 2000 },
        { x: 450, y: 1100 },
        { x: 450, y: 2100 },
        { x: 550, y: 1600 },
      ],
      enemyLand: [
        { x: 4110, y: 860 },
        { x: 4190, y: 960 },
        { x: 4070, y: 2200 },
        { x: 4150, y: 2300 },
        { x: 3450, y: 700 },
        { x: 3510, y: 1560 },
        { x: 4030, y: 800 },
        { x: 4010, y: 2120 },
      ],
      enemyWater: [
        { x: 4520, y: 1200 },
        { x: 4520, y: 1600 },
        { x: 4520, y: 2000 },
        { x: 4350, y: 1100 },
        { x: 4350, y: 2100 },
        { x: 4250, y: 1600 },
      ],
    },
    obstacles: CALDERA_ISLANDS,
    bridges: CALDERA_BRIDGES,
  },
  // =========================================================================
  // 5. PANAMA ISTHMUS: CONTINENTAL CANAL & LAKE GATUN
  // =========================================================================
  {
    id: 'panama-canal',
    name: 'Panama Isthmus: Continental Canal',
    theme: 'Tropical Jungle Isthmus • Lock Basins & Modern Viaducts',
    description: '18 diverse continental landmasses, curving spits, and lock bastions cut by the Chagres River Canal and Lake Gatun Reservoir. Fully crossed by high-speed concrete viaducts and heavy steel truss spans.',
    dimensions: { width: 4800, height: 3200 },
    waterColors: {
      deep: '#0f2736',
      mid: '#15394d',
      surface: '#1e4d66',
      wave: 'rgba(210, 230, 240, 0.11)',
      boundary: 'rgba(105, 135, 155, 0.30)',
    },
    islandStyle: 'reef',
    ambientWeather: 'clear',
    spawnPoints: {
      playerLand: [
        { x: 710, y: 770 },
        { x: 640, y: 870 },
        { x: 750, y: 1610 },
        { x: 670, y: 1710 },
        { x: 790, y: 2430 },
        { x: 710, y: 2530 },
        { x: 790, y: 700 },
        { x: 830, y: 1530 },
      ],
      playerWater: [
        { x: 280, y: 1200 },
        { x: 280, y: 1600 },
        { x: 280, y: 2000 },
        { x: 450, y: 1100 },
        { x: 450, y: 2100 },
        { x: 550, y: 1600 },
      ],
      enemyLand: [
        { x: 4110, y: 870 },
        { x: 4190, y: 970 },
        { x: 4070, y: 2210 },
        { x: 4150, y: 2310 },
        { x: 3450, y: 710 },
        { x: 3510, y: 1570 },
        { x: 4030, y: 810 },
        { x: 4010, y: 2130 },
      ],
      enemyWater: [
        { x: 4520, y: 1200 },
        { x: 4520, y: 1600 },
        { x: 4520, y: 2000 },
        { x: 4350, y: 1100 },
        { x: 4350, y: 2100 },
        { x: 4250, y: 1600 },
      ],
    },
    obstacles: PANAMA_ISLANDS,
    bridges: PANAMA_BRIDGES,
  },
  // =========================================================================
  // 6. BALTIC IRON STRAITS: BASTION CITADELS & SEA FORTS
  // =========================================================================
  {
    id: 'baltic-fortress',
    name: 'Baltic Iron Straits: Bastion Citadel',
    theme: 'Cold War Naval Redoubts • Heavy Through-Truss & Drawbridges',
    description: '18 faceted star fortress bastions, industrial drydock canals, and granite skerries guarding the stormy Baltic sea lane. Connected by heavy industrial through-trusses and bascule drawbridges.',
    dimensions: { width: 4800, height: 3200 },
    waterColors: {
      deep: '#06131f',
      mid: '#0b2034',
      surface: '#112f4c',
      wave: 'rgba(180, 210, 235, 0.16)',
      boundary: 'rgba(100, 130, 160, 0.4)',
    },
    islandStyle: 'industrial',
    ambientWeather: 'storm',
    spawnPoints: {
      playerLand: [
        { x: 710, y: 770 },
        { x: 640, y: 870 },
        { x: 750, y: 1610 },
        { x: 670, y: 1710 },
        { x: 790, y: 2430 },
        { x: 710, y: 2530 },
        { x: 790, y: 700 },
        { x: 830, y: 1530 },
      ],
      playerWater: [
        { x: 280, y: 1200 },
        { x: 280, y: 1600 },
        { x: 280, y: 2000 },
        { x: 450, y: 1100 },
        { x: 450, y: 2100 },
        { x: 550, y: 1600 },
      ],
      enemyLand: [
        { x: 4110, y: 870 },
        { x: 4190, y: 970 },
        { x: 4070, y: 2210 },
        { x: 4150, y: 2310 },
        { x: 3450, y: 710 },
        { x: 3510, y: 1570 },
        { x: 4030, y: 810 },
        { x: 4010, y: 2130 },
      ],
      enemyWater: [
        { x: 4520, y: 1200 },
        { x: 4520, y: 1600 },
        { x: 4520, y: 2000 },
        { x: 4350, y: 1100 },
        { x: 4350, y: 2100 },
        { x: 4250, y: 1600 },
      ],
    },
    obstacles: BALTIC_ISLANDS,
    bridges: BALTIC_BRIDGES,
  },
];

export const BATTLE_MAP_MAP = new Map<string, BattleMapConfig>(
  BATTLE_MAPS.map(m => [m.id, m])
);

