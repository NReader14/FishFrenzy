// ═══════════════════════════════════════════════════════════════
// OVERLAYS — Scoreboard, name entry, loading, admin, rules
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import {
  nameEntryOverlay, endScreenOverlay, overlay, scoreboardOverlay,
  scoreboardContent, loadingOverlay, loadingMessage, adminError,
  adminOverlay, adminEmailInput, adminPasswordInput, adminLoginBtn,
  adminCancelBtn
} from './dom.js';
import { CHARS } from './constants.js';
import { playCRTWipe } from './animations.js';
import {
  fetchHighScores, fetchAllScores, saveHighScore, isFirebaseOnline,
  adminWipeScores, fetchMaintenance, setMaintenance,
  saveGameConfig
} from '../firebase-config.js';
import { pwConfig, clearTO } from './powerups.js';

// Forward references (set by main.js)
let _initGame = null;
export function setInitGame(fn) { _initGame = fn; }

// ─── LOADING ───
export function showLoading(msg) {
  loadingMessage.textContent = msg || 'LOADING...';
  loadingOverlay.classList.remove('hidden');
}
export function hideLoading() { loadingOverlay.classList.add('hidden'); }

// ─── ADMIN ERROR ───
export function showAdminError(msg) { adminError.textContent = msg; adminError.classList.remove('hidden'); }
export function hideAdminError() { adminError.classList.add('hidden'); }

// ─── WIPE NOTIFICATION ───
export function showWipeNotification() {
  const notif = document.createElement('div');
  notif.textContent = 'SCOREBOARD WIPED';
  notif.className = 'wipe-notification';
  document.getElementById('game-wrapper').appendChild(notif);
  requestAnimationFrame(() => notif.classList.add('visible'));
  setTimeout(() => {
    notif.classList.remove('visible');
    setTimeout(() => notif.remove(), 400);
  }, 2000);
}

// ─── SCOREBOARD ───
export function buildScoreboardHtml(scores, highlightIdx = -1) {
  if (!scores || scores.length === 0) return '<p class="no-scores">NO SCORES YET</p>';

  const medals = ['🥇', '🥈', '🥉'];
  let html = '<table class="scoreboard-table"><thead><tr>';
  html += '<th></th><th>NAME</th><th>SCORE</th><th>LVL</th>';
  html += '</tr></thead><tbody>';

  scores.forEach((s, i) => {
    const cls = i === highlightIdx ? 'new-score' : '';
    const rankLabel = i < 3 ? medals[i] : `${i + 1}.`;
    html += `<tr class="${cls}">`;
    html += `<td class="rank">${rankLabel}</td>`;
    const nameColours = ['#ffdd44', '#c0c0d0', '#cd7f32'];
    const nStyle = i < 3 ? ` style="color:${nameColours[i]}"` : '';
    html += `<td class="name-col"${nStyle}>${s.name || '???'}</td>`;
    html += `<td>${s.score}</td>`;
    html += `<td>${s.level}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

export async function showFullLeaderboard() {
  const el = document.getElementById('full-leaderboard-overlay');
  const scoreboardOverlay = document.getElementById('scoreboard-overlay');
  el.innerHTML = '<p class="loading-text">LOADING...</p>';
  el.classList.remove('hidden');
  scoreboardOverlay.classList.add('hidden');

  const scores = await fetchAllScores(100);

  const tableHtml = buildScoreboardHtml(scores);
  el.innerHTML = `
    <div class="scoreboard-title">ALL SCORES</div>
    <div class="full-lb-count">${scores.length} ENTR${scores.length === 1 ? 'Y' : 'IES'}</div>
    <div class="full-lb-scroll">${tableHtml}</div>
    <div class="scoreboard-actions">
      <button id="full-lb-back-btn" class="btn-secondary">BACK</button>
    </div>`;

  document.getElementById('full-lb-back-btn').addEventListener('click', () => {
    el.classList.add('hidden');
    scoreboardOverlay.classList.remove('hidden');
  });
}

export async function showScoreboard(highlightIdx = -1) {
  scoreboardContent.innerHTML = '<p class="loading-text">LOADING...</p>';
  scoreboardOverlay.classList.remove('hidden');
  const scores = await fetchHighScores();
  scoreboardContent.innerHTML = buildScoreboardHtml(scores, highlightIdx);
  if (!isFirebaseOnline()) {
    scoreboardContent.innerHTML += '<p class="no-scores" style="color:#cc8844;">⚠ OFFLINE — SHOWING CACHED SCORES</p>';
  }
}

// ─── NAME ENTRY ───
export function showNameEntry(finalScore, finalLevel, msg) {
  S.nameEntryActive = true;
  let slots = [0, 0, 0];
  let activeSlot = 0;
  let errorMsg = '';

  function render() {
    const errH = errorMsg ? `<div class="name-error">${errorMsg}</div>` : '';

    let html = `
      <div class="name-entry-title">GAME OVER</div>
      <div class="name-entry-score">${msg.toUpperCase()} &mdash; SCORE: ${finalScore} &middot; LVL: ${finalLevel}</div>
      <div class="name-entry-prompt">ENTER YOUR INITIALS</div>
      ${errH}
      <div class="name-slots">`;

    for (let i = 0; i < 3; i++) {
      html += `
        <div class="name-slot">
          <div class="slot-arrow" data-slot="${i}" data-dir="up">&#9650;</div>
          <div class="slot-char ${i === activeSlot ? 'active' : ''}" data-slot="${i}">${CHARS[slots[i]]}</div>
          <div class="slot-arrow" data-slot="${i}" data-dir="down">&#9660;</div>
        </div>`;
    }

    html += `</div>
      <div class="name-entry-hint">TYPE A-Z ON YOUR KEYBOARD<br>UP/DOWN TO SCROLL &middot; LEFT/RIGHT TO SELECT<br>ENTER TO CONFIRM</div>
      <button id="confirm-name-btn" class="btn-primary" style="padding:10px 28px;font-size:10px;">OK</button>`;

    nameEntryOverlay.innerHTML = html;

    nameEntryOverlay.querySelectorAll('.slot-arrow').forEach(el => {
      el.addEventListener('click', () => {
        const s = +el.dataset.slot;
        activeSlot = s; errorMsg = '';
        slots[s] = el.dataset.dir === 'up'
          ? (slots[s] - 1 + CHARS.length) % CHARS.length
          : (slots[s] + 1) % CHARS.length;
        render();
      });
    });

    nameEntryOverlay.querySelectorAll('.slot-char').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => { activeSlot = +el.dataset.slot; errorMsg = ''; render(); });
    });

    document.getElementById('confirm-name-btn').addEventListener('click', tryConfirm);
  }

  let confirming = false;

  function showConfirmDialog() {
    const name = slots.map(i => CHARS[i]).join('');
    if (name.trim() === '') { errorMsg = 'NAME CANNOT BE BLANK'; render(); return; }
    confirming = true;
    nameEntryOverlay.innerHTML = `
      <div class="name-entry-title">CONFIRM NAME</div>
      <div class="name-confirm-display" style="font-size:24px;color:#44ddff;margin:16px 0;">${name}</div>
      <p class="name-entry-hint" style="margin-bottom:20px;">SAVE AS <span style="color:#44ddff;">${name}</span>?</p>
      <div style="display:flex;gap:16px;">
        <button id="confirm-yes" class="btn-primary" style="padding:10px 20px;font-size:10px;border-color:#44ee88;color:#44ee88;">YES</button>
        <button id="confirm-no" class="btn-secondary" style="border-color:#ee5566;color:#ee5566;">NO</button>
      </div>`;
    document.getElementById('confirm-yes').addEventListener('click', () => doSave(name));
    document.getElementById('confirm-no').addEventListener('click', () => { confirming = false; render(); });
  }

  async function doSave(name) {
    if (!S.nameEntryActive) return;
    S.nameEntryActive = false;
    confirming = false;
    document.removeEventListener('keydown', onKey);
    nameEntryOverlay.classList.add('hidden');
    showLoading('SAVING SCORE...');
    const idx = await saveHighScore(name, finalScore, finalLevel);
    hideLoading();
    const scores = await fetchHighScores();
    endScreenOverlay.classList.remove('hidden');
    endScreenOverlay.innerHTML = `
      <div class="result lose">GAME OVER</div>
      <p class="score-text">SCORE: ${finalScore} &middot; LVL: ${finalLevel}</p>
      ${buildScoreboardHtml(scores, idx)}
      ${!isFirebaseOnline() ? '<p class="no-scores" style="color:#cc8844;">⚠ OFFLINE MODE</p>' : ''}
      <div style="display:flex;gap:16px;margin-bottom:12px;">
        <button id="play-again-btn" class="btn-primary" style="padding:12px 20px;font-size:10px;">PLAY AGAIN</button>
        <button id="main-menu-btn" class="btn-secondary">MAIN MENU</button>
      </div>
      <p class="controls-hint">ENTER TO PLAY AGAIN &middot; ESC FOR MENU</p>`;
    document.getElementById('play-again-btn').addEventListener('click', () => {
      endScreenOverlay.classList.add('hidden');
      playCRTWipe(() => _initGame());
    });
    document.getElementById('main-menu-btn').addEventListener('click', () => {
      endScreenOverlay.classList.add('hidden');
      overlay.classList.remove('hidden');
    });
  }

  async function tryConfirm() { showConfirmDialog(); }

  function onKey(e) {
    if (!S.nameEntryActive) return;
    e.preventDefault();
    e.stopPropagation();
    const k = e.key;

    if (k === 'ArrowLeft')  { activeSlot = (activeSlot - 1 + 3) % 3; errorMsg = ''; render(); }
    else if (k === 'ArrowRight') { activeSlot = (activeSlot + 1) % 3; errorMsg = ''; render(); }
    else if (k === 'ArrowUp')    { slots[activeSlot] = (slots[activeSlot] - 1 + CHARS.length) % CHARS.length; errorMsg = ''; render(); }
    else if (k === 'ArrowDown')  { slots[activeSlot] = (slots[activeSlot] + 1) % CHARS.length; errorMsg = ''; render(); }
    else if (k === 'Enter') {
      if (confirming) { document.getElementById('confirm-yes')?.click(); }
      else { tryConfirm(); }
    }
    else if (k === 'Escape') { if (confirming) { document.getElementById('confirm-no')?.click(); } }
    else if (k === 'Backspace') {
      if (confirming) { document.getElementById('confirm-no')?.click(); }
      else { slots[activeSlot] = CHARS.indexOf(' '); activeSlot = Math.max(0, activeSlot - 1); errorMsg = ''; render(); }
    }
    else if (k.length === 1) {
      const charIdx = CHARS.indexOf(k.toUpperCase());
      if (charIdx !== -1) {
        slots[activeSlot] = charIdx;
        if (activeSlot < 2) activeSlot++;
        errorMsg = '';
        render();
      }
    }
  }

  document.addEventListener('keydown', onKey);
  nameEntryOverlay.classList.remove('hidden');
  render();
}


// ═══════════════════════════════════════════════════════════════
// DYNAMIC RULES PAGE
// ═══════════════════════════════════════════════════════════════

const RARITY_NAMES = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Mythical' };
const RARITY_TAG_COLOURS = { 1: '#44ee88', 2: '#aaaacc', 3: '#4488ff', 4: '#ffdd44', 5: '#ff44ff' };
const RARITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };
const RARITY_CSS_CLASS = { 1: 'common', 2: 'uncommon', 3: 'rare', 4: 'epic', 5: 'mythical' };

const PW_DESCRIPTIONS = {
  frenzy:    { name: 'FRENZY',    desc: '2x points + speed boost for 3s' },
  ice:       { name: 'ICE',       desc: 'Slows the shark for 4s' },
  shield:    { name: 'SHIELD',    desc: 'Blocks one shark hit' },
  poison:    { name: 'POISON',    desc: 'Bad! Lose 3 seconds', bad: true },
  goop:      { name: 'GOOP',      desc: 'Bad! Slows you for 4s', bad: true },
  hourglass: { name: 'TIME STOP', desc: 'Freezes timer &amp; shark for 3.5s' },
  buddy:     { name: 'BUDDY',     desc: 'Mirror fish collects treats for 3s' },
  hook:      { name: 'HOOK',      desc: 'Grapple to the nearest treat' },
  ghost:     { name: 'GHOST',     desc: 'Shark vanishes for 3s' },
  bomb:      { name: 'BOMB',      desc: 'Blasts shark to farthest corner' },
  decoy:     { name: 'DECOY',     desc: 'Fake fish distracts the shark' },
  swap:      { name: 'SWAP',      desc: 'Swap places with the shark' },
  star:      { name: 'STAR',      desc: 'Brief invincibility, shark bounces off' },
  double:    { name: 'DOUBLE',    desc: 'Duplicates all treats on the field' },
  magnet:    { name: 'MAGNET',    desc: 'Pulls all treats towards you' },
  wave:      { name: 'WAVE',      desc: 'Pushes all treats to nearest wall' },
};

export function buildRulesHTML() {
  const container = document.getElementById('rules-powerups-dynamic');
  if (!container) return;

  const groups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const [key, cfg] of Object.entries(pwConfig)) {
    if (key === 'crazy') continue;
    const r = cfg.rarity;
    if (r >= 1 && r <= 5) groups[r].push(key);
  }

  let html = '';
  for (let tier = 1; tier <= 5; tier++) {
    if (groups[tier].length === 0) continue;
    const cls = RARITY_CSS_CLASS[tier];
    if (tier === 5) {
      html += `<div class="rules-rarity-label rules-rarity-mythical">${RARITY_STARS[tier]} ${RARITY_NAMES[tier].toUpperCase()}</div>`;
    } else {
      html += `<div class="rules-rarity-label" style="color:${RARITY_TAG_COLOURS[tier]};">${RARITY_STARS[tier]} ${RARITY_NAMES[tier].toUpperCase()}</div>`;
    }
    html += '<div class="rules-powerup-grid">';
    for (const key of groups[tier]) {
      const pw = PW_DESCRIPTIONS[key];
      if (!pw) continue;
      const emoji = pwConfig[key].emoji;
      const nameStyle = pw.bad ? ' style="color:#ff4444;"' : '';
      html += `<div class="rules-pw rarity-${cls}"><span class="pw-icon">${emoji}</span><strong${nameStyle}>${pw.name}</strong> — ${pw.desc}</div>`;
    }
    html += '</div>';
  }
  html += `<div class="rules-rarity-label" style="color:#ff00aa;">☢ SPECIAL</div>`;
  html += `<div class="rules-powerup-grid">`;
  html += `<div class="rules-pw rarity-crazy"><span class="pw-icon">🍄</span><strong>CRAZY</strong> — Masses of treats for 5s, then game over! (Lv10+)</div>`;
  html += `</div>`;
  container.innerHTML = html;
}


// ═══════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════

export { RARITY_NAMES, RARITY_TAG_COLOURS };

const PW_LABELS = {
  frenzy: '🔥 Frenzy', ice: '❄️ Ice', shield: '🛡️ Shield',
  poison: '☠️ Poison', goop: '🧪 Goop', hourglass: '⏳ Time Stop',
  buddy: '🐠 Buddy', hook: '🪝 Hook', ghost: '👻 Ghost',
  bomb: '💣 Bomb', decoy: '👁️ Decoy', swap: '🔄 Swap',
  star: '🌟 Star', double: '💎 Double', magnet: '🧲 Magnet', wave: '🌊 Wave',
};

const DEFAULT_RARITIES = {
  frenzy: 1, ice: 2, shield: 2, poison: 2, goop: 3,
  hourglass: 3, buddy: 3, hook: 3, ghost: 4, bomb: 4,
  decoy: 4, swap: 4, star: 5, double: 5, magnet: 5, wave: 5,
};

function buildVarEditor() {
  const grid = document.getElementById('admin-var-editor');
  if (!grid) return;

  let html = '<div class="admin-var-label" style="color:#44ddff;">ITEM</div><div class="admin-var-label" style="color:#44ddff;">RARITY</div><div class="admin-var-label" style="color:#44ddff;">TIER</div>';

  for (const [key, label] of Object.entries(PW_LABELS)) {
    const currentRarity = pwConfig[key]?.rarity ?? DEFAULT_RARITIES[key] ?? 1;
    const tierName = RARITY_NAMES[currentRarity] || '?';
    const tierColour = RARITY_TAG_COLOURS[currentRarity] || '#888';
    html += `<div class="admin-var-label">${label}</div>`;
    html += `<input type="number" class="admin-var-input" data-pw="${key}" min="1" max="5" value="${currentRarity}">`;
    html += `<div class="admin-var-tag" data-pw-tag="${key}" style="color:${tierColour};">${tierName}</div>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.admin-var-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const v = parseInt(inp.value) || 1;
      const tag = grid.querySelector(`[data-pw-tag="${inp.dataset.pw}"]`);
      if (tag) {
        tag.textContent = RARITY_NAMES[v] || '?';
        tag.style.color = RARITY_TAG_COLOURS[v] || '#888';
      }
    });
  });
}

function showPanelMsg(msg, isError) {
  const el = document.getElementById('admin-panel-msg');
  el.textContent = msg;
  el.style.color = isError ? '#ee5566' : '#44ee88';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

export function openAdminPanel(currentMaint) {
  const panel = document.getElementById('admin-panel-overlay');
  if (!panel) return;
  panel.classList.remove('hidden');

  const statusEl = document.getElementById('maint-status');
  if (currentMaint) {
    statusEl.textContent = 'ON — SITE IS DOWN';
    statusEl.className = 'admin-status on';
  } else {
    statusEl.textContent = 'OFF — SITE IS LIVE';
    statusEl.className = 'admin-status off';
  }

  buildVarEditor();
  document.getElementById('admin-panel-msg').classList.add('hidden');
}

// ─── ADMIN EVENT HANDLERS ───
export function setupAdminEvents() {
  // Maintenance toggle
  document.getElementById('maint-toggle-btn')?.addEventListener('click', async () => {
    if (!S.adminCredentials) { showPanelMsg('NOT LOGGED IN', true); return; }
    const statusEl = document.getElementById('maint-status');
    const isCurrentlyOn = statusEl.classList.contains('on');
    statusEl.textContent = 'UPDATING...';

    try {
      await setMaintenance(!isCurrentlyOn, S.adminCredentials.email, S.adminCredentials.password);
      if (!isCurrentlyOn) {
        statusEl.textContent = 'ON — SITE IS DOWN'; statusEl.className = 'admin-status on';
      } else {
        statusEl.textContent = 'OFF — SITE IS LIVE'; statusEl.className = 'admin-status off';
      }
      showPanelMsg('MAINTENANCE ' + (!isCurrentlyOn ? 'ENABLED' : 'DISABLED'), false);
    } catch (err) {
      statusEl.textContent = 'ERROR';
      showPanelMsg('FAILED: ' + (err.message || 'UNKNOWN'), true);
    }
  });

  // Wipe
  document.getElementById('admin-wipe-btn')?.addEventListener('click', async () => {
    if (!S.adminCredentials) { showPanelMsg('NOT LOGGED IN', true); return; }
    if (!confirm('Are you sure? This permanently deletes ALL scores.')) return;
    try {
      await adminWipeScores(S.adminCredentials.email, S.adminCredentials.password);
      showPanelMsg('SCOREBOARD WIPED', false);
    } catch (err) {
      showPanelMsg('WIPE FAILED: ' + (err.message || 'UNKNOWN'), true);
    }
  });

  // Save config
  document.getElementById('admin-save-config-btn')?.addEventListener('click', async () => {
    if (!S.adminCredentials) { showPanelMsg('NOT LOGGED IN', true); return; }
    const grid = document.getElementById('admin-var-editor');
    const config = {};
    grid.querySelectorAll('.admin-var-input').forEach(inp => {
      const key = inp.dataset.pw;
      const val = Math.max(1, Math.min(5, parseInt(inp.value) || 1));
      config[key] = val;
    });
    try {
      await saveGameConfig({ rarities: config }, S.adminCredentials.email, S.adminCredentials.password);
      for (const [key, rarity] of Object.entries(config)) {
        if (pwConfig[key]) pwConfig[key].rarity = rarity;
      }
      showPanelMsg('CONFIG SAVED & APPLIED', false);
    } catch (err) {
      showPanelMsg('SAVE FAILED: ' + (err.message || 'UNKNOWN'), true);
    }
  });

  // Reset defaults
  document.getElementById('admin-reset-config-btn')?.addEventListener('click', () => {
    for (const [key, rarity] of Object.entries(DEFAULT_RARITIES)) {
      if (pwConfig[key]) pwConfig[key].rarity = rarity;
    }
    buildVarEditor();
    showPanelMsg('RESET TO DEFAULTS (NOT SAVED YET)', false);
  });

  // Close admin panel
  document.getElementById('admin-panel-close-btn')?.addEventListener('click', () => {
    document.getElementById('admin-panel-overlay')?.classList.add('hidden');
    S.adminCredentials = null;
    overlay.classList.remove('hidden');
  });

  // Admin cancel
  adminCancelBtn.addEventListener('click', () => {
    adminOverlay.classList.add('hidden');
    scoreboardOverlay.classList.remove('hidden');
  });
}

// smth 