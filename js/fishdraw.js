// ═══════════════════════════════════════════════════════════════
// FISHDRAW — Custom fish skin designer
// ═══════════════════════════════════════════════════════════════

import { ACCESSORY_TABS, addCustomSkinToList, drawSkinPreview } from './skins.js';
import { saveCustomSkin } from '../firebase-config.js';

const NAME_TITLES = [
  '', 'Mr', 'Supercool', 'The Amazing', 'Great', 'Magnificent', 'Legendary',
  'Electric', 'Funky', 'Ultra', 'Mega', 'Cosmic', 'Golden',
  'Mighty', 'Epic', 'Salty', 'Spooky', 'Sneaky', 'Radical',
  'Absolute', 'Notorious',
];

const NAME_MIDDLES = [
  '', 'The', 'Big', 'Little', 'Old', 'Young',
  'Captain', 'Doctor', 'Master', 'Sir', 'Lord', 'Saint',
  'Baron', 'Duke', 'King', 'Brother', 'Wizard', 'Uncle',
  'Agent', 'Professor',
];

const NAME_FIRSTS = [
  '', 'Shark', 'Dave', 'Barry', 'Steve', 'Bob', 'Gerald', 'Karen',
  'Chad', 'Kevin', 'Gary', 'Colin', 'Nigel', 'Derek',
  'Shane', 'Wayne', 'Reg', 'Phil', 'Clive', 'Rodney',
  'Doris', 'Frank',
];

// hat / mask / outfit are independent slots
function buildName() {
  const t = state.nameTitle, m = state.nameMiddle, n = state.nameFirst;
  return [t, m, n].filter(Boolean).join(' ');
}

const state = { c1: '#ff8833', c2: '#ffaa55', c3: '#cc5500', hat: 'none', mask: 'none', outfit: 'none', nameTitle: '', nameMiddle: '', nameFirst: '' };

// ─── Public API ────────────────────────────────────────────────

export function initFishDraw() {
  const ov = document.getElementById('fishdraw-overlay');
  if (!ov) return;
  buildOverlay(ov);
}

export function openFishDraw() {
  document.getElementById('settings-overlay')?.classList.add('hidden');
  const ov = document.getElementById('fishdraw-overlay');
  ov?.classList.remove('hidden');
  // Reset state
  Object.assign(state, { c1: '#ff8833', c2: '#ffaa55', c3: '#cc5500', hat: 'none', mask: 'none', outfit: 'none', nameTitle: '', nameMiddle: '', nameFirst: NAME_FIRSTS[0] });
  syncColourInputs();
  switchTab('hat');
  refreshAllAccPreviews();
  updatePreview();
  startPreviewAnimation();
  const t = document.getElementById('fd-name-title');
  const m = document.getElementById('fd-name-middle');
  const n = document.getElementById('fd-name-first');
  if (t) t.value = '';
  if (m) m.value = '';
  if (n) n.value = '';
  updateNamePreview();
}

// ─── Build overlay HTML ────────────────────────────────────────

function buildOverlay(ov) {
  ov.innerHTML = `
    <div class="fishdraw-title">DESIGN YOUR FISH</div>
    <div class="fishdraw-preview-wrap">
      <canvas id="fishdraw-preview" width="240" height="150"></canvas>
    </div>
    <div class="fishdraw-section-label">COLOURS</div>
    <div class="fishdraw-colours">
      <label class="fishdraw-colour-slot">
        <span>BODY</span>
        <input type="color" id="fd-c1" value="#ff8833">
      </label>
      <label class="fishdraw-colour-slot">
        <span>STRIPE</span>
        <input type="color" id="fd-c2" value="#ffaa55">
      </label>
      <label class="fishdraw-colour-slot">
        <span>FIN</span>
        <input type="color" id="fd-c3" value="#cc5500">
      </label>
    </div>
    <div class="fishdraw-section-label">ACCESSORIES</div>
    <div class="fd-tabs">
      <button class="fd-tab selected" data-tab="hat">HATS</button>
      <button class="fd-tab" data-tab="mask">MASKS</button>
      <button class="fd-tab" data-tab="outfit">OUTFITS</button>
    </div>
    <div id="fd-panel-hat"    class="fishdraw-acc-grid"></div>
    <div id="fd-panel-mask"   class="fishdraw-acc-grid hidden"></div>
    <div id="fd-panel-outfit" class="fishdraw-acc-grid hidden"></div>
    <div class="fishdraw-section-label">PICK A NAME</div>
    <div class="fd-name-row">
      <div class="fd-name-col">
        <div class="fd-name-col-label">TITLE</div>
        <select id="fd-name-title" class="fd-name-select"></select>
      </div>
      <div class="fd-name-col">
        <div class="fd-name-col-label">MIDDLE</div>
        <select id="fd-name-middle" class="fd-name-select"></select>
      </div>
      <div class="fd-name-col">
        <div class="fd-name-col-label">NAME</div>
        <select id="fd-name-first" class="fd-name-select"></select>
      </div>
    </div>
    <div id="fd-name-preview" class="fd-name-preview"></div>
    <div class="fishdraw-btn-row">
      <button id="fd-save-btn" class="btn-primary">SAVE SKIN</button>
      <button id="fd-cancel-btn" class="btn-secondary">BACK</button>
    </div>
    <p class="fishdraw-hint">Saved skins are shared with everyone who plays!</p>
  `;

  buildAllAccGrids();
  buildNameDropdown();

  let accRefreshTimer = null;
  ['c1', 'c2', 'c3'].forEach(key => {
    document.getElementById(`fd-${key}`)?.addEventListener('input', e => {
      state[key] = e.target.value;
      updatePreview();
      clearTimeout(accRefreshTimer);
      accRefreshTimer = setTimeout(refreshAllAccPreviews, 80);
    });
  });

  ov.querySelectorAll('.fd-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('fd-save-btn')?.addEventListener('click', saveSkin);
  document.getElementById('fd-cancel-btn')?.addEventListener('click', () => {
    stopPreviewAnimation();
    ov.classList.add('hidden');
    document.getElementById('settings-overlay')?.classList.remove('hidden');
  });
}

function switchTab(tabKey) {
  // Update tab button highlights
  document.querySelectorAll('.fd-tab').forEach(b => b.classList.toggle('selected', b.dataset.tab === tabKey));
  // Show/hide panels
  ['hat', 'mask', 'outfit'].forEach(k => {
    document.getElementById(`fd-panel-${k}`)?.classList.toggle('hidden', k !== tabKey);
  });
}

function buildAllAccGrids() {
  ACCESSORY_TABS.forEach(tab => {
    const stateKey = tab.label.toLowerCase().replace('s', '').replace('hats','hat').replace('masks','mask').replace('outfits','outfit');
    // derive the state slot key from tab index
    const slotKey = ['hat', 'mask', 'outfit'][ACCESSORY_TABS.indexOf(tab)];
    const grid = document.getElementById(`fd-panel-${slotKey}`);
    if (!grid) return;
    grid.innerHTML = '';

    tab.items.forEach(acc => {
      const btn = document.createElement('button');
      btn.className = 'fd-acc-btn' + (acc.key === 'none' ? ' selected' : '');
      btn.dataset.acc = acc.key;

      const cvs = document.createElement('canvas');
      cvs.width = 56; cvs.height = 48;
      drawSkinPreview(cvs.getContext('2d'), { c1: state.c1, c2: state.c2, c3: state.c3, extras: acc.fn }, 56, 48);
      btn.appendChild(cvs);

      const lbl = document.createElement('div');
      lbl.className = 'fd-acc-label';
      lbl.textContent = acc.label;
      btn.appendChild(lbl);

      btn.addEventListener('click', () => {
        state[slotKey] = acc.key;
        grid.querySelectorAll('.fd-acc-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updatePreview();
      });
      grid.appendChild(btn);
    });
  });
}

function populateSelect(id, options, stateKey) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = '';
  options.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val === '' ? '— none —' : val;
    sel.appendChild(opt);
  });
  sel.value = state[stateKey];
  sel.addEventListener('change', () => {
    state[stateKey] = sel.value;
    updateNamePreview();
  });
}

function updateNamePreview() {
  const el = document.getElementById('fd-name-preview');
  if (el) el.textContent = buildName();
}

function buildNameDropdown() {
  populateSelect('fd-name-title',  NAME_TITLES,  'nameTitle');
  populateSelect('fd-name-middle', NAME_MIDDLES, 'nameMiddle');
  populateSelect('fd-name-first',  NAME_FIRSTS,  'nameFirst');
  updateNamePreview();
}

// ─── Preview ───────────────────────────────────────────────────

function getExtrasFn() {
  const fns = ACCESSORY_TABS.map((tab, i) => {
    const key = state[['hat','mask','outfit'][i]];
    return key !== 'none' ? tab.items.find(a => a.key === key)?.fn : null;
  }).filter(Boolean);
  if (!fns.length) return null;
  if (fns.length === 1) return fns[0];
  return (c) => fns.forEach(f => f(c));
}

function syncColourInputs() {
  ['c1', 'c2', 'c3'].forEach(k => {
    const el = document.getElementById(`fd-${k}`);
    if (el) el.value = state[k];
  });
}

let _previewRaf = null;

function updatePreview() {
  const cvs = document.getElementById('fishdraw-preview');
  if (!cvs) return;
  drawSkinPreview(cvs.getContext('2d'), { c1: state.c1, c2: state.c2, c3: state.c3, extras: getExtrasFn() }, 240, 150, performance.now());
}

function startPreviewAnimation() {
  if (_previewRaf) return;
  function tick() {
    const ov = document.getElementById('fishdraw-overlay');
    if (!ov || ov.classList.contains('hidden')) { _previewRaf = null; return; }
    updatePreview();
    _previewRaf = requestAnimationFrame(tick);
  }
  _previewRaf = requestAnimationFrame(tick);
}

function stopPreviewAnimation() {
  if (_previewRaf) { cancelAnimationFrame(_previewRaf); _previewRaf = null; }
}

function refreshAllAccPreviews() {
  ['hat', 'mask', 'outfit'].forEach(slotKey => {
    document.getElementById(`fd-panel-${slotKey}`)?.querySelectorAll('.fd-acc-btn').forEach(btn => {
      const cvs = btn.querySelector('canvas');
      if (!cvs) return;
      const key = btn.dataset.acc;
      const allItems = ACCESSORY_TABS.flatMap(t => t.items);
      const acc = allItems.find(a => a.key === key);
      drawSkinPreview(cvs.getContext('2d'), { c1: state.c1, c2: state.c2, c3: state.c3, extras: acc?.fn || null }, 56, 48);
    });
  });
}

// ─── Save ──────────────────────────────────────────────────────

function flashNameError() {
  const ids = ['fd-name-title', 'fd-name-middle', 'fd-name-first'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('fd-name-error');
    setTimeout(() => el.classList.remove('fd-name-error'), 800);
  });
}

async function saveSkin() {
  const btn = document.getElementById('fd-save-btn');
  if (!buildName()) {
    flashNameError();
    if (btn) { btn.textContent = 'PICK A NAME!'; setTimeout(() => { btn.textContent = 'SAVE SKIN'; }, 1200); }
    return;
  }
  if (btn) btn.textContent = 'SAVING...';
  try {
    const fullName = buildName();
    await saveCustomSkin({ name: fullName, c1: state.c1, c2: state.c2, c3: state.c3, hat: state.hat, mask: state.mask, outfit: state.outfit });
    const idx = addCustomSkinToList({ name: fullName, c1: state.c1, c2: state.c2, c3: state.c3, hat: state.hat, mask: state.mask, outfit: state.outfit });
    window.dispatchEvent(new CustomEvent('fishSkinSaved', { detail: { idx } }));
    if (btn) btn.textContent = 'SAVED!';
    setTimeout(() => {
      stopPreviewAnimation();
      document.getElementById('fishdraw-overlay')?.classList.add('hidden');
      document.getElementById('settings-overlay')?.classList.remove('hidden');
      if (btn) btn.textContent = 'SAVE SKIN';
    }, 800);
  } catch (err) {
    console.warn('[FishDraw] Save failed:', err.message);
    if (btn) { btn.textContent = 'ERROR!'; setTimeout(() => { btn.textContent = 'SAVE SKIN'; }, 2000); }
  }
}
