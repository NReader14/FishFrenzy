// ═══════════════════════════════════════════════════════════════
// DRAWING — All canvas rendering functions
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { SKINS, drawFishBody, FISH_TYPE_EXTRAS_OFFSET } from './skins.js';
import { ctx } from './dom.js';
import { W, H, rand, dist,
  FRENZY_DURATION, ICE_DURATION, HOURGLASS_DURATION, GOOP_DURATION,
  GHOST_DURATION, BUDDY_DURATION, BOMB_DURATION, CRAZY_DURATION,
  DECOY_DURATION, STAR_DURATION, RAINBOW_DURATION,
  PROMPT_WANDER_DURATION, BODY_SWAP_DURATION, HELL_DURATION
} from './constants.js';
import { pwConfig } from './powerups.js';

// ─── WATER BACKGROUND ───
export function drawWater() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(1, '#040810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const t = Date.now() * 0.001;
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 6; i++) {
    const x = (Math.sin(t + i * 1.5) * 0.5 + 0.5) * W;
    const y = (Math.cos(t * 0.6 + i * 1.1) * 0.5 + 0.5) * H;
    ctx.fillStyle = '#3366aa';
    ctx.fillRect(x - 40, y - 40, 80, 80);
  }
  ctx.globalAlpha = 1;

  // Sea floor
  ctx.fillStyle = '#060d18';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) {
    const h = 10 + Math.sin(x * 0.05 + t * 0.3) * 4;
    ctx.lineTo(x, H - h);
    ctx.lineTo(x + 16, H - h);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // Seaweed
  ctx.fillStyle = '#0d3322';
  for (let i = 0; i < 7; i++) {
    const bx = 50 + i * 110;
    const sw = Math.sin(t * 1.2 + i) * 6;
    for (let j = 0; j < 4; j++) {
      ctx.fillRect(bx + sw * (j / 4) - 2, H - 14 - j * 14, 4, 12);
    }
  }
}

// ─── PIXEL FISH (reusable) ───
export function drawPixelFish(x, y, dir, angle, phase, c1, c2, c3, fishType = 'standard') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.rotate(angle || 0);
  drawFishBody(ctx, c1, c2, c3, phase, fishType);
  ctx.restore();
}

// ─── PLAYER FISH ───
export function drawFish() {
  // During body swap, fish is drawn as an angry red predator
  let c1, c2, c3, fishType = 'standard';
  if (S.bodySwapActive) {
    c1 = '#cc2222'; c2 = '#ee4444'; c3 = '#aa0000';
  } else {
    const skin = SKINS[S.settings.skin ?? 0] || SKINS[0];
    c1 = S.frenzyActive ? '#ffaa22' : skin.c1;
    c2 = S.frenzyActive ? '#ffcc44' : skin.c2;
    c3 = S.frenzyActive ? '#ee7700' : skin.c3;
    fishType = skin.fishType || 'standard';
  }
  drawPixelFish(S.fish.x, S.fish.y, S.fish.dir, S.fish.angle, S.fish.tailPhase, c1, c2, c3, fishType);

  // Draw skin accessories (glasses, crown, etc.) on top of base fish
  if (!S.bodySwapActive) {
    const skin = SKINS[S.settings.skin ?? 0] || SKINS[0];
    const typeOff = FISH_TYPE_EXTRAS_OFFSET[fishType] || FISH_TYPE_EXTRAS_OFFSET.standard;

    // Per-category accessories (custom skins)
    for (const key of ['hat', 'mask', 'outfit']) {
      const fn = skin[`${key}Fn`];
      if (fn) {
        const off = typeOff[key] || { x: 0, y: 0 };
        ctx.save();
        ctx.translate(S.fish.x, S.fish.y);
        ctx.scale(S.fish.dir, 1);
        ctx.rotate(S.fish.angle || 0);
        ctx.translate(off.x, off.y);
        fn(ctx);
        ctx.restore();
      }
    }

    // Legacy extras (predefined skins like Joker, Ninja, etc.)
    if (skin.extras) {
      const off = typeOff.mask || { x: 0, y: 0 };
      ctx.save();
      ctx.translate(S.fish.x, S.fish.y);
      ctx.scale(S.fish.dir, 1);
      ctx.rotate(S.fish.angle || 0);
      ctx.translate(off.x, off.y);
      skin.extras(ctx);
      ctx.restore();
    }
  }

  if (S.shieldActive) {
    const p = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    ctx.save(); ctx.translate(S.fish.x, S.fish.y);
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(68,238,136,${p})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  if (S.starActive) {
    const p = 0.25 + Math.sin(Date.now() * 0.008) * 0.15;
    ctx.save(); ctx.translate(S.fish.x, S.fish.y);
    ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,238,68,${p})`; ctx.fill();
    ctx.fillStyle = '#ffee44';
    for (let i = 0; i < 6; i++) {
      const a = Date.now() * 0.004 + (i / 6) * Math.PI * 2;
      ctx.fillRect(Math.cos(a) * 26 - 1, Math.sin(a) * 26 - 1, 3, 3);
    }
    ctx.restore();
  }

  if (S.goopActive) {
    ctx.save(); ctx.translate(S.fish.x, S.fish.y);
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(102,204,68,0.2)'; ctx.fill();
    ctx.restore();
  }

  if (S.promptActive) {
    const p = 0.35 + Math.sin(Date.now() * 0.009) * 0.18;
    ctx.save(); ctx.translate(S.fish.x, S.fish.y);
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 19, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,170,50,${p})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
}

// ─── BUDDY ───
export function drawBuddy() {
  if (!S.buddyActive || !S.buddy) return;
  const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.2;
  ctx.globalAlpha = pulse;
  drawPixelFish(S.buddy.x, S.buddy.y, S.buddy.dir, 0, S.buddy.tailPhase, '#22bbaa', '#44ddcc', '#119988');
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#44ddaa';
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(S.buddy.x + rand(-16, 16), S.buddy.y + rand(-10, 10), 2, 2);
  }
}

// ─── DECOY ───
export function drawDecoy() {
  if (!S.decoyActive || !S.decoyFish) return;
  S.decoyFish.tailPhase += 0.06;
  const flicker = 0.4 + Math.sin(Date.now() * 0.012) * 0.2;
  ctx.globalAlpha = flicker;
  drawPixelFish(S.decoyFish.x, S.decoyFish.y, S.decoyFish.dir, 0, S.decoyFish.tailPhase, '#ffaa44', '#ffcc66', '#dd8822');
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffcc44';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(S.decoyFish.x + rand(-18, 18), S.decoyFish.y + rand(-12, 12), 2, 2);
  }
}

// ─── GHOST SHARK (for HELL active phase) — identical to real shark, semi-transparent ───
function drawGhostSharkAt(x, y, angle, tailPhase, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  const tw = Math.round(Math.sin(tailPhase) * 4);

  // Exact same pixel art as the real shark
  ctx.fillStyle = '#556677';
  ctx.fillRect(-30, -6 + tw, 8, 3);
  ctx.fillRect(-34, -8 + tw, 5, 3);
  ctx.fillRect(-30, 3 + tw, 8, 3);
  ctx.fillRect(-34, 5 + tw, 5, 3);
  ctx.fillStyle = '#555566';
  ctx.fillRect(-24, -3 + tw, 6, 6);
  ctx.fillStyle = '#667788';
  ctx.fillRect(-18, -5, 36, 10);
  ctx.fillRect(-14, -6, 28, 2);
  ctx.fillRect(-14, 5, 28, 2);
  ctx.fillStyle = '#99aabb';
  ctx.fillRect(-14, 2, 28, 4);
  ctx.fillStyle = '#667788';
  ctx.fillRect(16, -4, 6, 8);
  ctx.fillRect(20, -3, 5, 6);
  ctx.fillRect(24, -2, 4, 4);
  ctx.fillRect(27, -1, 3, 2);
  ctx.fillStyle = '#556677';
  ctx.fillRect(-2, -12, 3, 7);
  ctx.fillRect(-1, -16, 3, 5);
  ctx.fillRect(0, -19, 2, 4);
  ctx.fillRect(2, 6, 8, 3);
  ctx.fillRect(4, 9, 5, 2);
  ctx.fillStyle = '#ffee44';
  ctx.fillRect(12, -4, 5, 5);
  ctx.fillStyle = '#111';
  ctx.fillRect(14, -4, 2, 5);
  ctx.fillStyle = '#fff';
  ctx.fillRect(13, -3, 1, 1);
  ctx.fillStyle = '#555566';
  ctx.fillRect(5, -3, 1, 6);
  ctx.fillRect(7, -3, 1, 6);
  ctx.fillRect(9, -3, 1, 6);
  ctx.fillStyle = '#ddeeff';
  ctx.fillRect(18, 3, 2, 2);
  ctx.fillRect(21, 3, 2, 2);
  ctx.fillRect(24, 2, 2, 2);
  ctx.fillRect(18, -5, 2, 2);
  ctx.fillRect(21, -5, 2, 2);
  ctx.fillRect(24, -4, 2, 2);

  ctx.restore();
}

// ─── SHARK ───
export function drawShark() {
  if (S.shark.hidden) return;
  // Hide shark during HELL intro (circles phase)
  if (S.hellAnim) {
    const hellElapsed = (Date.now() - S.hellAnim.startTime) / 1000;
    if (hellElapsed < 2) return;
  }

  ctx.save();
  ctx.translate(S.shark.x, S.shark.y);
  ctx.rotate(S.shark.angle);

  const frozen = S.iceActive || S.hourglassActive;
  if (frozen) ctx.globalAlpha = 0.6;

  const bodyCol  = frozen ? '#556688' : '#667788';
  const darkCol  = frozen ? '#445566' : '#555566';
  const finCol   = frozen ? '#4a5a6a' : '#556677';
  const bellyCol = frozen ? '#8899aa' : '#99aabb';

  const tw = Math.round(Math.sin(S.shark.tailPhase) * 4);
  ctx.fillStyle = finCol;
  ctx.fillRect(-30, -6 + tw, 8, 3);
  ctx.fillRect(-34, -8 + tw, 5, 3);
  ctx.fillRect(-30, 3 + tw, 8, 3);
  ctx.fillRect(-34, 5 + tw, 5, 3);
  ctx.fillStyle = darkCol;
  ctx.fillRect(-24, -3 + tw, 6, 6);

  ctx.fillStyle = bodyCol;
  ctx.fillRect(-18, -5, 36, 10);
  ctx.fillRect(-14, -6, 28, 2);
  ctx.fillRect(-14, 5, 28, 2);

  ctx.fillStyle = bellyCol;
  ctx.fillRect(-14, 2, 28, 4);

  ctx.fillStyle = bodyCol;
  ctx.fillRect(16, -4, 6, 8);
  ctx.fillRect(20, -3, 5, 6);
  ctx.fillRect(24, -2, 4, 4);
  ctx.fillRect(27, -1, 3, 2);

  ctx.fillStyle = finCol;
  ctx.fillRect(-2, -12, 3, 7);
  ctx.fillRect(-1, -16, 3, 5);
  ctx.fillRect(0, -19, 2, 4);

  ctx.fillStyle = finCol;
  ctx.fillRect(2, 6, 8, 3);
  ctx.fillRect(4, 9, 5, 2);

  const smart = S.settings.smartShark;
  ctx.fillStyle = frozen ? '#aabbcc' : smart ? '#00ff88' : '#ffee44';
  ctx.fillRect(12, -4, 5, 5);
  ctx.fillStyle = '#111';
  ctx.fillRect(14, -4, 2, 5);
  ctx.fillStyle = smart ? '#aaffcc' : '#fff';
  ctx.fillRect(13, -3, 1, 1);

  // Smart shark: green scan-line blink across eye
  if (smart) {
    const scan = Math.floor(Date.now() / 300) % 5;
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(12, -4 + scan, 5, 1);
  }

  ctx.fillStyle = darkCol;
  ctx.fillRect(5, -3, 1, 6);
  ctx.fillRect(7, -3, 1, 6);
  ctx.fillRect(9, -3, 1, 6);

  ctx.fillStyle = '#ddeeff';
  ctx.fillRect(18, 3, 2, 2);
  ctx.fillRect(21, 3, 2, 2);
  ctx.fillRect(24, 2, 2, 2);
  ctx.fillRect(18, -5, 2, 2);
  ctx.fillRect(21, -5, 2, 2);
  ctx.fillRect(24, -4, 2, 2);

  if (frozen) {
    ctx.fillStyle = '#88ddff';
    for (let i = 0; i < 4; i++) {
      const a = Date.now() * 0.002 + (i / 4) * Math.PI * 2;
      ctx.fillRect(Math.cos(a) * 22 - 1, Math.sin(a) * 22 - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.beginPath(); ctx.ellipse(4, 0, 28, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,40,40,${0.06 + Math.sin(Date.now() * 0.005) * 0.03})`;
    ctx.fill();
  }

  ctx.restore();

  // Player-controlled glow on shark during body swap
  if (S.bodySwapActive) {
    const p = 0.5 + Math.sin(Date.now() * 0.008) * 0.2;
    ctx.save(); ctx.translate(S.shark.x, S.shark.y);
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 26, S.shark.angle, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(68,255,136,${p})`; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 48, 32, S.shark.angle, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(68,255,136,${p * 0.35})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  // Shark quip speech bubble
  if (S.shark.quip && S.shark.quip.timer > 0 && !S.shark.hidden) {
    const fade = Math.min(1, S.shark.quip.timer / 20);
    const text = S.shark.quip.text.toUpperCase();
    ctx.save();
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word-wrap into lines
    const MAX_BW = 190, pad = 10, LINE_H = 14;
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > MAX_BW - pad * 2 && cur) {
        lines.push(cur); cur = word;
      } else { cur = test; }
    }
    if (cur) lines.push(cur);

    const maxLW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const bw = Math.max(60, maxLW + pad * 2);
    const bh = lines.length * LINE_H + pad;
    const bx = S.shark.x;
    // Position bubble above shark, clamped to canvas
    const rawBy = S.shark.y - 40 - bh;
    const by = Math.max(bh / 2 + 4, rawBy);

    ctx.globalAlpha = fade;
    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    // Bubble fill
    ctx.fillStyle = '#fff9e6';
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 6);
    ctx.fill();
    // Bubble outline
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#cc4400';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Tail (only if bubble is above shark)
    if (rawBy >= bh / 2 + 4) {
      ctx.fillStyle = '#fff9e6';
      ctx.strokeStyle = '#cc4400';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by + bh / 2 - 1);
      ctx.lineTo(bx + 5, by + bh / 2 - 1);
      ctx.lineTo(bx + 2, by + bh / 2 + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Text lines
    ctx.fillStyle = '#331100';
    ctx.shadowBlur = 0;
    lines.forEach((l, i) => {
      ctx.fillText(l, bx, by - bh / 2 + pad / 2 + LINE_H * i + LINE_H / 2);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // "..." speech bubble when prompted
  if (S.promptActive) {
    const bx = S.shark.x, by = S.shark.y - 36;
    const alpha = 0.7 + Math.sin(Date.now() * 0.006) * 0.18;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx - 14, by - 9, 28, 16);
    ctx.beginPath();
    ctx.moveTo(bx - 3, by + 7); ctx.lineTo(bx + 5, by + 7); ctx.lineTo(bx + 1, by + 15);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#444';
    ctx.fillRect(bx - 8, by - 2, 4, 4);
    ctx.fillRect(bx - 2, by - 2, 4, 4);
    ctx.fillRect(bx + 4, by - 2, 4, 4);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ─── TREATS ───
export function drawTreats() {
  for (const t of S.treats) {
    const bob = Math.round(Math.sin(t.bobPhase) * 2);
    t.bobPhase += 0.03;
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.type, t.x, t.y + bob);
  }
}

// ─── POWER-UP ITEMS ───
export function drawPWItems() {
  for (const k in S.pwItems) {
    const item = S.pwItems[k];
    if (!item) continue;

    const c = pwConfig[k];
    const rem = 1 - (Date.now() - item.spawnTime) / item.lifetime;
    const bob = Math.round(Math.sin(item.bobPhase) * 3);

    if (rem < 0.3 && Math.sin(Date.now() * 0.025) > 0) continue;

    ctx.save();
    ctx.translate(item.x, item.y + bob);

    if (k === 'poison' || k === 'goop') {
      const pulse = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = k === 'poison' ? `rgba(255,0,0,${pulse})` : `rgba(100,200,50,${pulse})`;
      ctx.fill();
    }

    const rainbowGlow = k === 'rainbow' ? `hsl(${(Date.now() * 0.3) % 360}, 100%, 65%)` : c.glow;
    const mysteryGlow = S.settings.mysteryBlocks ? '#f7b800' : rainbowGlow;

    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = mysteryGlow + '26'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = mysteryGlow + '10'; ctx.fill();

    const t = Date.now() * 0.003;
    for (let i = 0; i < 6; i++) {
      const a = t + (i / 6) * Math.PI * 2;
      ctx.fillStyle = mysteryGlow;
      ctx.fillRect(Math.cos(a) * 14 - 1, Math.sin(a) * 14 - 1, 3, 3);
    }

    if (S.settings.mysteryBlocks) {
      // Mario-style mystery block
      ctx.fillStyle = '#c87000';
      ctx.fillRect(-13, -13, 26, 26);
      ctx.fillStyle = '#f7b800';
      ctx.fillRect(-11, -11, 22, 18);
      ctx.fillStyle = '#ffd84d';
      ctx.fillRect(-11, -11, 22, 5);
      ctx.fillRect(-11, -11, 5, 22);
      ctx.fillStyle = '#c87000';
      ctx.fillRect(-11, 9, 22, 3);
      ctx.fillRect(9, -11, 3, 22);
      ctx.font = 'bold 15px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('?', 0, 1);
    } else {
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.emoji, 0, 0);
    }

    ctx.restore();
  }
}

// ─── SCREEN OVERLAYS ───
export function drawWarning() {
  const d = dist(S.shark, S.fish);
  if (d < 120 && !S.shieldActive && !S.shark.hidden && !S.starActive) {
    ctx.globalAlpha = (1 - d / 120) * 0.12;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

export function drawClaudeOverlay() {
  if (!S.claudeActive || !S.claudeAnim) return;
  const elapsed = Date.now() - S.claudeAnim.startTime;
  const t = Date.now() * 0.001;

  // Fade-in dark vignette
  ctx.globalAlpha = Math.min(0.74, elapsed / 400 * 0.74);
  ctx.fillStyle = '#020008';
  ctx.fillRect(0, 0, W, H);

  // One-time aurora sweep left → right
  const sweepX = (elapsed / 700) * (W + 240) - 120;
  if (sweepX < W + 120) {
    const grad = ctx.createLinearGradient(sweepX - 130, 0, sweepX + 130, 0);
    grad.addColorStop(0, 'rgba(110,40,220,0)');
    grad.addColorStop(0.4, 'rgba(120,50,220,0.30)');
    grad.addColorStop(0.5, 'rgba(255,160,40,0.36)');
    grad.addColorStop(0.6, 'rgba(120,50,220,0.30)');
    grad.addColorStop(1, 'rgba(110,40,220,0)');
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Animated border
  const pulse = 0.7 + Math.sin(t * 5) * 0.2;
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = `hsl(${270 + Math.sin(t * 2) * 30},80%,72%)`;
  ctx.lineWidth = 7;
  ctx.strokeRect(3.5, 3.5, W - 7, H - 7);
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = `hsl(${38 + Math.sin(t * 3) * 12},90%,65%)`;
  ctx.lineWidth = 2;
  ctx.strokeRect(11, 11, W - 22, H - 22);

  // Corner accents
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#cc88ff';
  const cs = 14;
  [[3, 3], [W - 3 - cs, 3], [3, H - 3 - cs], [W - 3 - cs, H - 3 - cs]].forEach(([cx, cy]) => {
    ctx.fillRect(cx, cy, cs, 3);
    ctx.fillRect(cx, cy, 3, cs);
  });

  // Typewriter text
  if (S.claudeAnim.text) {
    const cursor = Math.sin(t * 10) > 0 ? '|' : ' ';
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shadow
    ctx.fillStyle = '#220044';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(S.claudeAnim.text + cursor, W / 2 + 2, H / 2 + 2);
    // Gradient text
    const tg = ctx.createLinearGradient(0, H / 2 - 9, 0, H / 2 + 9);
    tg.addColorStop(0, '#ee99ff');
    tg.addColorStop(1, '#ffcc55');
    ctx.fillStyle = tg;
    ctx.fillText(S.claudeAnim.text + cursor, W / 2, H / 2);
    // Sub-caption once text is done
    if (S.claudeAnim.text === S.claudeAnim.textTarget) {
      const subAlpha = Math.min(1, (elapsed - S.claudeAnim.textTarget.length * 55 - 200) / 300);
      if (subAlpha > 0) {
        ctx.globalAlpha = subAlpha * 0.8;
        ctx.fillStyle = '#aa77dd';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText('COLLECTING ALL TREATS...', W / 2, H / 2 + 28);
      }
    }
  }

  ctx.globalAlpha = 1;
}

export function drawRainbowOverlay() {
  if (!S.rainbowActive) return;
  const t = Date.now() * 0.004;
  const th = 12, seg = 6;

  // Thick fast-cycling rainbow border
  ctx.globalAlpha = 0.95;
  for (let x = 0; x < W; x += seg) {
    const hue = (t * 300 + x * 3) % 360;
    ctx.fillStyle = 'hsl(' + hue + ',100%,65%)';
    ctx.fillRect(x, 0, seg + 1, th);
    ctx.fillStyle = 'hsl(' + ((hue + 60) % 360) + ',100%,65%)';
    ctx.fillRect(x, H - th, seg + 1, th);
  }
  for (let y = 0; y < H; y += seg) {
    const hue = (t * 300 + y * 3) % 360;
    ctx.fillStyle = 'hsl(' + hue + ',100%,65%)';
    ctx.fillRect(0, y, th, seg + 1);
    ctx.fillStyle = 'hsl(' + ((hue + 60) % 360) + ',100%,65%)';
    ctx.fillRect(W - th, y, th, seg + 1);
  }

  // Gentle rainbow screen tint — slow hue cycle, no strobing
  ctx.globalAlpha = 0.07 + Math.sin(t * 1.5) * 0.02;
  ctx.fillStyle = 'hsl(' + ((t * 40) % 360) + ',100%,60%)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.05 + Math.cos(t * 1.2) * 0.02;
  ctx.fillStyle = 'hsl(' + ((t * 40 + 150) % 360) + ',100%,60%)';
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 1;
}

export function drawFrenzyOverlay() {
  if (!S.frenzyActive) return;
  const t = Date.now() * 0.002, th = 5, seg = 12;
  ctx.globalAlpha = 0.75;
  for (let x = 0; x < W; x += seg) {
    const hue = (t * 120 + x * 1.5) % 360;
    ctx.fillStyle = `hsl(${hue},100%,55%)`;
    ctx.fillRect(x, 0, seg + 1, th);
    ctx.fillStyle = `hsl(${(hue + 180) % 360},100%,55%)`;
    ctx.fillRect(x, H - th, seg + 1, th);
  }
  for (let y = 0; y < H; y += seg) {
    const hue = (t * 120 + y * 1.5) % 360;
    ctx.fillStyle = `hsl(${hue},100%,55%)`;
    ctx.fillRect(0, y, th, seg + 1);
    ctx.fillStyle = `hsl(${(hue + 180) % 360},100%,55%)`;
    ctx.fillRect(W - th, y, th, seg + 1);
  }
  ctx.globalAlpha = 1;
}

export function drawIceOverlay() {
  if (!S.iceActive) return;
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#88ddff';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

export function drawHourglassOverlay() {
  if (!S.hourglassActive) return;
  const t = Date.now();
  // Screen tint
  ctx.globalAlpha = 0.05 + Math.sin(t * 0.003) * 0.03;
  ctx.fillStyle = '#ffdd44';
  ctx.fillRect(0, 0, W, H);
  // Golden pulsing border
  ctx.globalAlpha = 0.35 + Math.sin(t * 0.005) * 0.2;
  ctx.strokeStyle = '#ffdd44';
  ctx.lineWidth = 7;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.globalAlpha = 1;
}

export function drawGhostIndicator() {
  if (!S.ghostActive || !S.shark) return;
  const t = Date.now();
  const alpha = 0.25 + Math.sin(t * 0.006) * 0.12;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '30px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👻', S.shark.x, S.shark.y - 8);
  ctx.font = '6px "Press Start 2P"';
  ctx.fillStyle = '#aaaaff';
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillText('STUNNED', S.shark.x, S.shark.y - 38);
  ctx.restore();
}

export function drawCrazyOverlay() {
  if (!S.crazyActive) return;
  ctx.globalAlpha = 0.12 + Math.sin(Date.now() * 0.02) * 0.05;
  ctx.fillStyle = `hsl(${(Date.now() * 0.5) % 360}, 100%, 50%)`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

export function drawFishGlow() {
  if (!S.frenzyActive) return;
  ctx.save(); ctx.translate(S.fish.x, S.fish.y);
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,150,0,0.1)'; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,200,50,0.05)'; ctx.fill();
  ctx.restore();
}

export function drawMagnetLines() {
  if (!S.magnetActive) return;
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#dd44ff';
  ctx.lineWidth = 1;
  for (const t of S.treats) {
    if (t.collected) continue;
    ctx.beginPath();
    ctx.moveTo(S.fish.x, S.fish.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawScanlines() {
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// ─── CLOSEST TREAT ARROW ───
export function drawClosestTreatArrow() {
  if (S.treats.length === 0) return;
  // During body swap, arrow points from shark (player) to nearest treat
  const origin = S.bodySwapActive ? S.shark : S.fish;
  let nearest = null, nearestD = Infinity;
  for (const t of S.treats) { if (!t.collected) { const d = dist(t, origin); if (d < nearestD) { nearestD = d; nearest = t; } } }
  if (!nearest || nearestD < 50) return;
  const a = Math.atan2(nearest.y - origin.y, nearest.x - origin.x);
  const ax = origin.x + Math.cos(a) * 36;
  const ay = origin.y + Math.sin(a) * 36;

  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(a);

  const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.2;

  ctx.globalAlpha = pulse * 0.3;
  ctx.fillStyle = '#ffdd44';
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();

  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffdd44';
  ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-4, -6); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();

  ctx.globalAlpha = Math.min(1, pulse + 0.2);
  ctx.fillStyle = '#fff8dd';
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── TIMED POWER-UP BARS ───
export function drawPowerupTimerBars() {
  const bars = [];
  if (S.iceActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.iceStartTime) / ICE_DURATION);
    bars.push({ colour: '#88ddff', label: '❄️', rem });
  }
  if (S.hourglassActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.hourglassStartTime) / HOURGLASS_DURATION);
    bars.push({ colour: '#ffdd44', label: '⏳', rem });
  }
  if (S.goopActive) {
    const goopRem = Math.max(0, 1 - (Date.now() - S.goopStartTime) / GOOP_DURATION);
    bars.push({ colour: '#66cc44', label: '🧪', rem: goopRem });
  }
  if (S.frenzyActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.frenzyTimer) / FRENZY_DURATION);
    bars.push({ colour: '#ff8800', label: '🔥', rem });
  }
  if (S.ghostActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.ghostStartTime) / GHOST_DURATION);
    bars.push({ colour: '#aaaaff', label: '👻', rem });
  }
  if (S.buddyActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.buddyStartTime) / BUDDY_DURATION);
    bars.push({ colour: '#44ddaa', label: '🐠', rem });
  }
  if (S.bombActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.bombStartTime) / BOMB_DURATION);
    bars.push({ colour: '#ff4444', label: '💣', rem });
  }
  if (S.crazyActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.crazyStartTime) / CRAZY_DURATION);
    bars.push({ colour: '#ff00aa', label: '🍄', rem });
  }
  if (S.decoyActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.decoyStartTime) / DECOY_DURATION);
    bars.push({ colour: '#ffaa44', label: '👁️', rem });
  }
  if (S.starActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.starStartTime) / STAR_DURATION);
    bars.push({ colour: '#ffee44', label: '⭐', rem });
  }
  if (S.rainbowActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.rainbowStartTime) / RAINBOW_DURATION);
    bars.push({ colour: '#ff88ff', label: '🌈', rem });
  }
  if (S.promptActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.promptStartTime) / PROMPT_WANDER_DURATION);
    bars.push({ colour: '#aa66ff', label: '✍️', rem });
  }
  if (S.bodySwapActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.bodySwapStartTime) / BODY_SWAP_DURATION);
    bars.push({ colour: '#ff4488', label: '🎭', rem });
  }
  if (S.claudeActive && S.claudeAnim && S.claudeAnim.totalDuration > 0) {
    const rem = Math.max(0, 1 - (Date.now() - S.claudeAnim.startTime) / S.claudeAnim.totalDuration);
    bars.push({ colour: '#cc88ff', label: '🤖', rem });
  }
  if (S.hellActive) {
    const rem = Math.max(0, 1 - (Date.now() - S.hellStartTime) / HELL_DURATION);
    bars.push({ colour: '#ff0000', label: '👹', rem });
  }
  if (bars.length === 0) return;

  bars.forEach((b, i) => {
    ctx.globalAlpha = 0.3 + b.rem * 0.3;
    ctx.strokeStyle = b.colour;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    const by = H - 10 - i * 14;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(60, by - 4, W - 120, 8);
    ctx.fillStyle = b.colour;
    ctx.fillRect(60, by - 4, (W - 120) * b.rem, 8);
    ctx.font = '12px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, 42, by);
    ctx.globalAlpha = 1;
  });
}

// ─── BOMB SHOCKWAVE ANIMATION ───
export function drawBombAnim() {
  if (!S.bombAnim) return;
  const anim = S.bombAnim;
  const t = Math.min(1, (Date.now() - anim.startTime) / anim.duration);
  if (t >= 1) { S.bombAnim = null; return; }

  const ease = 1 - Math.pow(1 - t, 3);
  const maxR = Math.max(W, H);

  ctx.save();

  // Screen flash
  ctx.globalAlpha = (1 - t) * 0.45;
  ctx.fillStyle = '#ff6600';
  ctx.fillRect(0, 0, W, H);

  // Expanding shockwave rings
  for (let ring = 0; ring < 3; ring++) {
    const rt = Math.max(0, ease - ring * 0.12);
    const r = rt * maxR * 0.8;
    const alpha = (1 - rt) * 0.6;
    if (r <= 0 || alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ring === 0 ? '#ffaa00' : ring === 1 ? '#ff4400' : '#ff0000';
    ctx.lineWidth = 4 - ring;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(anim.x, anim.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── BODY SWAP SOUL ANIMATION ───
export function drawBodySwapAnim() {
  if (!S.bodySwapAnim) return;
  const anim = S.bodySwapAnim;
  const t = Math.min(1, (Date.now() - anim.startTime) / anim.duration);
  if (t >= 1) { S.bodySwapAnim = null; return; }

  // Ease in-out
  const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const arcHeight = 110;

  // Fish soul (orange): fish → shark, arcs upward
  const fsx = anim.fishX + (anim.sharkX - anim.fishX) * ease;
  const fsy = anim.fishY + (anim.sharkY - anim.fishY) * ease - Math.sin(t * Math.PI) * arcHeight;

  // Shark soul (blue): shark → fish, arcs downward
  const ssx = anim.sharkX + (anim.fishX - anim.sharkX) * ease;
  const ssy = anim.sharkY + (anim.fishY - anim.sharkY) * ease + Math.sin(t * Math.PI) * arcHeight;

  ctx.save();

  // Draw trailing ghost copies (past positions)
  for (let i = 1; i <= 6; i++) {
    const pt = Math.max(0, t - i * 0.04);
    const pe = pt < 0.5 ? 2 * pt * pt : -1 + (4 - 2 * pt) * pt;
    const pfx = anim.fishX + (anim.sharkX - anim.fishX) * pe;
    const pfy = anim.fishY + (anim.sharkY - anim.fishY) * pe - Math.sin(pt * Math.PI) * arcHeight;
    const psx = anim.sharkX + (anim.fishX - anim.sharkX) * pe;
    const psy = anim.sharkY + (anim.fishY - anim.sharkY) * pe + Math.sin(pt * Math.PI) * arcHeight;
    const a = (0.35 - i * 0.05);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = '#ff8833';
    ctx.beginPath(); ctx.arc(pfx, pfy, 10 - i, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#44aaff';
    ctx.beginPath(); ctx.arc(psx, psy, 10 - i, 0, Math.PI * 2); ctx.fill();
  }

  // Fish soul orb (orange glow)
  ctx.globalAlpha = 1;
  const wobble = Math.sin(Date.now() * 0.015) * 3;
  const drawSoul = (x, y, innerCol, outerCol) => {
    const r = 16 + wobble;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, innerCol);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.shadowColor = outerCol;
    ctx.shadowBlur = 28;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  };

  drawSoul(fsx, fsy, '#ff8833', '#ffaa44');
  drawSoul(ssx, ssy, '#44aaff', '#88ccff');

  // White flash + big text at crossing point (t ≈ 0.5)
  if (t > 0.36 && t < 0.64) {
    const flashT = 1 - Math.abs(t - 0.5) / 0.14;
    ctx.globalAlpha = flashT * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = flashT;
    ctx.font = 'bold 26px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff4488';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff4488';
    ctx.fillText('🎭 BODY SWAP!', W / 2, H / 2 - 14);
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff4488';
    ctx.fillText('YOU ARE THE SHARK', W / 2, H / 2 + 18);
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── HELL ANIMATION ───
export function drawHellAnim() {
  if (!S.hellAnim) return;
  const elapsed = (Date.now() - S.hellAnim.startTime) / 1000;
  if (elapsed > 14.5) { S.hellAnim = null; return; }

  const now = Date.now() * 0.001;
  const cx = W / 2, cy = H / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ── PHASE 1: INTRO (0–2s) — circles spin, game frozen, slow red waves ──
  if (elapsed < 2) {
    const p = elapsed / 2; // 0→1

    // Slow red/dark-red wash building up
    ctx.globalAlpha = p * 0.35;
    ctx.fillStyle = '#440000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.2;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, W, H);

    // Expanding burst rings from center
    for (let i = 0; i < 4; i++) {
      const rp = ((p * 2.5 + i * 0.35) % 1);
      ctx.globalAlpha = Math.max(0, (1 - rp) * 0.75);
      ctx.strokeStyle = i % 2 === 0 ? '#ff0000' : '#770000';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, rp * 220, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 4 spinning circles around center
    const spinAngle = now * 3.5;
    const orbitR = 70 + p * 40;
    for (let i = 0; i < 4; i++) {
      const a = spinAngle + i * (Math.PI / 2);
      const ox = cx + Math.cos(a) * orbitR;
      const oy = cy + Math.sin(a) * orbitR;
      const circR = 18 + Math.sin(now * 5 + i) * 4;

      ctx.globalAlpha = 0.9;
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = i % 2 === 0 ? '#ff2200' : '#ff6600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ox, oy, circR, 0, Math.PI * 2);
      ctx.stroke();
      const innerGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, circR);
      innerGrad.addColorStop(0, 'rgba(255,60,0,0.5)');
      innerGrad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(ox, oy, circR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // "HELL AWAITS" text fades in at end of intro
    if (p > 0.6) {
      const tp = (p - 0.6) / 0.4;
      ctx.globalAlpha = tp * 0.9;
      ctx.font = 'bold 18px "Press Start 2P", monospace';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ff2200';
      ctx.fillText('\u2666 HELL AWAITS \u2666', cx, cy);
      ctx.shadowBlur = 0;
    }
  }

  // ── PHASE 2: ACTIVE (2–12s) — 4 ghost sharks chase player, red vignette ──
  if (elapsed >= 2 && elapsed < 12) {
    // Steady dark red vignette (no fast pulsing)
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, W, H);

    const vig = ctx.createRadialGradient(cx, cy, 60, cx, cy, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(80,0,0,0.55)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Initialize ghost sharks on first active frame
    if (!S.hellAnim.ghosts) {
      S.hellAnim.ghosts = [
        { x: W * 0.1,  y: H * 0.15, angle: 0,          tailPhase: 0 },
        { x: W * 0.9,  y: H * 0.15, angle: Math.PI,     tailPhase: 1.5 },
        { x: W * 0.1,  y: H * 0.85, angle: 0,           tailPhase: 3 },
        { x: W * 0.9,  y: H * 0.85, angle: Math.PI,     tailPhase: 4.5 },
      ];
    }

    // Update and draw each ghost shark — they chase the fish
    const ghostSpeed = 1.2 + S.level * 0.08;
    for (let i = 0; i < S.hellAnim.ghosts.length; i++) {
      const g = S.hellAnim.ghosts[i];
      const tx = S.fish ? S.fish.x : cx;
      const ty = S.fish ? S.fish.y : cy;
      const dx = tx - g.x;
      const dy = ty - g.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 2) {
        g.x += (dx / d) * ghostSpeed;
        g.y += (dy / d) * ghostSpeed;
        g.angle = Math.atan2(dy, dx);
      }
      g.tailPhase += 0.1;
      const ghostAlpha = 0.55 + Math.sin(now * 1.5 + i * 1.5) * 0.08;
      drawGhostSharkAt(g.x, g.y, g.angle, g.tailPhase, ghostAlpha);
    }

    // "HELL" title — slow gentle pulse
    const pulse = 0.75 + Math.sin(now * 3) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 28px "Press Start 2P", monospace';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff2200';
    ctx.fillText('\u2666 HELL \u2666', cx, cy - 12);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.7;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff8844';
    ctx.fillText('TREATS DRAIN YOUR SOUL', cx, cy + 22);

    // Countdown
    const remaining = Math.max(0, Math.ceil(12 - elapsed));
    ctx.globalAlpha = 0.6;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff4400';
    ctx.fillText(remaining + 's OF HELL REMAINS', cx, H - 22);
  }

  // ── PHASE 3: FIRE OUTRO (12–13.5s) — fire rises, circles spin and fade ──
  if (elapsed >= 12 && elapsed < 13.5) {
    const fireP = (elapsed - 12) / 1.5;

    // Fading red overlay
    ctx.globalAlpha = (1 - fireP) * 0.18;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, W, H);

    // Fire columns rising from bottom
    const fireHeight = fireP * H * 0.92;
    ctx.globalAlpha = 0.9;
    for (let x = 0; x < W; x += 6) {
      const flicker1 = Math.sin(x * 0.09 + now * 13) * 28;
      const flicker2 = Math.sin(x * 0.17 + now * 9) * 18;
      const colH = Math.max(0, fireHeight + flicker1 + flicker2);
      const fireTop = H - colH;
      const hue = 8 + Math.sin(x * 0.08 + now * 2) * 10;
      const grad = ctx.createLinearGradient(x, H, x, fireTop);
      grad.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
      grad.addColorStop(0.5, `hsl(${hue + 18}, 100%, 65%)`);
      grad.addColorStop(1, 'rgba(255,200,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, fireTop, 7, colH);
    }

    // Circles spinning out and fading
    const spinAngle2 = now * 5;
    const orbitR2 = 100 + fireP * 60;
    for (let i = 0; i < 4; i++) {
      const a = spinAngle2 + i * (Math.PI / 2);
      const ox = cx + Math.cos(a) * orbitR2;
      const oy = cy + Math.sin(a) * orbitR2;
      ctx.globalAlpha = Math.max(0, 0.85 - fireP * 0.9);
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = i % 2 === 0 ? '#ff2200' : '#ff6600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ox, oy, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // ── PHASE 4: END TEXT (13.5–14.5s) ──
  if (elapsed >= 13.5 && elapsed < 14.5) {
    const ep = (elapsed - 13.5);
    const alpha = ep < 0.5 ? ep / 0.5 : (1 - ep) / 0.5;

    ctx.globalAlpha = alpha * 0.85;
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#ff4400';
    ctx.fillText('HELL AND BACK.', cx, cy - 16);

    ctx.globalAlpha = alpha * 0.7;
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffaa44';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 20;
    ctx.fillText("you're done.", cx, cy + 18);
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── TUTORIAL HINTS ───
// dur: seconds this step lasts (null = wait for input, never fade out)
const TUTORIAL_HINTS = [
  { title: 'WELCOME!',      body: 'ARROW KEYS / WASD TO SWIM  \u2022  TAP & DRAG ON MOBILE',         dur: null },
  { title: 'COLLECT',       body: 'EAT ALL THE TREATS BEFORE THE TIMER RUNS OUT!',                    dur: 6    },
  { title: 'POWER-UPS!',    body: 'GLOWING ORBS GIVE BOOSTS \u2014 FRENZY MAGNET SHIELD & MORE!',    dur: 5    },
  { title: 'DANGER ITEMS',  body: 'RED ORBS HURT YOU \u2014 POISON HOOK & GOOP \u2014 AVOID THEM!',  dur: 5    },
  { title: 'THE SHARK!',    body: "IT'S CHASING YOU \u2014 DODGE IT OR IT'S GAME OVER!",              dur: 5    },
  { title: 'ALL DONE!',     body: 'YOU ARE READY TO PLAY. HEADING BACK TO MENU...',                   dur: 3    },
];

export function drawTutorialHints() {
  if (!S.tutorialActive) return;
  const hint = TUTORIAL_HINTS[S.tutorialStep];
  if (!hint) return;

  const elapsed = (Date.now() - S.tutorialStepTime) / 1000;
  const stepDuration = hint.dur ?? 999;
  const fadeIn = Math.min(1, elapsed / 0.3);
  const fadeOut = hint.dur === null ? 1 : Math.max(0, 1 - (elapsed - (stepDuration - 0.4)) / 0.4);
  const alpha = fadeIn * (elapsed < stepDuration - 0.4 ? 1 : fadeOut);
  if (alpha <= 0) return;

  const bw = 480, bh = 58, bx = W / 2 - bw / 2, by = H - bh - 14;
  const stepDots = TUTORIAL_HINTS.map((_, i) => i === S.tutorialStep ? '\u25cf' : '\u25cb').join('  ');

  ctx.save();
  ctx.globalAlpha = alpha * 0.95;

  ctx.fillStyle = 'rgba(2,6,18,0.94)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#44ddff';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#44ddff';
  ctx.shadowColor = '#44ddff';
  ctx.shadowBlur = 10;
  ctx.fillText(hint.title, W / 2, by + 16);

  ctx.font = '6px "Press Start 2P", monospace';
  ctx.fillStyle = '#7799bb';
  ctx.shadowBlur = 0;
  ctx.fillText(hint.body, W / 2, by + 34);

  ctx.fillStyle = '#335566';
  ctx.fillText(stepDots, W / 2, by + 50);

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── LEVEL BANNER ───
export function drawLevelBanner() {
  if (!S.levelBanner) return;
  const elapsed = (Date.now() - S.levelBanner.startTime) / 1000;
  if (elapsed > 1.8) { S.levelBanner = null; return; }

  const alpha = elapsed < 0.35 ? elapsed / 0.35
              : elapsed < 1.2  ? 1
              : Math.max(0, 1 - (elapsed - 1.2) / 0.6);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 26px "Press Start 2P", monospace';
  ctx.shadowColor = '#44ddff';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#44ddff';
  ctx.fillText(S.levelBanner.text, W / 2, H / 2 - (S.levelBanner.sub ? 10 : 0));

  if (S.levelBanner.sub) {
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#88bbdd';
    ctx.shadowBlur = 10;
    ctx.fillText(S.levelBanner.sub, W / 2, H / 2 + 20);
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── CARD MINI-GAME ───
export function drawCardAnim() {
  if (!S.cardAnim) return;
  const ca = S.cardAnim;
  const now = Date.now();
  const cx = W / 2, cy = H / 2;

  ctx.save();

  // Dark overlay behind cards
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "#08000f";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Title
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = 'bold 11px "Press Start 2P", monospace';
  ctx.shadowColor = "#9933ff";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#cc88ff";
  ctx.fillText("♠ PICK A CARD ♠", cx, cy - 88);
  ctx.shadowBlur = 0;

  const CW = 56, CH = 82, GAP = 10;
  const totalW = 5 * CW + 4 * GAP;
  const startX = cx - totalW / 2;
  const baseY = cy - CH / 2 + 8;

  for (let i = 0; i < 5; i++) {
    const card = ca.cards[i];
    const isSelected = i === ca.selected && ca.phase === "pick";
    const isChosen   = i === ca.flipCard;
    const lifted     = isSelected || (isChosen && ca.phase !== "pick");
    const yOff       = lifted ? -20 : 0;
    const cardCX     = startX + i * (CW + GAP) + CW / 2;
    const cardCY     = baseY + CH / 2 + yOff;

    let scaleX = 1, showFace = false;
    if (ca.phase === "flip" && isChosen) {
      const t = (now - ca.flipStart) / 200;
      if (t < 1) {
        scaleX = Math.max(0, 1 - t);
      } else {
        scaleX = Math.min(1, t - 1);
        showFace = true;
      }
      if (t >= 2) { ca.phase = "reveal"; ca.revealStart = now; }
    } else if (ca.phase === "reveal" && isChosen) {
      showFace = true;
    }

    ctx.save();
    ctx.translate(cardCX, cardCY);
    ctx.scale(scaleX, 1);

    const hw = CW / 2, hh = CH / 2;

    if (!showFace) {
      ctx.fillStyle = isSelected ? "#2e1055" : "#180630";
      ctx.fillRect(-hw, -hh, CW, CH);
      if (isSelected) { ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 14; }
      ctx.strokeStyle = isSelected ? "#ffcc00" : "#7744bb";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeRect(-hw + 1, -hh + 1, CW - 2, CH - 2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isSelected ? "#aa8800" : "#3a1a77";
      ctx.lineWidth = 1;
      ctx.strokeRect(-hw + 4, -hh + 4, CW - 8, CH - 8);
      ctx.fillStyle = isSelected ? "#4422aa" : "#2a0d66";
      for (let dy = -hh + 13; dy < hh - 8; dy += 10) {
        for (let dx = -hw + 11; dx < hw - 8; dx += 10) {
          ctx.save(); ctx.translate(dx, dy); ctx.rotate(Math.PI / 4);
          ctx.fillRect(-3, -3, 6, 6); ctx.restore();
        }
      }
      ctx.fillStyle = isSelected ? "#cc99ff" : "#7744bb";
      ctx.save(); ctx.rotate(Math.PI / 4); ctx.fillRect(-7, -7, 14, 14); ctx.restore();
      ctx.fillStyle = isSelected ? "#2e1055" : "#180630";
      ctx.save(); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
    } else {
      ctx.fillStyle = "#fff8f0";
      ctx.fillRect(-hw, -hh, CW, CH);
      const borderCol = card.rare === "death" ? "#ff2200" : card.rare === "crazy" ? "#ff00ff" : card.good ? "#44ee88" : "#ff5555";
      if (card.rare) { ctx.shadowColor = borderCol; ctx.shadowBlur = 14; }
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 2;
      ctx.strokeRect(-hw + 1, -hh + 1, CW - 2, CH - 2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = card.good ? "#aaeebb" : "#ffbbbb";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-hw + 4, -hh + 4, CW - 8, CH - 8);
      ctx.font = "24px serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#000";
      ctx.fillText(card.emoji, 0, -10);
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillStyle = card.rare === "death" ? "#990000" : card.rare === "crazy" ? "#770077" : card.good ? "#225533" : "#882222";
      const words = card.label.split(" ");
      const lines = []; let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > CW - 10 && cur) { lines.push(cur); cur = w; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      lines.forEach((l, li) => ctx.fillText(l, 0, 10 + li * 9));
    }

    ctx.restore();
  }

  ctx.globalAlpha = 0.75;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (ca.phase === "pick") {
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = "#aa88cc";
    ctx.fillText("← → TO BROWSE  •  ENTER / CLICK TO PICK", cx, baseY + CH + 22);
  } else if (ca.phase === "reveal") {
    const card = ca.cards[ca.flipCard];
    ctx.globalAlpha = 0.95;
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    const resultCol = card.rare === "death" ? "#ff2200" : card.rare === "crazy" ? "#ff44ff" : card.good ? "#44ee88" : "#ff5555";
    ctx.fillStyle = resultCol;
    ctx.shadowColor = resultCol; ctx.shadowBlur = 12;
    const msg = card.rare === "death" ? "YOU CHOSE... POORLY." : card.rare === "crazy" ? "ABSOLUTE CHAOS." : card.good ? "NICE PICK!" : "TOUGH LUCK.";
    ctx.fillText(msg, cx, baseY + CH + 22);
    ctx.shadowBlur = 0;
    if (now - ca.revealStart > 1500) ca.resolved = true;
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
