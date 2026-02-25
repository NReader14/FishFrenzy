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
}

export function initSettings() {
  load();

  const overlay    = document.getElementById('overlay');
  const settingsOv = document.getElementById('settings-overlay');

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    overlay.classList.add('hidden');
    settingsOv.classList.remove('hidden');
    refreshUI();
  });

  document.getElementById('settings-back-btn')?.addEventListener('click', () => {
    settingsOv.classList.add('hidden');
    overlay.classList.remove('hidden');
  });

  document.getElementById('toggle-mystery-btn')?.addEventListener('click', () => {
    S.settings.mysteryBlocks = !S.settings.mysteryBlocks;
    save();
    refreshUI();
  });
}
