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
  isFirebaseOnline
} from "./firebase-config.js";


// ═══════════════════════════════════════════════════════════════
// SECTION 1: CONFIGURATION & CONSTANTS
// All tuneable values are defined here for easy adjustment.
// ═══════════════════════════════════════════════════════════════

// ─── POWER-UP DURATIONS (milliseconds) ───
const FRENZY_DURATION   = 3000;   // Frenzy: 2x points + speed boost
const ICE_DURATION      = 4000;   // Ice: shark slowed
const GHOST_DURATION    = 3000;   // Ghost: shark invisible & harmless
const HOURGLASS_DURATION = 5000;  // Time Stop: timer & shark frozen
const BUDDY_DURATION    = 3000;   // Buddy: helper fish collects treats
const BOMB_DURATION     = 2000;   // Bomb: shark scared to corner
const CRAZY_DURATION    = 5000;   // Crazy: mass treat spawn, then game over

// ─── ITEM APPEARANCE DURATIONS (milliseconds) ───
// How long a power-up item stays on the field before vanishing
const DEFAULT_ITEM_LIFETIME = 5000;  // Most power-ups
const SHORT_ITEM_LIFETIME   = 2000;  // Magnet, Hourglass
const CRAZY_ITEM_LIFETIME   = 900;   // Crazy mushroom (very brief)

// ─── GAMEPLAY CONSTANTS ───
const FRENZY_SPEED_BOOST = 1.2;  // Extra speed during frenzy
const COMBO_WINDOW       = 1200; // ms to keep combo chain alive
const PW_SPAWN_CHANCE    = 0.005; // Per-frame chance to spawn a power-up
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
const wipeScoreboardBtn = document.getElementById('wipe-scoreboard-btn');

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
['frenzy','ice','shield','magnet','ghost','time','buddy','bomb','crazy','combo'].forEach(
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
  ghost: null, hourglass: null, buddy: null, bomb: null, crazy: null
};

// Active power-up states
let frenzyActive = false, frenzyTimer = 0, frenzyTO = null;
let iceActive = false, iceTO = null;
let shieldActive = false;
let magnetActive = false;
let ghostActive = false, ghostTO = null;
let hourglassActive = false, hourglassTO = null, timerFrozen = false;
let buddyActive = false, buddyTO = null;
let bombActive = false, bombTO = null;
let crazyActive = false, crazyTO = null;

// Combo system
let comboCount = 0, comboTimer = 0;


// ═══════════════════════════════════════════════════════════════
// SECTION 4: FIREBASE INITIALISATION
// Authenticate anonymously when the page loads.
// ═══════════════════════════════════════════════════════════════

(async function boot() {
  await initAuth();
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

  let html = '<table class="scoreboard-table"><thead><tr>';
  html += '<th></th><th>NAME</th><th>SCORE</th><th>LVL</th>';
  html += '</tr></thead><tbody>';

  scores.forEach((s, i) => {
    const cls = i === highlightIdx ? 'new-score' : '';
    html += `<tr class="${cls}">`;
    html += `<td class="rank">${i + 1}.</td>`;
    html += `<td class="name-col">${s.name || '???'}</td>`;
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
      <div class="name-entry-hint">TYPE INITIALS OR USE ARROWS &middot; ENTER TO CONFIRM</div>
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

  async function tryConfirm() {
    if (!nameEntryActive) return;

    const name = slots.map(i => CHARS[i]).join('');
    if (name.trim() === '') {
      errorMsg = 'NAME CANNOT BE BLANK';
      render();
      return;
    }

    nameEntryActive = false;
    document.removeEventListener('keydown', onKey);
    nameEntryOverlay.classList.add('hidden');

    // Show loading whilst saving to Firebase
    showLoading('SAVING SCORE...');

    const idx = await saveHighScore(name, finalScore, finalLevel);

    hideLoading();

    // Fetch fresh scores for the end screen
    const scores = await fetchHighScores();

    // Show end screen with updated scoreboard
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

  function onKey(e) {
    if (!nameEntryActive) return;
    e.preventDefault();
    e.stopPropagation();
    const k = e.key;

    if (k === 'ArrowLeft')  { activeSlot = (activeSlot - 1 + 3) % 3; errorMsg = ''; render(); }
    else if (k === 'ArrowRight') { activeSlot = (activeSlot + 1) % 3; errorMsg = ''; render(); }
    else if (k === 'ArrowUp')    { slots[activeSlot] = (slots[activeSlot] - 1 + CHARS.length) % CHARS.length; errorMsg = ''; render(); }
    else if (k === 'ArrowDown')  { slots[activeSlot] = (slots[activeSlot] + 1) % CHARS.length; errorMsg = ''; render(); }
    else if (k === 'Enter')      { tryConfirm(); }
    else if (k === 'Backspace')  { slots[activeSlot] = CHARS.indexOf(' '); activeSlot = Math.max(0, activeSlot - 1); errorMsg = ''; render(); }
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

  // Phase 1: white line appears in centre
  requestAnimationFrame(() => {
    wipe.classList.add('crt-line');
    // Phase 2: line expands to fill screen
    setTimeout(() => {
      wipe.classList.remove('crt-line');
      wipe.classList.add('crt-expand');
      // Phase 3: screen revealed, wipe fades out
      setTimeout(() => {
        wipe.classList.add('crt-fade');
        setTimeout(() => {
          wipe.remove();
          if (callback) callback();
        }, 300);
      }, 250);
    }, 350);
  });
}


// ═══════════════════════════════════════════════════════════════
// SECTION 8: POWER-UP ACTIVATION FUNCTIONS
// Each function activates a power-up, sets timers, and
// updates the HUD status indicators.
// ═══════════════════════════════════════════════════════════════

function clearTO(t) { if (t) clearTimeout(t); return null; }
function stOn(key, cls)  { st[key].classList.add('s-on', cls); }
function stOff(key, cls) { st[key].classList.remove('s-on', cls); }

// ─── FRENZY: 2x points + speed boost ───
function activateFrenzy() {
  frenzyActive = true;
  frenzyTimer = Date.now();
  fish.speed = 2.5 + FRENZY_SPEED_BOOST;
  frenzyHud.classList.add('active');
  frenzyBarEl.style.width = '100%';
  stOn('frenzy', 's-frenzy');
  frenzyTO = clearTO(frenzyTO);
  frenzyTO = setTimeout(deactivateFrenzy, FRENZY_DURATION);
}

function deactivateFrenzy() {
  frenzyActive = false;
  fish.speed = 2.5;
  frenzyHud.classList.remove('active');
  frenzyBarEl.style.width = '0%';
  stOff('frenzy', 's-frenzy');
  frenzyTO = null;
}

// ─── ICE: Slow the shark ───
function activateIce() {
  iceActive = true;
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
  buddy = { x: fish.x - 30, y: fish.y, dir: 1, tailPhase: rand(0, Math.PI * 2) };
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
  frenzy:    { emoji: '🔥', glow: '#ff8800', fn: activateFrenzy,    ch: 1,    ok: () => !frenzyActive },
  ice:       { emoji: '❄️',  glow: '#88ddff', fn: activateIce,       ch: 0.8,  ok: () => !iceActive },
  shield:    { emoji: '🛡️', glow: '#44ee88', fn: activateShield,    ch: 0.5,  ok: () => !shieldActive },
  magnet:    { emoji: '🧲', glow: '#dd44ff', fn: activateMagnet,    ch: 0.3,  ok: () => !magnetActive, life: SHORT_ITEM_LIFETIME },
  ghost:     { emoji: '👻', glow: '#ff8844', fn: activateGhost,     ch: 0.2,  ok: () => !ghostActive },
  hourglass: { emoji: '⏳', glow: '#ffdd44', fn: activateHourglass, ch: 0.12, ok: () => !hourglassActive, life: SHORT_ITEM_LIFETIME },
  buddy:     { emoji: '🐠', glow: '#44ddaa', fn: activateBuddy,     ch: 0.2,  ok: () => !buddyActive },
  bomb:      { emoji: '💣', glow: '#ff4444', fn: activateBomb,      ch: 0.25, ok: () => !bombActive },
  crazy:     { emoji: '🍄', glow: '#ff00aa', fn: activateCrazy,     ch: 0.3,  ok: () => level > 9 && !crazyActive, life: CRAZY_ITEM_LIFETIME }
};

/** Spawn a power-up item at a random position away from the fish. */
function spawnPW(type) {
  const lt = pwConfig[type].life || DEFAULT_ITEM_LIFETIME;
  const item = {
    x: rand(50, W - 50),
    y: rand(50, H - 50),
    r: 16,
    bobPhase: rand(0, Math.PI * 2),
    spawnTime: Date.now(),
    lifetime: lt,
    type
  };
  // Ensure it doesn't spawn on top of the fish
  while (dist(item, fish) < 80) {
    item.x = rand(50, W - 50);
    item.y = rand(50, H - 50);
  }
  return item;
}

/** Each frame, randomly try to spawn power-ups that aren't already on field. */
function trySpawnPowerups() {
  for (const [k, c] of Object.entries(pwConfig)) {
    if (!pwItems[k] && c.ok() && Math.random() < PW_SPAWN_CHANCE * c.ch) {
      pwItems[k] = spawnPW(k);
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
  maxTime = Math.max(15, 32 - level * 2);
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
    dir: 1, tailPhase: 0,
    speed: 2.5, friction: 0.88
  };

  // Shark (enemy) — gets faster each level (slowed to compensate for slim hitbox)
  const sharkSpeed = 0.75 + level * 0.2;
  shark = {
    x: rand(60, W - 60), y: rand(60, H - 60),
    w: 50, h: 18,
    speed: sharkSpeed, savedSpeed: sharkSpeed, savedSpeed2: sharkSpeed,
    angle: rand(0, Math.PI * 2),
    dir: 1, tailPhase: 0,
    chaseTimer: 0,
    hidden: false
  };
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

  // Reset all power-up items and states
  for (const k in pwItems) pwItems[k] = null;
  frenzyActive = iceActive = shieldActive = magnetActive = false;
  ghostActive = hourglassActive = buddyActive = bombActive = false;
  crazyActive = timerFrozen = false;
  comboCount = 0;
  comboTimer = 0;

  // Clear all power-up timeouts
  frenzyTO = clearTO(frenzyTO);
  iceTO = clearTO(iceTO);
  ghostTO = clearTO(ghostTO);
  hourglassTO = clearTO(hourglassTO);
  buddyTO = clearTO(buddyTO);
  bombTO = clearTO(bombTO);
  crazyTO = clearTO(crazyTO);

  // Reset HUD indicators
  frenzyHud.classList.remove('active');
  frenzyBarEl.style.width = '0%';
  for (const s of Object.values(st)) {
    s.classList.remove('s-on', 's-frenzy', 's-ice', 's-shield', 's-magnet',
      's-ghost', 's-time', 's-buddy', 's-bomb', 's-combo', 's-crazy');
    s.style.color = '';
  }
  st.combo.textContent = '⚡x1';
  fish.speed = 2.5;

  // Start game
  gameRunning = true;

  // Timer countdown (1 tick per second)
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameRunning || timerFrozen) return;
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
  const types = ['🍤', '🪱', '🦐', '🫧', '⭐', '🍣', '🍙', '🍔'];
  const t = {
    x: rand(30, W - 30),
    y: rand(30, H - 30),
    r: 14,
    type: types[Math.floor(rand(0, types.length))],
    bobPhase: rand(0, Math.PI * 2),
    collected: false
  };
  while (dist(t, fish) < 60) {
    t.x = rand(30, W - 30);
    t.y = rand(30, H - 30);
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
  [frenzyTO, iceTO, ghostTO, hourglassTO, buddyTO, bombTO, crazyTO].forEach(clearTO);
  frenzyActive = iceActive = ghostActive = hourglassActive = false;
  buddyActive = bombActive = crazyActive = timerFrozen = false;
  frenzyHud.classList.remove('active');

  // Reset all status indicators
  for (const s of Object.values(st)) {
    s.classList.remove('s-on', 's-frenzy', 's-ice', 's-shield', 's-magnet',
      's-ghost', 's-time', 's-buddy', 's-bomb', 's-combo', 's-crazy');
    s.style.color = '';
  }

  if (!won) {
    // Game over — show name entry
    showNameEntry(score, level, msg);
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
  if (nameEntryActive) return; // Name entry has its own handler

  // Don't intercept keypresses when typing in input fields (e.g. admin login)
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  keys[e.key.toLowerCase()] = true;
  e.preventDefault();
});

document.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});


// ═══════════════════════════════════════════════════════════════
// SECTION 12: UPDATE FUNCTIONS
// Per-frame logic for fish, shark, buddy, treats, particles.
// ═══════════════════════════════════════════════════════════════

function updateFish() {
  const s = fish.speed;

  // Movement input
  if (keys['arrowleft'] || keys['a'])  { fish.vx -= s * 0.3; fish.dir = -1; }
  if (keys['arrowright'] || keys['d']) { fish.vx += s * 0.3; fish.dir = 1; }
  if (keys['arrowup'] || keys['w'])    { fish.vy -= s * 0.3; }
  if (keys['arrowdown'] || keys['s'])  { fish.vy += s * 0.3; }

  // Apply friction and velocity
  fish.vx *= fish.friction;
  fish.vy *= fish.friction;
  fish.x += fish.vx;
  fish.y += fish.vy;

  // Clamp to canvas bounds
  fish.x = Math.max(fish.w / 2, Math.min(W - fish.w / 2, fish.x));
  fish.y = Math.max(fish.h / 2, Math.min(H - fish.h / 2, fish.y));

  // Animate tail
  fish.tailPhase += 0.15;

  // Spawn bubbles behind fish
  if (Math.random() < 0.12) {
    bubbles.push({
      x: fish.x - fish.dir * 16,
      y: fish.y + rand(-4, 4),
      r: rand(1.5, 3),
      vy: rand(-0.5, -1.5),
      life: 1,
      decay: rand(0.015, 0.03)
    });
  }
}

function updateShark() {
  if (shark.hidden || hourglassActive) return;

  // Chase the fish with slight sinusoidal wobble
  shark.chaseTimer += 0.02;
  const a = Math.atan2(fish.y - shark.y, fish.x - shark.x);
  const wobble = Math.sin(shark.chaseTimer * 3) * 0.4;
  const dx = Math.cos(a + wobble) * shark.speed;
  const dy = Math.sin(a + wobble) * shark.speed;
  shark.x += dx;
  shark.y += dy;
  shark.angle = a;

  // Face the direction of travel (like the fish)
  if (dx > 0.05) shark.dir = 1;
  else if (dx < -0.05) shark.dir = -1;

  // Animate tail
  shark.tailPhase += 0.12;

  // Clamp to canvas
  shark.x = Math.max(20, Math.min(W - 20, shark.x));
  shark.y = Math.max(20, Math.min(H - 20, shark.y));

  // Collision with fish (body only, not tail)
  if (dist(shark, fish) < 30) {
    if (shieldActive) useShield();
    else endGame(false, 'The shark got you!');
  }
}

function updateBuddy() {
  if (!buddyActive || !buddy) return;

  // Follow the fish with slight lag
  const dx = fish.x - buddy.x - 20 * fish.dir;
  const dy = fish.y - buddy.y;
  buddy.x += dx * 0.08;
  buddy.y += dy * 0.08;
  buddy.dir = dx > 0 ? 1 : -1;
  buddy.tailPhase += 0.2;

  // Buddy collects treats it touches
  for (const t of treats) {
    if (!t.collected && dist(t, buddy) < 24) collectTreat(t);
  }
}

function updateTreats() {
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
function drawPixelFish(x, y, dir, phase, c1, c2, c3) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

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
  drawPixelFish(fish.x, fish.y, fish.dir, fish.tailPhase, c1, c2, c3);

  // Shield outline
  if (shieldActive) {
    const p = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    ctx.strokeStyle = `rgba(68,238,136,${p})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(fish.x - 22, fish.y - 18, 44, 36);
  }
}

function drawBuddy() {
  if (!buddyActive || !buddy) return;
  const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.2;
  ctx.globalAlpha = pulse;
  drawPixelFish(buddy.x, buddy.y, buddy.dir, buddy.tailPhase, '#22bbaa', '#44ddcc', '#119988');
  ctx.globalAlpha = 1;

  // Sparkle trail
  ctx.fillStyle = '#44ddaa';
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(buddy.x + rand(-16, 16), buddy.y + rand(-10, 10), 2, 2);
  }
}

// ─── SHARK (replaces the cat) ───
// ─── SHARK ───
// Drawn the same way as the player fish: faces left/right
// using ctx.scale(dir, 1), with the tail trailing behind.
// The tail is purely cosmetic — hitbox is on the body only.
function drawShark() {
  if (shark.hidden) return;

  ctx.save();
  ctx.translate(shark.x, shark.y);
  ctx.scale(shark.dir, 1); // Flip to face direction of travel

  const frozen = iceActive || hourglassActive;
  if (frozen) ctx.globalAlpha = 0.6;

  const bodyCol  = frozen ? '#556688' : '#667788';
  const darkCol  = frozen ? '#445566' : '#555566';
  const finCol   = frozen ? '#4a5a6a' : '#556677';
  const bellyCol = frozen ? '#8899aa' : '#99aabb';

  // ── Tail fin (behind body — NO hitbox) ──
  // Animated wag using tailPhase (same approach as fish tail)
  const tw = Math.round(Math.sin(shark.tailPhase) * 4);
  ctx.fillStyle = finCol;
  // Upper fork
  ctx.fillRect(-30, -6 + tw, 8, 3);
  ctx.fillRect(-34, -8 + tw, 5, 3);
  // Lower fork
  ctx.fillRect(-30, 3 + tw, 8, 3);
  ctx.fillRect(-34, 5 + tw, 5, 3);
  // Stem connecting to body
  ctx.fillStyle = darkCol;
  ctx.fillRect(-24, -3 + tw, 6, 6);

  // ── Main body (slim torpedo) ──
  ctx.fillStyle = bodyCol;
  ctx.fillRect(-18, -5, 36, 10);   // Core
  ctx.fillRect(-14, -6, 28, 2);    // Top edge
  ctx.fillRect(-14, 5, 28, 2);     // Bottom edge

  // Belly (lighter underside)
  ctx.fillStyle = bellyCol;
  ctx.fillRect(-14, 2, 28, 4);

  // ── Snout (pointed, extends right) ──
  ctx.fillStyle = bodyCol;
  ctx.fillRect(16, -4, 6, 8);
  ctx.fillRect(20, -3, 5, 6);
  ctx.fillRect(24, -2, 4, 4);
  ctx.fillRect(27, -1, 3, 2);

  // ── Dorsal fin (on top, tall & narrow) ──
  ctx.fillStyle = finCol;
  ctx.fillRect(-2, -12, 3, 7);
  ctx.fillRect(-1, -16, 3, 5);
  ctx.fillRect(0, -19, 2, 4);

  // ── Pectoral fin (swept back, underneath) ──
  ctx.fillStyle = finCol;
  ctx.fillRect(2, 6, 8, 3);
  ctx.fillRect(4, 9, 5, 2);

  // ── Eye ──
  ctx.fillStyle = frozen ? '#aabbcc' : '#ffee44';
  ctx.fillRect(12, -4, 5, 5);
  // Vertical slit pupil
  ctx.fillStyle = '#111';
  ctx.fillRect(14, -4, 2, 5);
  // Glint
  ctx.fillStyle = '#fff';
  ctx.fillRect(13, -3, 1, 1);

  // ── Gill slits (3 lines behind eye) ──
  ctx.fillStyle = darkCol;
  ctx.fillRect(5, -3, 1, 6);
  ctx.fillRect(7, -3, 1, 6);
  ctx.fillRect(9, -3, 1, 6);

  // ── Teeth (jagged row along the mouth line) ──
  ctx.fillStyle = '#ddeeff';
  ctx.fillRect(18, 3, 2, 2);
  ctx.fillRect(21, 3, 2, 2);
  ctx.fillRect(24, 2, 2, 2);
  ctx.fillRect(18, -5, 2, 2);
  ctx.fillRect(21, -5, 2, 2);
  ctx.fillRect(24, -4, 2, 2);

  // ── Effects ──
  if (frozen) {
    // Orbiting ice particles
    ctx.fillStyle = '#88ddff';
    for (let i = 0; i < 4; i++) {
      const a = Date.now() * 0.002 + (i / 4) * Math.PI * 2;
      ctx.fillRect(Math.cos(a) * 22 - 1, Math.sin(a) * 22 - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
  } else {
    // Danger aura (red glow around body only, not tail)
    ctx.fillStyle = `rgba(255,40,40,${0.06 + Math.sin(Date.now() * 0.005) * 0.03})`;
    ctx.fillRect(-20, -22, 52, 36);
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

    // Inner glow (distinguishes power-ups from treats)
    ctx.fillStyle = c.glow + '26';
    ctx.fillRect(-12, -12, 24, 24);

    // Outer glow
    ctx.fillStyle = c.glow + '10';
    ctx.fillRect(-18, -18, 36, 36);

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
  if (d < 120 && !shieldActive && !shark.hidden) {
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
  ctx.fillStyle = 'rgba(255,150,0,0.1)';
  ctx.fillRect(fish.x - 24, fish.y - 24, 48, 48);
  ctx.fillStyle = 'rgba(255,200,50,0.05)';
  ctx.fillRect(fish.x - 32, fish.y - 32, 64, 64);
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
}


// ═══════════════════════════════════════════════════════════════
// SECTION 14: MAIN GAME LOOP
// ═══════════════════════════════════════════════════════════════

function loop() {
  if (!gameRunning) return;

  // Update
  updateFish();
  updateShark();
  updateBuddy();
  updateTreats();
  updateFrenzyBar();
  updateParticles();
  trySpawnPowerups();
  updatePWItems();

  // Draw (order matters for layering)
  drawWater();
  drawMagnetLines();
  drawTreats();
  drawPWItems();
  drawParticles();
  drawBuddy();
  drawFish();
  drawFishGlow();
  drawShark();
  drawWarning();
  drawFrenzyOverlay();
  drawIceOverlay();
  drawHourglassOverlay();
  drawCrazyOverlay();
  drawScorePopups();
  drawScanlines();

  gameLoop = requestAnimationFrame(loop);
}


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

// Wipe scoreboard — opens admin login
wipeScoreboardBtn.addEventListener('click', () => {
  scoreboardOverlay.classList.add('hidden');
  adminOverlay.classList.remove('hidden');
  hideAdminError();
  adminEmailInput.value = '';
  adminPasswordInput.value = '';
  adminEmailInput.focus();
});

// Admin login and wipe
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
    await adminWipeScores(email, password);
    adminOverlay.classList.add('hidden');
    // Return to main menu with success notification
    overlay.classList.remove('hidden');
    showWipeNotification();
  } catch (err) {
    // Show a user-friendly error
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

// Admin cancel
adminCancelBtn.addEventListener('click', async () => {
  adminOverlay.classList.add('hidden');
  await showScoreboard();
});