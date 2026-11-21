// The simulation: one thief, four patrolling guards, three gems and an exit.
// Guards see through a cone clipped by walls; suspicion grows while they see
// you (or hear you running) and fades while you stay hidden. At full
// suspicion a guard gives chase; touch one and you are caught. Take all
// three gems, then slip out through the skylight exit to win.

import { FIELD, GUARD, LOOT, PAR_SECONDS, BONUS_PER_SECOND, PLAYER, STEP, SUSPICION } from './config.js';
import { createLevel, insideBush, insideExit } from './level.js';
import { angleDifference, canSee } from './vision.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_ALARM = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;

/** Turn `angle` toward `target` by at most `maxStep` radians. */
function turnToward(angle, target, maxStep) {
  let d = target - angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return target;
  return angle + Math.sign(d) * maxStep;
}

/**
 * Push a circle out of every solid rectangle it overlaps. Movement is
 * resolved one axis at a time by the caller, so walls slide instead of stop.
 */
function resolveCircle(level, x, y, radius) {
  for (const r of level.solids) {
    const cx = Math.max(r.x, Math.min(x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(y, r.y + r.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      x = cx + (dx / d) * radius;
      y = cy + (dy / d) * radius;
    } else {
      // Centre inside the rectangle: push out along the shallowest side.
      const left = x - r.x;
      const right = r.x + r.w - x;
      const top = y - r.y;
      const bottom = r.y + r.h - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = r.x - radius;
      else if (m === right) x = r.x + r.w + radius;
      else if (m === top) y = r.y - radius;
      else y = r.y + r.h + radius;
    }
  }
  return { x, y };
}

function makeGuard(patrol, index) {
  const start = patrol.points[0];
  const next = patrol.points[1 % patrol.points.length];
  return {
    name: patrol.name,
    x: start.x,
    y: start.y,
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    waypointIndex: 1 % patrol.points.length,
    pauseTimer: 0,
    scanDirection: 1,
    suspicion: 0,
    mode: 'patrol',
    lastSeen: { x: start.x, y: start.y },
    unseenTimer: 0,
    index,
  };
}

export function createWorld(random) {
  const level = createLevel();
  const state = {
    level,
    time: 0,
    score: 0,
    phase: 'play',
    alarm: false,
    player: {
      x: level.spawn.x,
      y: level.spawn.y,
      speed: 0,
      sneaking: false,
      moving: false,
      target: null,
    },
    guards: level.patrols.map((p, i) => makeGuard(p, i)),
    gemsTaken: 0,
    seedJitter: random(),
  };

  function reset() {
    const fresh = createLevel();
    state.level = fresh;
    state.time = 0;
    state.score = 0;
    state.phase = 'play';
    state.alarm = false;
    state.player.x = fresh.spawn.x;
    state.player.y = fresh.spawn.y;
    state.player.speed = 0;
    state.player.sneaking = false;
    state.player.moving = false;
    state.player.target = null;
    state.guards = fresh.patrols.map((p, i) => makeGuard(p, i));
    state.gemsTaken = 0;
  }

  function movePlayer(dt, mx, my, sneaking) {
    const p = state.player;
    p.sneaking = sneaking;
    let vx = mx;
    let vy = my;
    // Click-to-move: no keys held, walk toward the tapped point instead.
    if (vx === 0 && vy === 0 && p.target) {
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        p.target = null;
      } else {
        vx = dx / d;
        vy = dy / d;
      }
    }
    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
    const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    p.speed = len > 0 ? speed : 0;
    p.moving = len > 0;
    const nx = p.x + vx * speed * dt;
    const ny = p.y + vy * speed * dt;
    const afterX = resolveCircle(state.level, nx, p.y, PLAYER.radius);
    const after = resolveCircle(state.level, afterX.x, ny, PLAYER.radius);
    p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, after.x));
    p.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, after.y));
  }

  function suspicionRate(distance) {
    if (distance < SUSPICION.closeDistance) return SUSPICION.closeRise;
    if (distance < GUARD.sightRange * 0.6) return SUSPICION.midRise;
    return SUSPICION.farRise;
  }

  function updateGuard(g, dt) {
    const p = state.player;
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const distance = Math.hypot(dx, dy);
    const hidden = insideBush(state.level, p.x, p.y) && distance > GUARD.bushSpotRadius;
    const seen =
      !hidden &&
      canSee(g.x, g.y, g.angle, GUARD.sightRange, GUARD.sightHalfAngle, p.x, p.y, state.level.solids);
    const heard =
      !hidden && !p.sneaking && p.moving && p.speed >= PLAYER.noiseSpeed && distance < PLAYER.noiseRadius;
    let alarmed = false;

    if (seen) {
      g.suspicion = Math.min(1, g.suspicion + suspicionRate(distance) * dt);
      g.lastSeen.x = p.x;
      g.lastSeen.y = p.y;
      g.unseenTimer = 0;
    } else if (heard) {
      g.suspicion = Math.min(1, g.suspicion + SUSPICION.heardRise * dt);
      g.lastSeen.x = p.x;
      g.lastSeen.y = p.y;
      g.unseenTimer = 0;
      g.angle = turnToward(g.angle, Math.atan2(dy, dx), 3.2 * dt);
    } else {
      g.suspicion = Math.max(0, g.suspicion - SUSPICION.decay * dt);
      g.unseenTimer += dt;
    }

    if (g.suspicion >= 1 && g.mode !== 'chase') {
      g.mode = 'chase';
      g.unseenTimer = 0;
      alarmed = true;
    }

    if (g.mode === 'chase') {
      const tx = g.lastSeen.x - g.x;
      const ty = g.lastSeen.y - g.y;
      const td = Math.hypot(tx, ty);
      if (td > 12) {
        g.angle = turnToward(g.angle, Math.atan2(ty, tx), 5 * dt);
        const step = resolveCircle(
          state.level,
          g.x + (tx / td) * GUARD.chaseSpeed * dt,
          g.y + (ty / td) * GUARD.chaseSpeed * dt,
          GUARD.radius,
        );
        g.x = step.x;
        g.y = step.y;
      }
      if (!seen && g.unseenTimer > GUARD.giveUpSeconds) {
        g.mode = 'return';
        g.suspicion = 0.5;
      }
      return alarmed;
    }

    if (g.mode === 'return') {
      const target = state.level.patrols[g.index].points[g.waypointIndex];
      const tx = target.x - g.x;
      const ty = target.y - g.y;
      const td = Math.hypot(tx, ty);
      if (td < 14) {
        g.mode = 'patrol';
        g.pauseTimer = GUARD.waypointPause;
        return alarmed;
      }
      g.angle = turnToward(g.angle, Math.atan2(ty, tx), 5 * dt);
      const step = resolveCircle(
        state.level,
        g.x + (tx / td) * GUARD.patrolSpeed * dt,
        g.y + (ty / td) * GUARD.patrolSpeed * dt,
        GUARD.radius,
      );
      g.x = step.x;
      g.y = step.y;
      return alarmed;
    }

    // Patrol: walk the waypoints, pausing at each to look around.
    const patrol = state.level.patrols[g.index];
    if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
      g.angle += 0.7 * g.scanDirection * dt;
      if (g.angle > Math.PI) g.scanDirection = -1;
      if (g.angle < -Math.PI) g.scanDirection = 1;
      return alarmed;
    }
    const target = patrol.points[g.waypointIndex];
    const tx = target.x - g.x;
    const ty = target.y - g.y;
    const td = Math.hypot(tx, ty);
    if (td < 10) {
      g.waypointIndex = (g.waypointIndex + 1) % patrol.points.length;
      g.pauseTimer = GUARD.waypointPause;
      return alarmed;
    }
    g.angle = turnToward(g.angle, Math.atan2(ty, tx), 5 * dt);
    const step = resolveCircle(
      state.level,
      g.x + (tx / td) * GUARD.patrolSpeed * dt,
      g.y + (ty / td) * GUARD.patrolSpeed * dt,
      GUARD.radius,
    );
    g.x = step.x;
    g.y = step.y;
    return alarmed;
  }

  /**
   * Advance the world one fixed step. `mx, my` is the move direction
   * (-1..1 each); `sneaking` slows the thief to a silent crouch. Returns a
   * bitmask of EVENT_* flags for what happened in this step.
   */
  function step(dt, mx, my, sneaking) {
    if (state.phase !== 'play') return EVENT_NONE;
    state.time += dt;
    movePlayer(dt, mx, my, sneaking);
    let events = EVENT_NONE;
    let anyChase = false;
    for (const g of state.guards) {
      if (updateGuard(g, dt)) events |= EVENT_ALARM;
      if (g.mode === 'chase') anyChase = true;
      const caught = Math.hypot(g.x - state.player.x, g.y - state.player.y) < GUARD.catchRadius;
      if (caught) {
        state.phase = 'caught';
        return events | EVENT_CAUGHT;
      }
    }
    state.alarm = anyChase;
    for (const gem of state.level.gems) {
      if (!gem.taken && Math.hypot(gem.x - state.player.x, gem.y - state.player.y) < LOOT.radius + PLAYER.radius) {
        gem.taken = true;
        state.gemsTaken += 1;
        state.score += LOOT.points;
        events |= EVENT_LOOT;
      }
    }
    if (state.gemsTaken === LOOT.count && insideExit(state.level, state.player.x, state.player.y)) {
      state.phase = 'won';
      state.score += Math.max(0, Math.round((PAR_SECONDS - state.time) * BONUS_PER_SECOND));
      return events | EVENT_WIN;
    }
    return events;
  }

  // ---- Staging helpers: shots.js places a scene through these, never by
  // poking at the renderer's internals. The frame is still the real game. ----

  function teleportPlayer(x, y) {
    state.player.x = x;
    state.player.y = y;
    state.player.target = null;
  }

  function poseGuard(index, x, y, angle, suspicion) {
    const g = state.guards[index];
    g.x = x;
    g.y = y;
    g.angle = angle;
    g.suspicion = suspicion;
    g.mode = suspicion >= 1 ? 'chase' : 'patrol';
    g.pauseTimer = 0;
  }

  function setGemsTaken(count) {
    let taken = 0;
    for (const gem of state.level.gems) {
      gem.taken = taken < count;
      if (gem.taken) taken += 1;
    }
    state.gemsTaken = taken;
    state.score = taken * LOOT.points;
  }

  function winNow() {
    state.phase = 'won';
    state.score += Math.max(0, Math.round((PAR_SECONDS - state.time) * BONUS_PER_SECOND));
  }

  return { state, reset, step, teleportPlayer, poseGuard, setGemsTaken, winNow };
}
