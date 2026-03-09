// ═══════════════════════════════════════════════════════════════
// SETTINGS — User preferences, persisted to localStorage
// ═══════════════════════════════════════════════════════════════

import S from './state.js';

const STORAGE_KEY = 'fishFrenzySettings';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      if (typeof saved.mysteryBlocks === 'boolean') S.settings.mysteryBlocks = saved.mysteryBlocks;
      if (typeof saved.smartShark    === 'boolean') S.settings.smartShark    = saved.smartShark;
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
}

export function initSettings() {
  load();

  const overlay    = document.getElementById('overlay');
  const settingsOv = document.getElementById('settings-overlay');
  const adminBtn   = document.getElementById('admin-panel-btn');
  const adminOv    = document.getElementById('admin-overlay');

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
