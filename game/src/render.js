// The renderer: one canvas, scaled to the window, painting the gallery from
// above — floor, carpets, walls, cases, bushes, the glowing exit, gems,
// guards with their vision cones, the thief, and the HUD. Overlays cover the
// title, pause, caught and win screens.

import { FIELD, FONT, GUARD, LOOT, PALETTE, PLAYER } from './config.js';
import { coneRayEnd } from './vision.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

const TILE = 80;
const CONE_STEPS = 26;

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function coneColors(guard) {
  if (guard.mode === 'chase') return { fill: PALETTE.coneAlarm, edge: PALETTE.coneAlarmEdge };
  if (guard.suspicion > 0.35) return { fill: PALETTE.coneSuspicious, edge: PALETTE.coneSuspiciousEdge };
  return { fill: PALETTE.coneCalm, edge: PALETTE.coneCalmEdge };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scale = Math.min(w / FIELD.width, h / FIELD.height);
    offsetX = (w - FIELD.width * scale) / 2;
    offsetY = (h - FIELD.height * scale) / 2;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
  }

  window.addEventListener('resize', resize);
  resize();

  function toLogical(clientX, clientY) {
    return { x: (clientX - offsetX) / scale, y: (clientY - offsetY) / scale };
  }

  function drawFloor(level) {
    for (let y = 0; y < FIELD.height; y += TILE) {
      for (let x = 0; x < FIELD.width; x += TILE) {
        ctx.fillStyle = ((x + y) / TILE) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
    for (const c of level.carpets) {
      ctx.fillStyle = PALETTE.carpet;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = PALETTE.carpetEdge;
      ctx.lineWidth = 3;
      ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    }
  }

  function drawWalls(level) {
    for (const w of level.walls) {
      ctx.fillStyle = PALETTE.wallShadow;
      ctx.fillRect(w.x + 3, w.y + 4, w.w, w.h);
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(w.x, w.y, w.w, 4);
    }
  }

  function drawCases(level) {
    for (const c of level.cases) {
      ctx.fillStyle = PALETTE.caseBase;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = PALETTE.caseGlass;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(c.x + 5, c.y + 5, c.w - 10, c.h - 10);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = PALETTE.wallTop;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(c.x + 10, c.y + 8, 18, 3);
    }
  }

  function drawBushes(level, top) {
    for (const b of level.bushes) {
      if (top) {
        // Fringe drawn over the thief: foliage hides whoever stands in it.
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = PALETTE.bushLight;
      } else {
        ctx.globalAlpha = 1;
        ctx.fillStyle = PALETTE.bush;
      }
      ctx.beginPath();
      ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!top) {
        ctx.fillStyle = PALETTE.bushLeaf;
        for (let i = 0; i < 5; i += 1) {
          const lx = b.x + 14 + i * 17;
          const ly = b.y + 16 + ((i * 23) % 34);
          ctx.beginPath();
          ctx.arc(lx, ly, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawExit(level, time) {
    const e = level.exit;
    const pulse = 0.55 + 0.25 * Math.sin(time * 3);
    ctx.fillStyle = PALETTE.exitGlow;
    ctx.globalAlpha = pulse;
    ctx.fillRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = '#062b18';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2 + 1);
    ctx.strokeStyle = PALETTE.exit;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x + e.w / 2, e.y + e.h + 14);
    ctx.lineTo(e.x + e.w / 2, e.y + e.h + 26);
    ctx.moveTo(e.x + e.w / 2 - 6, e.y + e.h + 20);
    ctx.lineTo(e.x + e.w / 2, e.y + e.h + 26);
    ctx.lineTo(e.x + e.w / 2 + 6, e.y + e.h + 20);
    ctx.stroke();
  }

  function drawGems(level, time) {
    for (const gem of level.gems) {
      if (gem.taken) continue;
      const pulse = 1 + 0.12 * Math.sin(time * 4 + gem.x);
      ctx.save();
      ctx.translate(gem.x, gem.y);
      ctx.scale(pulse, pulse);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.gem;
      ctx.fillRect(-LOOT.radius * 0.7, -LOOT.radius * 0.7, LOOT.radius * 1.4, LOOT.radius * 1.4);
      ctx.fillStyle = PALETTE.gemCore;
      ctx.fillRect(-LOOT.radius * 0.3, -LOOT.radius * 0.3, LOOT.radius * 0.6, LOOT.radius * 0.6);
      ctx.restore();
      ctx.strokeStyle = 'rgba(127, 231, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, LOOT.radius + 6 + 2 * Math.sin(time * 4), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCone(guard, solids) {
    const colors = coneColors(guard);
    const start = guard.angle - GUARD.sightHalfAngle;
    const end = guard.angle + GUARD.sightHalfAngle;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (let i = 0; i <= CONE_STEPS; i += 1) {
      const a = start + ((end - start) * i) / CONE_STEPS;
      const hit = coneRayEnd(guard.x, guard.y, a, GUARD.sightRange, solids);
      ctx.lineTo(hit.x, hit.y);
    }
    ctx.closePath();
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGuard(guard) {
    const mark = guard.mode === 'chase' ? '!' : guard.suspicion > 0.35 ? '?' : '';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.guard;
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardDark;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Facing tick and eyes.
    const ex = guard.x + Math.cos(guard.angle) * GUARD.radius;
    const ey = guard.y + Math.sin(guard.angle) * GUARD.radius;
    ctx.strokeStyle = '#10131a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = '#10131a';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle - 0.4) * 6, guard.y + Math.sin(guard.angle - 0.4) * 6, 2.2, 0, Math.PI * 2);
    ctx.arc(guard.x + Math.cos(guard.angle + 0.4) * 6, guard.y + Math.sin(guard.angle + 0.4) * 6, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion arc above the head.
    if (guard.suspicion > 0.02) {
      ctx.strokeStyle = guard.mode === 'chase' ? PALETTE.danger : PALETTE.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.suspicion);
      ctx.stroke();
    }
    if (mark) {
      ctx.fillStyle = guard.mode === 'chase' ? PALETTE.danger : PALETTE.gold;
      ctx.font = `bold 22px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(mark, guard.x, guard.y - GUARD.radius - 10);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(guard.name, guard.x, guard.y + GUARD.radius + 4);
  }

  function drawPlayer(player, time) {
    // A running thief's footsteps ring out: draw the noise radius.
    if (player.moving && !player.sneaking) {
      const ripple = (time * 2) % 1;
      ctx.strokeStyle = `rgba(238, 241, 245, ${0.25 * (1 - ripple)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER.radius + ripple * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    const r = player.sneaking ? PLAYER.radius - 2 : PLAYER.radius;
    ctx.beginPath();
    ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.player;
    ctx.fill();
    ctx.strokeStyle = PALETTE.playerMask;
    ctx.lineWidth = 3;
    ctx.stroke();
    // The burglar's mask band.
    ctx.fillStyle = PALETTE.playerMask;
    ctx.fillRect(player.x - r + 2, player.y - 4, (r - 2) * 2, 8);
    if (player.sneaking) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('sneaking', player.x, player.y - r - 6);
    }
  }

  function drawHud(state, screen) {
    const level = state.level;
    ctx.fillStyle = 'rgba(17, 20, 27, 0.85)';
    ctx.fillRect(0, 0, FIELD.width, 40);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MIDNIGHT GALLERY', 16, 21);
    // Gems.
    for (let i = 0; i < LOOT.count; i += 1) {
      const gx = 250 + i * 30;
      ctx.save();
      ctx.translate(gx, 20);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i < state.gemsTaken ? PALETTE.gem : '#3a4152';
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`${state.gemsTaken} / ${LOOT.count} gems`, 350, 21);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(state.time), FIELD.width - 16, 21);
    if (state.alarm && screen === SCREEN_PLAY) {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('! ALARM — BREAK LINE OF SIGHT !', FIELD.width / 2, 62);
    } else if (screen === SCREEN_PLAY && state.gemsTaken === LOOT.count) {
      ctx.fillStyle = PALETTE.exit;
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('ALL GEMS — REACH THE GREEN EXIT', FIELD.width / 2, 62);
    }
    if (screen === SCREEN_PLAY) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(
        'WASD / arrows to move · Shift to sneak · click to walk there · P pause · M mute',
        FIELD.width / 2,
        FIELD.height - 12,
      );
    }
  }

  function overlayPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 640;
    const h = 120 + lines.length * 30;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.font = `bold 40px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, FIELD.width / 2, y + 52);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `18px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, y + 104 + i * 30);
    });
  }

  function draw(state, screen, best) {
    resize();
    const level = state.level;
    const time = state.time;
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(-offsetX / scale, -offsetY / scale, FIELD.width + (offsetX * 2) / scale, FIELD.height + (offsetY * 2) / scale);
    drawFloor(level);
    drawBushes(level, false);
    drawExit(level, time);
    drawGems(level, time);
    drawCases(level);
    drawWalls(level);
    for (const g of state.guards) drawCone(g, level.solids);
    for (const g of state.guards) drawGuard(g);
    drawPlayer(state.player, time);
    drawBushes(level, true);
    drawHud(state, screen);

    if (screen === SCREEN_TITLE) {
      overlayPanel('MIDNIGHT GALLERY', [
        'A cat burglar slips into the gallery after dark.',
        'Steal all 3 moon-gems, then reach the green EXIT unseen.',
        'Guards patrol with vision cones — crouch behind cases,',
        'hide in the plants, and never run where they can hear you.',
        best > 0 ? `Best escape: ${formatTime(best)}` : 'No escape yet — the gallery awaits.',
        'Press SPACE or click to begin',
      ], PALETTE.gold);
    } else if (screen === SCREEN_PAUSED) {
      overlayPanel('PAUSED', ['Take a breath. The guards wait for no one.', 'Press P or SPACE to keep sneaking'], PALETTE.muted);
    } else if (screen === SCREEN_CAUGHT) {
      overlayPanel('CAUGHT!', [
        `The guards caught you after ${formatTime(state.time)}.`,
        `Gems stolen: ${state.gemsTaken} of ${LOOT.count} · Score ${state.score}`,
        'Press SPACE or R to try again',
      ], PALETTE.danger);
    } else if (screen === SCREEN_WIN) {
      overlayPanel('CLEAN GETAWAY!', [
        `All 3 gems, out the skylight in ${formatTime(state.time)}.`,
        `Score ${state.score}${best > 0 ? ` · Best escape ${formatTime(best)}` : ''}`,
        'Press SPACE or R to steal again',
      ], PALETTE.exit);
    }
  }

  return { draw, toLogical, resize };
}
