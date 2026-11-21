// Vision geometry: what a guard can see, and what blocks the sight.
// Walls and display cases block sight; bushes do not. Everything here is
// pure geometry, so the world and the renderer agree on what is visible.

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * Whether segment (x1,y1)-(x2,y2) touches rectangle r. Slab test: the
 * segment enters the rectangle's x-range and y-range at overlapping times.
 */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const axes = [
    [dx, x1, r.x, r.x + r.w],
    [dy, y1, r.y, r.y + r.h],
  ];
  for (const [d, p, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      let t0 = (lo - p) / d;
      let t1 = (hi - p) / d;
      if (t0 > t1) [t0, t1] = [t1, t0];
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

/** Whether any rectangle in `solids` stands between the two points. */
export function lineOfSightBlocked(x1, y1, x2, y2, solids) {
  for (let i = 0; i < solids.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, solids[i])) return true;
  }
  return false;
}

/**
 * Whether the watcher at (wx, wy) facing `angle` can see the point (px, py):
 * inside range, inside the cone's half-angle, and with a clear line of sight.
 */
export function canSee(wx, wy, angle, range, halfAngle, px, py, solids) {
  const dx = px - wx;
  const dy = py - wy;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return false;
  if (distance > 1 && angleDifference(Math.atan2(dy, dx), angle) > halfAngle) return false;
  return !lineOfSightBlocked(wx, wy, px, py, solids);
}

/**
 * Where a vision cone's edge ray first hits a solid (or its full range):
 * used to draw the cone clipped by walls instead of through them.
 */
export function coneRayEnd(wx, wy, angle, range, solids) {
  const ex = wx + Math.cos(angle) * range;
  const ey = wy + Math.sin(angle) * range;
  let best = 1;
  for (let i = 0; i < solids.length; i += 1) {
    const r = solids[i];
    // Binary search the first t where the ray enters this rectangle.
    let lo = 0;
    let hi = 1;
    if (!segmentHitsRect(wx, wy, ex, ey, r)) continue;
    for (let step = 0; step < 24; step += 1) {
      const mid = (lo + hi) / 2;
      if (segmentHitsRect(wx, wy, wx + (ex - wx) * mid, wy + (ey - wy) * mid, r)) hi = mid;
      else lo = mid;
    }
    if (hi < best) best = hi;
  }
  return { x: wx + (ex - wx) * best, y: wy + (ey - wy) * best };
}
