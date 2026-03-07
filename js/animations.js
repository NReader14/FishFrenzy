// ═══════════════════════════════════════════════════════════════
// ANIMATIONS — CRT wipes, chomp text, swap/hook visual effects
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { ctx } from './dom.js';
import { W, H } from './constants.js';
import { spawnParticles } from './particles.js';

// ─── CRT WIPE (level start) ───
export function playCRTWipe(callback) {
  const wipe = document.createElement('div');
  wipe.className = 'crt-wipe';
  document.getElementById('game-wrapper').appendChild(wipe);

  requestAnimationFrame(() => {
    wipe.classList.add('crt-line');
    setTimeout(() => {
      wipe.classList.remove('crt-line');
      wipe.classList.add('crt-expand');
      setTimeout(() => {
        wipe.classList.add('crt-fade');
        setTimeout(() => {
          wipe.remove();
          if (callback) callback();
        }, 400);
      }, 300);
    }, 400);
  });
}

// ─── CRT GAME OVER (wipe → clear canvas → callback) ───
export function playCRTGameOver(callback) {
  const wipe = document.createElement('div');
  wipe.className = 'crt-wipe';
  document.getElementById('game-wrapper').appendChild(wipe);

  requestAnimationFrame(() => {
    wipe.classList.add('crt-line');
    setTimeout(() => {
      wipe.classList.remove('crt-line');
      wipe.classList.add('crt-expand');
      setTimeout(() => {
        ctx.fillStyle = '#080816';
        ctx.fillRect(0, 0, W, H);
        S.chompAnim = null;
        setTimeout(() => {
          wipe.classList.add('crt-fade');
          setTimeout(() => {
            wipe.remove();
            if (callback) callback();
          }, 400);
        }, 200);
      }, 300);
    }, 400);
  });
}

// ─── CHOMP TEXT ───
export function drawChomp() {
  if (!S.chompAnim) return;
  S.chompAnim.timer++;
  if (S.chompAnim.timer > 40) { S.chompAnim = null; return; }
  const alpha = 1 - S.chompAnim.timer / 40;
  const scale = 1 + S.chompAnim.timer * 0.02;
  ctx.save();
  ctx.translate(S.chompAnim.x, S.chompAnim.y - S.chompAnim.timer * 0.5);
  ctx.scale(scale, scale); ctx.globalAlpha = alpha;
  ctx.font = '16px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff4444'; ctx.fillText('CHOMP!', 0, 0);
  ctx.globalAlpha = 1; ctx.restore();
}

// ─── SWAP ANIMATION ───
export function updateSwapAnim() {
  if (!S.swapAnim) return;
  S.swapAnim.timer++;
  if (S.swapAnim.phase === 'pause' && S.swapAnim.timer > 60) {
    S.swapAnim.phase = 'flicker'; S.swapAnim.timer = 0;
  }
  if (S.swapAnim.phase === 'flicker' && S.swapAnim.timer > 36) {
    S.fish.x = S.swapAnim.oldSharkX; S.fish.y = S.swapAnim.oldSharkY;
    S.shark.x = S.swapAnim.oldFishX; S.shark.y = S.swapAnim.oldFishY;
    spawnParticles(S.fish.x, S.fish.y, '#aa44ff', 16);
    spawnParticles(S.shark.x, S.shark.y, '#aa44ff', 16);
    S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'SWAP!', life: 1.2, decay: 0.025 });
    S.swapAnim = null; S.gamePaused = false; S.timerFrozen = false;
  }
}

export function drawSwapEffect() {
  if (!S.swapAnim) return;
  if (S.swapAnim.phase === 'pause') {
    ctx.fillStyle = 'rgba(100,50,200,0.08)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(170,68,255,0.3)';
    ctx.beginPath(); ctx.arc(S.swapAnim.oldFishX, S.swapAnim.oldFishY, 22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(S.swapAnim.oldSharkX, S.swapAnim.oldSharkY, 22, 0, Math.PI * 2); ctx.fill();
  }
  if (S.swapAnim.phase === 'flicker') {
    if (Math.floor(S.swapAnim.timer / 6) % 2 === 0) {
      ctx.fillStyle = 'rgba(170,68,255,0.4)';
      ctx.beginPath(); ctx.arc(S.fish.x, S.fish.y, 18, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ─── HOOK ANIMATION ───
export function updateHookAnim() {
  if (!S.hookLine) return;

  if (S.hookLine.phase === 'line') {
    S.hookLine.progress += 0.05;
    if (S.hookLine.progress >= 1) {
      S.hookLine.phase = 'flicker';
      S.hookLine.flickerTimer = 0;
    }
  } else if (S.hookLine.phase === 'flicker') {
    S.hookLine.flickerTimer++;
    if (S.hookLine.flickerTimer > 30) {
      spawnParticles(S.fish.x, S.fish.y, '#ccaa44', 8);
      S.fish.x = S.hookLine.tx; S.fish.y = S.hookLine.ty;
      S.fish.vx = 0; S.fish.vy = 0;
      spawnParticles(S.fish.x, S.fish.y, '#ccaa44', 12);
      S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'HOOK!', life: 1, decay: 0.03 });
      S.hookLine = null; S.hookActive = false;
      S.gamePaused = false;
      if (!S.hourglassActive) S.timerFrozen = false;
    }
  }
}

export function drawHookLine() {
  if (!S.hookLine) return;
  const p = Math.min(1, S.hookLine.progress);
  const cx = S.hookLine.fx + (S.hookLine.tx - S.hookLine.fx) * p;
  const cy = S.hookLine.fy + (S.hookLine.ty - S.hookLine.fy) * p;

  ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ccaa44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(S.hookLine.fx, S.hookLine.fy); ctx.lineTo(cx, cy); ctx.stroke();
  ctx.fillStyle = '#ccaa44'; ctx.fillRect(cx - 2, cy - 2, 5, 5);
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(180,150,50,0.05)'; ctx.fillRect(0, 0, W, H);

  ctx.beginPath(); ctx.arc(S.hookLine.tx, S.hookLine.ty, 16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(204,170,68,0.2)'; ctx.fill();

  if (S.hookLine.phase === 'flicker' && Math.floor(S.hookLine.flickerTimer / 5) % 2 === 0) {
    ctx.beginPath(); ctx.arc(S.fish.x, S.fish.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(204,170,68,0.4)'; ctx.fill();
  }
}

// ─── TIME'S UP DEATH ANIMATION ───
// A giant shark sweeps across the canvas and chomps the fish before game-over.
export function playTimeUpDeath(fishX, fishY, callback) {
  const startTime = Date.now();
  const DURATION  = 2200; // ms
  const fromLeft  = fishX < W / 2; // shark enters from opposite side

  // Particles that explode when the shark reaches the fish
  const parts = [];
  let exploded = false;

  function spawnExplosion() {
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      const hue = Math.floor(Math.random() * 40);
      parts.push({ x: fishX, y: fishY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, decay: 0.018 + Math.random() * 0.02,
        col: `hsl(${hue},100%,60%)`, r: 2 + Math.random() * 4 });
    }
  }

  function drawSharkBody(x, y, dir, tailPhase) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);

    // Body
    ctx.fillStyle = '#445566';
    ctx.fillRect(-60, -20, 120, 40);
    ctx.fillRect(-50, -26, 100, 8);
    ctx.fillRect(-50, 18, 100, 8);

    // Belly
    ctx.fillStyle = '#8899aa';
    ctx.fillRect(-50, -8, 100, 16);

    // Tail
    const tw = Math.round(Math.sin(tailPhase) * 10);
    ctx.fillStyle = '#445566';
    ctx.fillRect(-80, -18 + tw, 24, 10);
    ctx.fillRect(-80, 8 + tw, 24, 10);
    ctx.fillRect(-96, -22 + tw, 16, 10);
    ctx.fillRect(-96, 12 + tw, 16, 10);

    // Dorsal fin
    ctx.fillStyle = '#3a4a55';
    ctx.fillRect(-30, -52, 28, 30);
    ctx.fillRect(-20, -60, 16, 12);

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(32, -10, 12, 12);
    ctx.fillStyle = '#111122';
    ctx.fillRect(36, -8, 7, 8);

    // Teeth / mouth
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(44 - i * 4, 8 + (i % 2) * 5, 3, 10 - (i % 2) * 3);
    }

    ctx.restore();
  }

  function frame() {
    const elapsed = Date.now() - startTime;
    if (elapsed >= DURATION) { callback(); return; }

    const t = elapsed / DURATION; // 0→1
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    // Dark water background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(1, '#040810');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Scan lines for drama
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

    // Giant shark sweeps from the far side through the fish's position
    const sharkStartX = fromLeft ? W + 250 : -250;
    const sharkEndX   = fromLeft ? -250 : W + 250;
    const sx = sharkStartX + (sharkEndX - sharkStartX) * eased;
    const sy = fishY + Math.sin(eased * Math.PI * 2) * 18;
    const dir = fromLeft ? -1 : 1; // faces the fish
    const tailPhase = elapsed * 0.01;

    // Scale up 3x for giant effect
    ctx.save();
    ctx.scale(3, 3);
    drawSharkBody(sx / 3, sy / 3, dir, tailPhase);
    ctx.restore();

    // Check if shark has reached the fish → explode it
    if (!exploded && Math.abs(sx - fishX) < 120) {
      exploded = true;
      spawnExplosion();
    }

    // Draw fish (frozen) until explosion
    if (!exploded) {
      ctx.globalAlpha = 0.8;
      // Simple fish shape at last position
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(fishX - 14, fishY - 8, 28, 16);
      ctx.fillStyle = '#2266dd';
      ctx.fillRect(fishX - 8, fishY + 2, 18, 4);
      ctx.fillRect(fishX - 22, fishY - 6, 8, 4);
      ctx.fillRect(fishX - 22, fishY + 2, 8, 4);
      ctx.globalAlpha = 1;
    }

    // Update and draw particles
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    }
    ctx.globalAlpha = 1;

    // "TIME'S UP!" text
    const textAlpha = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
    ctx.globalAlpha = textAlpha;
    ctx.font = 'bold 24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff4444';
    ctx.fillText("TIME'S UP!", W / 2, 60);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
