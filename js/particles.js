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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Track how many popups are near each x-slot to stagger them vertically
  const clusterOffset = new Map();
  for (const p of S.scorePopups) {
    const slot = Math.round(p.x / 30); // group by 30px x-bands
    const idx = clusterOffset.get(slot) ?? 0;
    clusterOffset.set(slot, idx + 1);
    const yOff = idx * -12; // each overlapping popup rises 12px above the previous
    ctx.globalAlpha = p.life;
    ctx.font = p.font || '8px "Press Start 2P"';
    if (typeof p.pts === 'string') {
      ctx.fillStyle = p.color || '#44ee88';
      ctx.fillText(p.pts, p.x, p.y + yOff);
    } else {
      ctx.fillStyle = p.pts >= 20 ? '#ff8800' : '#ffdd44';
      ctx.fillText('+' + p.pts, p.x, p.y + yOff);
    }
  }
  ctx.globalAlpha = 1;
}
