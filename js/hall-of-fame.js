import { drawSkinPreview, ACCESSORY_TABS } from './skins.js';

let _rafId = null;

// Build key→fn lookup from ACCESSORY_TABS
const _keyToFn = {};
for (const tab of ACCESSORY_TABS) {
  for (const item of tab.items) {
    _keyToFn[item.key] = item.fn;
  }
}

// Reconstruct a renderable skin from stored Firebase skin data
function buildSkin(data) {
  if (!data) return nameToSkin('???');
  const skin = {
    c1: data.c1 || '#4488ff',
    c2: data.c2 || '#2244aa',
    c3: data.c3 || '#66aaff',
    fishType: data.fishType || 'standard',
  };
  if (data.hatKey    && data.hatKey    !== 'none') skin.hatFn    = _keyToFn[data.hatKey]    || null;
  if (data.maskKey   && data.maskKey   !== 'none') skin.maskFn   = _keyToFn[data.maskKey]   || null;
  if (data.outfitKey && data.outfitKey !== 'none') skin.outfitFn = _keyToFn[data.outfitKey] || null;
  return skin;
}

// Fallback: deterministic colour from a 3-char name
function nameToSkin(name = '???') {
  const h = ((name.charCodeAt(0) || 0) * 37 + (name.charCodeAt(1) || 0) * 17 + (name.charCodeAt(2) || 0) * 7) % 360;
  const h2 = (h + 160) % 360;
  const h3 = (h + 40) % 360;
  return { c1: `hsl(${h},70%,58%)`, c2: `hsl(${h2},65%,35%)`, c3: `hsl(${h3},80%,65%)`, fishType: 'standard' };
}

export function initHallOfFame(scores) {
  const el = document.getElementById('hall-of-fame');
  if (!el) return;

  if (!scores || scores.length === 0) {
    el.classList.add('hidden');
    return;
  }

  const top = scores[0];

  // Champion info
  document.getElementById('hof-top-name').textContent  = top.name;
  document.getElementById('hof-top-score').textContent = top.score.toLocaleString();
  document.getElementById('hof-top-level').textContent = `LVL ${top.level}`;

  // Runners-up
  const runnersEl = document.getElementById('hof-runners');
  if (runnersEl) {
    runnersEl.innerHTML = scores.slice(1).map((s, i) =>
      `<div class="hof-runner">
        <span class="hof-runner-rank">#${i + 2}</span>
        <span class="hof-runner-name">${s.name}</span>
        <span class="hof-runner-score">${s.score.toLocaleString()}</span>
        <span class="hof-runner-level">LVL ${s.level}</span>
      </div>`
    ).join('');
  }

  el.classList.remove('hidden');

  // Animated champion fish
  const canvas = document.getElementById('hof-fish-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const skin = top.skin ? buildSkin(top.skin) : nameToSkin(top.name);
    if (_rafId) cancelAnimationFrame(_rafId);
    const loop = () => {
      drawSkinPreview(ctx, skin, canvas.width, canvas.height, Date.now());
      _rafId = requestAnimationFrame(loop);
    };
    loop();
  }
}

export function stopHallOfFameAnim() {
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
}
