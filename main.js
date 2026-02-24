// ═══════════════════════════════════════════════════════════════
// MAIN — Entry point. Wires all modules together.
// ═══════════════════════════════════════════════════════════════

import S from './js/state.js';
import {
  W, H, FISH_BASE_SPEED, FISH_ACCEL_RATE, FISH_MAX_SPEED_BONUS,
  FRENZY_SPEED_BOOST, SHARK_START_DELAY, COMBO_WINDOW,
  rand, dist
} from './js/constants.js';
import {
  ctx, overlay, winOverlay, endScreenOverlay, scoreboardOverlay,
  rulesOverlay, adminOverlay, scoreEl, timerEl, timerBar,
  levelEl, treatsLeftEl, startBtn, rulesBtn, rulesBackBtn,
  scoreboardBtn, closeScoreboardBtn, adminEmailInput,
  adminPasswordInput, adminLoginBtn, st
} from './js/dom.js';
import { spawnParticles, updateParticles, drawParticles, drawScorePopups } from './js/particles.js';
import {
  playCRTWipe, playCRTGameOver, drawChomp,
  updateSwapAnim, drawSwapEffect, updateHookAnim, drawHookLine
} from './js/animations.js';
import {
  pwConfig, loadRarities, trySpawnPowerups, updatePWItems,
  clearAllPowerupTimeouts, clearTO, useShield, deactivateDecoy,
  overlapsExisting, setEndGame, setSpawnTreat
} from './js/powerups.js';
import {
  drawWater, drawFish, drawBuddy, drawDecoy, drawShark,
  drawTreats, drawPWItems, drawWarning, drawFrenzyOverlay, drawIceOverlay,
  drawHourglassOverlay, drawCrazyOverlay, drawFishGlow, drawMagnetLines,
  drawScanlines, drawClosestTreatArrow, drawPowerupTimerBars
} from './js/drawing.js';
import { collectTreat } from './js/scoring.js';
import {
  showNameEntry, showScoreboard, showLoading, hideLoading,
  showAdminError, hideAdminError, buildRulesHTML, openAdminPanel,
  setupAdminEvents, setInitGame
} from './js/overlays.js';
import {
  initAuth, fetchHighScores, fetchMaintenance, setMaintenance,
  verifyAdminCredentials
} from './firebase-config.js';


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
  S.maxTime = Math.max(18, 35 - S.level);
  S.timeLeft = S.maxTime;
  timerEl.textContent = S.timeLeft;
  timerBar.style.width = '100%';
  timerBar.classList.remove('danger', 'frozen');
  scoreEl.textContent = S.score;
  levelEl.textContent = S.level;

  S.fish = {
    x: W / 2, y: H / 2, w: 36, h: 22,
    vx: 0, vy: 0, dir: 1, angle: 0, tailPhase: 0,
    speed: 2.5, friction: 0.88
  };

  const sharkSpeed = 0.75 + S.level * 0.2;
  S.shark = {
    x: rand(60, W - 60), y: rand(60, H - 60),
    speed: sharkSpeed, savedSpeed: sharkSpeed, savedSpeed2: sharkSpeed,
    angle: 0, tailPhase: 0, chaseTimer: 0, hidden: false
  };
  S.sharkDelay = SHARK_START_DELAY;

  while (dist(S.shark, S.fish) < 150) {
    S.shark.x = rand(60, W - 60); S.shark.y = rand(60, H - 60);
  }

  S.treats = [];
  const treatCount = 5 + S.level * 2;
  for (let i = 0; i < treatCount; i++) spawnTreat();
  treatsLeftEl.textContent = S.treats.length;

  S.particles = []; S.bubbles = []; S.scorePopups = [];
  S.buddy = null; S.decoyFish = null;

  for (const k in S.pwItems) S.pwItems[k] = null;
  S.frenzyActive = S.iceActive = S.shieldActive = S.magnetActive = false;
  S.ghostActive = S.hourglassActive = S.buddyActive = S.bombActive = false;
  S.crazyActive = S.timerFrozen = false;
  S.decoyActive = S.starActive = S.hookActive = S.goopActive = false;
  S.comboCount = 0; S.comboTimer = 0;
  S.accelBonus = 0; S.lastMoveDir = { x: 0, y: 0 };
  S.lastSpawnedPW = null;
  S.gamePaused = false; S.goopActive = false;
  S.hookLine = null; S.swapAnim = null; S.chompAnim = null;

  S.frenzyTO = clearTO(S.frenzyTO); S.iceTO = clearTO(S.iceTO);
  S.ghostTO = clearTO(S.ghostTO); S.hourglassTO = clearTO(S.hourglassTO);
  S.buddyTO = clearTO(S.buddyTO); S.bombTO = clearTO(S.bombTO);
  S.crazyTO = clearTO(S.crazyTO); S.decoyTO = clearTO(S.decoyTO);
  S.starTO = clearTO(S.starTO); S.goopTO = clearTO(S.goopTO);

  for (const s of Object.values(st)) {
    s.classList.remove('s-on', 's-frenzy', 's-ice', 's-shield', 's-magnet',
      's-ghost', 's-time', 's-buddy', 's-bomb', 's-combo', 's-crazy',
      's-decoy', 's-star', 's-poison', 's-hook', 's-swap', 's-double', 's-wave', 's-goop');
    s.style.color = '';
  }
  st.combo.textContent = '⚡x1';
  S.fish.speed = FISH_BASE_SPEED;

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
  S.decoyFish = null;

  for (const s of Object.values(st)) {
    s.classList.remove('s-on', 's-frenzy', 's-ice', 's-shield', 's-magnet',
      's-ghost', 's-time', 's-buddy', 's-bomb', 's-combo', 's-crazy',
      's-decoy', 's-star', 's-poison', 's-hook', 's-swap', 's-double', 's-wave', 's-goop');
    s.style.color = '';
  }

  if (!won) {
    S.chompAnim = { timer: 0, x: S.fish.x, y: S.fish.y };
    playCRTGameOver(() => showNameEntry(S.score, S.level, msg));
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

function updateFish() {
  if (S.gamePaused) return;

  let moveX = 0, moveY = 0;
  if (S.keys['arrowleft'] || S.keys['a'])  moveX -= 1;
  if (S.keys['arrowright'] || S.keys['d']) moveX += 1;
  if (S.keys['arrowup'] || S.keys['w'])    moveY -= 1;
  if (S.keys['arrowdown'] || S.keys['s'])  moveY += 1;

  if (moveX !== 0 || moveY !== 0) {
    if (moveX === S.lastMoveDir.x && moveY === S.lastMoveDir.y) {
      S.accelBonus = Math.min(S.accelBonus + FISH_ACCEL_RATE, FISH_MAX_SPEED_BONUS);
    } else {
      S.accelBonus *= 0.5;
    }
    S.lastMoveDir = { x: moveX, y: moveY };
  } else {
    S.accelBonus *= 0.95;
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

function updateShark() {
  if (S.shark.hidden || S.hourglassActive || S.gamePaused) return;

  if (S.sharkDelay > 0) { S.sharkDelay--; S.shark.tailPhase += 0.06; return; }

  const target = (S.decoyActive && S.decoyFish) ? S.decoyFish : S.fish;

  S.shark.chaseTimer += 0.02;
  const a = Math.atan2(target.y - S.shark.y, target.x - S.shark.x);
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

  const targetX = W - S.fish.x;
  const targetY = H - S.fish.y;
  S.buddy.x += (targetX - S.buddy.x) * 0.1;
  S.buddy.y += (targetY - S.buddy.y) * 0.1;
  S.buddy.x = Math.max(20, Math.min(W - 20, S.buddy.x));
  S.buddy.y = Math.max(20, Math.min(H - 20, S.buddy.y));
  S.buddy.dir = S.buddy.x > W / 2 ? -1 : 1;
  S.buddy.tailPhase += 0.2;

  for (const t of S.treats) {
    if (!t.collected && dist(t, S.buddy) < 24) collectTreat(t);
  }
}

function updateTreats() {
  if (S.gamePaused) return;

  if (S.magnetActive) {
    for (const t of S.treats) {
      if (t.collected) continue;
      const dx = S.fish.x - t.x, dy = S.fish.y - t.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) { t.x += dx / d * 18; t.y += dy / d * 18; }
    }
  }

  for (const t of S.treats) {
    if (!t.collected && dist(t, S.fish) < 24) collectTreat(t);
  }

  S.treats = S.treats.filter(t => !t.collected);
  treatsLeftEl.textContent = S.treats.length;

  if (S.treats.length === 0) endGame(true, '');

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

function loop() {
  if (!S.gameRunning) return;

  updateSwapAnim();
  updateHookAnim();
  if (!S.gamePaused || S.swapAnim) {
    updateFish();
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
  drawWarning();
  drawFrenzyOverlay();
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

document.addEventListener('keydown', e => {
  if (S.nameEntryActive || !e.key) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const k = e.key;

  // Enter/Space on overlay screens
  if (!S.gameRunning && (k === 'Enter' || k === ' ')) {
    const nextBtn = document.getElementById('next-level-btn');
    if (nextBtn && !winOverlay.classList.contains('hidden')) {
      e.preventDefault(); nextBtn.click(); return;
    }
    const playBtn = document.getElementById('play-again-btn');
    if (playBtn && !endScreenOverlay.classList.contains('hidden')) {
      e.preventDefault(); playBtn.click(); return;
    }
    if (!overlay.classList.contains('hidden')) {
      e.preventDefault(); startBtn.click(); return;
    }
  }

  // Escape on end screen
  if (!S.gameRunning && k === 'Escape') {
    const menuBtn = document.getElementById('main-menu-btn');
    if (menuBtn && !endScreenOverlay.classList.contains('hidden')) {
      e.preventDefault(); menuBtn.click(); return;
    }
  }

  // ESC toggles pause
  if (k === 'Escape' && S.gameRunning) {
    if (S.gamePaused && !S.swapAnim) {
      S.gamePaused = false;
      if (!S.hourglassActive) S.timerFrozen = false;
      S.keys = {};
      const po = document.getElementById('pause-overlay');
      if (po) po.classList.add('hidden');
    } else if (!S.gamePaused) {
      S.gamePaused = true;
      S.timerFrozen = true;
      const po = document.getElementById('pause-overlay');
      if (po) po.classList.remove('hidden');
    }
    e.preventDefault();
    return;
  }

  S.keys[k.toLowerCase()] = true;
  e.preventDefault();
});

document.addEventListener('keyup', e => {
  if (!e.key) return;
  S.keys[e.key.toLowerCase()] = false;
});


// ═══════════════════════════════════════════════════════════════
// PAUSE / VISIBILITY
// ═══════════════════════════════════════════════════════════════

document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.gameRunning && !S.gamePaused) {
    S.gamePaused = true;
    S.timerFrozen = true;
    const po = document.getElementById('pause-overlay');
    if (po) po.classList.remove('hidden');
  }
});

document.getElementById('pause-continue-btn')?.addEventListener('click', () => {
  if (!S.gameRunning) return;
  S.gamePaused = false;
  if (!S.hourglassActive) S.timerFrozen = false;
  S.keys = {};
  const po = document.getElementById('pause-overlay');
  if (po) po.classList.add('hidden');
});


// ═══════════════════════════════════════════════════════════════
// UI EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

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

// Admin panel button (on scoreboard page)
document.getElementById('admin-panel-btn')?.addEventListener('click', () => {
  scoreboardOverlay.classList.add('hidden');
  adminOverlay.classList.remove('hidden');
  hideAdminError();
  adminEmailInput.value = '';
  adminPasswordInput.value = '';
  adminEmailInput.focus();
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
