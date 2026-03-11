// ═══════════════════════════════════════════════════════════════
// SETTINGS — User preferences, persisted to localStorage
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { SKINS, drawSkinPreview, addCustomSkinToList } from './skins.js';
import { startMusic, stopMusic, initAudio, setMusicVolume, setSfxVolume } from './audio.js';
import { openFishDraw, initFishDraw } from './fishdraw.js';
import { fetchCustomSkins } from '../firebase-config.js';

const STORAGE_KEY = 'fishFrenzySettings';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      if (typeof saved.mysteryBlocks === 'boolean') S.settings.mysteryBlocks = saved.mysteryBlocks;
      if (typeof saved.smartShark    === 'boolean') S.settings.smartShark    = saved.smartShark;
      if (typeof saved.skin          === 'number')  S.settings.skin          = saved.skin;
      if (typeof saved.difficulty    === 'string' && ['easy','normal','hard'].includes(saved.difficulty))
        S.settings.difficulty = saved.difficulty;
      if (typeof saved.tutorial === 'boolean') S.settings.tutorial = saved.tutorial;
      if (typeof saved.music       === 'boolean') S.settings.music       = saved.music;
      if (typeof saved.sfx         === 'boolean') S.settings.sfx         = saved.sfx;
      if (typeof saved.musicVolume === 'number')  S.settings.musicVolume = saved.musicVolume;
      if (typeof saved.sfxVolume   === 'number')  S.settings.sfxVolume   = saved.sfxVolume;
    }
  } catch (_) {}
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...S.settings }));
}

function updateToggle(id, active) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.textContent       = active ? 'ON' : 'OFF';
  btn.style.borderColor = active ? '#44ee88' : '';
  btn.style.color       = active ? '#44ee88' : '';
}

function refreshUI() {
  updateToggle('toggle-mystery-btn',    S.settings.mysteryBlocks);
  updateToggle('toggle-smart-shark-btn',S.settings.smartShark);
  updateToggle('toggle-tutorial-btn',   S.settings.tutorial);
  updateToggle('toggle-music-btn',      S.settings.music);
  updateToggle('toggle-sfx-btn',        S.settings.sfx);
  const mvs = document.getElementById('music-vol-slider');
  const svs = document.getElementById('sfx-vol-slider');
  if (mvs) mvs.value = S.settings.musicVolume;
  if (svs) svs.value = S.settings.sfxVolume;
  const mp = document.getElementById('music-vol-pct');
  const sp = document.getElementById('sfx-vol-pct');
  if (mp) mp.textContent = S.settings.musicVolume + '%';
  if (sp) sp.textContent = S.settings.sfxVolume + '%';
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
  if (!grid || grid.querySelector('.skin-btn')) return; // already built

  SKINS.forEach((skin, i) => {
    const btn = document.createElement('button');
    btn.className = 'skin-btn' + (skin.custom ? ' skin-custom' : '');

    const cvs = document.createElement('canvas');
    cvs.width  = 64;
    cvs.height = 56;
    cvs.style.width  = '64px';
    cvs.style.height = '56px';
    const ctx2 = cvs.getContext('2d');
    drawSkinPreview(ctx2, skin, 64, 56);
    btn.appendChild(cvs);

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

  // DESIGN YOUR OWN button
  const designBtn = document.createElement('button');
  designBtn.className = 'skin-btn skin-btn-design';
  designBtn.title = 'Design your own fish skin';
  designBtn.innerHTML = '<div class="skin-btn-design-icon">✏</div><div class="skin-btn-label">CUSTOM</div>';
  designBtn.addEventListener('click', () => openFishDraw());
  grid.appendChild(designBtn);

  refreshSkinPicker();
}

function rebuildSkinPicker() {
  const grid = document.getElementById('skin-grid');
  if (!grid) return;
  grid.innerHTML = '';
  buildSkinPicker();
}

export function saveSettings() { save(); }

export function initSettings() {
  load();

  const overlay    = document.getElementById('overlay');
  const settingsOv = document.getElementById('settings-overlay');
  const adminBtn   = document.getElementById('admin-panel-btn');
  const adminOv    = document.getElementById('admin-overlay');

  initFishDraw();

  // Load custom skins from Firebase and add to the picker
  fetchCustomSkins().then(list => {
    if (!list.length) return;
    list.forEach(s => addCustomSkinToList(s));
    rebuildSkinPicker();
    refreshSkinPicker();
  }).catch(() => {});

  // When a skin is saved from the designer, select it and rebuild
  window.addEventListener('fishSkinSaved', (e) => {
    S.settings.skin = e.detail.idx;
    save();
    rebuildSkinPicker();
    refreshSkinPicker();
  });

  buildSkinPicker();

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    initAudio(); // unlock AudioContext on first interaction
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
    S.smartSharkHistory = [];
    save();
    refreshUI();
  });

  document.getElementById('toggle-tutorial-btn')?.addEventListener('click', () => {
    S.settings.tutorial = !S.settings.tutorial;
    save();
    refreshUI();
  });

  document.getElementById('toggle-music-btn')?.addEventListener('click', () => {
    S.settings.music = !S.settings.music;
    save();
    refreshUI();
    if (S.settings.music && S.gameRunning) startMusic();
    else if (!S.settings.music) stopMusic();
  });

  document.getElementById('toggle-sfx-btn')?.addEventListener('click', () => {
    S.settings.sfx = !S.settings.sfx;
    save();
    refreshUI();
  });

  document.getElementById('music-vol-slider')?.addEventListener('input', e => {
    S.settings.musicVolume = parseInt(e.target.value);
    save();
    setMusicVolume();
    const p = document.getElementById('music-vol-pct');
    if (p) p.textContent = S.settings.musicVolume + '%';
  });

  document.getElementById('sfx-vol-slider')?.addEventListener('input', e => {
    S.settings.sfxVolume = parseInt(e.target.value);
    save();
    setSfxVolume();
    const p = document.getElementById('sfx-vol-pct');
    if (p) p.textContent = S.settings.sfxVolume + '%';
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
