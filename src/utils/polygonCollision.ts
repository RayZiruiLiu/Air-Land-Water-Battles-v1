/**
 * Precise 2D polygon collision and intersection utilities.
 * Ensures ship hulls, projectiles, and AI pathfinding interact with the
 * exact visible geometry of map obstacles, rather than circular approximations.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface EdgeDistanceResult {
  distance: number;
  closestX: number;
  closestY: number;
  normalX: number;
  normalY: number;
  isInside: boolean;
}

/**
 * Standard ray-casting point-in-polygon test
 */
export function isPointInPolygon(px: number, py: number, polygon: Point2D[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates the shortest distance from a point to a line segment [a, b].
 */
export function distancePointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { dist: number; closestX: number; closestY: number; nx: number; ny: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 0.0001) {
    const d = Math.hypot(px - ax, py - ay);
    return {
      dist: d,
      closestX: ax,
      closestY: ay,
      nx: d > 0.001 ? (px - ax) / d : 0,
      ny: d > 0.001 ? (py - ay) / d : 1,
    };
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  const dist = Math.hypot(px - closestX, py - closestY);

  let nx = 0;
  let ny = 0;
  if (dist > 0.001) {
    nx = (px - closestX) / dist;
    ny = (py - closestY) / dist;
  } else {
    // Normal perpendicular to segment
    const edgeLen = Math.sqrt(lenSq);
    nx = -dy / edgeLen;
    ny = dx / edgeLen;
  }

  return { dist, closestX, closestY, nx, ny };
}

/**
 * Calculates the exact distance and outward push normal from a point to a polygon.
 * Ensures normalX and normalY consistently point OUTWARD into water.
 */
export function getPointPolygonDistance(px: number, py: number, polygon: Point2D[]): EdgeDistanceResult {
  const inside = isPointInPolygon(px, py, polygon);
  let minDist = Infinity;
  let bestClosestX = px;
  let bestClosestY = py;
  let bestOutwardNx = 0;
  let bestOutwardNy = 1;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ax = polygon[j].x;
    const ay = polygon[j].y;
    const bx = polygon[i].x;
    const by = polygon[i].y;

    const res = distancePointToSegment(px, py, ax, ay, bx, by);
    if (res.dist < minDist) {
      minDist = res.dist;
      bestClosestX = res.closestX;
      bestClosestY = res.closestY;

      // Determine the unambiguous outward normal for this polygon edge
      const dx = bx - ax;
      const dy = by - ay;
      const edgeLen = Math.hypot(dx, dy);
      if (edgeLen > 0.0001) {
        let candNx = -dy / edgeLen;
        let candNy = dx / edgeLen;
        const midX = (ax + bx) * 0.5;
        const midY = (ay + by) * 0.5;
        // If midpoint + normal is inside the polygon, normal points inward; flip it to point outward
        if (isPointInPolygon(midX + candNx * 3, midY + candNy * 3, polygon)) {
          candNx = -candNx;
          candNy = -candNy;
        }
        bestOutwardNx = candNx;
        bestOutwardNy = candNy;
      }
    }
  }

  if (inside) {
    return {
      distance: -minDist,
      closestX: bestClosestX,
      closestY: bestClosestY,
      normalX: bestOutwardNx,
      normalY: bestOutwardNy,
      isInside: true,
    };
  }

  return {
    distance: minDist,
    closestX: bestClosestX,
    closestY: bestClosestY,
    normalX: bestOutwardNx,
    normalY: bestOutwardNy,
    isInside: false,
  };
}

/**
 * Computes land clearance for a point: returns whether the point is on land,
 * distance to water/shoreline (positive when on land, negative when in water),
 * and the inward normal pointing back onto safe land.
 * Correctly handles overlapping polygons (such as bridges connecting deeply into islands)
 * by ignoring internal seams submerged beneath overlapping terrain.
 */
export function getLandClearance(
  px: number,
  py: number,
  landPolygons: Point2D[][]
): { onLand: boolean; distanceToWater: number; inwardNx: number; inwardNy: number; closestX: number; closestY: number } {
  if (!landPolygons || landPolygons.length === 0) {
    return { onLand: true, distanceToWater: 9999, inwardNx: 0, inwardNy: 0, closestX: px, closestY: py };
  }

  let onLand = false;
  let minDistanceToEdge = Infinity;
  let edgeInwardNx = 0;
  let edgeInwardNy = 0;
  let closestEdgeX = px;
  let closestEdgeY = py;

  // 1. Check if point is inside any land polygon
  for (let i = 0; i < landPolygons.length; i++) {
    const poly = landPolygons[i];
    const res = getPointPolygonDistance(px, py, poly);
    if (res.isInside) {
      onLand = true;

      // Verify whether this edge point is a true water boundary,
      // or an internal seam submerged under an overlapping polygon (e.g. bridge ramp on island)
      let isInternalSeam = false;
      for (let j = 0; j < landPolygons.length; j++) {
        if (i === j) continue;
        if (isPointInPolygon(res.closestX, res.closestY, landPolygons[j])) {
          isInternalSeam = true;
          break;
        }
      }

      if (!isInternalSeam) {
        const edgeDist = Math.abs(res.distance);
        if (edgeDist < minDistanceToEdge) {
          minDistanceToEdge = edgeDist;
          // Outward normal points to water; inward normal points deeper onto land
          edgeInwardNx = -res.normalX;
          edgeInwardNy = -res.normalY;
          closestEdgeX = res.closestX;
          closestEdgeY = res.closestY;
        }
      }
    }
  }

  if (onLand) {
    // If all nearby edges were internal seams (e.g. bridge ramp overlapping deep inland),
    // vehicle is completely safe and surrounded by contiguous land.
    const dist = minDistanceToEdge === Infinity ? 80 : minDistanceToEdge;
    return {
      onLand: true,
      distanceToWater: dist,
      inwardNx: edgeInwardNx,
      inwardNy: edgeInwardNy,
      closestX: closestEdgeX,
      closestY: closestEdgeY,
    };
  }

  // 2. Point is outside all polygons (truly in water) - find distance to nearest shoreline
  let bestDist = Infinity;
  for (let i = 0; i < landPolygons.length; i++) {
    const poly = landPolygons[i];
    const res = getPointPolygonDistance(px, py, poly);
    const distToPoly = Math.abs(res.distance);
    if (distToPoly < bestDist) {
      bestDist = distToPoly;
      edgeInwardNx = -res.normalX;
      edgeInwardNy = -res.normalY;
      closestEdgeX = res.closestX;
      closestEdgeY = res.closestY;
    }
  }

  return {
    onLand: false,
    distanceToWater: -bestDist, // Negative distance submerged in water
    inwardNx: edgeInwardNx,
    inwardNy: edgeInwardNy,
    closestX: closestEdgeX,
    closestY: closestEdgeY,
  };
}

/**
 * Constrains a land vehicle to remain strictly on land territory (islands and bridges).
 * If the vehicle chassis crosses into water, gently deflects it back onto safe land
 * without jitter, shaking, or abrupt rotation snapping.
 */
export function constrainLandVehicleToLand(
  shipX: number,
  shipY: number,
  shipAngle: number,
  hullLength: number,
  hullWidth: number,
  landPolygons: Point2D[][]
): { strayedIntoWater: boolean; pushX: number; pushY: number; inwardNx: number; inwardNy: number } {
  if (!landPolygons || landPolygons.length === 0) {
    return { strayedIntoWater: false, pushX: 0, pushY: 0, inwardNx: 0, inwardNy: 0 };
  }

  const centerClearance = getLandClearance(shipX, shipY, landPolygons);

  // If vehicle center has strayed into water
  if (!centerClearance.onLand) {
    const pen = Math.abs(centerClearance.distanceToWater) + 12;
    return {
      strayedIntoWater: true,
      pushX: centerClearance.inwardNx * pen,
      pushY: centerClearance.inwardNy * pen,
      inwardNx: centerClearance.inwardNx,
      inwardNy: centerClearance.inwardNy,
    };
  }

  // Fast path: if the vehicle center is comfortably inside land (> 18px from water), completely safe!
  if (centerClearance.distanceToWater >= 18) {
    return { strayedIntoWater: false, pushX: 0, pushY: 0, inwardNx: centerClearance.inwardNx, inwardNy: centerClearance.inwardNy };
  }

  // Vehicle center is close to water border - check perimeter probes (nose, tail, sides)
  const cos = Math.cos(shipAngle);
  const sin = Math.sin(shipAngle);
  const halfLen = hullLength * 0.40;
  const halfW = hullWidth * 0.40;

  const probes = [
    { x: shipX + cos * halfLen, y: shipY + sin * halfLen },
    { x: shipX - cos * halfLen, y: shipY - sin * halfLen },
    { x: shipX - sin * halfW, y: shipY + cos * halfW },
    { x: shipX + sin * halfW, y: shipY - cos * halfW },
  ];

  let maxPush = 0;
  let pushX = 0;
  let pushY = 0;
  let strayed = false;
  let bestInwardNx = centerClearance.inwardNx;
  let bestInwardNy = centerClearance.inwardNy;

  for (const p of probes) {
    const clr = getLandClearance(p.x, p.y, landPolygons);
    if (!clr.onLand) {
      strayed = true;
      const pen = Math.abs(clr.distanceToWater) + 8;
      if (pen > maxPush) {
        maxPush = pen;
        pushX = clr.inwardNx * pen;
        pushY = clr.inwardNy * pen;
        bestInwardNx = clr.inwardNx;
        bestInwardNy = clr.inwardNy;
      }
    }
  }

  if (strayed) {
    return { strayedIntoWater: true, pushX, pushY, inwardNx: bestInwardNx, inwardNy: bestInwardNy };
  }

  return { strayedIntoWater: false, pushX: 0, pushY: 0, inwardNx: bestInwardNx, inwardNy: bestInwardNy };
}

/**
 * Tests collision between an elongated ship hull and an obstacle polygon.
 * Returns the exact push vector needed to resolve intersection.
 */
export function checkShipPolygonCollision(
  shipX: number,
  shipY: number,
  shipAngle: number,
  hullLength: number,
  hullWidth: number,
  polygon: Point2D[],
  canals?: { x1: number; y1: number; x2: number; y2: number; width: number }[]
): { collided: boolean; pushX: number; pushY: number; contactX: number; contactY: number } {
  if (!polygon || polygon.length < 3) {
    return { collided: false, pushX: 0, pushY: 0, contactX: 0, contactY: 0 };
  }

  const cos = Math.cos(shipAngle);
  const sin = Math.sin(shipAngle);
  const halfLen = hullLength * 0.48;
  const hullRadius = Math.max(14, hullWidth * 0.45);

  // Sample probe points along ship keel (Bow, Mid-Bow, Center, Mid-Stern, Stern)
  const probeOffsets = [
    halfLen,            // Bow tip
    halfLen * 0.5,      // Forward deck
    0,                  // Center
    -halfLen * 0.5,     // Aft deck
    -halfLen,           // Stern
  ];

  let maxPenetration = 0;
  let bestPushX = 0;
  let bestPushY = 0;
  let contactX = shipX;
  let contactY = shipY;
  let hasCollision = false;

  for (const offset of probeOffsets) {
    const probeX = shipX + cos * offset;
    const probeY = shipY + sin * offset;

    // If this probe point is within an inland canal waterway, it is in open water
    if (canals && canals.length > 0) {
      let inCanalWater = false;
      for (const canal of canals) {
        const cDist = distancePointToSegment(probeX, probeY, canal.x1, canal.y1, canal.x2, canal.y2);
        if (cDist.dist < (canal.width * 0.5) - 4) {
          inCanalWater = true;
          break;
        }
      }
      if (inCanalWater) {
        continue;
      }
    }

    const result = getPointPolygonDistance(probeX, probeY, polygon);

    if (result.isInside) {
      hasCollision = true;
      const pen = Math.abs(result.distance) + hullRadius;
      if (pen > maxPenetration) {
        maxPenetration = pen;
        bestPushX = result.normalX * pen;
        bestPushY = result.normalY * pen;
        contactX = result.closestX;
        contactY = result.closestY;
      }
    } else if (result.distance < hullRadius) {
      hasCollision = true;
      const pen = hullRadius - result.distance;
      if (pen > maxPenetration) {
        maxPenetration = pen;
        bestPushX = result.normalX * pen;
        bestPushY = result.normalY * pen;
        contactX = result.closestX;
        contactY = result.closestY;
      }
    }
  }

  return {
    collided: hasCollision,
    pushX: bestPushX,
    pushY: bestPushY,
    contactX,
    contactY,
  };
}

/**
 * Checks if a line segment (e.g. projectile step or LOS check) intersects a polygon.
 */
export function checkSegmentPolygonIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  polygon: Point2D[]
): { hit: boolean; hitX: number; hitY: number } | null {
  if (!polygon || polygon.length < 3) return null;

  // Check if destination is inside polygon
  if (isPointInPolygon(x2, y2, polygon)) {
    return { hit: true, hitX: x2, hitY: y2 };
  }

  // Check intersection with each polygon edge
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const x3 = polygon[j].x;
    const y3 = polygon[j].y;
    const x4 = polygon[i].x;
    const y4 = polygon[i].y;

    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < 0.0001) continue;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        hit: true,
        hitX: x1 + ua * (x2 - x1),
        hitY: y1 + ua * (y2 - y1),
      };
    }
  }

  return null;
}
