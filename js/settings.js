// ═══════════════════════════════════════════════════════════════
// SETTINGS — User preferences, persisted to localStorage
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { SKINS, drawSkinPreview } from './skins.js';

const STORAGE_KEY = 'fishFrenzySettings';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      if (typeof saved.mysteryBlocks === 'boolean') S.settings.mysteryBlocks = saved.mysteryBlocks;
      if (typeof saved.smartShark    === 'boolean') S.settings.smartShark    = saved.smartShark;
      if (typeof saved.skin          === 'number')  S.settings.skin          = saved.skin;
    }
  } catch (_) {}
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...S.settings }));
}

function updateToggle(id, active) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.textContent   = active ? 'ON' : 'OFF';
  btn.style.borderColor = active ? '#44ee88' : '';
  btn.style.color       = active ? '#44ee88' : '';
}

function refreshUI() {
  updateToggle('toggle-mystery-btn', S.settings.mysteryBlocks);
  updateToggle('toggle-smart-shark-btn', S.settings.smartShark);
  refreshSkinPicker();
}

// ─── Skin Picker ─────────────────────────────────────────────

function refreshSkinPicker() {
  const grid = document.getElementById('skin-grid');
  if (!grid) return;
  grid.querySelectorAll('.skin-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === (S.settings.skin ?? 0));
  });
}

function buildSkinPicker() {
  const grid = document.getElementById('skin-grid');
  if (!grid || grid.children.length) return; // already built

  SKINS.forEach((skin, i) => {
    const btn = document.createElement('button');
    btn.className = 'skin-btn';

    // Mini canvas preview
    const cvs = document.createElement('canvas');
    cvs.width  = 64;
    cvs.height = 56;
    cvs.style.width  = '64px';   // override canvas { width:100% } in base.css
    cvs.style.height = '56px';
    const ctx2 = cvs.getContext('2d');
    drawSkinPreview(ctx2, skin, 64, 56);
    btn.appendChild(cvs);

    // Label
    const lbl = document.createElement('div');
    lbl.className = 'skin-btn-label';
    lbl.textContent = skin.name;
    btn.appendChild(lbl);

    btn.addEventListener('click', () => {
      S.settings.skin = i;
      save();
      refreshSkinPicker();
    });

    grid.appendChild(btn);
  });

  refreshSkinPicker();
}

export function initSettings() {
  load();

  const overlay    = document.getElementById('overlay');
  const settingsOv = document.getElementById('settings-overlay');
  const adminBtn   = document.getElementById('admin-panel-btn');
  const adminOv    = document.getElementById('admin-overlay');

  buildSkinPicker();

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    overlay.classList.add('hidden');
    settingsOv.classList.remove('hidden');
    refreshUI();
  });

  document.getElementById('settings-back-btn')?.addEventListener('click', () => {
    settingsOv.classList.add('hidden');
    overlay.classList.remove('hidden');
    adminBtn?.classList.add('hidden');
    _adminBuf = '';
  });

  document.getElementById('toggle-mystery-btn')?.addEventListener('click', () => {
    S.settings.mysteryBlocks = !S.settings.mysteryBlocks;
    save();
    refreshUI();
  });

  document.getElementById('toggle-smart-shark-btn')?.addEventListener('click', () => {
    S.settings.smartShark = !S.settings.smartShark;
    S.smartSharkHistory = []; // reset history on toggle
    save();
    refreshUI();
  });

  // Admin button (inside settings) — opens admin panel
  adminBtn?.addEventListener('click', () => {
    settingsOv.classList.add('hidden');
    adminOv?.classList.remove('hidden');
    document.getElementById('admin-email')?.focus();
    document.getElementById('admin-error')?.classList.add('hidden');
    if (document.getElementById('admin-email')) document.getElementById('admin-email').value = '';
    if (document.getElementById('admin-password')) document.getElementById('admin-password').value = '';
  });

  // Type "admin" anywhere to reveal the hidden admin button
  let _adminBuf = '';
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    _adminBuf = (_adminBuf + e.key).slice(-5);
    if (_adminBuf === 'admin') adminBtn?.classList.remove('hidden');
  });
}
