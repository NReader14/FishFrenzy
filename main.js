// ═══════════════════════════════════════════════════════════════
// MAIN — Entry point. Wires all modules together.
// ═══════════════════════════════════════════════════════════════

import S from './js/state.js';
import { showAd } from './js/ads.js';
import { NOTES as LOCAL_PATCH_NOTES } from './js/patch-notes-data.js';
import {
  W, H,
  SHARK_START_DELAY, COMBO_WINDOW,
  rand, dist
} from './js/constants.js';
import { gameVars, GAME_VAR_DEFAULTS, firebaseGameVars } from './js/game-vars.js';
import {
  overlay, winOverlay, scoreboardOverlay,
  rulesOverlay, adminOverlay, scoreEl, timerEl, timerBar,
  levelEl, treatsLeftEl, startBtn, rulesBtn, rulesBackBtn,
  scoreboardBtn, closeScoreboardBtn, adminEmailInput,
  adminPasswordInput, adminLoginBtn, st
} from './js/dom.js';
import { spawnParticles, spawnFrenzyTrail, updateParticles, drawParticles, drawScorePopups } from './js/particles.js';
import {
  playCRTWipe, playCRTGameOver, drawChomp, playTimeUpDeath,
  updateSwapAnim, drawSwapEffect, updateHookAnim, drawHookLine
} from './js/animations.js';
import {
  loadRarities, trySpawnPowerups, updatePWItems,
  clearAllPowerupTimeouts, clearTO, useShield,
  overlapsExisting, setEndGame
} from './js/powerups.js';
import {
  drawWater, drawFish, drawBuddy, drawDecoy, drawShark,
  drawTreats, drawPWItems, drawWarning, drawFrenzyOverlay, drawIceOverlay,
  drawHourglassOverlay, drawGhostIndicator, drawCrazyOverlay, drawFishGlow, drawMagnetLines,
  drawScanlines, drawClosestTreatArrow, drawPowerupTimerBars, drawRainbowOverlay,
  drawClaudeOverlay, drawBodySwapAnim, drawBombAnim, drawHellAnim, drawCardAnim,
  drawLevelBanner, drawTutorialHints
} from './js/drawing.js';
import { collectTreat } from './js/scoring.js';
import {
  showNameEntry, showScoreboard, showFullLeaderboard,
  showAdminError, hideAdminError, buildRulesHTML, openAdminPanel,
  setupAdminEvents, setInitGame
} from './js/overlays.js';
import { setupFeedbackForm } from './js/feedback.js';
import {
  initAuth, fetchHighScores, fetchMaintenance, setMaintenance,
  verifyAdminCredentials
} from './firebase-config.js';
import { initControls } from './js/controls.js';
import { initAuthUI } from './js/auth.js';
import { initSettings, saveSettings, cancelTrackPreview } from './js/settings.js';
import {
  initAchievements, onGameStart as achGameStart, onLevelStart as achLevelStart,
  onLevelComplete as achLevelComplete, onGameOver as achGameOver,
  onSharkDistanceFrame, onDeathCard as achDeathCard, onDeathWithCombo as achDeathWithCombo,
  buildAchievementsHTML, buildStatsHTML
} from './js/achievements.js';
import { initCursor } from './js/cursor.js';
import { initAudio, startMusic, stopMusic, sfxLevelUp, sfxGameOver, sfxSharkBite, sfxMenuClick, stopCardMusic, setMusicTempo } from './js/audio.js';
import { initMobileScale } from './js/mobile-scale.js';
import { initHallOfFame, stopHallOfFameAnim } from './js/hall-of-fame.js';


// ═══════════════════════════════════════════════════════════════
// WIRE UP FORWARD REFERENCES
// Powerups needs endGame and spawnTreat, overlays needs initGame.
// We pass them in to avoid circular imports.
// ═══════════════════════════════════════════════════════════════

setEndGame(endGame);
setInitGame(initGame);

// ─── TUTORIAL ───
function advanceTutorial() {
  S.tutorialStep++;
  S.tutorialStepTime = Date.now();
  if (S.tutorialStep === 4) S.sharkDelay = 90; // release shark at shark step
  if (S.tutorialStep >= 6) { endTutorial(); return; }
}

function endTutorial() {
  S.tutorialActive = false;
  S.gameRunning = false;
  clearInterval(S.timerInterval);
  cancelAnimationFrame(S.gameLoop);
  stopMusic();
  clearAllPowerupTimeouts();
  setTimeout(() => {
    winOverlay.classList.add('hidden');
    overlay.classList.remove('hidden');
    S.settings.difficulty = 'normal';
    saveSettings();
    refreshDifficultyUI();
  }, 800);
}

function updateTutorial() {
  if (!S.tutorialActive) return;
  const elapsed = (Date.now() - S.tutorialStepTime) / 1000;
  switch (S.tutorialStep) {
    case 0: { // wait for first movement
      const moving = S.keys['arrowleft'] || S.keys['arrowright'] ||
                     S.keys['arrowup']   || S.keys['arrowdown'] ||
                     S.keys['a'] || S.keys['d'] || S.keys['w'] || S.keys['s'];
      if (moving) advanceTutorial();
      break;
    }
    case 1: if (elapsed >= 6) advanceTutorial(); break;
    case 2: if (elapsed >= 5) advanceTutorial(); break;
    case 3: if (elapsed >= 5) advanceTutorial(); break;
    case 4: if (elapsed >= 5) advanceTutorial(); break;
    case 5: if (elapsed >= 3) advanceTutorial(); break;
  }
}

// ─── DIFFICULTY PRESETS ───
const DIFFICULTY_PRESETS = {
  easy:     { sharkSpeedBase: -2.4, sharkSpeedPerLevel: 0.12, levelTimeBase: 45, levelTimeMin: 25 },
  normal:   {},
  hard:     { sharkSpeedBase: -0.9, sharkSpeedPerLevel: 0.28, levelTimeBase: 28, levelTimeMin: 14 },
  tutorial: { sharkSpeedBase: -3.0, sharkSpeedPerLevel: 0.05, levelTimeBase: 120, levelTimeMin: 120, treatBase: 3, treatPerLevel: 0 },
};

function refreshDifficultyUI() {
  ['easy', 'normal', 'hard', 'tutorial'].forEach(d => {
    document.getElementById(`diff-${d}`)?.classList.toggle('diff-active', d === S.settings.difficulty);
  });
  refreshMultiplierHint();
}

function refreshMultiplierHint() {
  const el = document.getElementById('score-multiplier-hint');
  if (!el) return;
  const diff = S.settings.difficulty;
  if (diff === 'tutorial') { el.style.display = 'none'; return; }
  const diffMul    = diff === 'easy' ? 0.75 : diff === 'hard' ? 1.5 : 1;
  const smartMul   = S.settings.smartShark   ? 1.25 : 1;
  const mysteryMul    = S.settings.mysteryBlocks ? 1.05 : 1;
  const fastTreatsMul = S.settings.fastTreats   ? 1.03 : 1;
  const total         = diffMul * smartMul * mysteryMul * fastTreatsMul;
  const pct      = Math.round((total - 1) * 100);
  if (pct === 0) { el.style.display = 'none'; return; }
  const sign  = pct > 0 ? '+' : '';
  const color = pct >= 50 ? '#44ee88' : pct > 0 ? '#ffaa44' : '#ee5566';
  el.style.display = 'block';
  el.style.color   = color;
  el.textContent   = `${sign}${pct}% SCORE MULTIPLIER`;
}

['easy', 'normal', 'hard', 'tutorial'].forEach(d => {
  document.getElementById(`diff-${d}`)?.addEventListener('click', () => {
    S.settings.difficulty = d;
    saveSettings();
    refreshDifficultyUI();
  });
});


// ═══════════════════════════════════════════════════════════════
// BOOT — Firebase auth, maintenance check, welcome
// ═══════════════════════════════════════════════════════════════

(async function boot() {
  // Check maintenance FIRST — if under maintenance, show screen and stop before auth
  const maint = await fetchMaintenance();
  if (!maint) await initAuth();

  if (maint) {
    // Replace boot screen with maintenance screen (still covering everything)
    const bootEl = document.getElementById('boot-screen');
    if (bootEl) {
      bootEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">🔧</div>
          <h1 style="color:#ee5566;font-size:15px;font-family:'Press Start 2P',monospace;letter-spacing:2px;line-height:1.6;">UNDER<br>MAINTENANCE</h1>
          <p style="color:#5588aa;font-size:7px;font-family:'Press Start 2P',monospace;margin-top:4px;line-height:2;">WE'LL BE BACK SOON!</p>
          <button id="maint-admin-btn" class="btn-secondary" style="margin-top:16px;">ADMIN LOGIN</button>
        </div>`;
    }
    document.getElementById('maint-admin-btn').addEventListener('click', () => {
      const bootEl2 = document.getElementById('boot-screen');
      if (bootEl2) bootEl2.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:260px;">
          <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#44ddff;margin-bottom:8px;">ADMIN LOGIN</div>
          <input type="email" id="maint-email" class="admin-input" placeholder="Email" autocomplete="email">
          <input type="password" id="maint-pass" class="admin-input" placeholder="Password" autocomplete="current-password">
          <div id="maint-error" class="admin-error hidden" style="color:#ee5566;font-size:7px;margin:2px 0;"></div>
          <button id="maint-login-btn" class="btn-primary" style="padding:10px 20px;font-size:9px;margin-top:4px;width:100%;">DISABLE MAINTENANCE</button>
        </div>`;
      document.getElementById('maint-login-btn').addEventListener('click', async () => {
        try {
          await setMaintenance(false, document.getElementById('maint-email').value, document.getElementById('maint-pass').value);
          location.reload();
        } catch (_) {
          const e = document.getElementById('maint-error');
          if (e) { e.textContent = 'LOGIN FAILED'; e.classList.remove('hidden'); }
        }
      });
    });
    return;
  }

  // Not in maintenance — fade out boot screen to reveal the game
  const bootEl = document.getElementById('boot-screen');
  if (bootEl) {
    bootEl.classList.add('boot-fade');
    setTimeout(() => bootEl.remove(), 320);
  }
  if (!localStorage.getItem('fishFrenzyWelcomed')) {
    showWelcomeOverlay();
  }

  // Show global high score in top bar + Hall of Fame banner
  try {
    const scores = await fetchHighScores();
    const best = scores.length > 0 ? scores[0].score : null;
    const el = document.getElementById('global-hi-score');
    if (el) el.textContent = best !== null ? best.toLocaleString() : '---';
    S.globalHighScore = best ?? 0;
    initHallOfFame(scores);
  } catch (_) {}
})();

function showWelcomeOverlay() {
  const wo        = document.getElementById('welcome-overlay');
  const ackCb     = document.getElementById('rules-ack-checkbox');
  const ackLbl    = document.getElementById('rules-ack-label');
  const closeBtn  = document.getElementById('welcome-close-btn');
  const rulesBtn2 = document.getElementById('welcome-rules-btn');
  if (!wo || !ackCb || !closeBtn) return;

  if (rulesBtn2) {
    rulesBtn2.removeEventListener('click', rulesBtn2._handler);
    rulesBtn2._handler = () => {
      wo.classList.add('hidden');
      buildRulesHTML();
      rulesOverlay.classList.remove('hidden');
    };
    rulesBtn2.addEventListener('click', rulesBtn2._handler);
  }

  // Reset state each time it's shown
  ackCb.checked = false;
  closeBtn.disabled = true;
  ackLbl?.classList.remove('ack-done');
  wo.classList.remove('hidden');

  const onChange = () => {
    closeBtn.disabled = !ackCb.checked;
    ackLbl?.classList.toggle('ack-done', ackCb.checked);
  };
  ackCb.removeEventListener('change', ackCb._ackHandler);
  ackCb._ackHandler = onChange;
  ackCb.addEventListener('change', onChange);

  const onClose = () => {
    wo.classList.add('hidden');
    localStorage.setItem('fishFrenzyWelcomed', '1');
    closeBtn.removeEventListener('click', onClose);
  };
  closeBtn.removeEventListener('click', closeBtn._closeHandler);
  closeBtn._closeHandler = onClose;
  closeBtn.addEventListener('click', onClose);
}

// Load rarities from Firebase
loadRarities();


// ═══════════════════════════════════════════════════════════════
// GAME INIT & LEVEL SETUP
// ═══════════════════════════════════════════════════════════════

async function initGame() {
  S.level = 1;
  S.score = 0;
  S.pbNotified = false;

  // Apply defaults → difficulty preset → Firebase admin values (Firebase always wins)
  Object.assign(gameVars, GAME_VAR_DEFAULTS);
  Object.assign(gameVars, DIFFICULTY_PRESETS[S.settings.difficulty] || {});
  await loadRarities();
  if (Object.keys(firebaseGameVars).length) Object.assign(gameVars, firebaseGameVars);

  // Resolve per-difficulty timer: use difficulty-specific Firebase value if set, else keep current
  const _d = S.settings.difficulty;
  if (gameVars[`${_d}_levelTimeBase`] !== undefined) gameVars.levelTimeBase = gameVars[`${_d}_levelTimeBase`];
  if (gameVars[`${_d}_levelTimeMin`]  !== undefined) gameVars.levelTimeMin  = gameVars[`${_d}_levelTimeMin`];

  try {
    const scores = await fetchHighScores();
    S.globalHighScore = (scores.length > 0) ? scores[0].score : 0;
  } catch (_) {
    S.globalHighScore = 0;
  }

  startLevel();
  achGameStart();
  cancelTrackPreview();
  startMusic();
}

function spawnTreat() {
  const types = ['🪱', '🦐', '🦀', '🐟', '🍤', '🍣', '🍔', '🍕', '🍟', '🍉'];
  const t = {
    x: rand(30, W - 30), y: rand(30, H - 30),
    r: 14, type: types[Math.floor(rand(0, types.length))],
    bobPhase: rand(0, Math.PI * 2), collected: false
  };
  let attempts = 0;
  while ((dist(t, S.fish) < 60 || overlapsExisting(t.x, t.y, 30)) && attempts < 30) {
    t.x = rand(30, W - 30); t.y = rand(30, H - 30); attempts++;
  }
  S.treats.push(t);
}

function startLevel() {
  setMusicTempo(1.0);
  S.maxTime = Math.max(gameVars.levelTimeMin, gameVars.levelTimeBase - S.level);
  S.timeLeft = S.maxTime;
  timerEl.textContent = S.timeLeft;
  timerBar.style.width = '100%';
  timerBar.classList.remove('danger', 'frozen');
  scoreEl.textContent = S.score;
  levelEl.textContent = S.level;

  S.fish = {
    x: W / 2, y: H / 2, w: 36, h: 22,
    vx: 0, vy: 0, dir: 1, angle: 0, tailPhase: 0,
    speed: gameVars.fishSpeed, friction: gameVars.fishFriction
  };

  // Sqrt curve: scales fast early, softens at high levels to stay fair
  const sharkSpeed = (gameVars.fishSpeed + gameVars.sharkSpeedBase) + gameVars.sharkSpeedPerLevel * Math.sqrt(S.level * 2);
  S.shark = {
    x: rand(60, W - 60), y: rand(60, H - 60),
    speed: sharkSpeed,
    angle: 0, tailPhase: 0, chaseTimer: 0, hidden: false, quip: null
  };
  _sharkQuipTimer = Math.round(gameVars.sharkQuipInterval * 60 * (0.5 + Math.random()));
  S.sharkDelay = SHARK_START_DELAY;

  while (dist(S.shark, S.fish) < 150) {
    S.shark.x = rand(60, W - 60); S.shark.y = rand(60, H - 60);
  }

  S.treats = [];
  const treatCount = gameVars.treatBase + S.level * gameVars.treatPerLevel;
  for (let i = 0; i < treatCount; i++) spawnTreat();
  treatsLeftEl.textContent = S.treats.length;

  S.particles = []; S.bubbles = []; S.scorePopups = [];
  S.buddy = null; S.decoyFish = null;

  for (const k in S.pwItems) S.pwItems[k] = null;
  S.frenzyActive = S.iceActive = S.shieldActive = S.magnetActive = false;
  S.ghostActive = S.hourglassActive = S.buddyActive = S.bombActive = false;
  S.crazyActive = S.timerFrozen = false; S.crazyMultiplier = 1;
  S.decoyActive = S.starActive = S.hookActive = S.goopActive = false;
  S.rainbowActive = false;
  S.promptActive = false; S.promptWandering = false; S.promptWanderTimer = 0;
  S.claudeActive = false; S.claudeAnim = null;
  S.bodySwapActive = false; S.bodySwapTO = clearTO(S.bodySwapTO);
  S.hellActive = false; S.hellTO = clearTO(S.hellTO); S.hellAnim = null;
  S.cardAnim = null; S.cardDeathPending = false;
  S.smartSharkHistory = [];
  S.comboCount = 0; S.comboTimer = 0;
  S.accelBonus = 0; S.lastMoveDir = { x: 0, y: 0 }; S.keys = {};
  S.lastSpawnedPW = null;
  S.gamePaused = false; S.goopActive = false;
  S.hookLine = null; S.swapAnim = null; S.chompAnim = null;

  S.frenzyTO = clearTO(S.frenzyTO); S.iceTO = clearTO(S.iceTO);
  S.ghostTO = clearTO(S.ghostTO); S.hourglassTO = clearTO(S.hourglassTO);
  S.buddyTO = clearTO(S.buddyTO); S.bombTO = clearTO(S.bombTO);
  S.crazyTO = clearTO(S.crazyTO); S.decoyTO = clearTO(S.decoyTO);
  S.starTO = clearTO(S.starTO); S.goopTO = clearTO(S.goopTO);
  S.rainbowTO = clearTO(S.rainbowTO);

  for (const s of Object.values(st)) {
    s.classList.remove('s-on', 's-frenzy', 's-ice', 's-shield', 's-magnet',
      's-ghost', 's-time', 's-buddy', 's-bomb', 's-combo', 's-crazy',
      's-decoy', 's-star', 's-poison', 's-hook', 's-swap', 's-double', 's-wave', 's-goop', 's-rainbow',
      's-prompt', 's-claude', 's-bodyswap', 's-hell');
    s.style.color = '';
  }
  st.combo.textContent = '⚡x1';
  S.fish.speed = gameVars.fishSpeed;

  S.gameRunning = true;
  achLevelStart(S.level);
  if (S.level > 1) sfxLevelUp();
  S.levelBanner = { text: `LEVEL ${S.level}`, sub: S.level > 1 ? 'LEVEL UP!' : null, startTime: Date.now() };

  if (S.settings.difficulty === 'tutorial' && S.level === 1) {
    S.tutorialActive = true;
    S.tutorialStep = 0;
    S.tutorialStepTime = Date.now();
    S.tutorialMoved = false;
    S.sharkDelay = 99999; // freeze shark until step 4
  } else {
    S.tutorialActive = false;
  }

  if (S.timerInterval) clearInterval(S.timerInterval);
  S.timerInterval = setInterval(() => {
    if (!S.gameRunning || S.timerFrozen || S.gamePaused) return;
    S.timeLeft--;
    timerEl.textContent = Math.max(0, S.timeLeft);
    timerBar.style.width = (S.timeLeft / S.maxTime * 100) + '%';
    if (S.timeLeft <= 10 && !S.timerFrozen) timerBar.classList.add('danger');
    else timerBar.classList.remove('danger');
    if (S.timeLeft <= 0) endGame(false, "Time's up!");
  }, 1000);

  if (S.gameLoop) cancelAnimationFrame(S.gameLoop);
  loop();
}

function endGame(won, msg) {
  if (!S.gameRunning) return; // guard against double-call from same frame

  // In tutorial mode: if all treats collected, just respawn them and continue.
  // Only restart the tutorial if the player actually dies.
  if (S.settings.difficulty === 'tutorial') {
    if (won) {
      for (let i = 0; i < 3; i++) spawnTreat();
      treatsLeftEl.textContent = S.treats.length;
      return;
    }
    // Timer ran out — just reset the clock, don't crash the tutorial
    if (msg === "Time's up!") {
      S.timeLeft = S.maxTime;
      timerEl.textContent = S.timeLeft;
      timerBar.style.width = '100%';
      timerBar.classList.remove('danger');
      return;
    }
    // Died by shark — restart tutorial from beginning
    S.tutorialActive = false;
    S.gameRunning = false;
    clearInterval(S.timerInterval);
    cancelAnimationFrame(S.gameLoop);
    clearAllPowerupTimeouts();
    stopMusic();
    setTimeout(() => { S.level = 1; S.score = 0; initGame(); }, 800);
    return;
  }

  if (won) {
    achLevelComplete(S.level, S.timeLeft);
  } else {
    achDeathWithCombo(S.comboCount);
    achGameOver(S.score, S.level);
  }
  if (!won) { stopMusic(); sfxGameOver(); }
  S.gameRunning = false;
  clearInterval(S.timerInterval);
  cancelAnimationFrame(S.gameLoop);

  // Capture whichever powerup was active at time of death
  S.deathPowerup = S.frenzyActive ? '🔥 FRENZY'
    : S.iceActive       ? '❄️ ICE'
    : S.ghostActive     ? '👻 GHOST'
    : S.hourglassActive ? '⏳ HOURGLASS'
    : S.buddyActive     ? '🐠 BUDDY'
    : S.bombActive      ? '💣 BOMB'
    : S.crazyActive     ? '🍄 MUSHROOM'
    : S.decoyActive     ? '👁️ DECOY'
    : S.starActive      ? '⭐ STAR'
    : S.goopActive      ? '🧪 GOOP'
    : S.rainbowActive   ? '🌈 RAINBOW'
    : S.promptActive    ? '✍️ PROMPT'
    : S.claudeActive    ? '🤖 CLAUDE'
    : S.bodySwapActive  ? '🎭 BODY SWAP'
    : S.hellActive      ? '👹 HELL'
    : null;

  clearAllPowerupTimeouts();
  S.frenzyActive = S.iceActive = S.ghostActive = S.hourglassActive = false;
  S.buddyActive = S.bombActive = S.crazyActive = S.timerFrozen = false; S.crazyMultiplier = 1;
  S.decoyActive = S.starActive = S.hookActive = S.goopActive = false;
  S.rainbowActive = false;
  S.promptActive = false; S.promptWandering = false;
  S.claudeActive = false; S.claudeAnim = null;
  S.bodySwapActive = false;
  S.hellActive = false; S.hellAnim = null;
  S.cardAnim = null; S.cardDeathPending = false;
  S.decoyFish = null;

  for (const s of Object.values(st)) {
    s.classList.remove('s-on', 's-frenzy', 's-ice', 's-shield', 's-magnet',
      's-ghost', 's-time', 's-buddy', 's-bomb', 's-combo', 's-crazy',
      's-decoy', 's-star', 's-poison', 's-hook', 's-swap', 's-double', 's-wave', 's-goop', 's-rainbow',
      's-prompt', 's-claude', 's-bodyswap', 's-hell');
    s.style.color = '';
  }

  if (!won) {
    if (msg === "Time's up!") {
      const fx = S.fish.x, fy = S.fish.y;
      playTimeUpDeath(fx, fy, () => playCRTGameOver(() => showAd().then(() => showNameEntry(S.score, S.level, msg))));
    } else {
      S.chompAnim = { timer: 0, x: S.fish.x, y: S.fish.y };
      playCRTGameOver(() => showAd().then(() => showNameEntry(S.score, S.level, msg)));
    }
  } else {
    winOverlay.classList.remove('hidden');
    winOverlay.innerHTML = `
      <div class="result win">LEVEL COMPLETE</div>
      <p class="score-text">SCORE: ${S.score} &middot; LVL: ${S.level}</p>
      <button id="next-level-btn" class="btn-primary">NEXT LEVEL</button>
      <p class="controls-hint">PRESS ENTER FOR NEXT LEVEL</p>`;

    document.getElementById('next-level-btn').addEventListener('click', () => {
      winOverlay.classList.add('hidden');
      S.level++;
      startLevel();
    });
  }
}


// ═══════════════════════════════════════════════════════════════
// UPDATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function updateFish(dt = 1) {
  if (S.gamePaused) return;

  // Body swap: fish becomes an AI predator chasing the shark
  if (S.bodySwapActive) {
    const chaseSpeed = S.shark.speed * 0.75;
    const a = Math.atan2(S.shark.y - S.fish.y, S.shark.x - S.fish.x);
    const wobble = Math.sin(Date.now() * 0.003) * 0.3;
    S.fish.vx = Math.cos(a + wobble) * chaseSpeed;
    S.fish.vy = Math.sin(a + wobble) * chaseSpeed;
    S.fish.x += S.fish.vx;
    S.fish.y += S.fish.vy;
    S.fish.x = Math.max(S.fish.w / 2, Math.min(W - S.fish.w / 2, S.fish.x));
    S.fish.y = Math.max(S.fish.h / 2, Math.min(H - S.fish.h / 2, S.fish.y));
    if (S.fish.vx > 0.3) S.fish.dir = 1;
    else if (S.fish.vx < -0.3) S.fish.dir = -1;
    S.fish.tailPhase += 0.18;

    // Fish (enemy) catches shark (player)
    if (dist(S.fish, S.shark) < 30) {
      if (S.starActive) {
        const ba = Math.atan2(S.fish.y - S.shark.y, S.fish.x - S.shark.x);
        S.fish.x += Math.cos(ba) * 80;
        S.fish.y += Math.sin(ba) * 80;
        S.fish.x = Math.max(S.fish.w / 2, Math.min(W - S.fish.w / 2, S.fish.x));
        S.fish.y = Math.max(S.fish.h / 2, Math.min(H - S.fish.h / 2, S.fish.y));
        spawnParticles(S.shark.x, S.shark.y, '#ffee44', 12);
        S.scorePopups.push({ x: S.shark.x, y: S.shark.y - 20, pts: 'BOUNCE!', life: 0.8, decay: 0.03 });
      } else if (S.shieldActive) {
        useShield();
      } else {
        sfxSharkBite();
        endGame(false, 'The fish got you!');
      }
    }
    return;
  }

  let moveX = 0, moveY = 0;
  if (!S.inputFrozen) {
    if (S.keys['arrowleft'] || S.keys['a'])  moveX -= 1;
    if (S.keys['arrowright'] || S.keys['d']) moveX += 1;
    if (S.keys['arrowup'] || S.keys['w'])    moveY -= 1;
    if (S.keys['arrowdown'] || S.keys['s'])  moveY += 1;
  }

  if (moveX !== 0 || moveY !== 0) {
    if (moveX === S.lastMoveDir.x && moveY === S.lastMoveDir.y) {
      S.accelBonus = Math.min(S.accelBonus + gameVars.fishAccelRate * dt, gameVars.fishMaxSpeedBonus);
    } else {
      S.accelBonus *= Math.pow(0.5, dt);
    }
    S.lastMoveDir = { x: moveX, y: moveY };
  } else {
    S.accelBonus *= Math.pow(0.95, dt);
    S.lastMoveDir = { x: 0, y: 0 };
  }

  const s = S.fish.speed + S.accelBonus;

  const inputLen = Math.hypot(moveX, moveY);
  const nx = inputLen > 0 ? moveX / inputLen : 0;
  const ny = inputLen > 0 ? moveY / inputLen : 0;

  if (nx < 0) S.fish.dir = -1;
  if (nx > 0) S.fish.dir = 1;
  S.fish.vx += nx * s * 0.3;
  S.fish.vy += ny * s * 0.3;

  S.fish.vx *= S.fish.friction;
  S.fish.vy *= S.fish.friction;
  S.fish.x += S.fish.vx;
  S.fish.y += S.fish.vy;
  S.fish.x = Math.max(S.fish.w / 2, Math.min(W - S.fish.w / 2, S.fish.x));
  S.fish.y = Math.max(S.fish.h / 2, Math.min(H - S.fish.h / 2, S.fish.y));

  const spd = Math.hypot(S.fish.vx, S.fish.vy);
  if (spd > 0.5) {
    let targetAngle = Math.atan2(S.fish.vy, S.fish.vx * S.fish.dir);
    targetAngle = Math.max(-1.4, Math.min(1.4, targetAngle));
    S.fish.angle = S.fish.angle + (targetAngle - S.fish.angle) * 0.12;
  } else {
    S.fish.angle = S.fish.angle + (0 - S.fish.angle) * 0.1;
  }

  if (S.fish.vx > 0.3) S.fish.dir = 1;
  else if (S.fish.vx < -0.3) S.fish.dir = -1;

  S.fish.tailPhase += 0.15;

  if (Math.random() < 0.12) {
    S.bubbles.push({
      x: S.fish.x - S.fish.dir * 16, y: S.fish.y + rand(-4, 4),
      r: rand(1.5, 3), vy: rand(-0.5, -1.5), life: 1, decay: rand(0.015, 0.03)
    });
  }
}

const SHARK_QUIPS = [
  // classic
  'tee hee i am shark',
  'grrr',
  'dun dun dun',
  'nom nom nom',
  'boo!',
  'i was here first',
  'this is my ocean',
  'have you met my 300 teeth?',

  // threatening
  "i'm gonna get you",
  "hi luke, i'm gonan get you",
  'you were never safe. not once.',
  'just keep swimming... so i can follow you',
  'i am in your walls',

  // internet brain
  'chat watch this',
  "new shark who this",
  '>:)',
  'no thoughts, head empty, only chomp',
  'POV: you are the fish',
  'ratio + you are in the ocean',
  'caught in 4k (the ocean)',
  'i am not a fish i am a vibe',
  'bro thought he could swim lmao',
  'touch grass? i cannot. i am shark.',

  // deceptively polite
  'hello :)',
  'lovely weather we\'re having',
  'don\'t mind me',
  'just passing through',
  'i am normal',
  "the ocean is just a soup and we are all ingredients",
  "i was put on this earth to do one thing and brother i am doing it",

  //long 
  'hey wait come back, i just want to talk, i have not eaten in 3 days, these two things are unrelated',
  'hello i am new here, i heard there was a pool party, i brought snacks, the snacks are you',
  "so um, hypothetically, if someone were to, not me, eat you, would that be, would you be cool with that",
  "hey so i was thinking, and tell me if this is weird, what if i just, a little bit, chomped you",
"sorry sorry sorry, i promise i'm not usually like this, it's just, you look really, this is so embarrassing, you look really edible",
];
let _sharkQuipTimer = 0;

function updateShark() {
  if (S.shark.hidden || S.hourglassActive || S.gamePaused) return;

  // Tick quip display timer
  if (S.shark.quip && S.shark.quip.timer > 0) S.shark.quip.timer--;

  // Randomly trigger a new quip (avg ~every 5 seconds at 60fps)
  if (!S.bodySwapActive) {
    _sharkQuipTimer--;
    if (_sharkQuipTimer <= 0) {
      _sharkQuipTimer = Math.round(gameVars.sharkQuipInterval * 60 * (0.4 + Math.random() * 1.2));
      const text = SHARK_QUIPS[Math.floor(Math.random() * SHARK_QUIPS.length)];
      S.shark.quip = { text, timer: Math.max(Math.round(gameVars.sharkQuipDuration * 60), text.length * 7) };
    }
  }

  if (S.sharkDelay > 0) { S.sharkDelay--; S.shark.tailPhase += 0.06; return; }

  // Body swap: player controls the shark
  if (S.bodySwapActive) {
    let moveX = 0, moveY = 0;
    if (S.keys['arrowleft'] || S.keys['a'])  moveX -= 1;
    if (S.keys['arrowright'] || S.keys['d']) moveX += 1;
    if (S.keys['arrowup'] || S.keys['w'])    moveY -= 1;
    if (S.keys['arrowdown'] || S.keys['s'])  moveY += 1;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      S.shark.x += (moveX / len) * S.shark.speed;
      S.shark.y += (moveY / len) * S.shark.speed;
      const ta = Math.atan2(moveY, moveX);
      let diff = ta - S.shark.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      S.shark.angle += diff * 0.35;
    }
    S.shark.x = Math.max(20, Math.min(W - 20, S.shark.x));
    S.shark.y = Math.max(20, Math.min(H - 20, S.shark.y));
    S.shark.tailPhase += 0.12;
    return;
  }

  // Prompt: freeze phase — just wag tail, no movement or targeting
  if (S.promptActive && !S.promptWandering) {
    S.shark.tailPhase += 0.06;
    return;
  }

  // Prompt: wander phase — random movement, no targeting
  if (S.promptActive && S.promptWandering) {
    const now = Date.now();
    if (now - S.promptWanderTimer > 800) {
      S.promptWanderAngle = Math.random() * Math.PI * 2;
      S.promptWanderTimer = now;
    }
    S.shark.x += Math.cos(S.promptWanderAngle) * S.shark.speed;
    S.shark.y += Math.sin(S.promptWanderAngle) * S.shark.speed;
    // Bounce off walls
    if (S.shark.x <= 20 || S.shark.x >= W - 20) S.promptWanderAngle = Math.PI - S.promptWanderAngle;
    if (S.shark.y <= 20 || S.shark.y >= H - 20) S.promptWanderAngle = -S.promptWanderAngle;
    S.shark.x = Math.max(20, Math.min(W - 20, S.shark.x));
    S.shark.y = Math.max(20, Math.min(H - 20, S.shark.y));
    let diff = S.promptWanderAngle - S.shark.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    S.shark.angle += diff * 0.15;
    S.shark.tailPhase += 0.12;
    return;
  }

  // Ghost: shark wanders randomly instead of chasing
  if (S.ghostActive) {
    const now = Date.now();
    if (!S.shark.ghostWanderAngle || now - S.shark.ghostWanderTimer > 900) {
      S.shark.ghostWanderAngle = Math.random() * Math.PI * 2;
      S.shark.ghostWanderTimer = now;
    }
    S.shark.x += Math.cos(S.shark.ghostWanderAngle) * S.shark.speed * 0.7;
    S.shark.y += Math.sin(S.shark.ghostWanderAngle) * S.shark.speed * 0.7;
    if (S.shark.x <= 20 || S.shark.x >= W - 20) S.shark.ghostWanderAngle = Math.PI - S.shark.ghostWanderAngle;
    if (S.shark.y <= 20 || S.shark.y >= H - 20) S.shark.ghostWanderAngle = -S.shark.ghostWanderAngle;
    S.shark.x = Math.max(20, Math.min(W - 20, S.shark.x));
    S.shark.y = Math.max(20, Math.min(H - 20, S.shark.y));
    let gda = S.shark.ghostWanderAngle - S.shark.angle;
    while (gda > Math.PI) gda -= Math.PI * 2;
    while (gda < -Math.PI) gda += Math.PI * 2;
    S.shark.angle += gda * 0.12;
    S.shark.tailPhase += 0.12;
    return;
  }

  const target = (S.decoyActive && S.decoyFish) ? S.decoyFish : S.fish;

  // ── Smart shark: multi-tier prediction ─────────────────────────
  // Tier 0 (lv 1-5):  linear prediction, high noise
  // Tier 1 (lv 6-10): geometric intercept + acceleration correction
  // Tier 2 (lv 11-15): intercept + treat-path blocking
  // Tier 3 (lv 16+):  full intercept + aggressive treat blocking, near-zero noise
  // Each tier ramps up smoothly within its 5-level window.
  let targetX = target.x, targetY = target.y;
  if (S.settings.smartShark && !S.decoyActive && S.smartSharkHistory.length >= 8) {
    const hist = S.smartSharkHistory;
    const n    = hist.length;
    const lv   = S.level;
    const tier = Math.min(3, Math.floor((lv - 1) / 4));        // 0–3, now ramps every 4 levels
    const tp   = Math.min(1, ((lv - 1) % 4) / 3);             // 0→1 within tier

    // 1. Velocity — smaller window at higher tiers for faster reaction
    const velWin = Math.max(2, Math.round(8 - tier * 2 - tp));
    const cur    = hist[n - 1];
    const older  = hist[Math.max(0, n - 1 - velWin)];
    const vx = (cur.x - older.x) / velWin;
    const vy = (cur.y - older.y) / velWin;

    // 2. Acceleration (tier 1+): second derivative for quadratic correction
    let ax = 0, ay = 0;
    if (tier >= 1 && n >= velWin * 2 + 2) {
      const mid    = hist[Math.max(0, n - 1 - velWin)];
      const oldest = hist[Math.max(0, n - 1 - velWin * 2)];
      const vxOld  = (mid.x - oldest.x) / velWin;
      const vyOld  = (mid.y - oldest.y) / velWin;
      ax = (vx - vxOld) / velWin * 0.5;
      ay = (vy - vyOld) / velWin * 0.5;
    }

    // 3. Noise — shrinks with tier and within-tier progress
    const noiseBase  = [18, 7, 2, 0][tier];
    const noiseScale = noiseBase * (1 - tp * 0.7);
    const nx = (Math.random() - 0.5) * 2 * noiseScale;
    const ny = (Math.random() - 0.5) * 2 * noiseScale;

    if (tier === 0) {
      // Tier 0: simple linear look-ahead, short window
      const lookahead = 16 + tp * 18;
      targetX = target.x + vx * lookahead + nx;
      targetY = target.y + vy * lookahead + ny;
    } else {
      // Tier 1+: solve for geometric intercept time
      // Find t where dist(fish(t), shark) = speed * t
      // fish(t) ≈ target + v*t  (linear; accel added as post-correction)
      const spd = S.shark.speed;
      const dx  = target.x - S.shark.x;
      const dy  = target.y - S.shark.y;
      const a   = vx * vx + vy * vy - spd * spd;
      const b   = 2 * (dx * vx + dy * vy);
      const c   = dx * dx + dy * dy;
      const maxLook = [0, 60, 90, 130][tier] + tp * 20;

      let t = 0;
      if (Math.abs(a) < 0.01) {
        t = b !== 0 ? Math.max(0, -c / b) : 0;
      } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
          const t1 = (-b - Math.sqrt(disc)) / (2 * a);
          const t2 = (-b + Math.sqrt(disc)) / (2 * a);
          const tPos = [t1, t2].filter(v => v > 0);
          t = tPos.length ? Math.min(...tPos) : 0;
        }
      }
      t = Math.min(Math.max(0, t), maxLook);

      // Apply linear + quadratic correction from acceleration
      targetX = target.x + vx * t + 0.5 * ax * t * t + nx;
      targetY = target.y + vy * t + 0.5 * ay * t * t + ny;
    }

    // 4. Treat-path blocking (tier 2+)
    // Detect which treat the fish is heading toward and cut off the path.
    if (tier >= 2 && S.treats?.length) {
      const treatBlend = (0.36 + tp * 0.1) + (tier === 3 ? 0.28 : 0);
      let bestTreat = null, bestScore = -Infinity;
      const speed = Math.hypot(vx, vy) || 0.01;
      for (const tr of S.treats) {
        if (tr.collected) continue;
        const tx = tr.x - target.x, ty = tr.y - target.y;
        const d  = Math.hypot(tx, ty);
        if (d > 280) continue;
        const dot = (tx * vx + ty * vy) / (speed * d); // cos of angle, -1→1
        if (dot > 0.25) {
          const score = dot / d;
          if (score > bestScore) { bestScore = score; bestTreat = tr; }
        }
      }
      if (bestTreat) {
        // Aim for a point 35% of the way from fish to the treat
        const cutX = target.x + (bestTreat.x - target.x) * 0.48;
        const cutY = target.y + (bestTreat.y - target.y) * 0.48;
        targetX = targetX * (1 - treatBlend) + cutX * treatBlend;
        targetY = targetY * (1 - treatBlend) + cutY * treatBlend;
      }
    }

    targetX = Math.max(10, Math.min(W - 10, targetX));
    targetY = Math.max(10, Math.min(H - 10, targetY));
  }

  S.shark.chaseTimer += 0.02;
  const a = Math.atan2(targetY - S.shark.y, targetX - S.shark.x);
  const wobble = Math.sin(S.shark.chaseTimer * 3) * 0.4;
  const dx = Math.cos(a + wobble) * S.shark.speed;
  const dy = Math.sin(a + wobble) * S.shark.speed;
  S.shark.x += dx;
  S.shark.y += dy;

  let targetAngle = a;
  let diff = targetAngle - S.shark.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  S.shark.angle += diff * 0.15;

  S.shark.tailPhase += 0.12;

  S.shark.x = Math.max(20, Math.min(W - 20, S.shark.x));
  S.shark.y = Math.max(20, Math.min(H - 20, S.shark.y));

  // Shark eats decoy — decoy survives, teleports to new spot
  if (S.decoyActive && S.decoyFish && dist(S.shark, S.decoyFish) < 25) {
    spawnParticles(S.decoyFish.x, S.decoyFish.y, '#ffaa44', 12);
    S.scorePopups.push({ x: S.decoyFish.x, y: S.decoyFish.y - 14, pts: 'CHOMP!', life: 0.8, decay: 0.03 });
    S.decoyFish.x = Math.max(40, Math.min(W - 40, S.fish.x + rand(-120, 120)));
    S.decoyFish.y = Math.max(40, Math.min(H - 40, S.fish.y + rand(-80, 80)));
  }

  // Collision with fish
  if (dist(S.shark, S.fish) < 30) {
    if (S.starActive) {
      const ba = Math.atan2(S.shark.y - S.fish.y, S.shark.x - S.fish.x);
      S.shark.x += Math.cos(ba) * 80;
      S.shark.y += Math.sin(ba) * 80;
      S.shark.x = Math.max(20, Math.min(W - 20, S.shark.x));
      S.shark.y = Math.max(20, Math.min(H - 20, S.shark.y));
      spawnParticles(S.fish.x, S.fish.y, '#ffee44', 12);
      S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'BOUNCE!', life: 0.8, decay: 0.03 });
    } else if (S.shieldActive) {
      useShield();
    } else {
      endGame(false, 'The shark got you!');
    }
  }
}

function updateBuddy() {
  if (!S.buddyActive || !S.buddy || S.gamePaused) return;

  // Find nearest uncollected treat
  let nearest = null, nearestD = Infinity;
  for (const t of S.treats) {
    if (t.collected) continue;
    const d = dist(t, S.buddy);
    if (d < nearestD) { nearestD = d; nearest = t; }
  }

  if (nearest) {
    // Slowly drift toward the nearest treat
    const dx = nearest.x - S.buddy.x;
    const dy = nearest.y - S.buddy.y;
    const d = Math.hypot(dx, dy);
    const speed = 1.2;
    if (d > speed) {
      S.buddy.x += (dx / d) * speed;
      S.buddy.y += (dy / d) * speed;
    }
    if (nearestD < 22) collectTreat(nearest);
  }

  S.buddy.x = Math.max(20, Math.min(W - 20, S.buddy.x));
  S.buddy.y = Math.max(20, Math.min(H - 20, S.buddy.y));
  S.buddy.dir = nearest && nearest.x < S.buddy.x ? -1 : 1;
  S.buddy.tailPhase += 0.15;
}

function updateTreats() {
  if (S.gamePaused) return;

  const collectTarget = S.bodySwapActive ? S.shark : S.fish;

  if (S.magnetActive) {
    for (const t of S.treats) {
      if (t.collected) continue;
      const dx = collectTarget.x - t.x, dy = collectTarget.y - t.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) { t.x += dx / d * 18; t.y += dy / d * 18; }
    }
  }

  for (const t of S.treats) {
    if (!t.collected && dist(t, collectTarget) < 24) collectTreat(t);
  }

  S.treats = S.treats.filter(t => !t.collected);
  treatsLeftEl.textContent = S.treats.length;

  if (S.treats.length === 0 && !S.claudeActive) endGame(true, '');

  const now = Date.now();
  if (now - S.comboTimer > COMBO_WINDOW && S.comboCount > 0) {
    S.comboCount = 0;
    st.combo.textContent = '⚡x1';
    st.combo.classList.remove('s-on', 's-combo');
  }
}


// ═══════════════════════════════════════════════════════════════
// MAIN GAME LOOP
// ═══════════════════════════════════════════════════════════════

let lastTimestamp = 0;

function loop(timestamp) {
  if (!S.gameRunning) return;

  const dt = (lastTimestamp && timestamp) ? Math.min((timestamp - lastTimestamp) / (1000 / 60), 3) : 1;
  lastTimestamp = timestamp;

  updateSwapAnim();
  updateHookAnim();
  if ((!S.gamePaused && !S.bodySwapAnim) || S.swapAnim) {
    // Track fish position history for smart shark prediction
    if (S.settings.smartShark && S.fish && S.gameRunning) {
      S.smartSharkHistory.push({ x: S.fish.x, y: S.fish.y });
      if (S.smartSharkHistory.length > 120) S.smartSharkHistory.shift();
    }
    updateTutorial();
    updateFish(dt);
    updateShark();
    updateBuddy();
    updateTreats();
    if (S.shark && S.fish) onSharkDistanceFrame(dist(S.shark, S.fish));
    updateParticles();
    if (S.frenzyActive && S.fish) spawnFrenzyTrail(S.fish.x, S.fish.y);
    trySpawnPowerups();
    updatePWItems();
  }

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
  drawBombAnim();
  drawBodySwapAnim();
  drawHellAnim();
  drawCardAnim();
  if (S.cardAnim?.resolved) {
    const card = S.cardAnim.cards[S.cardAnim.flipCard];
    S.cardAnim    = null;
    S.gamePaused  = false;
    S.timerFrozen = false;
    stopCardMusic();
    startMusic();
    card.fn();
    if (card.rare === 'death') achDeathCard();
    if (S.cardDeathPending) {
      S.cardDeathPending = false;
      endGame(false, 'The cards decided.');
    }
  }
  drawWarning();
  drawFrenzyOverlay();
  drawRainbowOverlay();
  drawClaudeOverlay();
  drawIceOverlay();
  drawHourglassOverlay();
  drawGhostIndicator();
  drawCrazyOverlay();
  drawPowerupTimerBars();
  drawScorePopups();
  drawTutorialHints();
  drawLevelBanner();
  drawScanlines();

  S.gameLoop = requestAnimationFrame(loop);
}


// ═══════════════════════════════════════════════════════════════
// INPUT HANDLING
// ═══════════════════════════════════════════════════════════════

initControls();
initSettings();
initAuthUI();
initAchievements();
initCursor();
initMobileScale();
refreshDifficultyUI(); // run after initSettings so saved difficulty is loaded
window.addEventListener('settingsMultiplierChanged', refreshMultiplierHint);


// ═══════════════════════════════════════════════════════════════
// UI EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

document.getElementById('welcome-reopen-btn')?.addEventListener('click', () => {
  showWelcomeOverlay();
});

startBtn.addEventListener('click', () => {
  stopHallOfFameAnim();
  initAudio();
  sfxMenuClick();
  overlay.classList.add('hidden');
  playCRTWipe(() => initGame());
});

rulesBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
  buildRulesHTML();
  rulesOverlay.classList.remove('hidden');
});

rulesBackBtn.addEventListener('click', () => {
  rulesOverlay.classList.add('hidden');
  overlay.classList.remove('hidden');
});

// ─── EASTER EGG — School of fish on home screen ─────────────────────────────
(function scheduleSchool() {
  const wait = 18000 + Math.random() * 22000; // 18–40 s between schools
  setTimeout(() => {
    const menuOv = document.getElementById('overlay');
    if (!menuOv?.classList.contains('hidden')) {
      const goRight = Math.random() < 0.5;
      const count   = 4 + Math.floor(Math.random() * 6);
      const yPct    = 12 + Math.random() * 68;
      const emojis  = ['🐟','🐠','🐡'];
      const baseDur = 3500 + Math.random() * 2000;
      // 🐟 emoji faces LEFT by default — flip it when swimming right
      const flip = goRight ? 'scaleX(-1)' : 'scaleX(1)';

      for (let i = 0; i < count; i++) {
        const swimDur  = baseDur + Math.random() * 400;
        const swimDely = i * 90 + Math.random() * 40;
        const bobDur   = 600 + Math.random() * 500;
        const bobAmt   = (4 + Math.random() * 6).toFixed(1) + 'px';
        const size     = 13 + Math.random() * 10;
        const offY     = (Math.random() - 0.5) * 36;
        const emoji    = emojis[Math.floor(Math.random() * emojis.length)];

        // Outer wrapper: swim (left/right property) + static flip (transform)
        const wrap = document.createElement('span');
        wrap.className = 'easter-fish';
        wrap.style.cssText = [
          `top: calc(${yPct}% + ${offY}px)`,
          `font-size: ${size}px`,
          `transform: ${flip}`,
          goRight ? 'left: -60px' : 'right: -60px',
          `animation: ${goRight ? 'easter-swim-right' : 'easter-swim-left'} ${swimDur}ms linear ${swimDely}ms forwards`,
        ].join(';');

        // Inner span: bob only (translateY, no conflict with outer flip)
        const inner = document.createElement('span');
        inner.className = 'easter-fish-inner';
        inner.textContent = emoji;
        inner.style.setProperty('--bob-dur', bobDur + 'ms');
        inner.style.setProperty('--bob-amt', bobAmt);

        wrap.appendChild(inner);
        menuOv.appendChild(wrap);
        setTimeout(() => wrap.remove(), swimDur + swimDely + 200);
      }
    }
    scheduleSchool();
  }, wait);
})();

// ─── PATCH NOTES ────────────────────────────────────────────────────────────
function renderNotes(notes, container) {
  container.innerHTML = '<div class="patch-notes-title">📋 PATCH NOTES</div>' +
    notes.map(n => `
      <div class="patch-note${n.thanks ? ' patch-note-thanks' : ''}">
        <div class="patch-note-version">${n.emoji || ''} ${n.v}${n.title ? ' — ' + n.title : ''}</div>
        <div class="patch-note-date">${n.date || ''}</div>
        <ul class="patch-note-list">${(n.items || []).map(i => `<li>${i}</li>`).join('')}</ul>
      </div>`).join('');
}

document.getElementById('achievements-btn')?.addEventListener('click', () => {
  overlay.classList.add('hidden');
  const achOv = document.getElementById('achievements-overlay');
  const achContent = document.getElementById('achievements-content');
  if (achContent) achContent.innerHTML = buildAchievementsHTML();
  achOv?.classList.remove('hidden');
});
document.getElementById('achievements-back-btn')?.addEventListener('click', () => {
  document.getElementById('achievements-overlay')?.classList.add('hidden');
  overlay.classList.remove('hidden');
});

document.getElementById('stats-btn')?.addEventListener('click', () => {
  overlay.classList.add('hidden');
  const statsOv = document.getElementById('stats-overlay');
  const statsContent = document.getElementById('stats-content');
  if (statsContent) statsContent.innerHTML = buildStatsHTML();
  statsOv?.classList.remove('hidden');
});
document.getElementById('stats-back-btn')?.addEventListener('click', () => {
  document.getElementById('stats-overlay')?.classList.add('hidden');
  overlay.classList.remove('hidden');
});

// Patch notes new-version badge
(function() {
  const SEEN_KEY = 'fishFrenzyLastPatchSeen';
  const latest = LOCAL_PATCH_NOTES[0]?.v;
  const seen   = localStorage.getItem(SEEN_KEY);
  const btn    = document.getElementById('patch-notes-btn');
  if (btn && latest && seen !== latest) {
    btn.classList.add('patch-notes-new');
  }
})();

document.getElementById('patch-notes-btn')?.addEventListener('click', () => {
  overlay.classList.add('hidden');
  const patchOv = document.getElementById('patch-notes-overlay');
  patchOv?.classList.remove('hidden');
  const container = patchOv?.querySelector('.patch-notes-container');
  if (!container) return;

  // Dismiss the new-version badge
  const latest = LOCAL_PATCH_NOTES[0]?.v;
  if (latest) localStorage.setItem('fishFrenzyLastPatchSeen', latest);
  document.getElementById('patch-notes-btn')?.classList.remove('patch-notes-new');

  renderNotes(LOCAL_PATCH_NOTES, container);
});
document.getElementById('patch-notes-back-btn')?.addEventListener('click', () => {
  document.getElementById('patch-notes-overlay')?.classList.add('hidden');
  overlay.classList.remove('hidden');
});

scoreboardBtn.addEventListener('click', async () => {
  overlay.classList.add('hidden');
  await showScoreboard();
});

closeScoreboardBtn.addEventListener('click', () => {
  scoreboardOverlay.classList.add('hidden');
  overlay.classList.remove('hidden');
});

document.getElementById('view-all-scores-btn')?.addEventListener('click', () => {
  showFullLeaderboard();
});


// Admin login
adminLoginBtn.addEventListener('click', async () => {
  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value;

  if (!email || !password) { showAdminError('ENTER EMAIL AND PASSWORD'); return; }

  adminLoginBtn.disabled = true;
  hideAdminError();

  try {
    await verifyAdminCredentials(email, password);
    S.adminCredentials = { email, password };
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

// Wire up admin panel events (maintenance toggle, wipe, save, reset, close)
setupAdminEvents();
setupFeedbackForm();
