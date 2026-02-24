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
