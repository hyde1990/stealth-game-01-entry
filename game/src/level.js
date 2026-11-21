// The gallery floor: one fixed level, drawn from this data. Walls and display
// cases are solid and block sight; bushes hide you but let everyone through.
// Every coordinate is in the 1280x720 logical field.

export const SPAWN = { x: 70, y: 640 };

/** The skylight exit: step into it with every gem to slip away. */
export const EXIT = { x: 1150, y: 24, w: 80, h: 36 };

/** Solid rectangles: the outer border plus interior gallery walls. Door gaps
 *  are where a wall is split into two segments. */
export const WALLS = [
  { x: 0, y: 0, w: 1280, h: 24 },
  { x: 0, y: 696, w: 1280, h: 24 },
  { x: 0, y: 0, w: 24, h: 720 },
  { x: 1256, y: 0, w: 24, h: 720 },
  // Wall A (vertical, west hall): door gap y 300..360.
  { x: 420, y: 96, w: 24, h: 204 },
  { x: 420, y: 360, w: 24, h: 36 },
  // Wall B (horizontal, south hall): door gap x 430..500.
  { x: 180, y: 480, w: 250, h: 24 },
  { x: 500, y: 480, w: 200, h: 24 },
  // Wall C (vertical, east hall): door gap y 380..440.
  { x: 860, y: 240, w: 24, h: 140 },
  { x: 860, y: 440, w: 24, h: 160 },
  // Wall D (horizontal, gem vault): door gap x 1020..1090.
  { x: 860, y: 200, w: 160, h: 24 },
  { x: 1090, y: 200, w: 130, h: 24 },
  // Wall E (short stub, north-west pocket).
  { x: 96, y: 240, w: 180, h: 24 },
];

/** Display cases: solid cover you can crouch behind. */
export const CASES = [
  { x: 560, y: 150, w: 64, h: 44 },
  { x: 660, y: 320, w: 64, h: 44 },
  { x: 180, y: 580, w: 64, h: 44 },
  { x: 980, y: 520, w: 64, h: 44 },
  { x: 1080, y: 300, w: 64, h: 44 },
  { x: 200, y: 120, w: 64, h: 44 },
];

/** Potted-plant thickets: standing inside one hides you from cones. */
export const BUSHES = [
  { x: 520, y: 560, w: 96, h: 72 },
  { x: 980, y: 90, w: 96, h: 72 },
  { x: 240, y: 300, w: 96, h: 72 },
];

/** The three moon-gems, each on its own pedestal. */
export const GEMS = [
  { x: 1120, y: 120 },
  { x: 300, y: 620 },
  { x: 620, y: 140 },
];

/** Guard patrols: waypoints each guard walks in a loop, with a name. */
export const PATROLS = [
  { name: 'Pip', points: [{ x: 480, y: 270 }, { x: 820, y: 270 }] },
  { name: 'Mara', points: [{ x: 760, y: 120 }, { x: 760, y: 560 }] },
  { name: 'Ren', points: [{ x: 900, y: 120 }, { x: 1180, y: 120 }] },
  { name: 'Sable', points: [{ x: 300, y: 600 }, { x: 700, y: 600 }] },
];

/** A red-carpet runner down the middle hall, purely decorative. */
export const CARPETS = [
  { x: 444, y: 396, w: 416, h: 84 },
  { x: 884, y: 224, w: 372, h: 84 },
];

/**
 * The level as the world uses it: the solids that block movement and sight
 * (walls + cases), the bushes, and fresh copies of the gems and patrols.
 */
export function createLevel() {
  return {
    walls: WALLS,
    cases: CASES,
    bushes: BUSHES,
    carpets: CARPETS,
    exit: EXIT,
    spawn: SPAWN,
    solids: [...WALLS, ...CASES],
    gems: GEMS.map((g) => ({ x: g.x, y: g.y, taken: false })),
    patrols: PATROLS.map((p) => ({ name: p.name, points: p.points.map((q) => ({ ...q })) })),
  };
}

/** Whether point (x, y) stands inside any bush. */
export function insideBush(level, x, y) {
  for (const b of level.bushes) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

/** Whether point (x, y) stands inside the exit doorway. */
export function insideExit(level, x, y) {
  const e = level.exit;
  return x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h;
}
