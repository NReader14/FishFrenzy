// ═══════════════════════════════════════════════════════════════
// CONTROLS — Keyboard input + mobile virtual joystick
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { canvas, overlay, winOverlay, endScreenOverlay, startBtn } from './dom.js';
import { W, H } from './constants.js';
import { portraitRotated } from './mobile-scale.js';

// ─── Card helpers ────────────────────────────────────────────────

function cardHitTest(mx, my) {
  const CW = 56, CH = 82, GAP = 10;
  const startX = W / 2 - (5 * CW + 4 * GAP) / 2;
  const baseY  = H / 2 - CH / 2 + 8;
  for (let i = 0; i < 5; i++) {
    const cx = startX + i * (CW + GAP);
    if (mx >= cx && mx <= cx + CW && my >= baseY - 25 && my <= baseY + CH + 5) return i;
  }
  return -1;
}

function confirmCard(idx) {
  if (!S.cardAnim || S.cardAnim.phase !== 'pick') return;
  S.cardAnim.flipCard  = idx;
  S.cardAnim.phase     = 'flip';
  S.cardAnim.flipStart = Date.now();
}

export function initControls() {
  initKeyboard();
  initCardInput();
  initJoystick();
}

// ─── Keyboard ───────────────────────────────────────────────────

function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (S.nameEntryActive || !e.key) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const k = e.key;

    // Enter/Space on overlay screens
    if (!S.gameRunning && (k === 'Enter' || k === ' ')) {
      const nextBtn = document.getElementById('next-level-btn');
      if (nextBtn && !winOverlay.classList.contains('hidden')) {
        e.preventDefault(); nextBtn.click(); return;
      }
      const playBtn = document.getElementById('play-again-btn');
      if (playBtn && !endScreenOverlay.classList.contains('hidden')) {
        e.preventDefault(); playBtn.click(); return;
      }
      if (!overlay.classList.contains('hidden')) {
        e.preventDefault(); startBtn.click(); return;
      }
    }

    // Escape on end screen
    if (!S.gameRunning && k === 'Escape') {
      const menuBtn = document.getElementById('main-menu-btn');
      if (menuBtn && !endScreenOverlay.classList.contains('hidden')) {
        e.preventDefault(); menuBtn.click(); return;
      }
    }

    // Card mini-game navigation
    if (S.cardAnim && S.cardAnim.phase === 'pick') {
      if (k === 'ArrowLeft')              { S.cardAnim.selected = Math.max(0, S.cardAnim.selected - 1); e.preventDefault(); return; }
      if (k === 'ArrowRight')             { S.cardAnim.selected = Math.min(4, S.cardAnim.selected + 1); e.preventDefault(); return; }
      if (k === 'Enter' || k === ' ')     { confirmCard(S.cardAnim.selected); e.preventDefault(); return; }
    }

    // ESC toggles pause
    if (k === 'Escape' && S.gameRunning) {
      if (S.gamePaused && !S.swapAnim) {
        S.gamePaused = false;
        if (!S.hourglassActive) S.timerFrozen = false;
        S.keys = {};
        const po = document.getElementById('pause-overlay');
        if (po) po.classList.add('hidden');
      } else if (!S.gamePaused) {
        S.gamePaused = true;
        S.timerFrozen = true;
        const po = document.getElementById('pause-overlay');
        if (po) po.classList.remove('hidden');
      }
      e.preventDefault();
      return;
    }

    S.keys[k.toLowerCase()] = true;
    e.preventDefault();
  });

  document.addEventListener('keyup', e => {
    if (!e.key) return;
    S.keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.gameRunning && !S.gamePaused) {
      S.gamePaused = true;
      S.timerFrozen = true;
      const po = document.getElementById('pause-overlay');
      if (po) po.classList.remove('hidden');
    }
  });

  document.getElementById('pause-continue-btn')?.addEventListener('click', () => {
    if (!S.gameRunning) return;
    S.gamePaused = false;
    if (!S.hourglassActive) S.timerFrozen = false;
    S.keys = {};
    const po = document.getElementById('pause-overlay');
    if (po) po.classList.add('hidden');
  });
}

// ─── Card Input (mouse + touch on canvas) ───────────────────────

function initCardInput() {
  function canvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width  / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('mousemove', e => {
    if (!S.cardAnim || S.cardAnim.phase !== 'pick') return;
    const { x, y } = canvasCoords(e.clientX, e.clientY);
    const idx = cardHitTest(x, y);
    if (idx >= 0) S.cardAnim.selected = idx;
  });

  canvas.addEventListener('click', e => {
    if (!S.cardAnim || S.cardAnim.phase !== 'pick') return;
    const { x, y } = canvasCoords(e.clientX, e.clientY);
    const idx = cardHitTest(x, y);
    if (idx >= 0) confirmCard(idx);
  });

  canvas.addEventListener('touchend', e => {
    if (!S.cardAnim || S.cardAnim.phase !== 'pick') return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const { x, y } = canvasCoords(t.clientX, t.clientY);
    const idx = cardHitTest(x, y);
    if (idx >= 0) confirmCard(idx);
  }, { passive: false });
}

// ─── Virtual Joystick ───────────────────────────────────────────

const DIRS = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'];

function initJoystick() {
  // Build DOM — appended to body, shown/positioned entirely by JS
  const base = document.createElement('div');
  base.id = 'joystick-base';
  const thumb = document.createElement('div');
  thumb.id = 'joystick-thumb';
  base.appendChild(thumb);
  document.body.appendChild(base);

  let active = false;
  let startX = 0, startY = 0;
  let touchId = null;

  function getRadius() {
    return (base.offsetWidth || 96) / 2;
  }

  function showAt(clientX, clientY) {
    // Show first so offsetWidth is readable
    base.style.display = 'flex';
    const r = getRadius();
    // Clamp so the joystick ring never goes off-screen
    const cx = Math.max(r, Math.min(window.innerWidth  - r, clientX));
    const cy = Math.max(r, Math.min(window.innerHeight - r, clientY));
    base.style.left = cx + 'px';
    base.style.top  = cy + 'px';
    startX = cx;
    startY = cy;
  }

  function hide() {
    base.style.display = 'none';
    base.style.left = '';
    base.style.top  = '';
    thumb.style.transform = 'translate(-50%, -50%)';
    DIRS.forEach(d => { S.keys[d] = false; });
    active   = false;
    touchId  = null;
  }

  // Floating joystick: activates on touches OUTSIDE the game canvas so the
  // screen stays unobstructed. Works on either side — left or right handed.
  const gameWrapper = document.getElementById('game-wrapper');
  // On landscape full-screen, the wrapper fills the viewport so "outside" never
  // exists — allow joystick anywhere except buttons/inputs/links.
  document.body.addEventListener('touchstart', e => {
    if (active || !S.gameRunning || S.gamePaused) return;
    if (!e.changedTouches || !e.changedTouches.length) return;
    if (e.target.closest('button, input, a, .slot-arrow, .slot-char')) return;

    const t = e.changedTouches[0];
    e.preventDefault();
    touchId = t.identifier;
    showAt(t.clientX, t.clientY);
    active = true;
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (!active || !e.changedTouches) return;
    let t = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) { t = e.changedTouches[i]; break; }
    }
    if (!t) return;
    e.preventDefault();

    const r = getRadius();
    const deadzone = r * 0.25;
    const rawDx = t.clientX - startX;
    const rawDy = t.clientY - startY;

    const mag = Math.hypot(rawDx, rawDy);
    const clampedDx = mag > r ? (rawDx / mag) * r : rawDx;
    const clampedDy = mag > r ? (rawDy / mag) * r : rawDy;
    thumb.style.transform = `translate(calc(-50% + ${clampedDx}px), calc(-50% + ${clampedDy}px))`;

    // When game is rotated -90deg in portrait, remap physical swipe → game direction:
    // physical right (+dx) = game down, physical down (+dy) = game left
    const gdx = portraitRotated ?  rawDy : rawDx;
    const gdy = portraitRotated ? -rawDx : rawDy;

    S.keys['arrowleft']  = gdx < -deadzone;
    S.keys['arrowright'] = gdx >  deadzone;
    S.keys['arrowup']    = gdy < -deadzone;
    S.keys['arrowdown']  = gdy >  deadzone;
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (!e.changedTouches) { hide(); return; }
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) { hide(); return; }
    }
  });

  document.addEventListener('touchcancel', e => {
    if (!e.changedTouches) { hide(); return; }
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) { hide(); return; }
    }
  });
}
