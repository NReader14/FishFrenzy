// ═══════════════════════════════════════════════════════════════
// MOBILE SCALE — Rotate + scale the game to fill portrait screens
// ═══════════════════════════════════════════════════════════════

export let portraitRotated = false;

export function applyMobileScale() {
  const wrapper = document.getElementById('game-wrapper');
  if (!wrapper) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile   = vw <= 600;
  const isPortrait = vw < vh;

  if (!isMobile || !isPortrait) {
    // Landscape or desktop — clear any portrait overrides
    wrapper.style.position   = '';
    wrapper.style.top        = '';
    wrapper.style.left       = '';
    wrapper.style.width      = '';
    wrapper.style.maxWidth   = '';
    wrapper.style.transform  = '';
    portraitRotated = false;
    return;
  }

  // Portrait mobile: rotate -90deg so the landscape game fills the screen.
  // Scale by vh/720 so the canvas fills the full portrait height.
  // Small amount clips horizontally (~10%) — acceptable for bigger feel.
  const CANVAS_W = 720;
  const scale = vh / CANVAS_W;

  wrapper.style.position  = 'fixed';
  wrapper.style.top       = '50%';
  wrapper.style.left      = '50%';
  wrapper.style.width     = CANVAS_W + 'px';
  wrapper.style.maxWidth  = 'none';
  wrapper.style.transform = `translate(-50%, -50%) rotate(-90deg) scale(${scale})`;
  portraitRotated = true;
}

export function initMobileScale() {
  applyMobileScale();
  window.addEventListener('resize',            applyMobileScale, { passive: true });
  window.addEventListener('orientationchange', () => {
    // Brief delay so innerWidth/innerHeight reflect the new orientation
    setTimeout(applyMobileScale, 100);
  }, { passive: true });
}
