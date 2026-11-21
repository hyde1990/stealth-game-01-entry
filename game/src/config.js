// Midnight Gallery — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** How long a real second of play may take to catch up after a stall. */
export const MAX_FRAME = 0.25;

export const PLAYER = {
  radius: 13,
  walkSpeed: 175,
  sneakSpeed: 95,
  /** Moving faster than this counts as running: it makes noise guards hear. */
  noiseSpeed: 140,
  /** A guard hears running footsteps inside this radius. */
  noiseRadius: 120,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  chaseSpeed: 198,
  /** Seconds a guard waits at each patrol waypoint, looking around. */
  waypointPause: 1.2,
  /** Vision cone: how far a guard sees, and its half-angle in radians. */
  sightRange: 232,
  sightHalfAngle: 0.62,
  /** A guard still spots you inside a bush when closer than this. */
  bushSpotRadius: 62,
  /** Touching a guard closer than this gets you caught. */
  catchRadius: 24,
  /** Seconds of no sight before an alarmed guard gives up the chase. */
  giveUpSeconds: 4.5,
};

/** Suspicion 0..1: how fast it grows while a guard sees you, by distance. */
export const SUSPICION = {
  closeRise: 1.7,
  midRise: 1.0,
  farRise: 0.55,
  /** Distance under which the close rate applies. */
  closeDistance: 85,
  /** Hearing a runner raises suspicion this fast. */
  heardRise: 0.5,
  /** How fast suspicion fades while you are unseen. */
  decay: 0.45,
};

export const LOOT = { count: 3, points: 100, radius: 15 };

/** Win bonus: seconds under this par earn 5 points each. */
export const PAR_SECONDS = 240;
export const BONUS_PER_SECOND = 5;

export const PALETTE = {
  floorA: '#1c212b',
  floorB: '#202634',
  carpet: '#3a2330',
  carpetEdge: '#54303f',
  wall: '#313949',
  wallTop: '#4a5568',
  wallShadow: '#171b24',
  caseBase: '#2c3345',
  caseGlass: '#7fd4e6',
  bush: '#1e3a24',
  bushLeaf: '#2f5c33',
  bushLight: '#4a7d46',
  exit: '#39d98a',
  exitGlow: '#1d7a4c',
  gem: '#7fe7ff',
  gemCore: '#e8fbff',
  player: '#e8e4d8',
  playerMask: '#23272f',
  guard: '#8a94a8',
  guardDark: '#5c6577',
  coneCalm: 'rgba(242, 201, 76, 0.20)',
  coneCalmEdge: 'rgba(242, 201, 76, 0.45)',
  coneSuspicious: 'rgba(242, 140, 76, 0.30)',
  coneSuspiciousEdge: 'rgba(242, 140, 76, 0.60)',
  coneAlarm: 'rgba(229, 83, 75, 0.34)',
  coneAlarmEdge: 'rgba(229, 83, 75, 0.70)',
  text: '#eef1f5',
  muted: '#8b93a3',
  panel: '#252b38',
  gold: '#f2c94c',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best escape time is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-gallery.best-seconds';
