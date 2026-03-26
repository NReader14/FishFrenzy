// ═══════════════════════════════════════════════════════════════
// OVERLAYS — Scoreboard, name entry, loading, admin, rules
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { SKINS } from './skins.js';
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
  saveGameConfig, fetchPatchNotes, savePatchNotes, fetchFeedback, deleteFeedback,
  fetchAchievementLeaders
} from '../firebase-config.js';
import { pwConfig, clearTO } from './powerups.js';
import { setupItemTestEvents } from './admin.js';
import { gameVars, GAME_VAR_META, GAME_VAR_DEFAULTS, firebaseGameVars } from './game-vars.js';
import { saveSettings } from './settings.js';
import { getUnlockedCount, getNonSecretCount } from './achievements.js';
import { saveAchievementBoard } from '../firebase-config.js';

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
    const isMyScore = S.currentUser && s.uid && s.uid === S.currentUser.uid;
    const cls = [i === highlightIdx ? 'new-score' : '', isMyScore ? 'my-score' : ''].filter(Boolean).join(' ');
    const rankLabel = i < 3 ? medals[i] : `${i + 1}.`;
    html += `<tr class="${cls}">`;
    html += `<td class="rank">${rankLabel}</td>`;
    const nameColours = ['#ffdd44', '#c0c0d0', '#cd7f32'];
    const nStyle = i < 3 ? ` style="color:${nameColours[i]}"` : '';
    html += `<td class="name-col"${nStyle}>${s.name || '???'}${isMyScore ? ' <span class="my-score-tag">YOU</span>' : ''}</td>`;
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

  let allScores;
  try { allScores = await fetchAllScores(200); }
  catch (_) {
    el.innerHTML = '<p class="loading-text">FAILED TO LOAD — CHECK CONNECTION</p>';
    return;
  }

  let activeFilter = 'all';
  const DIFFS = ['all', 'easy', 'normal', 'hard'];
  const DIFF_LABELS = { all: 'ALL', easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };

  function render() {
    const scores = activeFilter === 'all'
      ? allScores
      : allScores.filter(s => (s.difficulty || 'normal') === activeFilter);
    const filterBtns = DIFFS.map(d =>
      `<button class="lb-filter-btn${d === activeFilter ? ' lb-filter-active' : ''}" data-diff="${d}">${DIFF_LABELS[d]}</button>`
    ).join('');
    el.innerHTML = `
      <div class="scoreboard-title">ALL SCORES</div>
      <div class="lb-filter-row">${filterBtns}</div>
      <div class="full-lb-count">${scores.length} ENTR${scores.length === 1 ? 'Y' : 'IES'}</div>
      <div class="full-lb-scroll">${buildScoreboardHtml(scores)}</div>
      <div class="scoreboard-actions">
        <button id="full-lb-back-btn" class="btn-secondary">BACK</button>
      </div>`;
    el.querySelectorAll('.lb-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => { activeFilter = btn.dataset.diff; render(); });
    });
    document.getElementById('full-lb-back-btn').addEventListener('click', () => {
      el.classList.add('hidden');
      scoreboardOverlay.classList.remove('hidden');
    });
  }
  render();
}

export async function showScoreboard(highlightIdx = -1) {
  scoreboardContent.innerHTML = '<p class="loading-text">LOADING...</p>';
  scoreboardOverlay.classList.remove('hidden');

  // Reset to scores tab
  const achBoardContent = document.getElementById('ach-board-content');
  const tabScoresBtn = document.getElementById('tab-scores-btn');
  const tabAchBtn = document.getElementById('tab-ach-btn');
  const viewAllBtn = document.getElementById('view-all-scores-btn');
  scoreboardContent.classList.remove('hidden');
  if (achBoardContent) achBoardContent.classList.add('hidden');
  if (tabScoresBtn) tabScoresBtn.classList.add('scoreboard-tab-active');
  if (tabAchBtn) tabAchBtn.classList.remove('scoreboard-tab-active');

  let allScores;
  try { allScores = await fetchHighScores(); }
  catch (_) {
    scoreboardContent.innerHTML = '<p class="loading-text">FAILED TO LOAD — CHECK CONNECTION</p>';
    return;
  }

  let activeDiff = 'all';
  const DIFFS = ['all', 'easy', 'normal', 'hard'];
  const DIFF_LABELS = { all: 'ALL', easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };

  function renderScores() {
    const scores = activeDiff === 'all'
      ? allScores
      : allScores.filter(s => (s.difficulty || 'normal') === activeDiff);
    let hi = highlightIdx;
    if (hi === -1 && S.lastPlayerName) {
      const found = scores.findIndex(s => s.name === S.lastPlayerName);
      if (found !== -1) hi = found;
    }
    const filterBtns = DIFFS.map(d =>
      `<button class="lb-filter-btn${d === activeDiff ? ' lb-filter-active' : ''}" data-diff="${d}">${DIFF_LABELS[d]}</button>`
    ).join('');
    scoreboardContent.innerHTML = `<div class="lb-filter-row">${filterBtns}</div>`
      + buildScoreboardHtml(scores, hi)
      + (!isFirebaseOnline() ? '<p class="no-scores" style="color:#cc8844;">⚠ OFFLINE — SHOWING CACHED SCORES</p>' : '');
    scoreboardContent.querySelectorAll('.lb-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => { activeDiff = btn.dataset.diff; renderScores(); });
    });
  }
  renderScores();

  // Tab switching
  if (tabScoresBtn) {
    tabScoresBtn.onclick = () => {
      scoreboardContent.classList.remove('hidden');
      if (achBoardContent) achBoardContent.classList.add('hidden');
      if (viewAllBtn) viewAllBtn.classList.remove('hidden');
      tabScoresBtn.classList.add('scoreboard-tab-active');
      if (tabAchBtn) tabAchBtn.classList.remove('scoreboard-tab-active');
    };
  }
  if (tabAchBtn) {
    tabAchBtn.onclick = async () => {
      scoreboardContent.classList.add('hidden');
      if (achBoardContent) { achBoardContent.classList.remove('hidden'); }
      if (viewAllBtn) viewAllBtn.classList.add('hidden');
      tabAchBtn.classList.add('scoreboard-tab-active');
      tabScoresBtn.classList.remove('scoreboard-tab-active');
      if (achBoardContent && achBoardContent.dataset.loaded !== 'true') {
        achBoardContent.innerHTML = '<p class="loading-text">LOADING...</p>';
        const leaders = await fetchAchievementLeaders(10);
        achBoardContent.dataset.loaded = 'true';
        if (!leaders.length) {
          achBoardContent.innerHTML = '<p class="no-scores">NO DATA YET — SIGN IN AND PLAY TO APPEAR HERE</p>';
          return;
        }
        const myUid = S.currentUser && !S.currentUser.isAnonymous ? S.currentUser.uid : null;
        let html = '<table class="scoreboard-table"><thead><tr><th>#</th><th>NAME</th><th>ACHIEVEMENTS</th></tr></thead><tbody>';
        leaders.forEach((l, i) => {
          const isMe = myUid && l.uid === myUid;
          const cls = isMe ? 'my-score' : '';
          html += `<tr class="${cls}">
            <td>${i + 1}</td>
            <td>${l.name || '???'}${isMe ? ' <span class="my-score-tag">YOU</span>' : ''}</td>
            <td>${l.count} / ${getNonSecretCount()}</td>
          </tr>`;
        });
        html += '</tbody></table>';
        achBoardContent.innerHTML = html;
      }
    };
  }
}

// ─── NAME ENTRY ───
export function showNameEntry(finalScore, finalLevel, msg) {
  S.nameEntryActive = true;
  const saved = S.settings.lastInitials || '';
  let slots = [0, 1, 2].map(i => {
    const ch = saved[i] ? saved[i].toUpperCase() : null;
    const idx = ch ? CHARS.indexOf(ch) : -1;
    return idx !== -1 ? idx : 0;
  });
  let activeSlot = 0;
  let errorMsg = '';

  const isTouch = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function render() {
    const errH = errorMsg ? `<div class="name-error">${errorMsg}</div>` : '';

    const pwLine = S.deathPowerup
      ? `<div style="font-size:8px;color:#ffaa44;margin-bottom:4px;letter-spacing:0.1em;">ACTIVE: ${S.deathPowerup}</div>`
      : '';

    let html = `
      <div class="name-entry-title">GAME OVER</div>
      <div class="name-entry-score">${msg.toUpperCase()} &mdash; SCORE: ${finalScore} &middot; LVL: ${finalLevel}</div>
      ${pwLine}
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

    const hintText = isTouch
      ? 'TAP &#9650;&#9660; TO CHANGE &middot; TAP SLOT TO SELECT<br>TAP "TYPE NAME" TO USE KEYBOARD<br>ENTER TO CONFIRM'
      : 'TYPE A-Z ON YOUR KEYBOARD<br>UP/DOWN TO SCROLL &middot; LEFT/RIGHT TO SELECT<br>ENTER TO CONFIRM';

    html += `</div>
      <div class="name-entry-hint">${hintText}</div>`;

    if (isTouch) {
      html += `<button id="mobile-kb-btn" class="btn-secondary" style="font-size:7px;padding:6px 14px;margin:6px 0 4px;">&#9000; TYPE NAME</button>`;
    }

    html += `<button id="confirm-name-btn" class="btn-primary" style="padding:10px 28px;font-size:10px;">OK</button>
      <input type="text" id="name-mobile-input" autocomplete="off" autocorrect="off" autocapitalize="characters"
        spellcheck="false" inputmode="text"
        style="position:fixed;opacity:0.01;width:1px;height:1px;top:50%;left:50%;font-size:16px;
               border:none;outline:none;background:transparent;color:transparent;padding:0;pointer-events:auto;">`;

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

    // "Type Name" button — user gesture needed on iOS to trigger keyboard
    const mobileKbBtn = document.getElementById('mobile-kb-btn');
    if (mobileKbBtn) {
      mobileKbBtn.addEventListener('click', function() {
        const mi = document.getElementById('name-mobile-input');
        if (mi) mi.focus();
      });
    }

    // Mobile input — handles keyboard typing without rebuilding DOM (keeps keyboard open)
    const mobileInput = document.getElementById('name-mobile-input');
    if (mobileInput) {
      mobileInput.addEventListener('input', function(e) {
        if (confirming) return;
        const char = e.data ? e.data.toUpperCase() : null;
        if (char && CHARS.indexOf(char) !== -1) {
          slots[activeSlot] = CHARS.indexOf(char);
          if (activeSlot < 2) activeSlot++;
          errorMsg = '';
        } else if (e.inputType === 'deleteContentBackward') {
          slots[activeSlot] = CHARS.indexOf(' ');
          activeSlot = Math.max(0, activeSlot - 1);
          errorMsg = '';
        }
        this.value = '';
        // Update only slot chars in-place to avoid closing mobile keyboard
        nameEntryOverlay.querySelectorAll('.slot-char').forEach((el, i) => {
          el.textContent = CHARS[slots[i]];
          el.classList.toggle('active', i === activeSlot);
        });
        const errEl = nameEntryOverlay.querySelector('.name-error');
        if (errEl) errEl.remove();
        this.focus();
      });
    }
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
    S.lastPlayerName = name;
    S.settings.lastInitials = name;
    saveSettings();
    // If signed in, link these initials to their achievement board entry
    if (S.currentUser && !S.currentUser.isAnonymous) {
      saveAchievementBoard(S.currentUser.uid, name, getUnlockedCount());
    }
    confirming = false;
    document.removeEventListener('keydown', onKey);
    nameEntryOverlay.classList.add('hidden');
    showLoading('SAVING SCORE...');
    const activeSkin = SKINS[S.settings.skin ?? 0] || SKINS[0];
    const skinSnapshot = {
      c1: activeSkin.c1, c2: activeSkin.c2, c3: activeSkin.c3,
      fishType:   activeSkin.fishType   || 'standard',
      hatKey:     activeSkin.hatKey     || 'none',
      maskKey:    activeSkin.maskKey    || 'none',
      outfitKey:  activeSkin.outfitKey  || 'none',
      difficulty: S.settings.difficulty || 'normal',
    };
    let idx = -1, scores = [];
    try {
      idx    = await saveHighScore(name, finalScore, finalLevel, skinSnapshot);
      scores = await fetchHighScores();
    } catch (_) {}
    hideLoading();
    const hiEl = document.getElementById('global-hi-score');
    if (hiEl && scores.length > 0) hiEl.textContent = scores[0].score.toLocaleString();
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

  function tryConfirm() { showConfirmDialog(); }

  function onKey(e) {
    if (!S.nameEntryActive) return;
    const k = e.key;
    // Mobile input handles letter typing via 'input' event; skip here to avoid double-processing
    const mobileInput = document.getElementById('name-mobile-input');
    if (mobileInput && document.activeElement === mobileInput && k.length === 1 && k !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();

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

const RARITY_NAMES = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Mythical', 6: 'Legendary' };
const RARITY_TAG_COLOURS = { 1: '#44ee88', 2: '#aaaacc', 3: '#4488ff', 4: '#ffdd44', 5: '#ff44ff', 6: '#cc88ff' };
const RARITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★', 6: '★★★★★★' };
const RARITY_CSS_CLASS = { 1: 'common', 2: 'uncommon', 3: 'rare', 4: 'epic', 5: 'mythical', 6: 'legendary' };

const PW_DESCRIPTIONS = {
  frenzy:    { name: 'FRENZY',    desc: '2x points + speed boost for 3s' },
  ice:       { name: 'ICE',       desc: 'Slows the shark to 25% speed for 4s' },
  shield:    { name: 'SHIELD',    desc: 'Blocks one shark hit' },
  poison:    { name: 'POISON',    desc: 'Bad! Lose 3 seconds', bad: true },
  goop:      { name: 'GOOP',      desc: 'Bad! Slows you to half speed for 4s', bad: true },
  hourglass: { name: 'TIME STOP', desc: 'Freezes timer &amp; shark for 3.5s' },
  buddy:     { name: 'BUDDY',     desc: 'A helper fish collects treats for you for 3s' },
  hook:      { name: 'HOOK',      desc: 'Grapples you to the nearest treat instantly' },
  ghost:     { name: 'GHOST',     desc: 'Shark loses track and wanders for 3s' },
  bomb:      { name: 'BOMB',      desc: 'Blasts the shark to the far corner' },
  decoy:     { name: 'DECOY',     desc: 'Spawns a fake fish to distract the shark for 4s' },
  swap:      { name: 'SWAP',      desc: 'Teleports you and the shark to each other\'s positions' },
  card:      { name: 'CARD',      desc: 'Draw a random card — bonus points, a powerup, extra time, or your doom' },
  star:      { name: 'STAR',      desc: '3s of invincibility — shark bounces off on contact' },
  double:    { name: 'DOUBLE',    desc: 'Duplicates every treat currently on the field' },
  magnet:    { name: 'MAGNET',    desc: 'Pulls all treats towards you for 1.5s' },
  wave:      { name: 'WAVE',      desc: 'Blasts all treats to the nearest wall' },
  bodyswap:  { name: 'BODY SWAP', desc: 'YOU become the shark for 8s — collect treats while the fish hunts you' },
  prompt:    { name: 'PROMPT',    desc: 'Freezes the shark for 1s, then it swims back and forth helplessly for 5s' },
  crazy:     { name: 'CRAZY',     desc: 'Floods the field with treats for 5s — then kills you instantly. (Lv9+)', bad: true, nameStyle: 'color:#ff00aa;' },
  rainbow:   { name: 'RAINBOW',   desc: 'ULTRA! Activates Frenzy, Ice, Time Stop, Shield, Buddy, Decoy &amp; Star simultaneously', nameStyle: 'background:linear-gradient(90deg,#ff4444,#ff8800,#ffee00,#44ee44,#44aaff,#aa44ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;' },
  claude:    { name: 'THE CLAUDE', desc: 'ULTIMATE! Auto-collects all treats &amp; freezes the shark. +500 bonus!', nameStyle: 'background:linear-gradient(90deg,#cc88ff,#ffcc44);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;' },
  hell:      { name: 'HELL',      desc: 'Bad! Every treat drains your score for 10s. The screen bleeds. Survive for the achievement.', bad: true, nameStyle: 'color:#ff2200;' },
  nice:      { name: 'NICE',      desc: '+69 points. That\'s it. That\'s the item.' },
};

export function buildRulesHTML() {
  const container = document.getElementById('rules-powerups-dynamic');
  if (!container) return;

  const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const [key, cfg] of Object.entries(pwConfig)) {
    const r = cfg.rarity;
    if (r >= 1 && r <= 6) groups[r].push(key);
  }

  let html = '';
  for (let tier = 1; tier <= 6; tier++) {
    if (groups[tier].length === 0) continue;
    const cls = RARITY_CSS_CLASS[tier];
    if (tier === 6) {
      html += `<div class="rules-rarity-label rarity-legendary-label">${RARITY_STARS[tier]} ${RARITY_NAMES[tier].toUpperCase()}</div>`;
    } else if (tier === 5) {
      html += `<div class="rules-rarity-label rules-rarity-mythical">${RARITY_STARS[tier]} ${RARITY_NAMES[tier].toUpperCase()}</div>`;
    } else {
      html += `<div class="rules-rarity-label" style="color:${RARITY_TAG_COLOURS[tier]};">${RARITY_STARS[tier]} ${RARITY_NAMES[tier].toUpperCase()}</div>`;
    }
    html += '<div class="rules-powerup-grid">';
    for (const key of groups[tier]) {
      const pw = PW_DESCRIPTIONS[key];
      if (!pw) continue;
      const emoji = pwConfig[key].emoji;
      const nameStyle = pw.nameStyle ? ` style="${pw.nameStyle}"` : pw.bad ? ' style="color:#ff4444;"' : '';
      html += `<div class="rules-pw rarity-${cls}"><span class="pw-icon">${emoji}</span><strong${nameStyle}>${pw.name}</strong> — ${pw.desc}</div>`;
    }
    html += '</div>';
  }

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
  rainbow: '🌈 Rainbow', crazy: '🍄 Crazy', prompt: '✍️ Prompt', claude: '🤖 The Claude',
  bodyswap: '🎭 Body Swap', hell: '👹 Hell', card: '🃏 Card',
};

const DEFAULT_RARITIES = {
  frenzy: 1, ice: 2, shield: 2, poison: 2, goop: 3,
  hourglass: 3, buddy: 3, hook: 3, ghost: 4, bomb: 4,
  decoy: 4, swap: 4, star: 5, double: 5, magnet: 5, wave: 5,
  rainbow: 6, crazy: 6, prompt: 3, claude: 6, bodyswap: 5, hell: 6, card: 4,
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
    html += `<input type="number" class="admin-var-input" data-pw="${key}" min="1" max="6" value="${currentRarity}">`;
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

function buildGameVarEditor() {
  const grid = document.getElementById('admin-gamevar-editor');
  if (!grid) return;
  let html = `<div class="admin-var-label" style="color:#44ddff;">VARIABLE</div><div class="admin-var-label" style="color:#44ddff;">SLIDER</div><div class="admin-var-label" style="color:#44ddff;">VAL</div>`;
  for (const [key, meta] of Object.entries(GAME_VAR_META)) {
    const val = gameVars[key];
    const isFirebase = key in firebaseGameVars;
    const dot = isFirebase ? `<span title="Firebase override" style="color:#44ff88;margin-right:3px;">●</span>` : '';
    html += `<div class="admin-var-label">${dot}${meta.label}</div>`;
    html += `<input type="range" class="admin-gv-slider" data-gv="${key}" min="${meta.min}" max="${meta.max}" step="${meta.step}" value="${val}">`;
    html += `<div class="admin-gv-val" data-gv-val="${key}">${val}</div>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.admin-gv-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const display = grid.querySelector(`[data-gv-val="${slider.dataset.gv}"]`);
      if (display) display.textContent = slider.value;
    });
  });
}

function showPanelMsg(msg, isError, btn) {
  const el = document.getElementById('admin-panel-msg');
  el.textContent = msg;
  el.style.color = isError ? '#ee5566' : '#44ee88';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);

  if (btn) {
    const icon = document.createElement('span');
    icon.textContent = isError ? ' ✗' : ' ✓';
    icon.style.color = isError ? '#ee5566' : '#44ee88';
    icon.style.fontWeight = 'bold';
    icon.className = 'admin-save-icon';
    btn.querySelectorAll('.admin-save-icon').forEach(e => e.remove());
    btn.appendChild(icon);
    setTimeout(() => icon.remove(), 3000);
  }
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
  buildGameVarEditor();
  document.getElementById('admin-panel-msg').classList.add('hidden');
}

// ─── ADMIN EVENT HANDLERS ───
export function setupAdminEvents() {
  setupItemTestEvents();

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
  document.getElementById('admin-save-config-btn')?.addEventListener('click', async function() {
    if (!S.adminCredentials) { showPanelMsg('NOT LOGGED IN', true, this); return; }
    const grid = document.getElementById('admin-var-editor');
    const config = {};
    grid.querySelectorAll('.admin-var-input').forEach(inp => {
      const key = inp.dataset.pw;
      const val = Math.max(1, Math.min(6, parseInt(inp.value) || 1));
      config[key] = val;
    });
    try {
      await saveGameConfig({ rarities: config }, S.adminCredentials.email, S.adminCredentials.password);
      for (const [key, rarity] of Object.entries(config)) {
        if (pwConfig[key]) pwConfig[key].rarity = rarity;
      }
      showPanelMsg('CONFIG SAVED & APPLIED', false, this);
    } catch (err) {
      showPanelMsg('SAVE FAILED: ' + (err.message || 'UNKNOWN'), true, this);
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

  // Save game vars
  document.getElementById('admin-save-gamevars-btn')?.addEventListener('click', async function() {
    if (!S.adminCredentials) { showPanelMsg('NOT LOGGED IN', true, this); return; }
    const grid = document.getElementById('admin-gamevar-editor');
    const config = {};
    grid.querySelectorAll('.admin-gv-slider').forEach(inp => {
      const key = inp.dataset.gv;
      const meta = GAME_VAR_META[key];
      if (!meta) return;
      const val = Math.max(meta.min, Math.min(meta.max, parseFloat(inp.value) || meta.min));
      config[key] = val;
    });
    try {
      await saveGameConfig({ gameVars: config }, S.adminCredentials.email, S.adminCredentials.password);
      for (const [key, val] of Object.entries(config)) gameVars[key] = val;
      showPanelMsg('GAME VARS SAVED & APPLIED', false, this);
    } catch (err) {
      showPanelMsg('SAVE FAILED: ' + (err.message || 'UNKNOWN'), true, this);
    }
  });

  // Reset game var defaults (also clears Firebase cache so next game start doesn't re-apply)
  document.getElementById('admin-reset-gamevars-btn')?.addEventListener('click', () => {
    for (const key of Object.keys(GAME_VAR_DEFAULTS)) {
      gameVars[key] = GAME_VAR_DEFAULTS[key];
      delete firebaseGameVars[key];
    }
    buildGameVarEditor();
    showPanelMsg('GAME VARS RESET (NOT SAVED YET)', false);
  });

  // Patch notes editor — load from Firebase when panel opens
  fetchPatchNotes().then(notes => {
    const ta = document.getElementById('admin-patch-notes-ta');
    if (!ta) return;
    try {
      const parsed = JSON.parse(notes || '[]');
      ta.value = JSON.stringify(parsed, null, 2);
    } catch (_) {
      ta.value = notes || '';
    }
  });

  document.getElementById('admin-save-patch-btn')?.addEventListener('click', async () => {
    const ta = document.getElementById('admin-patch-notes-ta');
    const statusEl = document.getElementById('admin-patch-status');
    if (!ta || !S.adminCredentials) return;
    // Validate JSON before saving
    try { JSON.parse(ta.value); } catch (_) {
      if (statusEl) { statusEl.textContent = '✗ INVALID JSON'; statusEl.style.color = '#ee5566'; }
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
      return;
    }
    if (statusEl) statusEl.textContent = 'SAVING...';
    try {
      await savePatchNotes(ta.value, S.adminCredentials.email, S.adminCredentials.password);
      if (statusEl) { statusEl.textContent = '✓ SAVED'; statusEl.style.color = '#44ff88'; }
    } catch (err) {
      if (statusEl) { statusEl.textContent = '✗ ERROR'; statusEl.style.color = '#ee5566'; }
    }
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  });

  // Load feedback entries
  document.getElementById('admin-load-feedback-btn')?.addEventListener('click', async function() {
    const list = document.getElementById('admin-feedback-list');
    const count = document.getElementById('admin-feedback-count');
    if (!list) return;
    list.textContent = 'LOADING...';
    const entries = await fetchFeedback(S.adminCredentials.email, S.adminCredentials.password, 30);
    if (!entries.length) { list.textContent = 'NO FEEDBACK YET'; count.textContent = ''; return; }
    count.textContent = `${entries.length} ENTR${entries.length === 1 ? 'Y' : 'IES'}`;
    const renderList = (data) => {
      list.innerHTML = data.map(e => {
        const typeLabel = e.type === 'bug' ? '🐛' : '💡';
        const when = e.timestamp?.toDate ? e.timestamp.toDate().toLocaleString() : '—';
        const msg = (e.message || '').slice(0, 120) + (e.message?.length > 120 ? '…' : '');
        return `<div data-fb-id="${e.id}" style="border-bottom:1px solid #1a2a3a;padding:4px 0;display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
          <div>
            <span style="color:${e.type === 'bug' ? '#ee5566' : '#44ddff'}">${typeLabel} ${e.type?.toUpperCase()}</span>
            <span style="color:#445566;margin-left:6px;">${when}</span>
            <div style="color:#aabbcc;margin-top:2px;">${msg}</div>
          </div>
          <button data-del-id="${e.id}" style="background:none;border:1px solid #ee5566;color:#ee5566;font-size:7px;padding:2px 5px;cursor:pointer;flex-shrink:0;font-family:inherit;">✕</button>
        </div>`;
      }).join('');
      list.querySelectorAll('[data-del-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-del-id');
          btn.disabled = true;
          btn.textContent = '…';
          try {
            await deleteFeedback(S.adminCredentials.email, S.adminCredentials.password, id);
            list.querySelector(`[data-fb-id="${id}"]`)?.remove();
            const remaining = list.querySelectorAll('[data-fb-id]').length;
            count.textContent = remaining ? `${remaining} ENTR${remaining === 1 ? 'Y' : 'IES'}` : '';
            if (!remaining) list.textContent = 'NO FEEDBACK YET';
          } catch { btn.disabled = false; btn.textContent = '✕'; }
        });
      });
    };
    renderList(entries);
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