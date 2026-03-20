// ═══════════════════════════════════════════════════════════════
// SETTINGS — User preferences, persisted to localStorage
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { SKINS, drawSkinPreview, addCustomSkinToList } from './skins.js';
import { startMusic, stopMusic, initAudio, setMusicVolume, setSfxVolume, seekMusicToMiddle, TRACKS } from './audio.js';
import { openFishDraw, initFishDraw } from './fishdraw.js';
import { fetchCustomSkins, saveUserSettings, loadUserSettings } from '../firebase-config.js';
import { onTrackChanged as achTrack } from './achievements.js';

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
      if (typeof saved.track === 'string' && TRACKS.some(t => t.id === saved.track))
        S.settings.track = saved.track;
      if (typeof saved.sharkQuips  === 'boolean') S.settings.sharkQuips  = saved.sharkQuips;
      if (typeof saved.fastTreats  === 'boolean') S.settings.fastTreats  = saved.fastTreats;
      if (typeof saved.showAds     === 'boolean') S.settings.showAds     = saved.showAds;
    }
  } catch (_) {}
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...S.settings }));
  if (S.currentUser) saveUserSettings(S.currentUser.uid, S.settings);
}

export async function syncSettingsFromCloud(uid) {
  const cloudSettings = await loadUserSettings(uid);
  if (!cloudSettings) return;
  // Merge cloud settings into S.settings (cloud wins)
  Object.assign(S.settings, cloudSettings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...S.settings }));
  refreshUI();
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
  updateToggle('toggle-shark-quips-btn',  S.settings.sharkQuips);
  updateToggle('toggle-fast-treats-btn', S.settings.fastTreats);
  updateToggle('toggle-ads-btn',         S.settings.showAds ?? false);
  const mvs = document.getElementById('music-vol-slider');
  const svs = document.getElementById('sfx-vol-slider');
  if (mvs) mvs.value = S.settings.musicVolume;
  if (svs) svs.value = S.settings.sfxVolume;
  const mp = document.getElementById('music-vol-pct');
  const sp = document.getElementById('sfx-vol-pct');
  if (mp) mp.textContent = S.settings.musicVolume + '%';
  if (sp) sp.textContent = S.settings.sfxVolume + '%';
  refreshTrackPicker();
  refreshSkinPicker();
}

// ─── Track Picker ────────────────────────────────────────────

let _previewTimer = null;

export function cancelTrackPreview() {
  if (_previewTimer) { clearTimeout(_previewTimer); _previewTimer = null; }
}

function buildTrackPicker() {
  const picker = document.getElementById('track-picker');
  if (!picker || picker.querySelector('.track-btn')) return;
  TRACKS.forEach(track => {
    const btn = document.createElement('button');
    btn.className = 'track-btn' + (track.src ? ' track-mp3' : '');
    btn.dataset.trackId = track.id;
    btn.textContent = track.label;
    btn.addEventListener('click', () => {
      S.settings.track = track.id;
      save();
      achTrack(track.id);
      refreshTrackPicker();
      if (!S.settings.music) return;
      stopMusic();
      startMusic();
      if (!S.gameRunning) {
        // 5-second preview from middle of track then stop
        cancelTrackPreview();
        seekMusicToMiddle();
        _previewTimer = setTimeout(() => { stopMusic(); _previewTimer = null; }, 10000);
      }
    });
    picker.appendChild(btn);
  });
}

function refreshTrackPicker() {
  document.querySelectorAll('#track-picker .track-btn').forEach(btn => {
    const active = btn.dataset.trackId === (S.settings.track ?? 'chiptune');
    btn.style.borderColor = active ? '#44ee88' : '';
    btn.style.color       = active ? '#44ee88' : '';
  });
}

// ─── Skin Picker ─────────────────────────────────────────────

function refreshSkinPicker() {
  const allBtns = [
    ...document.querySelectorAll('#skin-grid .skin-btn'),
    ...document.querySelectorAll('#custom-skin-grid .skin-btn'),
  ];
  // rebuild index map: each btn has data-skin-idx set by makeSkinBtn
  allBtns.forEach(btn => {
    btn.classList.toggle('selected', Number(btn.dataset.skinIdx) === (S.settings.skin ?? 0));
  });
}

function makeSkinBtn(skin, i) {
  const btn = document.createElement('button');
  btn.className = 'skin-btn' + (skin.custom ? ' skin-custom' : '');
  btn.dataset.skinIdx = i;
  const cvs = document.createElement('canvas');
  cvs.width = 64; cvs.height = 56;
  cvs.style.width = '64px'; cvs.style.height = '56px';
  drawSkinPreview(cvs.getContext('2d'), skin, 64, 56);
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
  return btn;
}

function buildSkinPicker() {
  const grid = document.getElementById('skin-grid');
  if (!grid || grid.querySelector('.skin-btn')) return; // already built

  const customGrid    = document.getElementById('custom-skin-grid');
  const customSection = document.getElementById('custom-skins-section');

  SKINS.forEach((skin, i) => {
    if (skin.custom) {
      customGrid.appendChild(makeSkinBtn(skin, i));
      customSection.classList.remove('hidden');
    } else {
      grid.appendChild(makeSkinBtn(skin, i));
    }
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
  const customGrid = document.getElementById('custom-skin-grid');
  if (customGrid) customGrid.innerHTML = '';
  buildSkinPicker();
}

export function saveSettings() { save(); }

export function initSettings() {
  load();

  const overlay    = document.getElementById('overlay');
  const settingsOv = document.getElementById('settings-overlay');
  const skinsOv    = document.getElementById('skins-overlay');
  const musicOv    = document.getElementById('music-overlay');
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

  buildTrackPicker();
  buildSkinPicker();

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    initAudio(); // unlock AudioContext on first interaction
    overlay.classList.add('hidden');
    settingsOv.classList.remove('hidden');
    refreshUI();
  });

  document.getElementById('skins-btn')?.addEventListener('click', () => {
    settingsOv.classList.add('hidden');
    skinsOv.classList.remove('hidden');
    refreshSkinPicker();
  });

  document.getElementById('skins-back-btn')?.addEventListener('click', () => {
    skinsOv.classList.add('hidden');
    settingsOv.classList.remove('hidden');
  });

  document.getElementById('music-btn')?.addEventListener('click', () => {
    settingsOv.classList.add('hidden');
    musicOv.classList.remove('hidden');
    refreshUI();
  });

  document.getElementById('music-back-btn')?.addEventListener('click', () => {
    musicOv.classList.add('hidden');
    settingsOv.classList.remove('hidden');
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
    window.dispatchEvent(new Event('settingsMultiplierChanged'));
  });

  document.getElementById('toggle-smart-shark-btn')?.addEventListener('click', () => {
    S.settings.smartShark = !S.settings.smartShark;
    S.smartSharkHistory = [];
    save();
    refreshUI();
    window.dispatchEvent(new Event('settingsMultiplierChanged'));
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

  document.getElementById('toggle-shark-quips-btn')?.addEventListener('click', () => {
    S.settings.sharkQuips = !S.settings.sharkQuips;
    updateToggle('toggle-shark-quips-btn', S.settings.sharkQuips);
    save();
  });

  document.getElementById('toggle-fast-treats-btn')?.addEventListener('click', () => {
    S.settings.fastTreats = !S.settings.fastTreats;
    save();
    refreshUI();
    window.dispatchEvent(new Event('settingsMultiplierChanged'));
  });

  document.getElementById('toggle-ads-btn')?.addEventListener('click', () => {
    S.settings.showAds = !(S.settings.showAds ?? false);
    updateToggle('toggle-ads-btn', S.settings.showAds);
    save();
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
