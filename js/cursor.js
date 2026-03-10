// ═══════════════════════════════════════════════════════════════
// CURSOR — Neon SVG pointer cursor matching the game UI.
//
// Shown on all menus/overlays.
// Hidden during live gameplay EXCEPT when the card mini-game is active.
// ═══════════════════════════════════════════════════════════════

import S from './state.js';

// ─── SVG cursor element ───────────────────────────────────────

const el = document.createElement('div');
Object.assign(el.style, {
  position:     'fixed',
  top:          '0',
  left:         '0',
  pointerEvents:'none',
  zIndex:       '999999',
  display:      'none',
  lineHeight:   '0',
});

// Classic pointer cursor shape drawn as a smooth SVG.
// Coordinate space: 12×18. Tip at (0,0).
el.innerHTML = `
<svg width="19" height="25" viewBox="0 0 11 15"
     xmlns="http://www.w3.org/2000/svg"
     style="overflow:visible; filter:drop-shadow(0 0 3px #44ddff) drop-shadow(0 0 8px rgba(68,221,255,0.55)) drop-shadow(0 0 16px rgba(68,221,255,0.25))">
  <path d="M0,0 L0,13 L3,9 L5,14 L8,13 L6,8 L10,8 Z"
        fill="#44ddff" stroke="rgba(0,20,40,0.35)" stroke-width="0.6" stroke-linejoin="round"/>
</svg>`;

document.body.appendChild(el);

// ─── Mouse tracking ───────────────────────────────────────────

document.addEventListener('mousemove', e => {
  el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
}, { passive: true });

// ─── Visibility ───────────────────────────────────────────────

function updateVisibility() {
  const show = !S.gameRunning || !!S.cardAnim;
  el.style.display = show ? 'block' : 'none';
  document.documentElement.classList.toggle('hide-cursor', show);
}

(function tick() {
  updateVisibility();
  requestAnimationFrame(tick);
})();

export function initCursor() { /* side-effects run on import */ }
