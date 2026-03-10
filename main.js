// ═══════════════════════════════════════════════════════════════
// MAIN — Entry point. Wires all modules together.
// ═══════════════════════════════════════════════════════════════

import S from './js/state.js';
import {
  W, H,
  FRENZY_SPEED_BOOST, SHARK_START_DELAY, COMBO_WINDOW,
  rand, dist
} from './js/constants.js';
import { gameVars } from './js/game-vars.js';
import {
  ctx, overlay, winOverlay, scoreboardOverlay,
  rulesOverlay, adminOverlay, scoreEl, timerEl, timerBar,
  levelEl, treatsLeftEl, startBtn, rulesBtn, rulesBackBtn,
  scoreboardBtn, closeScoreboardBtn, adminEmailInput,
  adminPasswordInput, adminLoginBtn, st
} from './js/dom.js';
import { spawnParticles, updateParticles, drawParticles, drawScorePopups } from './js/particles.js';
import {
  playCRTWipe, playCRTGameOver, drawChomp, playTimeUpDeath,
  updateSwapAnim, drawSwapEffect, updateHookAnim, drawHookLine
} from './js/animations.js';
import {
  pwConfig, loadRarities, trySpawnPowerups, updatePWItems,
  clearAllPowerupTimeouts, clearTO, useShield, deactivateDecoy, deactivatePrompt,
  overlapsExisting, setEndGame, setSpawnTreat
} from './js/powerups.js';
import {
  drawWater, drawFish, drawBuddy, drawDecoy, drawShark,
  drawTreats, drawPWItems, drawWarning, drawFrenzyOverlay, drawIceOverlay,
  drawHourglassOverlay, drawCrazyOverlay, drawFishGlow, drawMagnetLines,
  drawScanlines, drawClosestTreatArrow, drawPowerupTimerBars, drawRainbowOverlay,
  drawClaudeOverlay, drawBodySwapAnim, drawBombAnim, drawHellAnim, drawCardAnim
} from './js/drawing.js';
import { collectTreat } from './js/scoring.js';
import {
  showNameEntry, showScoreboard, showFullLeaderboard, showLoading, hideLoading,
  showAdminError, hideAdminError, buildRulesHTML, openAdminPanel,
  setupAdminEvents, setInitGame
} from './js/overlays.js';
import {
  initAuth, fetchHighScores, fetchMaintenance, setMaintenance,
  verifyAdminCredentials
} from './firebase-config.js';
import { initControls } from './js/controls.js';
import { initSettings } from './js/settings.js';
import { initCursor } from './js/cursor.js';


// ═══════════════════════════════════════════════════════════════
// WIRE UP FORWARD REFERENCES
// Powerups needs endGame and spawnTreat, overlays needs initGame.
// We pass them in to avoid circular imports.
// ═══════════════════════════════════════════════════════════════

setEndGame(endGame);
setSpawnTreat(spawnTreat);
setInitGame(initGame);


// ═══════════════════════════════════════════════════════════════
// BOOT — Firebase auth, maintenance check, welcome
// ═══════════════════════════════════════════════════════════════

(async function boot() {
  await initAuth();
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
  if (!localStorage.getItem('fishFrenzyWelcomed')) {
    showWelcomeOverlay();
  }
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

  try {
    const scores = await fetchHighScores();
    S.globalHighScore = (scores.length > 0) ? scores[0].score : 0;
  } catch (_) {
    S.globalHighScore = 0;
  }

  startLevel();
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

  const sharkSpeed = (gameVars.fishSpeed + gameVars.sharkSpeedBase) + S.level * gameVars.sharkSpeedPerLevel;
  S.shark = {
    x: rand(60, W - 60), y: rand(60, H - 60),
    speed: sharkSpeed, savedSpeed: sharkSpeed, savedSpeed2: sharkSpeed,
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
  S.crazyActive = S.timerFrozen = false;
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
  S.gameRunning = false;
  clearInterval(S.timerInterval);
  cancelAnimationFrame(S.gameLoop);

  clearAllPowerupTimeouts();
  S.frenzyActive = S.iceActive = S.ghostActive = S.hourglassActive = false;
  S.buddyActive = S.bombActive = S.crazyActive = S.timerFrozen = false;
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
      playTimeUpDeath(fx, fy, () => playCRTGameOver(() => showNameEntry(S.score, S.level, msg)));
    } else {
      S.chompAnim = { timer: 0, x: S.fish.x, y: S.fish.y };
      playCRTGameOver(() => showNameEntry(S.score, S.level, msg));
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
        endGame(false, 'The fish got you!');
      }
    }
    return;
  }

  let moveX = 0, moveY = 0;
  if (S.keys['arrowleft'] || S.keys['a'])  moveX -= 1;
  if (S.keys['arrowright'] || S.keys['d']) moveX += 1;
  if (S.keys['arrowup'] || S.keys['w'])    moveY -= 1;
  if (S.keys['arrowdown'] || S.keys['s'])  moveY += 1;

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

  if (moveX < 0) { S.fish.vx -= s * 0.3; S.fish.dir = -1; }
  if (moveX > 0) { S.fish.vx += s * 0.3; S.fish.dir = 1; }
  if (moveY < 0) S.fish.vy -= s * 0.3;
  if (moveY > 0) S.fish.vy += s * 0.3;

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

  // Smart shark: kinematic prediction of fish position
  let targetX = target.x, targetY = target.y;
  if (S.settings.smartShark && !S.decoyActive && S.smartSharkHistory.length >= 4) {
    const hist = S.smartSharkHistory;
    const n = hist.length;
    // Velocity window shrinks with level so the shark reacts to direction changes faster
    const velWindow = Math.max(2, Math.round(12 - S.level * 0.8));
    const older = hist[Math.max(0, n - 1 - velWindow)];
    const cur   = hist[n - 1];
    const vx = (cur.x - older.x) / velWindow;
    const vy = (cur.y - older.y) / velWindow;
    // Lookahead: level 1 = 6 frames (~0.1s), level 10 = 60 frames (~1s)
    const lookahead = S.level * 6;
    // Prediction noise: high at level 1, near-zero at level 10
    const noiseScale = Math.max(0, (10 - S.level) * 3);
    const nx = (Math.random() - 0.5) * noiseScale;
    const ny = (Math.random() - 0.5) * noiseScale;
    targetX = Math.max(10, Math.min(W - 10, target.x + vx * lookahead + nx));
    targetY = Math.max(10, Math.min(H - 10, target.y + vy * lookahead + ny));
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

  // Shark eats decoy
  if (S.decoyActive && S.decoyFish && dist(S.shark, S.decoyFish) < 25) {
    spawnParticles(S.decoyFish.x, S.decoyFish.y, '#ffaa44', 12);
    S.scorePopups.push({ x: S.decoyFish.x, y: S.decoyFish.y - 14, pts: 'CHOMP!', life: 0.8, decay: 0.03 });
    deactivateDecoy();
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
      if (S.smartSharkHistory.length > 90) S.smartSharkHistory.shift();
    }
    updateFish(dt);
    updateShark();
    updateBuddy();
    updateTreats();
    updateParticles();
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
    card.fn();
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
  drawCrazyOverlay();
  drawPowerupTimerBars();
  drawScorePopups();
  drawScanlines();

  S.gameLoop = requestAnimationFrame(loop);
}


// ═══════════════════════════════════════════════════════════════
// INPUT HANDLING
// ═══════════════════════════════════════════════════════════════

initControls();
initSettings();
initCursor();


// ═══════════════════════════════════════════════════════════════
// UI EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

document.getElementById('welcome-reopen-btn')?.addEventListener('click', () => {
  showWelcomeOverlay();
});

startBtn.addEventListener('click', () => {
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
