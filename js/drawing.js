// ═══════════════════════════════════════════════════════════════
// DRAWING — All canvas rendering functions
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { ctx } from './dom.js';
import { W, H, rand, dist,
  FRENZY_DURATION, ICE_DURATION, HOURGLASS_DURATION, GOOP_DURATION
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
export function drawPixelFish(x, y, dir, angle, phase, c1, c2, c3) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.rotate(angle || 0);

  ctx.fillStyle = c1;
  ctx.fillRect(-14, -8, 28, 16);
  ctx.fillRect(-10, -10, 20, 2);
  ctx.fillRect(-10, 8, 20, 2);

  ctx.fillStyle = c2;
  ctx.fillRect(-10, 2, 18, 4);

  ctx.fillStyle = c3;
  ctx.fillRect(-10, -10, 20, 3);

  const tw = Math.round(Math.sin(phase) * 4);
  ctx.fillStyle = c1;
  ctx.fillRect(-22, -6 + tw, 8, 4);
  ctx.fillRect(-22, 2 + tw, 8, 4);
  ctx.fillRect(-26, -8 + tw, 4, 4);
  ctx.fillRect(-26, 4 + tw, 4, 4);

  ctx.fillStyle = '#fff';
  ctx.fillRect(6, -6, 8, 8);
  ctx.fillStyle = '#111';
  ctx.fillRect(10, -4, 4, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(10, -4, 2, 2);

  ctx.fillStyle = c3;
  ctx.fillRect(-2, -14, 8, 4);
  ctx.fillRect(0, -12, 4, 2);

  ctx.restore();
}

// ─── PLAYER FISH ───
export function drawFish() {
  const c1 = S.frenzyActive ? '#ffaa22' : '#ff8833';
  const c2 = S.frenzyActive ? '#ffcc44' : '#ffaa55';
  const c3 = S.frenzyActive ? '#ee7700' : '#cc5500';
  drawPixelFish(S.fish.x, S.fish.y, S.fish.dir, S.fish.angle, S.fish.tailPhase, c1, c2, c3);

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

// ─── SHARK ───
export function drawShark() {
  if (S.shark.hidden) return;

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

  ctx.fillStyle = frozen ? '#aabbcc' : '#ffee44';
  ctx.fillRect(12, -4, 5, 5);
  ctx.fillStyle = '#111';
  ctx.fillRect(14, -4, 2, 5);
  ctx.fillStyle = '#fff';
  ctx.fillRect(13, -3, 1, 1);

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
  ctx.globalAlpha = 0.03 + Math.sin(Date.now() * 0.003) * 0.02;
  ctx.fillStyle = '#ffdd44';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
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
  let nearest = null, nearestD = Infinity;
  for (const t of S.treats) { if (!t.collected) { const d = dist(t, S.fish); if (d < nearestD) { nearestD = d; nearest = t; } } }
  if (!nearest || nearestD < 50) return;
  const a = Math.atan2(nearest.y - S.fish.y, nearest.x - S.fish.x);
  const ax = S.fish.x + Math.cos(a) * 36;
  const ay = S.fish.y + Math.sin(a) * 36;

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
