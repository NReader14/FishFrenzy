// ═══════════════════════════════════════════════════════════════
// PARTICLES — Spawn, update, and draw particles, bubbles, popups
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { ctx } from './dom.js';
import { rand, W, H } from './constants.js';

export function spawnParticles(x, y, color, count) {
  for (let i = 0; i < (count || 6); i++) {
    S.particles.push({
      x, y,
      vx: rand(-2, 2), vy: rand(-2, 2),
      life: 1, decay: rand(0.02, 0.05),
      r: rand(2, 5), color
    });
  }
}

export function updateParticles() {
  for (const p of S.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    p.vy -= 0.01;
  }
  S.particles = S.particles.filter(p => p.life > 0);

  for (const b of S.bubbles) {
    b.y += b.vy;
    b.life -= b.decay;
  }
  S.bubbles = S.bubbles.filter(b => b.life > 0);

  for (const p of S.scorePopups) {
    p.y -= 0.8;
    p.life -= p.decay;
  }
  S.scorePopups = S.scorePopups.filter(p => p.life > 0);
}

export function drawParticles() {
  for (const p of S.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    const s = Math.ceil(p.r * p.life);
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  for (const b of S.bubbles) {
    ctx.globalAlpha = b.life * 0.3;
    ctx.strokeStyle = '#6699bb';
    ctx.lineWidth = 1;
    const s = Math.ceil(b.r * 2);
    ctx.strokeRect(b.x - s / 2, b.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

export function drawScorePopups() {
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of S.scorePopups) {
    ctx.globalAlpha = p.life;
    if (typeof p.pts === 'string') {
      ctx.fillStyle = '#44ee88';
      ctx.fillText(p.pts, p.x, p.y);
    } else {
      ctx.fillStyle = p.pts >= 20 ? '#ff8800' : '#ffdd44';
      ctx.fillText('+' + p.pts, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}
