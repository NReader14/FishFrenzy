// ═══════════════════════════════════════════════════════════════
// CONTROLS — Keyboard input + mobile virtual joystick
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { overlay, winOverlay, endScreenOverlay, startBtn } from './dom.js';

export function initControls() {
  initKeyboard();
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
  document.body.addEventListener('touchstart', e => {
    if (active || !S.gameRunning || S.gamePaused) return;
    if (e.target.closest('button, input, a')) return;

    const t = e.changedTouches[0];
    const rect = gameWrapper.getBoundingClientRect();
    const insideCanvas = (
      t.clientX >= rect.left && t.clientX <= rect.right &&
      t.clientY >= rect.top  && t.clientY <= rect.bottom
    );
    if (insideCanvas) return; // keep canvas taps free for UI

    e.preventDefault();
    touchId = t.identifier;
    showAt(t.clientX, t.clientY);
    active = true;
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (!active) return;
    let t = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) { t = e.changedTouches[i]; break; }
    }
    if (!t) return;
    e.preventDefault();

    const r = getRadius();
    const deadzone = r * 0.25;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    const mag = Math.hypot(dx, dy);
    const clampedDx = mag > r ? (dx / mag) * r : dx;
    const clampedDy = mag > r ? (dy / mag) * r : dy;
    thumb.style.transform = `translate(calc(-50% + ${clampedDx}px), calc(-50% + ${clampedDy}px))`;

    S.keys['arrowleft']  = dx < -deadzone;
    S.keys['arrowright'] = dx >  deadzone;
    S.keys['arrowup']    = dy < -deadzone;
    S.keys['arrowdown']  = dy >  deadzone;
  }, { passive: false });

  document.addEventListener('touchend', e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) { hide(); return; }
    }
  });

  document.addEventListener('touchcancel', e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) { hide(); return; }
    }
  });
}
