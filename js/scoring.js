// ═══════════════════════════════════════════════════════════════
// SCORING — Combo system, streak messages, high score check
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { st, scoreEl } from './dom.js';
import { COMBO_WINDOW, W, H } from './constants.js';
import { spawnParticles } from './particles.js';

const STREAK_MSGS = { 2: 'NICE!', 3: 'GREAT!', 4: 'UNSTOPPABLE!', 5: 'GODLIKE!' };
const STREAK_COLS = { 2: '#88ddff', 3: '#44ee88', 4: '#ffdd44', 5: '#ff44ff' };

export function collectTreat(t) {
  t.collected = true;
  const now = Date.now();

  // Combo system
  if (now - S.comboTimer < COMBO_WINDOW) S.comboCount++;
  else S.comboCount = 1;
  S.comboTimer = now;
  const cm = Math.min(S.comboCount, 5);

  // Update combo HUD
  st.combo.textContent = '⚡x' + cm;
  if (cm >= 3) st.combo.classList.add('s-on', 's-combo');
  else st.combo.classList.remove('s-on', 's-combo');

  // Streak messages
  if (STREAK_MSGS[cm]) {
    S.scorePopups.push({
      x: S.fish.x, y: S.fish.y - 34,
      pts: STREAK_MSGS[cm], life: 1.2, decay: 0.02
    });
    spawnParticles(S.fish.x, S.fish.y, STREAK_COLS[cm], 10);
  }

  // Calculate points
  const basePts = S.frenzyActive ? 20 : 10;
  const pts = basePts * cm;
  S.score += pts;
  scoreEl.textContent = S.score;

  // Global high score check
  if (S.score > S.globalHighScore && S.globalHighScore > 0 && !S.pbNotified) {
    S.pbNotified = true;
    S.scorePopups.push({
      x: W / 2, y: H / 2 - 40,
      pts: '★ NEW HIGH SCORE! ★', life: 2.5, decay: 0.01
    });
    spawnParticles(S.fish.x, S.fish.y, '#ffdd44', 20);
  }

  // Visual feedback
  spawnParticles(t.x, t.y, S.frenzyActive ? '#ff8800' : '#ffdd44', 8);
  S.scorePopups.push({ x: t.x, y: t.y - 14, pts, life: 1, decay: 0.025 });
}
