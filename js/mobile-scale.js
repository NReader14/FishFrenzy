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
  // wrapper CSS width = vh (phone height), canvas inside at 720:480 ratio.
  const canvasH = vh * (480 / 720);
  // Rough total wrapper height (HUD ~50px + status bar ~26px + canvas)
  const wrapperH = canvasH + 76;
  // After rotating, visual width = wrapperH; scale to fit phone width
  const scale = Math.min(1, vw / wrapperH);

  wrapper.style.position  = 'fixed';
  wrapper.style.top       = '50%';
  wrapper.style.left      = '50%';
  wrapper.style.width     = vh + 'px';
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
