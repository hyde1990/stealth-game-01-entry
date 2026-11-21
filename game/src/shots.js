// The screenshot scenes behind ?shot=start|play|end. Each one stages the real
// world — guards mid-patrol, the thief placed by the world's own helpers —
// and returns the screen to draw over it, so the frame is what the game
// really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Seconds of patrol the title scene lets run before the frame is taken. */
const START_SECONDS = 5;

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best time to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Mid-sneak: the thief crouches right behind a display case in the
    // middle hall while Pip's cone sweeps down toward them — the case clips
    // the cone, so the thief sits in its shadow, one gem already pocketed.
    // The guards are posed, not stepped, so the frame is exactly this
    // standoff.
    world.setGemsTaken(1);
    world.state.time = 47;
    world.teleportPlayer(640, 380);
    world.poseGuard(0, 700, 300, 2.03, 0.55);
    world.poseGuard(1, 760, 300, -Math.PI / 2, 0.1);
    world.poseGuard(2, 1000, 120, Math.PI, 0);
    world.poseGuard(3, 500, 600, 0, 0);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    // The getaway: all three gems pocketed, the thief at the skylight exit.
    world.setGemsTaken(3);
    world.state.time = 137;
    world.teleportPlayer(1190, 42);
    world.poseGuard(0, 640, 270, 0, 0);
    world.poseGuard(1, 760, 420, -Math.PI / 2, 0.15);
    world.poseGuard(2, 1000, 120, Math.PI, 0);
    world.poseGuard(3, 500, 600, 0, 0);
    world.winNow();
    return { screen: SCREEN_WIN, best: 137 };
  }
  // Start: the title screen over the live gallery, guards already patrolling.
  for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, 0, 0, false);
  world.state.time = 0;
  return { screen: SCREEN_TITLE, best: 0 };
}
