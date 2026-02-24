// ═══════════════════════════════════════════════════════════════
// FISH FRENZY — MAIN GAME LOGIC
// Handles all gameplay, rendering, UI overlays, and input.
// Firebase operations are imported from firebase-config.js.
// ═══════════════════════════════════════════════════════════════

import {
  initAuth,
  fetchHighScores,
  saveHighScore,
  adminWipeScores,
  isFirebaseOnline,
  fetchMaintenance,
  setMaintenance,
  fetchGameConfig,
  saveGameConfig
} from "./firebase-config.js";


// ═══════════════════════════════════════════════════════════════
// SECTION 1: CONFIGURATION & CONSTANTS
// All tuneable values are defined here for easy adjustment.
// ═══════════════════════════════════════════════════════════════

// ─── POWER-UP DURATIONS (milliseconds) ───
const FRENZY_DURATION   = 3000;   // Frenzy: 2x points + speed boost
const ICE_DURATION      = 4000;   // Ice: shark slowed
const GHOST_DURATION    = 3000;   // Ghost: shark invisible & harmless
const HOURGLASS_DURATION = 3500;  // Shortened  // Time Stop: timer & shark frozen
const BUDDY_DURATION    = 3000;   // Buddy: helper fish collects treats
const BOMB_DURATION     = 2000;   // Bomb: shark scared to corner
const CRAZY_DURATION    = 5000;   // Crazy: mass treat spawn, then game over

// ─── POWER-UP RARITY SYSTEM ───
// Each rarity tier defines spawn chance multiplier and field lifetime.
// 1 = Common, 2 = Uncommon, 3 = Rare, 4 = Epic, 5 = Mythical
const RARITY = {
  1: { name: 'Common',   spawnMul: 1.2,  life: 5000 },
  2: { name: 'Uncommon', spawnMul: 0.75, life: 4500 },
  3: { name: 'Rare',     spawnMul: 0.4,  life: 3500 },
  4: { name: 'Epic',     spawnMul: 0.18, life: 2500 },
  5: { name: 'Mythical', spawnMul: 0.08, life: 2000 },
};
const CRAZY_ITEM_LIFETIME   = 900;

// ─── BUDGET: Max total rarity cost of items on field ───
// Level 1 = 7, scales up to level 15 = 15
function getFieldBudget() {
  return Math.min(15, Math.floor(7 + (Math.max(1, level) - 1) * (8 / 14)));
}

function getFieldCost() {
  let cost = 0;
  for (const k in pwItems) {
    if (pwItems[k]) {
      const r = pwConfig[k]?.rarity || 0;
      if (r > 0) cost += r; else if (r === 0) cost += 5; // Crazy = 5
    }
  }
  return cost;
}
   // Crazy mushroom — its own thing
const MAX_FIELD_ITEMS       = 3;     // Max power-up items on screen at once


// ─── PROGRESSIVE SPEED ───
const FISH_BASE_SPEED      = 2.5;
const FISH_ACCEL_RATE      = 0.003; // Speed gain per frame in same direction
const FISH_MAX_SPEED_BONUS = 0.8;   // Max extra speed from acceleration

// ─── SHARK START DELAY ───
const SHARK_START_DELAY = 90;  // Frames before shark moves (~1.5s at 60fps)

// ─── GOOP DURATION ───
const GOOP_DURATION = 4000;  // Goop: slows player for 4s
const DECOY_DURATION = 4000;
const STAR_DURATION = 3000;

// ─── GAMEPLAY CONSTANTS ───
const FRENZY_SPEED_BOOST = 1.2;  // Extra speed during frenzy
const COMBO_WINDOW       = 1200; // ms to keep combo chain alive
const PW_SPAWN_CHANCE    = 0.007; // Slightly increased // Per-frame chance to spawn a power-up
const MAX_SCORES         = 5;    // Leaderboard size

// ─── CANVAS ───
const W = 720;  // Canvas width
const H = 480;  // Canvas height

// ─── CHARACTER SET (for name entry) ───
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('');

// ─── UTILITY FUNCTIONS ───
const rand = (a, b) => Math.random() * (b - a) + a;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);


// ═══════════════════════════════════════════════════════════════
// SECTION 2: DOM REFERENCES
// Cache all DOM elements at startup to avoid repeated lookups.
// ═══════════════════════════════════════════════════════════════

const canvas  = document.getElementById('game');
const ctx     = canvas.getContext('2d');

// Overlays
const overlay           = document.getElementById('overlay');
const nameEntryOverlay  = document.getElementById('name-entry-overlay');
const endScreenOverlay  = document.getElementById('end-screen-overlay');
const winOverlay        = document.getElementById('win-overlay');
const scoreboardOverlay = document.getElementById('scoreboard-overlay');
const rulesOverlay      = document.getElementById('rules-overlay');
const adminOverlay      = document.getElementById('admin-overlay');
const loadingOverlay    = document.getElementById('loading-overlay');
const loadingMessage    = document.getElementById('loading-message');

// HUD elements
const scoreEl     = document.getElementById('score');
const timerEl     = document.getElementById('timer');
const timerBar    = document.getElementById('timer-bar');
const levelEl     = document.getElementById('level');
const treatsLeftEl = document.getElementById('treats-left');
const frenzyHud   = document.getElementById('frenzy-hud');
const frenzyBarEl = document.getElementById('frenzy-bar');

// Buttons
const startBtn          = document.getElementById('start-btn');
const rulesBtn          = document.getElementById('rules-btn');
const rulesBackBtn      = document.getElementById('rules-back-btn');
const scoreboardBtn     = document.getElementById('scoreboard-btn');
const closeScoreboardBtn = document.getElementById('close-scoreboard-btn');
// wipeScoreboardBtn removed — wipe now in admin panel

// Admin form
const adminEmailInput    = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const adminLoginBtn      = document.getElementById('admin-login-btn');
const adminCancelBtn     = document.getElementById('admin-cancel-btn');
const adminError         = document.getElementById('admin-error');

// Scoreboard content container
const scoreboardContent = document.getElementById('scoreboard-content');

// Status bar indicators (power-up icons in the HUD)
const st = {};
['frenzy','ice','shield','magnet','ghost','time','buddy','bomb','crazy','combo',
 'decoy','star','hook','goop'].forEach(
  k => st[k] = document.getElementById('st-' + k)
);


// ═══════════════════════════════════════════════════════════════
// SECTION 3: GAME STATE
// All mutable game state is declared here.
// ═══════════════════════════════════════════════════════════════

// Core entities
let fish, shark, treats, particles, bubbles, scorePopups, buddy;

// Game state
let score, level, timeLeft, maxTime;
let gameRunning = false;
let gameLoop = null;
let timerInterval = null;

// Input tracking
let keys = {};
let nameEntryActive = false;

// Power-up items on the field (null = not spawned)
let pwItems = {
  frenzy: null, ice: null, shield: null, magnet: null,
  ghost: null, hourglass: null, buddy: null, bomb: null, crazy: null,
  decoy: null, swap: null, star: null, double: null,
  wave: null, poison: null, hook: null, goop: null
};

// Active power-up states
let frenzyActive = false, frenzyTimer = 0, frenzyTO = null;
let iceActive = false, iceTO = null, iceStartTime = 0;
let shieldActive = false;
let magnetActive = false;
let ghostActive = false, ghostTO = null;
let hourglassActive = false, hourglassTO = null, timerFrozen = false, hourglassStartTime = 0;
let buddyActive = false, buddyTO = null;
let bombActive = false, bombTO = null;
let crazyActive = false, crazyTO = null;
let decoyActive = false, decoyTO = null, decoyFish = null;
let starActive = false, starTO = null;
let hookActive = false;

// Combo system
let comboCount = 0, comboTimer = 0;

// Progressive speed
let accelBonus = 0, lastMoveDir = { x: 0, y: 0 };

// Shark start delay (frames)
let sharkDelay = 0;

// Last spawned power-up (prevent duplicates)
let lastSpawnedPW = null;

// Pause state
let gamePaused = false;

// Goop state
let goopActive = false, goopTO = null, goopStartTime = 0;

// Hook animation
let hookLine = null; // { fx, fy, tx, ty, progress }

// Swap animation
let swapAnim = null; // { phase, timer, old positions }

// Chomp animation
let chompAnim = null; // { timer, x, y }


// ═══════════════════════════════════════════════════════════════
// SECTION 4: FIREBASE INITIALISATION
// Authenticate anonymously when the page loads.
// ═══════════════════════════════════════════════════════════════

(async function boot() {
  await initAuth();
  // Check maintenance mode
  const maint = await fetchMaintenance();
  if (maint) {
    document.getElementById('game-wrapper').innerHTML = `
      <div class="game-overlay" style="background:#0a0a16;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <h1 style="color:#ee5566;font-size:16px;font-family:'Press Start 2P',monospace;">UNDER MAINTENANCE</h1>
        <p style="color:#5588aa;font-size:8px;margin-top:16px;font-family:'Press Start 2P',monospace;">WE'LL BE BACK SOON!</p>
        <button id="maint-admin-btn" class="btn-secondary" style="margin-top:24px;">ADMIN LOGIN</button>
      </div>`;
    document.getElementById('maint-admin-btn').addEventListener('click', () => {
      const wrapper = document.getElementById('game-wrapper');
      wrapper.innerHTML = `
        <div class="game-overlay" style="background:#0a0a16;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div class="admin-title" style="font-family:'Press Start 2P',monospace;font-size:10px;color:#44ddff;margin-bottom:16px;">ADMIN LOGIN</div>
          <div class="admin-form" style="display:flex;flex-direction:column;gap:8px;width:240px;">
            <input type="email" id="maint-email" class="admin-input" placeholder="Email" autocomplete="email">
            <input type="password" id="maint-pass" class="admin-input" placeholder="Password" autocomplete="current-password">
            <div id="maint-error" class="admin-error hidden" style="color:#ee5566;font-size:7px;margin:4px 0;"></div>
            <button id="maint-login-btn" class="btn-primary" style="padding:10px 20px;font-size:9px;margin-top:8px;">DISABLE MAINTENANCE</button>
          </div>
        </div>`;
      document.getElementById('maint-login-btn').addEventListener('click', async () => {
        try {
          await setMaintenance(false, document.getElementById('maint-email').value, document.getElementById('maint-pass').value);
          location.reload();
        } catch (err) {
          const e = document.getElementById('maint-error');
          e.textContent = 'LOGIN FAILED'; e.classList.remove('hidden');
        }
      });
    });
    return;
  }
  // Show welcome popup on first visit
  if (!localStorage.getItem('fishFrenzyWelcomed')) {
    const wo = document.getElementById('welcome-overlay');
    if (wo) {
      wo.classList.remove('hidden');
      document.getElementById('welcome-close-btn')?.addEventListener('click', () => {
        wo.classList.add('hidden');
        localStorage.setItem('fishFrenzyWelcomed', '1');
      });
    }
  }
})();


// ═══════════════════════════════════════════════════════════════
// SECTION 5: SCOREBOARD UI
// Building HTML tables and managing the scoreboard overlay.
// ═══════════════════════════════════════════════════════════════

/**
 * Build an HTML table of high scores.
 * @param {Array} scores - Array of { name, score, level }
 * @param {number} highlightIdx - Index to highlight as "new" (-1 for none)
 * @returns {string} HTML string
 */
function buildScoreboardHtml(scores, highlightIdx = -1) {
  if (!scores || scores.length === 0) {
    return '<p class="no-scores">NO SCORES YET</p>';
  }

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

/**
 * Show the scoreboard overlay. Fetches scores from Firebase first.
 */
async function showScoreboard(highlightIdx = -1) {
  scoreboardContent.innerHTML = '<p class="loading-text">LOADING...</p>';
  scoreboardOverlay.classList.remove('hidden');

  const scores = await fetchHighScores();
  scoreboardContent.innerHTML = buildScoreboardHtml(scores, highlightIdx);

  if (!isFirebaseOnline()) {
    scoreboardContent.innerHTML += '<p class="no-scores" style="color:#cc8844;">⚠ OFFLINE — SHOWING CACHED SCORES</p>';
  }
}


// ═══════════════════════════════════════════════════════════════
// SECTION 6: NAME ENTRY
// Arcade-style 3-character initial entry after game over.
// ═══════════════════════════════════════════════════════════════

function showNameEntry(finalScore, finalLevel, msg) {
  nameEntryActive = true;
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

    // Attach click handlers to arrows
    nameEntryOverlay.querySelectorAll('.slot-arrow').forEach(el => {
      el.addEventListener('click', () => {
        const s = +el.dataset.slot;
        activeSlot = s;
        errorMsg = '';
        slots[s] = el.dataset.dir === 'up'
          ? (slots[s] - 1 + CHARS.length) % CHARS.length
          : (slots[s] + 1) % CHARS.length;
        render();
      });
    });

    // Click on character to select that slot
    nameEntryOverlay.querySelectorAll('.slot-char').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        activeSlot = +el.dataset.slot;
        errorMsg = '';
        render();
      });
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
    if (!nameEntryActive) return;
    nameEntryActive = false;
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
      <p class="controls-hint">ARROW KEYS / WASD TO SWIM</p>`;
    document.getElementById('play-again-btn').addEventListener('click', () => {
      endScreenOverlay.classList.add('hidden');
      playCRTWipe(() => initGame());
    });
    document.getElementById('main-menu-btn').addEventListener('click', () => {
      endScreenOverlay.classList.add('hidden');
      overlay.classList.remove('hidden');
    });
  }

  async function tryConfirm() { showConfirmDialog(); }

  function onKey(e) {
    if (!nameEntryActive) return;
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
// SECTION 7: LOADING / ADMIN UI HELPERS
// ═══════════════════════════════════════════════════════════════

function showLoading(msg) {
  loadingMessage.textContent = msg || 'LOADING...';
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

function showAdminError(msg) {
  adminError.textContent = msg;
  adminError.classList.remove('hidden');
}

function hideAdminError() {
  adminError.classList.add('hidden');
}

/**
 * Show a brief "SCOREBOARD WIPED" notification that fades out.
 */
function showWipeNotification() {
  const notif = document.createElement('div');
  notif.textContent = 'SCOREBOARD WIPED';
  notif.className = 'wipe-notification';
  document.getElementById('game-wrapper').appendChild(notif);
  // Trigger fade-in
  requestAnimationFrame(() => notif.classList.add('visible'));
  // Remove after 2 seconds
  setTimeout(() => {
    notif.classList.remove('visible');
    setTimeout(() => notif.remove(), 400);
  }, 2000);
}

/**
 * CRT TV turn-on wipe effect before the game starts.
 * A white horizontal line expands from the centre, then fades out.
 * Calls the callback once the animation finishes.
 */
function playCRTWipe(callback) {
  const wipe = document.createElement('div');
  wipe.className = 'crt-wipe';
  document.getElementById('game-wrapper').appendChild(wipe);

  // Phase 1: soft line appears in centre (400ms)
  requestAnimationFrame(() => {
    wipe.classList.add('crt-line');
    // Phase 2: line expands to fill screen (300ms)
    setTimeout(() => {
      wipe.classList.remove('crt-line');
      wipe.classList.add('crt-expand');
      // Phase 3: screen fades to reveal game (400ms)
      setTimeout(() => {
        wipe.classList.add('crt-fade');
        setTimeout(() => {
          wipe.remove();
          if (callback) callback();
        }, 400);
      }, 300);
    }, 400);
  });
}


// ═══════════════════════════════════════════════════════════════
// SECTION 8: POWER-UP ACTIVATION FUNCTIONS
// Each function activates a power-up, sets timers, and
// updates the HUD status indicators.
// ═══════════════════════════════════════════════════════════════

function clearTO(t) { if (t) clearTimeout(t); return null; }
function stOn(key, cls)  { if (st[key]) st[key].classList.add('s-on', cls); }
function stOff(key, cls) { if (st[key]) st[key].classList.remove('s-on', cls); }

// ─── FRENZY: 2x points + speed boost ───
function activateFrenzy() {
  frenzyActive = true;
  frenzyTimer = Date.now();
  fish.speed = FISH_BASE_SPEED + FRENZY_SPEED_BOOST;
  frenzyHud.classList.add('active');
  frenzyBarEl.style.width = '100%';
  stOn('frenzy', 's-frenzy');
  frenzyTO = clearTO(frenzyTO);
  frenzyTO = setTimeout(deactivateFrenzy, FRENZY_DURATION);
}

function deactivateFrenzy() {
  frenzyActive = false;
  fish.speed = FISH_BASE_SPEED;
  frenzyHud.classList.remove('active');
  frenzyBarEl.style.width = '0%';
  stOff('frenzy', 's-frenzy');
  frenzyTO = null;
}

// ─── ICE: Slow the shark ───
function activateIce() {
  iceActive = true;
  iceStartTime = Date.now();
  shark.savedSpeed = shark.speed;
  shark.speed *= 0.25;
  stOn('ice', 's-ice');
  iceTO = clearTO(iceTO);
  iceTO = setTimeout(deactivateIce, ICE_DURATION);
}

function deactivateIce() {
  iceActive = false;
  shark.speed = shark.savedSpeed || (0.75 + level * 0.2);
  stOff('ice', 's-ice');
  iceTO = null;
}

// ─── SHIELD: Block one hit ───
function activateShield() {
  shieldActive = true;
  stOn('shield', 's-shield');
}

function useShield() {
  shieldActive = false;
  stOff('shield', 's-shield');
  spawnParticles(fish.x, fish.y, '#44ee88', 16);
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'SAVED', life: 1.5, decay: 0.02 });

  // Knock shark away from fish
  const a = Math.atan2(shark.y - fish.y, shark.x - fish.x);
  shark.x += Math.cos(a) * 80;
  shark.y += Math.sin(a) * 80;
  shark.x = Math.max(20, Math.min(W - 20, shark.x));
  shark.y = Math.max(20, Math.min(H - 20, shark.y));
}

// ─── MAGNET: Pull all treats to fish ───
function activateMagnet() {
  magnetActive = true;
  stOn('magnet', 's-magnet');
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'MAGNET!', life: 0.05, decay: 0.03 });
  setTimeout(() => { magnetActive = false; stOff('magnet', 's-magnet'); }, 500);
}

// ─── GHOST: Shark vanishes ───
function activateGhost() {
  ghostActive = true;
  shark.hidden = true;
  stOn('ghost', 's-ghost');
  scorePopups.push({ x: shark.x, y: shark.y - 20, pts: 'POOF!', life: 1, decay: 0.03 });
  spawnParticles(shark.x, shark.y, '#ff8844', 16);
  ghostTO = clearTO(ghostTO);
  ghostTO = setTimeout(deactivateGhost, GHOST_DURATION);
}

function deactivateGhost() {
  ghostActive = false;
  shark.hidden = false;
  stOff('ghost', 's-ghost');
  ghostTO = null;
  spawnParticles(shark.x, shark.y, '#ff8844', 10);
}

// ─── HOURGLASS: Freeze time and shark ───
function activateHourglass() {
  hourglassActive = true;
  timerFrozen = true;
  hourglassStartTime = Date.now();
  shark.savedSpeed2 = shark.speed;
  shark.speed = 0;
  timerBar.classList.add('frozen');
  stOn('time', 's-time');
  scorePopups.push({ x: W / 2, y: H / 2, pts: 'TIME STOP!', life: 1.2, decay: 0.025 });
  hourglassTO = clearTO(hourglassTO);
  hourglassTO = setTimeout(deactivateHourglass, HOURGLASS_DURATION);
}

function deactivateHourglass() {
  hourglassActive = false;
  timerFrozen = false;
  shark.speed = shark.savedSpeed2 || (0.75 + level * 0.2);
  if (iceActive) shark.speed *= 0.25;
  timerBar.classList.remove('frozen');
  stOff('time', 's-time');
  hourglassTO = null;
}

// ─── BUDDY: Helper fish ───
function activateBuddy() {
  buddyActive = true;
  buddy = { x: W - fish.x, y: H - fish.y, dir: -fish.dir, tailPhase: rand(0, Math.PI * 2) };
  stOn('buddy', 's-buddy');
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'BUDDY!', life: 1, decay: 0.03 });
  buddyTO = clearTO(buddyTO);
  buddyTO = setTimeout(deactivateBuddy, BUDDY_DURATION);
}

function deactivateBuddy() {
  buddyActive = false;
  if (buddy) spawnParticles(buddy.x, buddy.y, '#44ddaa', 8);
  buddy = null;
  stOff('buddy', 's-buddy');
  buddyTO = null;
}

// ─── BOMB: Blast shark to farthest corner ───
function activateBomb() {
  bombActive = true;
  stOn('bomb', 's-bomb');
  spawnParticles(fish.x, fish.y, '#ff4444', 20);
  spawnParticles(fish.x, fish.y, '#ffaa00', 14);
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'BOOM!', life: 1.2, decay: 0.025 });

  // Send shark to the farthest corner
  const corners = [
    { x: 30, y: 30 }, { x: W - 30, y: 30 },
    { x: 30, y: H - 30 }, { x: W - 30, y: H - 30 }
  ];
  let best = corners[0], bestD = 0;
  corners.forEach(c => {
    const d = dist(c, fish);
    if (d > bestD) { bestD = d; best = c; }
  });
  shark.x = best.x;
  shark.y = best.y;

  bombTO = clearTO(bombTO);
  bombTO = setTimeout(() => {
    bombActive = false;
    stOff('bomb', 's-bomb');
    bombTO = null;
  }, BOMB_DURATION);
}

// ─── CRAZY: Mass treat spawn (level 10+ only) ───
function activateCrazy() {
  crazyActive = true;
  stOn('crazy', 's-crazy');
  scorePopups.push({ x: fish.x, y: fish.y - 30, pts: 'CHAOS! 5 SECONDS!', life: 2, decay: 0.015 });
  spawnParticles(fish.x, fish.y, '#ff00aa', 40);

  // Spawn 20x the normal item count
  const toSpawn = (5 + level * 2) * 20;
  for (let i = 0; i < toSpawn; i++) spawnTreat();
  treatsLeftEl.textContent = treats.length;

  crazyTO = clearTO(crazyTO);
  crazyTO = setTimeout(() => {
    if (gameRunning) endGame(false, 'OVERDOSE!');
  }, CRAZY_DURATION);
}

// ─── DECOY: Spawn a fake fish that distracts the shark ───
function activateDecoy() {
  decoyActive = true;
  // Place decoy on opposite side of fish from shark
  const ax = Math.atan2(shark.y - fish.y, shark.x - fish.x);
  decoyFish = {
    x: fish.x - Math.cos(ax) * 100,
    y: fish.y - Math.sin(ax) * 100,
    dir: fish.dir, tailPhase: rand(0, Math.PI * 2)
  };
  decoyFish.x = Math.max(30, Math.min(W - 30, decoyFish.x));
  decoyFish.y = Math.max(30, Math.min(H - 30, decoyFish.y));
  stOn('decoy', 's-decoy');
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'DECOY!', life: 1, decay: 0.03 });
  spawnParticles(decoyFish.x, decoyFish.y, '#ffaa44', 12);
  decoyTO = clearTO(decoyTO);
  decoyTO = setTimeout(deactivateDecoy, 4000);
}

function deactivateDecoy() {
  decoyActive = false;
  if (decoyFish) spawnParticles(decoyFish.x, decoyFish.y, '#ffaa44', 8);
  decoyFish = null;
  stOff('decoy', 's-decoy');
  decoyTO = null;
}

// ─── SWAP: Pause, flicker 3x, then teleport ───
function activateSwap() {
  swapAnim = {
    phase: 'pause', timer: 0,
    oldFishX: fish.x, oldFishY: fish.y,
    oldSharkX: shark.x, oldSharkY: shark.y
  };
  gamePaused = true;
  timerFrozen = true;
}

function updateSwapAnim() {
  if (!swapAnim) return;
  swapAnim.timer++;
  if (swapAnim.phase === 'pause' && swapAnim.timer > 60) {
    swapAnim.phase = 'flicker'; swapAnim.timer = 0;
  }
  if (swapAnim.phase === 'flicker' && swapAnim.timer > 36) {
    fish.x = swapAnim.oldSharkX; fish.y = swapAnim.oldSharkY;
    shark.x = swapAnim.oldFishX; shark.y = swapAnim.oldFishY;
    spawnParticles(fish.x, fish.y, '#aa44ff', 16);
    spawnParticles(shark.x, shark.y, '#aa44ff', 16);
    scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'SWAP!', life: 1.2, decay: 0.025 });
    swapAnim = null; gamePaused = false; timerFrozen = false;
  }
}

// ─── STAR: Brief invincibility, shark bounces off ───
function activateStar() {
  starActive = true;
  stOn('star', 's-star');
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'STAR!', life: 1, decay: 0.03 });
  spawnParticles(fish.x, fish.y, '#ffee44', 20);
  starTO = clearTO(starTO);
  starTO = setTimeout(deactivateStar, 3000);
}

function deactivateStar() {
  starActive = false;
  stOff('star', 's-star');
  starTO = null;
}

// ─── DOUBLE: Duplicate all current treats on the field ───
function activateDouble() {
  const currentTreats = [...treats];
  for (const t of currentTreats) {
    if (t.collected) continue;
    treats.push({
      x: t.x + rand(-20, 20),
      y: t.y + rand(-20, 20),
      r: 14,
      type: t.type,
      bobPhase: rand(0, Math.PI * 2),
      collected: false
    });
  }
  treatsLeftEl.textContent = treats.length;
  spawnParticles(fish.x, fish.y, '#44ddff', 16);
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'DOUBLE!', life: 1.2, decay: 0.025 });
}

// ─── WAVE: Push all treats to nearest wall ───
function activateWave() {
  for (const t of treats) {
    if (t.collected) continue;
    // Find nearest wall axis
    const dLeft = t.x, dRight = W - t.x;
    const dTop = t.y, dBottom = H - t.y;
    const minDist = Math.min(dLeft, dRight, dTop, dBottom);
    if (minDist === dLeft) t.x = 20;
    else if (minDist === dRight) t.x = W - 20;
    else if (minDist === dTop) t.y = 20;
    else t.y = H - 20;
    spawnParticles(t.x, t.y, '#4488ff', 3);
  }
  scorePopups.push({ x: W / 2, y: H / 2, pts: 'WAVE!', life: 1, decay: 0.03 });
  spawnParticles(fish.x, fish.y, '#4488ff', 16);
}

// ─── POISON: Bad item — lose 3 seconds ───
function activatePoison() {
  timeLeft = Math.max(0, timeLeft - 3);
  timerEl.textContent = Math.max(0, timeLeft);
  timerBar.style.width = (timeLeft / maxTime * 100) + '%';
  spawnParticles(fish.x, fish.y, '#44ff00', 16);
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: '-3 SEC!', life: 1.5, decay: 0.02 });
  // Flash the timer bar red briefly
  timerBar.classList.add('danger');
  setTimeout(() => {
    if (timeLeft > 10) timerBar.classList.remove('danger');
  }, 500);
  if (timeLeft <= 0) endGame(false, "Poisoned!");
}

// ─── HOOK: Pause + line animation + flicker + teleport (like swap) ───
function activateHook() {
  if (treats.length === 0) return;
  let nearest = null, nearestD = Infinity;
  for (const t of treats) {
    if (!t.collected) { const d = dist(t, fish); if (d < nearestD) { nearestD = d; nearest = t; } }
  }
  if (nearest) {
    hookLine = {
      fx: fish.x, fy: fish.y, tx: nearest.x, ty: nearest.y,
      progress: 0, phase: 'line', flickerTimer: 0
    };
    hookActive = true;
    gamePaused = true;
    timerFrozen = true;
  }
}

function updateHookAnim() {
  if (!hookLine) return;

  if (hookLine.phase === 'line') {
    // Draw line extending from fish to target
    hookLine.progress += 0.05;
    if (hookLine.progress >= 1) {
      hookLine.phase = 'flicker';
      hookLine.flickerTimer = 0;
    }
  } else if (hookLine.phase === 'flicker') {
    // Fish flickers 3 times then teleports
    hookLine.flickerTimer++;
    if (hookLine.flickerTimer > 30) {
      spawnParticles(fish.x, fish.y, '#ccaa44', 8);
      fish.x = hookLine.tx; fish.y = hookLine.ty;
      fish.vx = 0; fish.vy = 0;
      spawnParticles(fish.x, fish.y, '#ccaa44', 12);
      scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'HOOK!', life: 1, decay: 0.03 });
      hookLine = null; hookActive = false;
      gamePaused = false;
      if (!hourglassActive) timerFrozen = false;
    }
  }
}



// ─── GOOP: Slows player for 4s (bad item) ───
function activateGoop() {
  goopActive = true;
  goopStartTime = Date.now();
  fish.speed = FISH_BASE_SPEED * 0.5;
  stOn('goop', 's-goop');
  spawnParticles(fish.x, fish.y, '#66cc44', 16);
  scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'GOOPED!', life: 1.5, decay: 0.02 });
  goopTO = clearTO(goopTO);
  goopTO = setTimeout(() => {
    goopActive = false;
    fish.speed = frenzyActive ? FISH_BASE_SPEED + FRENZY_SPEED_BOOST : FISH_BASE_SPEED;
    stOff('goop', 's-goop');
    goopTO = null;
  }, GOOP_DURATION);
}

const r = {}

async function loadRarities() {
  const config = await fetchGameConfig();
  const rarities = config?.rarities;
  r = rarities
  console.log(rarities);
}

loadRarities();

// ═══════════════════════════════════════════════════════════════
// SECTION 9: POWER-UP SPAWNING & FIELD MANAGEMENT
// Power-ups appear randomly on the field, bob up and down,
// and are collected on contact with the fish or buddy.
// ═══════════════════════════════════════════════════════════════

/**
 * Power-up configuration table.
 * Each entry defines the emoji, glow colour, activation function,
 * relative spawn chance, eligibility check, and field lifetime.
 */
const pwConfig = {
  frenzy:    { emoji: '🔥', glow: '#ff8800', fn: activateFrenzy,    rarity: 1, ok: () => !frenzyActive },
  ice:       { emoji: '❄️',  glow: '#88ddff', fn: activateIce,       rarity: 2, ok: () => !iceActive },
  shield:    { emoji: '🛡️', glow: '#44ee88', fn: activateShield,    rarity: 2, ok: () => !shieldActive },
  poison:    { emoji: '☠️',  glow: '#44ff00', fn: activatePoison,    rarity: 2, ok: () => true },
  hourglass: { emoji: '⏳', glow: '#ffdd44', fn: activateHourglass, rarity: 3, ok: () => !hourglassActive },
  buddy:     { emoji: '🐠', glow: '#44ddaa', fn: activateBuddy,     rarity: 3, ok: () => !buddyActive },
  hook:      { emoji: '🪝', glow: '#ccaa44', fn: activateHook,      rarity: 3, ok: () => treats.length > 0 && !hookActive },
  ghost:     { emoji: '👻', glow: '#ff8844', fn: activateGhost,     rarity: 4, ok: () => !ghostActive },
  bomb:      { emoji: '💣', glow: '#ff4444', fn: activateBomb,      rarity: 4, ok: () => !bombActive },
  decoy:     { emoji: '👁️', glow: '#ffaa44', fn: activateDecoy,     rarity: 4, ok: () => !decoyActive },
  swap:      { emoji: '🔄', glow: '#aa44ff', fn: activateSwap,      rarity: 4, ok: () => !swapAnim },
  star:      { emoji: '🌟', glow: '#ffee44', fn: activateStar,      rarity: 5, ok: () => !starActive },
  double:    { emoji: '💎', glow: '#44ddff', fn: activateDouble,    rarity: 5, ok: () => treats.length > 0 },
  magnet:    { emoji: '🧲', glow: '#dd44ff', fn: activateMagnet,    rarity: 5, ok: () => !magnetActive },
  wave:      { emoji: '🌊', glow: '#4488ff', fn: activateWave,      rarity: 5, ok: () => treats.length > 0 },
  crazy:     { emoji: '🍄', glow: '#ff00aa', fn: activateCrazy,     rarity: 0, ok: () => level > 9 && !crazyActive, life: CRAZY_ITEM_LIFETIME }
};


/** Check if a position overlaps existing items or treats. */
function overlapsExisting(x, y, radius) {
  for (const k in pwItems) {
    const item = pwItems[k];
    if (item && Math.hypot(item.x - x, item.y - y) < radius) return true;
  }
  for (const t of treats) {
    if (!t.collected && Math.hypot(t.x - x, t.y - y) < radius) return true;
  }
  return false;
}
/** Spawn a power-up item at a random position, avoiding overlaps. */
function spawnPW(type) {
  const cfg = pwConfig[type];
  const lt = cfg.life || (RARITY[cfg.rarity] ? RARITY[cfg.rarity].life : 5000);
  let x, y, attempts = 0;
  do {
    x = rand(50, W - 50);
    y = rand(50, H - 50);
    attempts++;
  } while ((dist({ x, y }, fish) < 80 || overlapsExisting(x, y, 40)) && attempts < 30);
  return { x, y, r: 16, bobPhase: rand(0, Math.PI * 2), spawnTime: Date.now(), lifetime: lt, type };
}

/** Each frame, randomly try to spawn power-ups (budget + duplicate check). */
function trySpawnPowerups() {
  if (gamePaused) return;
  let fieldCount = 0;
  for (const k in pwItems) { if (pwItems[k]) fieldCount++; }
  if (fieldCount >= MAX_FIELD_ITEMS) return;

  const budget = getFieldBudget();
  const currentCost = getFieldCost();

  for (const [k, c] of Object.entries(pwConfig)) {
    if (fieldCount >= MAX_FIELD_ITEMS) break;
    if (pwItems[k] || !c.ok()) continue;
    if (k === lastSpawnedPW) continue; // No same type in a row

    const r = c.rarity === 0 ? 5 : c.rarity;
    if (currentCost + r > budget) continue; // Would exceed budget

    const rarityMul = c.rarity === 0 ? 0.15 : RARITY[c.rarity].spawnMul;
    if (Math.random() < PW_SPAWN_CHANCE * rarityMul) {
      pwItems[k] = spawnPW(k);
      lastSpawnedPW = k;
      fieldCount++;
    }
  }
}

/** Update power-up items: bobbing animation, expiry, collection. */
function updatePWItems() {
  for (const k in pwItems) {
    const item = pwItems[k];
    if (!item) continue;

    item.bobPhase += 0.06;

    // Expire if lifetime exceeded
    if (Date.now() - item.spawnTime > item.lifetime) {
      spawnParticles(item.x, item.y, '#333', 4);
      pwItems[k] = null;
      continue;
    }

    // Fish collects power-up
    if (dist(item, fish) < 26) {
      spawnParticles(item.x, item.y, pwConfig[k].glow, 12);
      pwConfig[k].fn();
      pwItems[k] = null;
      continue;
    }

    // Buddy collects power-up
    if (buddyActive && buddy && dist(item, buddy) < 26) {
      spawnParticles(item.x, item.y, pwConfig[k].glow, 12);
      pwConfig[k].fn();
      pwItems[k] = null;
    }
  }
}

/** Update the frenzy progress bar in the HUD. */
function updateFrenzyBar() {
  if (frenzyActive) {
    const remaining = Math.max(0, 1 - (Date.now() - frenzyTimer) / FRENZY_DURATION);
    frenzyBarEl.style.width = (remaining * 100) + '%';
  }
}


// ═══════════════════════════════════════════════════════════════
// SECTION 10: CORE GAME LOGIC
// Init, level setup, treat spawning, collision, game end.
// ═══════════════════════════════════════════════════════════════

/** Start a new game from level 1. */
function initGame() {
  level = 1;
  score = 0;
  startLevel();
}

/** Set up a level: reset entities, timer, power-ups. */
function startLevel() {
  // Timer scales down with level (minimum 15 seconds)
  maxTime = Math.max(18, 35 - level);  // More forgiving timer
  timeLeft = maxTime;
  timerEl.textContent = timeLeft;
  timerBar.style.width = '100%';
  timerBar.classList.remove('danger', 'frozen');
  scoreEl.textContent = score;
  levelEl.textContent = level;

  // Player fish
  fish = {
    x: W / 2, y: H / 2,
    w: 36, h: 22,
    vx: 0, vy: 0,
    dir: 1, angle: 0, tailPhase: 0,
    speed: 2.5, friction: 0.88
  };

  // Shark (enemy) — gets faster each level (slowed to compensate for slim hitbox)
  const sharkSpeed = 0.75 + level * 0.2;
  shark = {
    x: rand(60, W - 60), y: rand(60, H - 60),
    speed: sharkSpeed, savedSpeed: sharkSpeed, savedSpeed2: sharkSpeed,
    angle: 0, tailPhase: 0,
    chaseTimer: 0,
    hidden: false
  };
  sharkDelay = SHARK_START_DELAY;

  // Don't spawn shark too close to fish
  while (dist(shark, fish) < 150) {
    shark.x = rand(60, W - 60);
    shark.y = rand(60, H - 60);
  }

  // Spawn treats (collectible items)
  treats = [];
  const treatCount = 5 + level * 2;
  for (let i = 0; i < treatCount; i++) spawnTreat();
  treatsLeftEl.textContent = treats.length;

  // Reset particle systems
  particles = [];
  bubbles = [];
  scorePopups = [];
  buddy = null;
  decoyFish = null;

  // Reset all power-up items and states
  for (const k in pwItems) pwItems[k] = null;
  frenzyActive = iceActive = shieldActive = magnetActive = false;
  ghostActive = hourglassActive = buddyActive = bombActive = false;
  crazyActive = timerFrozen = false;
  decoyActive = starActive = hookActive = goopActive = false;
  comboCount = 0;
  comboTimer = 0;
  accelBonus = 0;
  lastMoveDir = { x: 0, y: 0 };
  lastSpawnedPW = null;
  gamePaused = false;
  goopActive = false;
  hookLine = null;
  swapAnim = null;
  chompAnim = null;

  // Clear all power-up timeouts
  frenzyTO = clearTO(frenzyTO);
  iceTO = clearTO(iceTO);
  ghostTO = clearTO(ghostTO);
  hourglassTO = clearTO(hourglassTO);
  buddyTO = clearTO(buddyTO);
  bombTO = clearTO(bombTO);
  crazyTO = clearTO(crazyTO);
  decoyTO = clearTO(decoyTO);
  starTO = clearTO(starTO);
  goopTO = clearTO(goopTO);

  // Reset HUD indicators
  frenzyHud.classList.remove('active');
  frenzyBarEl.style.width = '0%';
  for (const s of Object.values(st)) {
    s.classList.remove('s-on', 's-frenzy', 's-ice', 's-shield', 's-magnet',
      's-ghost', 's-time', 's-buddy', 's-bomb', 's-combo', 's-crazy', 's-decoy', 's-star', 's-poison', 's-hook', 's-swap', 's-double', 's-wave', 's-goop');
    s.style.color = '';
  }
  st.combo.textContent = '⚡x1';
  fish.speed = FISH_BASE_SPEED;

  // Start game
  gameRunning = true;

  // Timer countdown (1 tick per second)
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameRunning || timerFrozen || gamePaused) return;
    timeLeft--;
    timerEl.textContent = Math.max(0, timeLeft);
    timerBar.style.width = (timeLeft / maxTime * 100) + '%';
    if (timeLeft <= 10 && !timerFrozen) timerBar.classList.add('danger');
    else timerBar.classList.remove('danger');
    if (timeLeft <= 0) endGame(false, "Time's up!");
  }, 1000);

  // Start render loop
  if (gameLoop) cancelAnimationFrame(gameLoop);
  loop();
}

/** Spawn a single treat at a random position. */
function spawnTreat() {
  // Treats use distinct, food/nature themed emojis
  // These are visually different from power-up emojis
  const types = ['🪱', '🦐', '🦀', '🐟', '🍤', '🍣', '🍔', '🍕', '🍟', '🍉'];
  const t = {
    x: rand(30, W - 30),
    y: rand(30, H - 30),
    r: 14,
    type: types[Math.floor(rand(0, types.length))],
    bobPhase: rand(0, Math.PI * 2),
    collected: false
  };
  let attempts = 0;
  while ((dist(t, fish) < 60 || overlapsExisting(t.x, t.y, 30)) && attempts < 30) {
    t.x = rand(30, W - 30);
    t.y = rand(30, H - 30);
    attempts++;
  }
  treats.push(t);
}

/** Spawn visual particles at a position. */
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < (count || 6); i++) {
    particles.push({
      x, y,
      vx: rand(-2, 2), vy: rand(-2, 2),
      life: 1, decay: rand(0.02, 0.05),
      r: rand(2, 5), color
    });
  }
}

/** Collect a treat: score it, combo it, particles. */
function collectTreat(t) {
  t.collected = true;
  const now = Date.now();

  // Combo system: quick successive collections multiply points
  if (now - comboTimer < COMBO_WINDOW) comboCount++;
  else comboCount = 1;
  comboTimer = now;
  const cm = Math.min(comboCount, 5);

  // Update combo HUD
  st.combo.textContent = '⚡x' + cm;
  if (cm >= 3) st.combo.classList.add('s-on', 's-combo');
  else st.combo.classList.remove('s-on', 's-combo');

  // Calculate points
  const basePts = frenzyActive ? 20 : 10;
  const pts = basePts * cm;
  score += pts;
  scoreEl.textContent = score;

  // Visual feedback
  spawnParticles(t.x, t.y, frenzyActive ? '#ff8800' : '#ffdd44', 8);
  scorePopups.push({ x: t.x, y: t.y - 14, pts, life: 1, decay: 0.025 });
}

/** End the game (win or lose). */
function endGame(won, msg) {
  gameRunning = false;
  clearInterval(timerInterval);
  cancelAnimationFrame(gameLoop);

  // Clear all power-up timeouts
  [frenzyTO, iceTO, ghostTO, hourglassTO, buddyTO, bombTO, crazyTO, decoyTO, starTO].forEach(clearTO);
  frenzyActive = iceActive = ghostActive = hourglassActive = false;
  buddyActive = bombActive = crazyActive = timerFrozen = false;
  decoyActive = starActive = hookActive = goopActive = false;
  decoyFish = null;
  frenzyHud.classList.remove('active');

  // Reset all status indicators
  for (const s of Object.values(st)) {
    s.classList.remove('s-on', 's-frenzy', 's-ice', 's-shield', 's-magnet',
      's-ghost', 's-time', 's-buddy', 's-bomb', 's-combo', 's-crazy', 's-decoy', 's-star', 's-poison', 's-hook', 's-swap', 's-double', 's-wave', 's-goop');
    s.style.color = '';
  }

  if (!won) {
    // Chomp effect + CRT wipe on game over
    chompAnim = { timer: 0, x: fish.x, y: fish.y };
    playCRTWipe(() => showNameEntry(score, level, msg));
  } else {
    // Level complete — show win screen
    winOverlay.classList.remove('hidden');
    winOverlay.innerHTML = `
      <div class="result win">LEVEL COMPLETE</div>
      <p class="score-text">SCORE: ${score} &middot; LVL: ${level}</p>
      <button id="next-level-btn" class="btn-primary">NEXT LEVEL</button>
      <p class="controls-hint">ARROW KEYS / WASD TO SWIM</p>`;

    document.getElementById('next-level-btn').addEventListener('click', () => {
      winOverlay.classList.add('hidden');
      level++;
      startLevel();
    });
  }
}


// ═══════════════════════════════════════════════════════════════
// SECTION 11: INPUT HANDLING
// Keyboard input for gameplay and name entry.
// ═══════════════════════════════════════════════════════════════

document.addEventListener('keydown', e => {
  if (nameEntryActive || !e.key) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  // ESC toggles pause
  if (e.key === 'Escape' && gameRunning) {
    if (gamePaused && !swapAnim) {
      // Resume
      gamePaused = false;
      if (!hourglassActive) timerFrozen = false;
      keys = {};
      const po = document.getElementById('pause-overlay');
      if (po) po.classList.add('hidden');
    } else if (!gamePaused) {
      // Pause
      gamePaused = true;
      timerFrozen = true;
      const po = document.getElementById('pause-overlay');
      if (po) po.classList.remove('hidden');
    }
    e.preventDefault();
    return;
  }

  keys[e.key.toLowerCase()] = true;
  e.preventDefault();
});

document.addEventListener('keyup', e => {
  if (!e.key) return;
  keys[e.key.toLowerCase()] = false;
});


// ═══════════════════════════════════════════════════════════════
// SECTION 12: UPDATE FUNCTIONS
// Per-frame logic for fish, shark, buddy, treats, particles.
// ═══════════════════════════════════════════════════════════════

function updateFish() {
  if (gamePaused) return;

  // Progressive acceleration: speed up when moving in the same direction
  let moveX = 0, moveY = 0;
  if (keys['arrowleft'] || keys['a'])  moveX -= 1;
  if (keys['arrowright'] || keys['d']) moveX += 1;
  if (keys['arrowup'] || keys['w'])    moveY -= 1;
  if (keys['arrowdown'] || keys['s'])  moveY += 1;

  if (moveX !== 0 || moveY !== 0) {
    if (moveX === lastMoveDir.x && moveY === lastMoveDir.y) {
      accelBonus = Math.min(accelBonus + FISH_ACCEL_RATE, FISH_MAX_SPEED_BONUS);
    } else {
      accelBonus *= 0.5;
    }
    lastMoveDir = { x: moveX, y: moveY };
  } else {
    accelBonus *= 0.95;
    lastMoveDir = { x: 0, y: 0 };
  }

  const s = fish.speed + accelBonus;

  if (moveX < 0) { fish.vx -= s * 0.3; fish.dir = -1; }
  if (moveX > 0) { fish.vx += s * 0.3; fish.dir = 1; }
  if (moveY < 0) fish.vy -= s * 0.3;
  if (moveY > 0) fish.vy += s * 0.3;

  fish.vx *= fish.friction;
  fish.vy *= fish.friction;
  fish.x += fish.vx;
  fish.y += fish.vy;
  fish.x = Math.max(fish.w / 2, Math.min(W - fish.w / 2, fish.x));
  fish.y = Math.max(fish.h / 2, Math.min(H - fish.h / 2, fish.y));

  // Fish rotation — face movement direction, clamp to avoid upside-down
  const spd = Math.hypot(fish.vx, fish.vy);
  if (spd > 0.5) {
    let targetAngle = Math.atan2(fish.vy, fish.vx * fish.dir);
    targetAngle = Math.max(-1.4, Math.min(1.4, targetAngle)); // ~±80°
    fish.angle = fish.angle + (targetAngle - fish.angle) * 0.12;
  } else {
    fish.angle = fish.angle + (0 - fish.angle) * 0.1;
  }

  // Flip direction at near-180° before going upside-down
  if (fish.vx > 0.3) fish.dir = 1;
  else if (fish.vx < -0.3) fish.dir = -1;

  fish.tailPhase += 0.15;

  if (Math.random() < 0.12) {
    bubbles.push({
      x: fish.x - fish.dir * 16, y: fish.y + rand(-4, 4),
      r: rand(1.5, 3), vy: rand(-0.5, -1.5), life: 1, decay: rand(0.015, 0.03)
    });
  }
}

function updateShark() {
  if (shark.hidden || hourglassActive || gamePaused) return;

  // Start-of-level delay: shark waits before chasing
  if (sharkDelay > 0) { sharkDelay--; shark.tailPhase += 0.06; return; }

  // Chase the decoy if active, otherwise chase the fish
  const target = (decoyActive && decoyFish) ? decoyFish : fish;

  shark.chaseTimer += 0.02;
  const a = Math.atan2(target.y - shark.y, target.x - shark.x);
  const wobble = Math.sin(shark.chaseTimer * 3) * 0.4;
  const dx = Math.cos(a + wobble) * shark.speed;
  const dy = Math.sin(a + wobble) * shark.speed;
  shark.x += dx;
  shark.y += dy;

  // Smoothly rotate towards the target (lerp to avoid snapping)
  let targetAngle = a;
  let diff = targetAngle - shark.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  shark.angle += diff * 0.15;

  // Animate tail
  shark.tailPhase += 0.12;

  // Clamp to canvas
  shark.x = Math.max(20, Math.min(W - 20, shark.x));
  shark.y = Math.max(20, Math.min(H - 20, shark.y));

  // Shark can eat the decoy
  if (decoyActive && decoyFish && dist(shark, decoyFish) < 25) {
    spawnParticles(decoyFish.x, decoyFish.y, '#ffaa44', 12);
    scorePopups.push({ x: decoyFish.x, y: decoyFish.y - 14, pts: 'CHOMP!', life: 0.8, decay: 0.03 });
    deactivateDecoy();
  }

  // Collision with fish (body only, not tail)
  if (dist(shark, fish) < 30) {
    if (starActive) {
      // Star: bounce shark away
      const ba = Math.atan2(shark.y - fish.y, shark.x - fish.x);
      shark.x += Math.cos(ba) * 80;
      shark.y += Math.sin(ba) * 80;
      shark.x = Math.max(20, Math.min(W - 20, shark.x));
      shark.y = Math.max(20, Math.min(H - 20, shark.y));
      spawnParticles(fish.x, fish.y, '#ffee44', 12);
      scorePopups.push({ x: fish.x, y: fish.y - 20, pts: 'BOUNCE!', life: 0.8, decay: 0.03 });
    } else if (shieldActive) {
      useShield();
    } else {
      endGame(false, 'The shark got you!');
    }
  }
}

function updateBuddy() {
  if (!buddyActive || !buddy || gamePaused) return;

  // Mirror movement: buddy mirrors fish position across canvas centre
  const targetX = W - fish.x;
  const targetY = H - fish.y;
  buddy.x += (targetX - buddy.x) * 0.1;
  buddy.y += (targetY - buddy.y) * 0.1;
  buddy.x = Math.max(20, Math.min(W - 20, buddy.x));
  buddy.y = Math.max(20, Math.min(H - 20, buddy.y));
  buddy.dir = buddy.x > W / 2 ? -1 : 1;
  buddy.tailPhase += 0.2;

  // Buddy collects treats it touches (shark cannot catch buddy)
  for (const t of treats) {
    if (!t.collected && dist(t, buddy) < 24) collectTreat(t);
  }
}

function updateTreats() {
  if (gamePaused) return;
  // Magnet: pull treats towards fish
  if (magnetActive) {
    for (const t of treats) {
      if (t.collected) continue;
      const dx = fish.x - t.x, dy = fish.y - t.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) {
        t.x += dx / d * 18;
        t.y += dy / d * 18;
      }
    }
  }

  // Fish collects treats it touches
  for (const t of treats) {
    if (!t.collected && dist(t, fish) < 24) collectTreat(t);
  }

  // Remove collected treats
  treats = treats.filter(t => !t.collected);
  treatsLeftEl.textContent = treats.length;

  // All treats collected = level complete
  if (treats.length === 0) endGame(true, '');

  // Reset combo if window expired
  const now = Date.now();
  if (now - comboTimer > COMBO_WINDOW && comboCount > 0) {
    comboCount = 0;
    st.combo.textContent = '⚡x1';
    st.combo.classList.remove('s-on', 's-combo');
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    p.vy -= 0.01; // Slight upward drift
  }
  particles = particles.filter(p => p.life > 0);

  for (const b of bubbles) {
    b.y += b.vy;
    b.life -= b.decay;
  }
  bubbles = bubbles.filter(b => b.life > 0);

  for (const p of scorePopups) {
    p.y -= 0.8;
    p.life -= p.decay;
  }
  scorePopups = scorePopups.filter(p => p.life > 0);
}


// ═══════════════════════════════════════════════════════════════
// SECTION 13: DRAWING FUNCTIONS
// All canvas rendering — water, fish, shark, treats, effects.
// ═══════════════════════════════════════════════════════════════

// ─── WATER BACKGROUND ───
function drawWater() {
  // Gradient from dark blue to near-black
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(1, '#040810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle moving light patches
  const t = Date.now() * 0.001;
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 6; i++) {
    const x = (Math.sin(t + i * 1.5) * 0.5 + 0.5) * W;
    const y = (Math.cos(t * 0.6 + i * 1.1) * 0.5 + 0.5) * H;
    ctx.fillStyle = '#3366aa';
    ctx.fillRect(x - 40, y - 40, 80, 80);
  }
  ctx.globalAlpha = 1;

  // Sea floor
  ctx.fillStyle = '#060d18';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) {
    const h = 10 + Math.sin(x * 0.05 + t * 0.3) * 4;
    ctx.lineTo(x, H - h);
    ctx.lineTo(x + 16, H - h);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // Seaweed
  ctx.fillStyle = '#0d3322';
  for (let i = 0; i < 7; i++) {
    const bx = 50 + i * 110;
    const sw = Math.sin(t * 1.2 + i) * 6;
    for (let j = 0; j < 4; j++) {
      ctx.fillRect(bx + sw * (j / 4) - 2, H - 14 - j * 14, 4, 12);
    }
  }
}

// ─── PIXEL FISH (reusable for player and buddy) ───
function drawPixelFish(x, y, dir, angle, phase, c1, c2, c3) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.rotate(angle || 0);

  // Body
  ctx.fillStyle = c1;
  ctx.fillRect(-14, -8, 28, 16);
  ctx.fillRect(-10, -10, 20, 2);
  ctx.fillRect(-10, 8, 20, 2);

  // Belly stripe
  ctx.fillStyle = c2;
  ctx.fillRect(-10, 2, 18, 4);

  // Dorsal
  ctx.fillStyle = c3;
  ctx.fillRect(-10, -10, 20, 3);

  // Tail (animated)
  const tw = Math.round(Math.sin(phase) * 4);
  ctx.fillStyle = c1;
  ctx.fillRect(-22, -6 + tw, 8, 4);
  ctx.fillRect(-22, 2 + tw, 8, 4);
  ctx.fillRect(-26, -8 + tw, 4, 4);
  ctx.fillRect(-26, 4 + tw, 4, 4);

  // Eye
  ctx.fillStyle = '#fff';
  ctx.fillRect(6, -6, 8, 8);
  ctx.fillStyle = '#111';
  ctx.fillRect(10, -4, 4, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(10, -4, 2, 2);

  // Top fin
  ctx.fillStyle = c3;
  ctx.fillRect(-2, -14, 8, 4);
  ctx.fillRect(0, -12, 4, 2);

  ctx.restore();
}

function drawFish() {
  const c1 = frenzyActive ? '#ffaa22' : '#ff8833';
  const c2 = frenzyActive ? '#ffcc44' : '#ffaa55';
  const c3 = frenzyActive ? '#ee7700' : '#cc5500';
  drawPixelFish(fish.x, fish.y, fish.dir, fish.angle, fish.tailPhase, c1, c2, c3);

  // Shield: elliptical glow fitting the fish shape
  if (shieldActive) {
    const p = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    ctx.save(); ctx.translate(fish.x, fish.y);
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(68,238,136,${p})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  // Star: circular aura + orbiting sparkles
  if (starActive) {
    const p = 0.25 + Math.sin(Date.now() * 0.008) * 0.15;
    ctx.save(); ctx.translate(fish.x, fish.y);
    ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,238,68,${p})`; ctx.fill();
    ctx.fillStyle = '#ffee44';
    for (let i = 0; i < 6; i++) {
      const a = Date.now() * 0.004 + (i / 6) * Math.PI * 2;
      ctx.fillRect(Math.cos(a) * 26 - 1, Math.sin(a) * 26 - 1, 3, 3);
    }
    ctx.restore();
  }

  // Goop tint on fish
  if (goopActive) {
    ctx.save(); ctx.translate(fish.x, fish.y);
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(102,204,68,0.2)'; ctx.fill();
    ctx.restore();
  }
}

function drawBuddy() {
  if (!buddyActive || !buddy) return;
  const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.2;
  ctx.globalAlpha = pulse;
  drawPixelFish(buddy.x, buddy.y, buddy.dir, 0, buddy.tailPhase, '#22bbaa', '#44ddcc', '#119988');
  ctx.globalAlpha = 1;

  // Sparkle trail
  ctx.fillStyle = '#44ddaa';
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(buddy.x + rand(-16, 16), buddy.y + rand(-10, 10), 2, 2);
  }
}

function drawDecoy() {
  if (!decoyActive || !decoyFish) return;
  // Animate tail
  decoyFish.tailPhase += 0.06;
  // Draw as translucent orange fish (flickering to look holographic)
  const flicker = 0.4 + Math.sin(Date.now() * 0.012) * 0.2;
  ctx.globalAlpha = flicker;
  drawPixelFish(decoyFish.x, decoyFish.y, decoyFish.dir, 0, decoyFish.tailPhase, '#ffaa44', '#ffcc66', '#dd8822');
  ctx.globalAlpha = 1;
  // Hologram sparkles
  ctx.fillStyle = '#ffcc44';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(decoyFish.x + rand(-18, 18), decoyFish.y + rand(-12, 12), 2, 2);
  }
}

// ─── SHARK ───
// Rotates to face the target using ctx.rotate(shark.angle).
// The angle is smoothly interpolated in updateShark.
function drawShark() {
  if (shark.hidden) return;

  ctx.save();
  ctx.translate(shark.x, shark.y);
  ctx.rotate(shark.angle); // Rotate to face the fish

  const frozen = iceActive || hourglassActive;
  if (frozen) ctx.globalAlpha = 0.6;

  const bodyCol  = frozen ? '#556688' : '#667788';
  const darkCol  = frozen ? '#445566' : '#555566';
  const finCol   = frozen ? '#4a5a6a' : '#556677';
  const bellyCol = frozen ? '#8899aa' : '#99aabb';

  // ── Tail fin (trails behind — NO hitbox) ──
  const tw = Math.round(Math.sin(shark.tailPhase) * 4);
  ctx.fillStyle = finCol;
  // Upper fork
  ctx.fillRect(-30, -6 + tw, 8, 3);
  ctx.fillRect(-34, -8 + tw, 5, 3);
  // Lower fork
  ctx.fillRect(-30, 3 + tw, 8, 3);
  ctx.fillRect(-34, 5 + tw, 5, 3);
  // Stem
  ctx.fillStyle = darkCol;
  ctx.fillRect(-24, -3 + tw, 6, 6);

  // ── Main body (slim torpedo) ──
  ctx.fillStyle = bodyCol;
  ctx.fillRect(-18, -5, 36, 10);
  ctx.fillRect(-14, -6, 28, 2);    // Top edge
  ctx.fillRect(-14, 5, 28, 2);     // Bottom edge

  // Belly (lighter underside)
  ctx.fillStyle = bellyCol;
  ctx.fillRect(-14, 2, 28, 4);

  // ── Snout (pointed, extends towards fish) ──
  ctx.fillStyle = bodyCol;
  ctx.fillRect(16, -4, 6, 8);
  ctx.fillRect(20, -3, 5, 6);
  ctx.fillRect(24, -2, 4, 4);
  ctx.fillRect(27, -1, 3, 2);

  // ── Dorsal fin (on top) ──
  ctx.fillStyle = finCol;
  ctx.fillRect(-2, -12, 3, 7);
  ctx.fillRect(-1, -16, 3, 5);
  ctx.fillRect(0, -19, 2, 4);

  // ── Pectoral fin (underneath) ──
  ctx.fillStyle = finCol;
  ctx.fillRect(2, 6, 8, 3);
  ctx.fillRect(4, 9, 5, 2);

  // ── Eye ──
  ctx.fillStyle = frozen ? '#aabbcc' : '#ffee44';
  ctx.fillRect(12, -4, 5, 5);
  ctx.fillStyle = '#111';
  ctx.fillRect(14, -4, 2, 5);    // Slit pupil
  ctx.fillStyle = '#fff';
  ctx.fillRect(13, -3, 1, 1);    // Glint

  // ── Gill slits ──
  ctx.fillStyle = darkCol;
  ctx.fillRect(5, -3, 1, 6);
  ctx.fillRect(7, -3, 1, 6);
  ctx.fillRect(9, -3, 1, 6);

  // ── Teeth ──
  ctx.fillStyle = '#ddeeff';
  ctx.fillRect(18, 3, 2, 2);
  ctx.fillRect(21, 3, 2, 2);
  ctx.fillRect(24, 2, 2, 2);
  ctx.fillRect(18, -5, 2, 2);
  ctx.fillRect(21, -5, 2, 2);
  ctx.fillRect(24, -4, 2, 2);

  // ── Effects ──
  if (frozen) {
    ctx.fillStyle = '#88ddff';
    for (let i = 0; i < 4; i++) {
      const a = Date.now() * 0.002 + (i / 4) * Math.PI * 2;
      ctx.fillRect(Math.cos(a) * 22 - 1, Math.sin(a) * 22 - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.beginPath(); ctx.ellipse(4, 0, 28, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,40,40,${0.06 + Math.sin(Date.now() * 0.005) * 0.03})`;
    ctx.fill();
  }

  ctx.restore();
}

// ─── TREATS ───
// Treats are drawn simply — just the emoji bobbing up and down.
// No glow, no orbiting particles. This makes them visually
// distinct from power-ups which have glows and particle rings.
function drawTreats() {
  for (const t of treats) {
    const bob = Math.round(Math.sin(t.bobPhase) * 2);
    t.bobPhase += 0.03; // Gentle bob
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.type, t.x, t.y + bob);
  }
}

// ─── POWER-UP ITEMS ───
// Power-ups are drawn with glow backgrounds and orbiting dots
// to make them visually distinct from regular treats.
function drawPWItems() {
  for (const k in pwItems) {
    const item = pwItems[k];
    if (!item) continue;

    const c = pwConfig[k];
    const rem = 1 - (Date.now() - item.spawnTime) / item.lifetime;
    const bob = Math.round(Math.sin(item.bobPhase) * 3);

    // Blink when about to expire
    if (rem < 0.3 && Math.sin(Date.now() * 0.025) > 0) continue;

    ctx.save();
    ctx.translate(item.x, item.y + bob);

    // Poison/Goop gets a pulsing warning glow (circular)
    if (k === 'poison' || k === 'goop') {
      const pulse = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = k === 'poison' ? `rgba(255,0,0,${pulse})` : `rgba(100,200,50,${pulse})`;
      ctx.fill();
    }

    // Circular inner glow
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = c.glow + '26'; ctx.fill();

    // Circular outer glow
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = c.glow + '10'; ctx.fill();

    // Orbiting particle dots (only on power-ups)
    const t = Date.now() * 0.003;
    for (let i = 0; i < 6; i++) {
      const a = t + (i / 6) * Math.PI * 2;
      ctx.fillStyle = c.glow;
      ctx.fillRect(Math.cos(a) * 14 - 1, Math.sin(a) * 14 - 1, 3, 3);
    }

    // Emoji
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.emoji, 0, 0);

    ctx.restore();
  }
}

// ─── PARTICLES & EFFECTS ───
function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    const s = Math.ceil(p.r * p.life);
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  for (const b of bubbles) {
    ctx.globalAlpha = b.life * 0.3;
    ctx.strokeStyle = '#6699bb';
    ctx.lineWidth = 1;
    const s = Math.ceil(b.r * 2);
    ctx.strokeRect(b.x - s / 2, b.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

function drawScorePopups() {
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of scorePopups) {
    ctx.globalAlpha = p.life;
    if (typeof p.pts === 'string') {
      ctx.fillStyle = '#44ee88';
      ctx.fillText(p.pts, p.x, p.y);
    } else {
      ctx.fillStyle = p.pts >= 20 ? '#ff8800' : '#ffdd44';
      ctx.fillText('+' + p.pts, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}

// ─── SCREEN OVERLAYS (visual effects) ───
function drawWarning() {
  const d = dist(shark, fish);
  if (d < 120 && !shieldActive && !shark.hidden && !starActive) {
    ctx.globalAlpha = (1 - d / 120) * 0.12;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function drawFrenzyOverlay() {
  if (!frenzyActive) return;
  const t = Date.now() * 0.002, th = 5, seg = 12;
  ctx.globalAlpha = 0.75;
  for (let x = 0; x < W; x += seg) {
    const hue = (t * 120 + x * 1.5) % 360;
    ctx.fillStyle = `hsl(${hue},100%,55%)`;
    ctx.fillRect(x, 0, seg + 1, th);
    ctx.fillStyle = `hsl(${(hue + 180) % 360},100%,55%)`;
    ctx.fillRect(x, H - th, seg + 1, th);
  }
  for (let y = 0; y < H; y += seg) {
    const hue = (t * 120 + y * 1.5) % 360;
    ctx.fillStyle = `hsl(${hue},100%,55%)`;
    ctx.fillRect(0, y, th, seg + 1);
    ctx.fillStyle = `hsl(${(hue + 180) % 360},100%,55%)`;
    ctx.fillRect(W - th, y, th, seg + 1);
  }
  ctx.globalAlpha = 1;
}

function drawIceOverlay() {
  if (!iceActive) return;
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#88ddff';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function drawHourglassOverlay() {
  if (!hourglassActive) return;
  ctx.globalAlpha = 0.03 + Math.sin(Date.now() * 0.003) * 0.02;
  ctx.fillStyle = '#ffdd44';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function drawCrazyOverlay() {
  if (!crazyActive) return;
  ctx.globalAlpha = 0.12 + Math.sin(Date.now() * 0.02) * 0.05;
  ctx.fillStyle = `hsl(${(Date.now() * 0.5) % 360}, 100%, 50%)`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function drawFishGlow() {
  if (!frenzyActive) return;
  ctx.save(); ctx.translate(fish.x, fish.y);
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,150,0,0.1)'; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,200,50,0.05)'; ctx.fill();
  ctx.restore();
}

function drawMagnetLines() {
  if (!magnetActive) return;
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#dd44ff';
  ctx.lineWidth = 1;
  for (const t of treats) {
    if (t.collected) continue;
    ctx.beginPath();
    ctx.moveTo(fish.x, fish.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawScanlines() {
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // Vignette effect (dark edges for 3D depth)
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}



// ─── CLOSEST TREAT ARROW ───
function drawClosestTreatArrow() {
  if (treats.length === 0) return;
  let nearest = null, nearestD = Infinity;
  for (const t of treats) { if (!t.collected) { const d = dist(t, fish); if (d < nearestD) { nearestD = d; nearest = t; } } }
  if (!nearest || nearestD < 50) return;
  const a = Math.atan2(nearest.y - fish.y, nearest.x - fish.x);
  const ax = fish.x + Math.cos(a) * 32;
  const ay = fish.y + Math.sin(a) * 32;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
  ctx.fillStyle = `rgba(255,210,80,${0.25 + Math.sin(Date.now() * 0.005) * 0.1})`;
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ─── HOOK LINE + FLICKER ANIMATION ───
function drawHookLine() {
  if (!hookLine) return;
  const p = Math.min(1, hookLine.progress);
  const cx = hookLine.fx + (hookLine.tx - hookLine.fx) * p;
  const cy = hookLine.fy + (hookLine.ty - hookLine.fy) * p;

  // Draw line
  ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ccaa44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hookLine.fx, hookLine.fy); ctx.lineTo(cx, cy); ctx.stroke();
  // Hook tip
  ctx.fillStyle = '#ccaa44'; ctx.fillRect(cx - 2, cy - 2, 5, 5);
  ctx.globalAlpha = 1;

  // Dim overlay during hook
  ctx.fillStyle = 'rgba(180,150,50,0.05)'; ctx.fillRect(0, 0, W, H);

  // Glow at target
  ctx.beginPath(); ctx.arc(hookLine.tx, hookLine.ty, 16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(204,170,68,0.2)'; ctx.fill();

  // Fish flicker during flicker phase
  if (hookLine.phase === 'flicker' && Math.floor(hookLine.flickerTimer / 5) % 2 === 0) {
    ctx.beginPath(); ctx.arc(fish.x, fish.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(204,170,68,0.4)'; ctx.fill();
  }
}

// ─── SWAP VISUAL EFFECT ───
function drawSwapEffect() {
  if (!swapAnim) return;
  if (swapAnim.phase === 'pause') {
    ctx.fillStyle = 'rgba(100,50,200,0.08)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(170,68,255,0.3)';
    ctx.beginPath(); ctx.arc(swapAnim.oldFishX, swapAnim.oldFishY, 22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(swapAnim.oldSharkX, swapAnim.oldSharkY, 22, 0, Math.PI * 2); ctx.fill();
  }
  if (swapAnim.phase === 'flicker') {
    if (Math.floor(swapAnim.timer / 6) % 2 === 0) {
      ctx.fillStyle = 'rgba(170,68,255,0.4)';
      ctx.beginPath(); ctx.arc(fish.x, fish.y, 18, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ─── CHOMP TEXT ───
function drawChomp() {
  if (!chompAnim) return;
  chompAnim.timer++;
  if (chompAnim.timer > 40) { chompAnim = null; return; }
  const alpha = 1 - chompAnim.timer / 40;
  const scale = 1 + chompAnim.timer * 0.02;
  ctx.save();
  ctx.translate(chompAnim.x, chompAnim.y - chompAnim.timer * 0.5);
  ctx.scale(scale, scale); ctx.globalAlpha = alpha;
  ctx.font = '16px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff4444'; ctx.fillText('CHOMP!', 0, 0);
  ctx.globalAlpha = 1; ctx.restore();
}

// ─── TIMED POWER-UP BARS + EDGE OUTLINES ───
function drawPowerupTimerBars() {
  const bars = [];
  if (iceActive) {
    const rem = Math.max(0, 1 - (Date.now() - iceStartTime) / ICE_DURATION);
    bars.push({ colour: '#88ddff', label: '❄️', rem });
  }
  if (hourglassActive) {
    const rem = Math.max(0, 1 - (Date.now() - hourglassStartTime) / HOURGLASS_DURATION);
    bars.push({ colour: '#ffdd44', label: '⏳', rem });
  }
  if (goopActive) {
    const goopRem = Math.max(0, 1 - (Date.now() - goopStartTime) / GOOP_DURATION);
    bars.push({ colour: '#66cc44', label: '🧪', rem: goopRem });
  }
  if (frenzyActive) {
    const rem = Math.max(0, 1 - (Date.now() - frenzyTimer) / FRENZY_DURATION);
    bars.push({ colour: '#ff8800', label: '🔥', rem });
  }
  if (bars.length === 0) return;

  bars.forEach((b, i) => {
    // Edge outline in the power-up's colour
    ctx.globalAlpha = 0.3 + b.rem * 0.3;
    ctx.strokeStyle = b.colour;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Timer bar at bottom of screen
    const by = H - 10 - i * 14;
    ctx.globalAlpha = 0.7;
    // Background track
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(60, by - 4, W - 120, 8);
    // Fill bar
    ctx.fillStyle = b.colour;
    ctx.fillRect(60, by - 4, (W - 120) * b.rem, 8);
    // Label
    ctx.font = '12px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, 42, by);
    ctx.globalAlpha = 1;
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 14: MAIN GAME LOOP
// ═══════════════════════════════════════════════════════════════

function loop() {
  if (!gameRunning) return;

  // Update (skip most when paused, except swap animation)
  updateSwapAnim();
  updateHookAnim();
  if (!gamePaused || swapAnim) {
    updateFish();
    updateShark();
    updateBuddy();
    updateTreats();
    updateFrenzyBar();
    updateParticles();
    trySpawnPowerups();
    updatePWItems();
  }

  // Draw (order matters for layering)
  drawWater();
  drawMagnetLines();
  drawHookLine();
  drawTreats();
  drawPWItems();
  drawParticles();
  drawBuddy();
  drawDecoy();
  drawFish();
  drawFishGlow();
  drawClosestTreatArrow();
  drawShark();
  drawChomp();
  drawSwapEffect();
  drawWarning();
  drawFrenzyOverlay();
  drawIceOverlay();
  drawHourglassOverlay();
  drawCrazyOverlay();
  drawPowerupTimerBars();
  drawScorePopups();
  drawScanlines();

  gameLoop = requestAnimationFrame(loop);
}



// Pause on tab-out
document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameRunning && !gamePaused) {
    gamePaused = true;
    timerFrozen = true;
    const po = document.getElementById('pause-overlay');
    if (po) po.classList.remove('hidden');
  }
});

// Continue button
document.getElementById('pause-continue-btn')?.addEventListener('click', () => {
  if (!gameRunning) return;
  gamePaused = false;
  if (!hourglassActive) timerFrozen = false;
  keys = {};
  const po = document.getElementById('pause-overlay');
  if (po) po.classList.add('hidden');
});

// ═══════════════════════════════════════════════════════════════
// SECTION 15: UI EVENT HANDLERS
// Button clicks for menus, scoreboard, admin login.
// ═══════════════════════════════════════════════════════════════

// Start game
startBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
  playCRTWipe(() => {
    initGame();
  });
});

// Rules page
rulesBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
  rulesOverlay.classList.remove('hidden');
});

rulesBackBtn.addEventListener('click', () => {
  rulesOverlay.classList.add('hidden');
  overlay.classList.remove('hidden');
});

// Scoreboard (from main menu)
scoreboardBtn.addEventListener('click', async () => {
  overlay.classList.add('hidden');
  await showScoreboard();
});

closeScoreboardBtn.addEventListener('click', () => {
  scoreboardOverlay.classList.add('hidden');
  overlay.classList.remove('hidden');
});

// Wipe scoreboard button removed — now accessed from admin panel

// Admin panel button (on scoreboard page)
document.getElementById('admin-panel-btn')?.addEventListener('click', () => {
  scoreboardOverlay.classList.add('hidden');
  adminOverlay.classList.remove('hidden');
  hideAdminError();
  adminEmailInput.value = '';
  adminPasswordInput.value = '';
  adminEmailInput.focus();
});

// Admin login — opens admin panel on success
let adminCredentials = null; // Store temporarily for panel actions

adminLoginBtn.addEventListener('click', async () => {
  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value;

  if (!email || !password) {
    showAdminError('ENTER EMAIL AND PASSWORD');
    return;
  }

  adminLoginBtn.disabled = true;
  hideAdminError();

  try {
    // Verify credentials by attempting sign-in via admin wipe (which calls signInWithEmailAndPassword)
    // We use a lightweight check: try to read maintenance after a test sign-in
    const { verifyAdminCredentials } = await import('./firebase-config.js');
    await verifyAdminCredentials(email, password);
    adminCredentials = { email, password };
    const maint = await fetchMaintenance();
    adminOverlay.classList.add('hidden');
    openAdminPanel(maint);
  } catch (err) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      showAdminError('INVALID CREDENTIALS');
    } else if (err.code === 'auth/too-many-requests') {
      showAdminError('TOO MANY ATTEMPTS. TRY LATER.');
    } else {
      showAdminError('ERROR: ' + (err.message || 'UNKNOWN'));
    }
  } finally {
    adminLoginBtn.disabled = false;
  }
});

// ─── ADMIN PANEL LOGIC ───
const DEFAULT_PW_CONFIG = {
  frenzy: { rarity: r.frenzy ?? 1, label: '🔥 Frenzy' },
  ice: { rarity: r.ice ?? 2, label: '❄️ Ice' },
  shield: { rarity: r.shield ?? 2, label: '🛡️ Shield' },
  poison: { rarity: r.poison ?? 2, label: '☠️ Poison' },
  goop: { rarity: r.goop ?? 3, label: '🧪 Goop' },
  hourglass: { rarity: r.hourglass ?? 3, label: '⏳ Time Stop' },
  buddy: { rarity: r.buddy ?? 3, label: '🐠 Buddy' },
  hook: { rarity: r.hook ?? 3, label: '🪝 Hook' },
  ghost: { rarity: r.ghost ?? 4, label: '👻 Ghost' },
  bomb: { rarity: r.bomb ?? 4, label: '💣 Bomb' },
  decoy: { rarity: r.decoy ?? 4, label: '👁️ Decoy' },
  swap: { rarity: r.swap ?? 4, label: '🔄 Swap' },
  star: { rarity: r.star ?? 5, label: '🌟 Star' },
  double: { rarity: r.double ?? 5, label: '💎 Double' },
  magnet: { rarity: r.magnet ?? 5, label: '🧲 Magnet' },
  wave: { rarity: r.wave ?? 5, label: '🌊 Wave' },
};
const RARITY_NAMES = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Mythical' };
const RARITY_TAG_COLOURS = { 1: '#44ee88', 2: '#aaaacc', 3: '#4488ff', 4: '#ffdd44', 5: '#ff44ff' };

function openAdminPanel(currentMaint) {
  const panel = document.getElementById('admin-panel-overlay');
  if (!panel) return;
  panel.classList.remove('hidden');

  // Maintenance status
  const statusEl = document.getElementById('maint-status');
  if (currentMaint) {
    statusEl.textContent = 'ON — SITE IS DOWN';
    statusEl.className = 'admin-status on';
  } else {
    statusEl.textContent = 'OFF — SITE IS LIVE';
    statusEl.className = 'admin-status off';
  }

  // Build variable editor grid
  buildVarEditor();

  // Clear messages
  const msgEl = document.getElementById('admin-panel-msg');
  msgEl.classList.add('hidden');
}

function buildVarEditor() {
  const grid = document.getElementById('admin-var-editor');
  if (!grid) return;

  let html = '<div class="admin-var-label" style="color:#44ddff;">ITEM</div><div class="admin-var-label" style="color:#44ddff;">RARITY</div><div class="admin-var-label" style="color:#44ddff;">TIER</div>';

  for (const [key, cfg] of Object.entries(DEFAULT_PW_CONFIG)) {
    const currentRarity = pwConfig[key]?.rarity ?? cfg.rarity;
    const tierName = RARITY_NAMES[currentRarity] || '?';
    const tierColour = RARITY_TAG_COLOURS[currentRarity] || '#888';

    html += `<div class="admin-var-label">${cfg.label}</div>`;
    html += `<input type="number" class="admin-var-input" data-pw="${key}" min="1" max="5" value="${currentRarity}">`;
    html += `<div class="admin-var-tag" data-pw-tag="${key}" style="color:${tierColour};">${tierName}</div>`;
  }

  grid.innerHTML = html;

  // Update tier label on input change
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

// Maintenance toggle
document.getElementById('maint-toggle-btn')?.addEventListener('click', async () => {
  if (!adminCredentials) { showPanelMsg('NOT LOGGED IN', true); return; }
  const statusEl = document.getElementById('maint-status');
  const isCurrentlyOn = statusEl.classList.contains('on');
  statusEl.textContent = 'UPDATING...';

  try {
    await setMaintenance(!isCurrentlyOn, adminCredentials.email, adminCredentials.password);
    if (!isCurrentlyOn) {
      statusEl.textContent = 'ON — SITE IS DOWN';
      statusEl.className = 'admin-status on';
    } else {
      statusEl.textContent = 'OFF — SITE IS LIVE';
      statusEl.className = 'admin-status off';
    }
    showPanelMsg('MAINTENANCE ' + (!isCurrentlyOn ? 'ENABLED' : 'DISABLED'), false);
  } catch (err) {
    statusEl.textContent = 'ERROR';
    showPanelMsg('FAILED: ' + (err.message || 'UNKNOWN'), true);
  }
});

// Wipe scoreboard from admin panel
document.getElementById('admin-wipe-btn')?.addEventListener('click', async () => {
  if (!adminCredentials) { showPanelMsg('NOT LOGGED IN', true); return; }
  if (!confirm('Are you sure? This permanently deletes ALL scores.')) return;

  try {
    await adminWipeScores(adminCredentials.email, adminCredentials.password);
    showPanelMsg('SCOREBOARD WIPED', false);
  } catch (err) {
    showPanelMsg('WIPE FAILED: ' + (err.message || 'UNKNOWN'), true);
  }
});

// Save config to Firebase
document.getElementById('admin-save-config-btn')?.addEventListener('click', async () => {
  if (!adminCredentials) { showPanelMsg('NOT LOGGED IN', true); return; }

  const grid = document.getElementById('admin-var-editor');
  const config = {};
  grid.querySelectorAll('.admin-var-input').forEach(inp => {
    const key = inp.dataset.pw;
    const val = Math.max(1, Math.min(5, parseInt(inp.value) || 1));
    config[key] = val;
  });

  try {
    await saveGameConfig({ rarities: config }, adminCredentials.email, adminCredentials.password);
    // Apply locally too
    for (const [key, rarity] of Object.entries(config)) {
      if (pwConfig[key]) pwConfig[key].rarity = rarity;
    }
    showPanelMsg('CONFIG SAVED & APPLIED', false);
  } catch (err) {
    showPanelMsg('SAVE FAILED: ' + (err.message || 'UNKNOWN'), true);
  }
});

// Reset config to defaults
document.getElementById('admin-reset-config-btn')?.addEventListener('click', () => {
  for (const [key, cfg] of Object.entries(DEFAULT_PW_CONFIG)) {
    if (pwConfig[key]) pwConfig[key].rarity = cfg.rarity;
  }
  buildVarEditor();
  showPanelMsg('RESET TO DEFAULTS (NOT SAVED YET)', false);
});

// Close admin panel
document.getElementById('admin-panel-close-btn')?.addEventListener('click', () => {
  document.getElementById('admin-panel-overlay')?.classList.add('hidden');
  adminCredentials = null;
  overlay.classList.remove('hidden');
});

// Admin cancel — return to scoreboard
adminCancelBtn.addEventListener('click', () => {
  adminOverlay.classList.add('hidden');
  scoreboardOverlay.classList.remove('hidden');
});