// ═══════════════════════════════════════════════════════════════
// POWERUPS — Activation functions, config, spawning, field mgmt
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { st, timerBar, timerEl, treatsLeftEl, scoreEl } from './dom.js';
import { collectTreat } from './scoring.js';
import { spawnParticles } from './particles.js';
import {
  FRENZY_DURATION, ICE_DURATION, GHOST_DURATION, HOURGLASS_DURATION,
  BUDDY_DURATION, BOMB_DURATION, CRAZY_DURATION, GOOP_DURATION,
  DECOY_DURATION, STAR_DURATION,
  CRAZY_ITEM_LIFETIME, CLAUDE_ITEM_LIFETIME,
  PROMPT_FREEZE_DURATION, PROMPT_WANDER_DURATION, BODY_SWAP_DURATION, RAINBOW_DURATION,
  HELL_DURATION,
  MAX_FIELD_ITEMS, RARITY, PW_SPAWN_CHANCE,
  FRENZY_SPEED_BOOST,
  W, H, rand, dist
} from './constants.js';
import { fetchGameConfig } from '../firebase-config.js';
import { gameVars, firebaseGameVars } from './game-vars.js';
import { sfxPowerup, setMusicTempo, startCardMusic } from './audio.js';
import { SKINS } from './skins.js';
import { onPowerupCollected as achPowerup, onHellSurvived as achHell } from './achievements.js';

// ─── HELPERS ───
export function clearTO(t) { if (t) clearTimeout(t); return null; }
function stOn(key, cls)  { if (st[key]) st[key].classList.add('s-on', cls); }
function stOff(key, cls) { if (st[key]) st[key].classList.remove('s-on', cls); }

export function getCurrentFishSpeed() {
  let speed = gameVars.fishSpeed;
  if (S.frenzyActive) speed += FRENZY_SPEED_BOOST;
  if (S.goopActive)   speed *= 0.5;
  return speed;
}

// Forward reference for endGame (set by main.js to avoid circular import)
let _endGame = null;
export function setEndGame(fn) { _endGame = fn; }

// Forward reference for spawnTreat

// Tracked timeouts for Claude's typewriter effect (cleared on game end)
let _claudeTypewriterTOs = [];

// Tracked timeouts for body-swap end countdown (cleared on game end)
let _bodySwapCountdownTOs = [];

// Tracked timeouts for card rage bonus reset (cleared on game end)
let _cardRageTOs = [];

// ─── FRENZY ───
function activateFrenzy() {
  S.frenzyActive = true;
  S.frenzyTimer = Date.now();
  stOn('frenzy', 's-frenzy');
  S.frenzyTO = clearTO(S.frenzyTO);
  S.frenzyTO = setTimeout(deactivateFrenzy, FRENZY_DURATION);
}

function deactivateFrenzy() {
  S.frenzyActive = false;
  stOff('frenzy', 's-frenzy');
  S.frenzyTO = null;
}

// Compute what the shark speed should be given currently active effects.
// Used by all deactivation functions to avoid savedSpeed cross-contamination.
function restoreSharkSpeed() {
  const base = (gameVars.fishSpeed + gameVars.sharkSpeedBase) + gameVars.sharkSpeedPerLevel * Math.sqrt(S.level * 2);
  if (S.bodySwapActive || S.hourglassActive || S.promptActive) {
    S.shark.speed = 0;
  } else if (S.iceActive) {
    S.shark.speed = base * 0.25;
  } else {
    S.shark.speed = base;
  }
}

// ─── ICE ───
function activateIce() {
  S.iceActive = true;
  S.iceStartTime = Date.now();
  setMusicTempo(0.6);
  // If hourglass already has the shark stopped, grant bonus time instead of wasting the slow
  if (S.hourglassActive) {
    S.timeLeft = Math.min(S.maxTime, S.timeLeft + 4);
    timerEl.textContent = S.timeLeft;
    S.scorePopups.push({ x: W / 2, y: H / 2, pts: 'ICE COMBO! +4 SEC!', life: 1.5, decay: 0.02 });
    stOn('ice', 's-ice');
    S.iceTO = clearTO(S.iceTO);
    S.iceTO = setTimeout(deactivateIce, ICE_DURATION);
    return;
  }
  S.shark.speed *= 0.25;
  stOn('ice', 's-ice');
  S.iceTO = clearTO(S.iceTO);
  S.iceTO = setTimeout(deactivateIce, ICE_DURATION);
}

function deactivateIce() {
  S.iceActive = false;
  restoreSharkSpeed();
  stOff('ice', 's-ice');
  S.iceTO = null;
  if (!S.goopActive && !S.hourglassActive) setMusicTempo(1.0);
}

// ─── SHIELD ───
function activateShield() {
  S.shieldActive = true;
  stOn('shield', 's-shield');
}

export function useShield() {
  S.shieldActive = false;
  stOff('shield', 's-shield');
  spawnParticles(S.fish.x, S.fish.y, '#44ee88', 16);
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'SAVED', life: 1.5, decay: 0.02 });

  const a = Math.atan2(S.shark.y - S.fish.y, S.shark.x - S.fish.x);
  S.shark.x += Math.cos(a) * 80;
  S.shark.y += Math.sin(a) * 80;
  S.shark.x = Math.max(20, Math.min(W - 20, S.shark.x));
  S.shark.y = Math.max(20, Math.min(H - 20, S.shark.y));
}

// ─── MAGNET ───
function activateMagnet() {
  S.magnetActive = true;
  stOn('magnet', 's-magnet');
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'MAGNET!', life: 1, decay: 0.025 });
  S.magnetTO = clearTO(S.magnetTO);
  S.magnetTO = setTimeout(() => { S.magnetActive = false; stOff('magnet', 's-magnet'); S.magnetTO = null; }, 1500);
}

// ─── GHOST ───
function activateGhost() {
  S.ghostActive = true;
  S.ghostStartTime = Date.now();
  S.shark.hidden = true;
  stOn('ghost', 's-ghost');
  S.scorePopups.push({ x: S.shark.x, y: S.shark.y - 20, pts: 'POOF!', life: 1, decay: 0.03 });
  spawnParticles(S.shark.x, S.shark.y, '#ff8844', 16);
  S.ghostTO = clearTO(S.ghostTO);
  S.ghostTO = setTimeout(deactivateGhost, GHOST_DURATION);
}

function deactivateGhost() {
  S.ghostActive = false;
  S.shark.hidden = false;
  stOff('ghost', 's-ghost');
  S.ghostTO = null;
  spawnParticles(S.shark.x, S.shark.y, '#ff8844', 10);
}

// ─── HOURGLASS ───
function activateHourglass() {
  S.hourglassActive = true;
  S.timerFrozen = true;
  S.hourglassStartTime = Date.now();
  S.shark.speed = 0;
  setMusicTempo(0.6);
  timerBar.classList.add('frozen');
  stOn('time', 's-time');
  S.scorePopups.push({ x: W / 2, y: H / 2, pts: 'TIME STOP!', life: 1.2, decay: 0.025 });
  S.hourglassTO = clearTO(S.hourglassTO);
  S.hourglassTO = setTimeout(deactivateHourglass, HOURGLASS_DURATION);
}

function deactivateHourglass() {
  S.hourglassActive = false;
  S.timerFrozen = false;
  restoreSharkSpeed();
  timerBar.classList.remove('frozen');
  stOff('time', 's-time');
  S.hourglassTO = null;
  if (!S.iceActive && !S.goopActive) setMusicTempo(1.0);
}

// ─── BUDDY ───
function activateBuddy() {
  S.buddyActive = true;
  S.buddyStartTime = Date.now();
  // Spawn near the nearest uncollected treat, or at a random spot
  const targets = S.treats.filter(t => !t.collected);
  const spawnNear = targets.length ? targets[Math.floor(Math.random() * targets.length)] : null;
  const sx = spawnNear ? Math.max(20, Math.min(W - 20, spawnNear.x + rand(-40, 40))) : rand(60, W - 60);
  const sy = spawnNear ? Math.max(20, Math.min(H - 20, spawnNear.y + rand(-40, 40))) : rand(60, H - 60);
  S.buddy = { x: sx, y: sy, dir: 1, tailPhase: rand(0, Math.PI * 2) };
  stOn('buddy', 's-buddy');
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'BUDDY!', life: 1, decay: 0.03 });
  S.buddyTO = clearTO(S.buddyTO);
  S.buddyTO = setTimeout(deactivateBuddy, BUDDY_DURATION);
}

function deactivateBuddy() {
  S.buddyActive = false;
  if (S.buddy) spawnParticles(S.buddy.x, S.buddy.y, '#44ddaa', 8);
  S.buddy = null;
  stOff('buddy', 's-buddy');
  S.buddyTO = null;
}

// ─── BOMB ───
function activateBomb() {
  S.bombActive = true;
  S.bombStartTime = Date.now();
  S.bombAnim = { x: S.fish.x, y: S.fish.y, startTime: Date.now(), duration: 500 };
  stOn('bomb', 's-bomb');
  spawnParticles(S.fish.x, S.fish.y, '#ff4444', 20);
  spawnParticles(S.fish.x, S.fish.y, '#ffaa00', 14);
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'BOOM!', life: 1.2, decay: 0.025 });

  const corners = [
    { x: 30, y: 30 }, { x: W - 30, y: 30 },
    { x: 30, y: H - 30 }, { x: W - 30, y: H - 30 }
  ];
  let best = corners[0], bestD = 0;
  corners.forEach(c => {
    const d = dist(c, S.fish);
    if (d > bestD) { bestD = d; best = c; }
  });
  S.shark.x = best.x;
  S.shark.y = best.y;

  S.bombTO = clearTO(S.bombTO);
  S.bombTO = setTimeout(() => {
    S.bombActive = false;
    stOff('bomb', 's-bomb');
    S.bombTO = null;
  }, BOMB_DURATION);
}

// ─── CRAZY ───
function activateCrazy() {
  S.crazyActive = true;
  S.crazyStartTime = Date.now();
  stOn('crazy', 's-crazy');
  spawnParticles(S.fish.x, S.fish.y, '#ff00aa', 40);

  // Steal 5–7 seconds from the timer
  const stolen = 5 + Math.floor(Math.random() * 3); // 5, 6, or 7
  S.timeLeft = Math.max(1, S.timeLeft - stolen);

  // x20 score multiplier for 5 seconds
  S.crazyMultiplier = 20;

  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 36, pts: `🍄 x20 PTS! -${stolen}s`, life: 2.2, decay: 0.012 });

  // Countdown popups: 5 4 3 2 1
  [5, 4, 3, 2, 1].forEach((n, i) => {
    _bodySwapCountdownTOs.push(setTimeout(() => {
      if (!S.crazyActive) return;
      S.scorePopups.push({ x: W / 2, y: H / 2 - 20, pts: String(n), life: 0.95, decay: 0.025, col: '#ff00aa' });
    }, i * 1000));
  });

  S.crazyTO = clearTO(S.crazyTO);
  S.crazyTO = setTimeout(() => {
    S.crazyActive = false;
    S.crazyMultiplier = 1;
    stOff('crazy', 's-crazy');
    S.scorePopups.push({ x: W / 2, y: H / 2 - 20, pts: 'BACK TO NORMAL', life: 1.5, decay: 0.02 });
  }, CRAZY_DURATION);
}

// ─── DECOY ───
function activateDecoy() {
  S.decoyActive = true;
  S.decoyStartTime = Date.now();
  const ax = Math.atan2(S.shark.y - S.fish.y, S.shark.x - S.fish.x);
  S.decoyFish = {
    x: S.fish.x - Math.cos(ax) * 100,
    y: S.fish.y - Math.sin(ax) * 100,
    dir: S.fish.dir, tailPhase: rand(0, Math.PI * 2)
  };
  S.decoyFish.x = Math.max(30, Math.min(W - 30, S.decoyFish.x));
  S.decoyFish.y = Math.max(30, Math.min(H - 30, S.decoyFish.y));
  stOn('decoy', 's-decoy');
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'DECOY!', life: 1, decay: 0.03 });
  spawnParticles(S.decoyFish.x, S.decoyFish.y, '#ffaa44', 12);
  S.decoyTO = clearTO(S.decoyTO);
  S.decoyTO = setTimeout(deactivateDecoy, DECOY_DURATION);
}

export function deactivateDecoy() {
  S.decoyActive = false;
  if (S.decoyFish) spawnParticles(S.decoyFish.x, S.decoyFish.y, '#ffaa44', 8);
  S.decoyFish = null;
  stOff('decoy', 's-decoy');
  S.decoyTO = null;
}

// ─── SWAP ───
function activateSwap() {
  S.swapAnim = {
    phase: 'pause', timer: 0,
    oldFishX: S.fish.x, oldFishY: S.fish.y,
    oldSharkX: S.shark.x, oldSharkY: S.shark.y
  };
  S.gamePaused = true;
  S.timerFrozen = true;
}

// ─── STAR ───
function activateStar() {
  S.starActive = true;
  S.starStartTime = Date.now();
  stOn('star', 's-star');
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'STAR!', life: 1, decay: 0.03 });
  spawnParticles(S.fish.x, S.fish.y, '#ffee44', 20);
  S.starTO = clearTO(S.starTO);
  S.starTO = setTimeout(deactivateStar, STAR_DURATION);
}

function deactivateStar() {
  S.starActive = false;
  stOff('star', 's-star');
  S.starTO = null;
}

// ─── NICE ───
function activateNice() {
  S.score += 69;
  scoreEl.textContent = S.score;
  spawnParticles(S.fish.x, S.fish.y, '#ff88cc', 14);
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: '+69 😏', life: 1.4, decay: 0.02 });
}

// ─── DOUBLE ───
function activateDouble() {
  const currentTreats = [...S.treats];
  for (const t of currentTreats) {
    if (t.collected) continue;
    S.treats.push({
      x: t.x + rand(-20, 20), y: t.y + rand(-20, 20),
      r: 14, type: t.type, bobPhase: rand(0, Math.PI * 2), collected: false
    });
  }
  treatsLeftEl.textContent = S.treats.length;
  spawnParticles(S.fish.x, S.fish.y, '#44ddff', 16);
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'DOUBLE!', life: 1.2, decay: 0.025 });
  stOn('double', 's-double');
  setTimeout(() => stOff('double', 's-double'), 2000);
}

// ─── WAVE ───
function activateWave() {
  const target = S.bodySwapActive ? S.shark : S.fish;
  for (const t of S.treats) {
    if (t.collected) continue;
    const dx = target.x - t.x, dy = target.y - t.y;
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      t.x += (dx / d) * Math.min(d * 0.7, 160);
      t.y += (dy / d) * Math.min(d * 0.7, 160);
    }
    t.x = Math.max(20, Math.min(W - 20, t.x));
    t.y = Math.max(20, Math.min(H - 20, t.y));
    spawnParticles(t.x, t.y, '#4488ff', 3);
  }
  S.scorePopups.push({ x: W / 2, y: H / 2, pts: 'WAVE!', life: 1, decay: 0.03 });
  spawnParticles(target.x, target.y, '#4488ff', 20);
  stOn('wave', 's-wave');
  setTimeout(() => stOff('wave', 's-wave'), 1500);
}

// ─── POISON ───
function activatePoison() {
  S.timeLeft = Math.max(0, S.timeLeft - 3);
  timerEl.textContent = Math.max(0, S.timeLeft);
  timerBar.style.width = (S.timeLeft / S.maxTime * 100) + '%';
  spawnParticles(S.fish.x, S.fish.y, '#44ff00', 16);
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: '-3 SEC!', life: 1.5, decay: 0.02 });
  timerBar.classList.add('danger');
  stOn('poison', 's-poison');
  setTimeout(() => { if (S.timeLeft > 10) timerBar.classList.remove('danger'); }, 500);
  setTimeout(() => stOff('poison', 's-poison'), 1500);
  if (S.timeLeft <= 0 && _endGame) _endGame(false, "Poisoned!");
}

// ─── HOOK ───
function activateHook() {
  if (S.treats.length === 0) return;
  let nearest = null, nearestD = Infinity;
  for (const t of S.treats) {
    if (!t.collected) { const d = dist(t, S.fish); if (d < nearestD) { nearestD = d; nearest = t; } }
  }
  if (nearest) {
    S.hookLine = {
      fx: S.fish.x, fy: S.fish.y, tx: nearest.x, ty: nearest.y,
      progress: 0, phase: 'line', flickerTimer: 0
    };
    S.hookActive = true;
    S.gamePaused = true;
    S.timerFrozen = true;
  }
}

// ─── RAINBOW ───
function activateRainbow() {
  S.rainbowActive = true;
  S.rainbowStartTime = Date.now();
  stOn('rainbow', 's-rainbow');
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 36, pts: '🌈 ULTRA RAINBOW! 🌈', life: 3, decay: 0.01 });

  // Staggered multi-colour particle bursts
  const burstColors = ['#ff4444', '#ff8800', '#ffee00', '#44ee44', '#44aaff', '#aa44ff', '#ff44ff'];
  burstColors.forEach((color, i) => {
    setTimeout(() => {
      if (S.gameRunning) spawnParticles(S.fish.x, S.fish.y, color, 24);
    }, i * 70);
  });
  // Second wave of bursts
  burstColors.forEach((color, i) => {
    setTimeout(() => {
      if (S.gameRunning) spawnParticles(S.fish.x, S.fish.y, color, 14);
    }, 500 + i * 60);
  });

  activateFrenzy();
  activateIce();
  activateHourglass();
  activateShield();
  activateBuddy();
  activateDecoy();
  activateStar();

  S.rainbowTO = clearTO(S.rainbowTO);
  S.rainbowTO = setTimeout(() => {
    S.rainbowActive = false;
    stOff('rainbow', 's-rainbow');
    S.rainbowTO = null;
    // End all child effects that rainbow spawned
    if (S.frenzyActive)    { S.frenzyTO    = clearTO(S.frenzyTO);    deactivateFrenzy(); }
    if (S.iceActive)       { S.iceTO       = clearTO(S.iceTO);       deactivateIce(); }
    if (S.hourglassActive) { S.hourglassTO = clearTO(S.hourglassTO); deactivateHourglass(); }
    if (S.shieldActive)    { S.shieldActive = false; stOff('shield', 's-shield'); }
    if (S.buddyActive)     { S.buddyTO     = clearTO(S.buddyTO);     deactivateBuddy(); }
    if (S.decoyActive)     { S.decoyTO     = clearTO(S.decoyTO);     deactivateDecoy(); }
    if (S.starActive)      { S.starTO      = clearTO(S.starTO);      deactivateStar(); }
  }, RAINBOW_DURATION);
}

// ─── GOOP ───
function activateGoop() {
  S.goopActive = true;
  S.goopStartTime = Date.now();
  setMusicTempo(0.6);
  stOn('goop', 's-goop');
  spawnParticles(S.fish.x, S.fish.y, '#66cc44', 16);
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'GOOPED!', life: 1.5, decay: 0.02 });
  S.goopTO = clearTO(S.goopTO);
  S.goopTO = setTimeout(() => {
    S.goopActive = false;
    stOff('goop', 's-goop');
    S.goopTO = null;
    if (!S.iceActive && !S.hourglassActive) setMusicTempo(1.0);
  }, GOOP_DURATION);
}


// ─── PROMPT ───
function activatePrompt() {
  S.promptActive = true;
  S.promptStartTime = Date.now();
  S.promptWandering = false;
  S.shark.speed = 0;
  stOn('prompt', 's-prompt');
  spawnParticles(S.shark.x, S.shark.y, '#aa66ff', 16);
  S.scorePopups.push({ x: S.shark.x, y: S.shark.y - 28, pts: '✍️ PROMPTED!', life: 1.8, decay: 0.018 });

  // After freeze: start wandering
  S.promptTO2 = clearTO(S.promptTO2);
  S.promptTO2 = setTimeout(() => {
    if (!S.promptActive || !S.gameRunning) return;
    S.promptWandering = true;
    restoreSharkSpeed();
    S.promptWanderAngle = Math.random() * Math.PI * 2;
    S.promptWanderTimer = Date.now();
  }, PROMPT_FREEZE_DURATION);

  S.promptTO = clearTO(S.promptTO);
  S.promptTO = setTimeout(deactivatePrompt, PROMPT_FREEZE_DURATION + PROMPT_WANDER_DURATION);
}

export function deactivatePrompt() {
  if (!S.promptActive) return;
  S.promptActive = false;
  S.promptWandering = false;
  restoreSharkSpeed();
  stOff('prompt', 's-prompt');
  spawnParticles(S.shark.x, S.shark.y, '#aa66ff', 8);
  S.promptTO = null;
  S.promptTO2 = clearTO(S.promptTO2);
}

// ─── BODY SWAP ───
function activateBodySwap() {
  // Clear active shark effects
  if (S.iceActive) {
    S.iceActive = false;
    S.iceTO = clearTO(S.iceTO);
    stOff('ice', 's-ice');
  }
  if (S.hourglassActive) {
    S.hourglassActive = false;
    S.timerFrozen = false;
    S.hourglassTO = clearTO(S.hourglassTO);
    timerBar.classList.remove('frozen');
    stOff('time', 's-time');
  }
  if (S.promptActive) {
    S.promptActive = false;
    S.promptWandering = false;
    S.promptTO = clearTO(S.promptTO);
    S.promptTO2 = clearTO(S.promptTO2);
    stOff('prompt', 's-prompt');
  }
  if (S.claudeActive) {
    S.claudeActive = false;
    S.claudeAnim = null;
    stOff('claude', 's-claude');
  }

  S.bodySwapActive = true;
  S.bodySwapStartTime = Date.now();
  // Trigger swap soul animation
  S.bodySwapAnim = { startTime: Date.now(), duration: 1100, fishX: S.fish.x, fishY: S.fish.y, sharkX: S.shark.x, sharkY: S.shark.y };
  // Zero out fish velocity so AI starts fresh
  S.fish.vx = 0; S.fish.vy = 0;
  // Boost shark speed for agility as player controls it
  S.shark.speed = getCurrentFishSpeed() + 1;
  stOn('bodyswap', 's-bodyswap');
  spawnParticles(S.fish.x, S.fish.y, '#ff4488', 20);
  spawnParticles(S.shark.x, S.shark.y, '#44ff88', 16);
  S.scorePopups.push({ x: W/2, y: H/2 - 22, pts: '🎭 MIND SWAP!', life: 2.5, decay: 0.014, font: '13px "Press Start 2P"', color: '#ff4488' });
  S.scorePopups.push({ x: W/2, y: H/2 + 18, pts: 'YOU ARE NOW THE SHARK', life: 2.5, decay: 0.014, font: '7px "Press Start 2P"', color: '#ff88aa' });
  S.inputFrozen = true;
  setTimeout(() => { S.inputFrozen = false; }, 1200);

  S.bodySwapTO = clearTO(S.bodySwapTO);
  S.bodySwapTO = setTimeout(deactivateBodySwap, BODY_SWAP_DURATION);
}

// Clears all power-up effects collected during a body swap (clean slate on return)
function _wipeSwapEffects() {
  if (S.frenzyActive)    { S.frenzyTO    = clearTO(S.frenzyTO);    deactivateFrenzy(); }
  if (S.iceActive)       { S.iceTO       = clearTO(S.iceTO);       deactivateIce(); }
  if (S.goopActive)      { S.goopTO = clearTO(S.goopTO); S.goopActive = false; stOff('goop', 's-goop'); }
  if (S.ghostActive)     { S.ghostTO     = clearTO(S.ghostTO);     deactivateGhost(); }
  if (S.hourglassActive) { S.hourglassTO = clearTO(S.hourglassTO); deactivateHourglass(); }
  if (S.buddyActive)     { S.buddyTO     = clearTO(S.buddyTO);     deactivateBuddy(); }
  if (S.decoyActive)     { S.decoyTO     = clearTO(S.decoyTO);     deactivateDecoy(); }
  if (S.starActive)      { S.starTO      = clearTO(S.starTO);      deactivateStar(); }
  if (S.shieldActive)    { S.shieldActive = false; stOff('shield', 's-shield'); }
  if (S.magnetActive)    { S.magnetTO    = clearTO(S.magnetTO);    S.magnetActive = false; stOff('magnet', 's-magnet'); }
  setMusicTempo(1.0);
}

export function deactivateBodySwap() {
  if (!S.bodySwapActive) return;
  S.bodySwapActive = false;
  S.bodySwapAnim = null;
  S.fish.vx = 0; S.fish.vy = 0;
  // Keep shark frozen for 4s (3-2-1-GO! countdown + 1s head start) via sharkDelay
  S.sharkDelay = 240;
  stOff('bodyswap', 's-bodyswap');
  spawnParticles(S.fish.x, S.fish.y, '#ff4488', 10);
  spawnParticles(S.shark.x, S.shark.y, '#44ff88', 10);
  S.scorePopups.push({ x: W/2, y: H/2 - 22, pts: '🐟 BACK TO FISH', life: 2.5, decay: 0.014, font: '13px "Press Start 2P"', color: '#44ffaa' });
  S.bodySwapTO = null;

  // Countdown 3-2-1-GO!, player regains control at GO!, shark releases 1s after
  S.inputFrozen = true;
  _bodySwapCountdownTOs.forEach(clearTO);
  _bodySwapCountdownTOs = [];
  ['3', '2', '1'].forEach((n, i) => {
    _bodySwapCountdownTOs.push(setTimeout(() => {
      if (!S.gameRunning) return;
      S.scorePopups.push({ x: W/2, y: H/2 + 28, pts: n, life: 1, decay: 0.018, font: '22px "Press Start 2P"', color: '#ffffff' });
    }, i * 1000));
  });
  // GO! — wipe any effects collected during the swap, then return control
  _bodySwapCountdownTOs.push(setTimeout(() => {
    _wipeSwapEffects();
    if (S.gameRunning) {
      S.scorePopups.push({ x: W/2, y: H/2 + 28, pts: 'GO!', life: 1, decay: 0.018, font: '18px "Press Start 2P"', color: '#44ffaa' });
    }
    S.inputFrozen = false;
  }, 3000));
  // Shark releases 1s after GO! — handled by S.sharkDelay = 240 set above
}

// ─── THE CLAUDE ───
function activateClaude() {
  S.claudeActive = true;
  S.claudeAnim = { startTime: Date.now(), text: '', textTarget: "I'LL HELP YOU WITH THAT.", totalDuration: 0 };
  S.shark.savedClaudeSpeed = S.shark.speed;
  S.shark.speed = 0;
  S.gamePaused = true;
  stOn('claude', 's-claude');

  // Typewriter effect — tracked so they can be cancelled on game end
  const target = S.claudeAnim.textTarget;
  _claudeTypewriterTOs.forEach(clearTO);
  _claudeTypewriterTOs = [];
  for (let i = 0; i <= target.length; i++) {
    _claudeTypewriterTOs.push(setTimeout(() => { if (S.claudeAnim) S.claudeAnim.text = target.slice(0, i); }, i * 55));
  }

  // Collect treats sequentially starting at 900ms
  const uncollected = S.treats.filter(t => !t.collected);
  const BASE_DELAY = 900;
  uncollected.forEach((t, i) => {
    setTimeout(() => {
      if (!S.gameRunning || t.collected) return;
      collectTreat(t);
    }, BASE_DELAY + i * 130);
  });

  // End animation after all treats collected + extra flourish time
  const totalDuration = BASE_DELAY + uncollected.length * 130 + 1200;
  if (S.claudeAnim) S.claudeAnim.totalDuration = totalDuration;
  S.claudeTO = clearTO(S.claudeTO);
  S.claudeTO = setTimeout(() => {
    if (!S.gameRunning) return;
    // Bonus score
    S.score += 500;
    scoreEl.textContent = S.score;
    S.scorePopups.push({ x: W / 2, y: H / 2, pts: '+500 CLAUDE BONUS!', life: 2.5, decay: 0.01 });
    spawnParticles(W / 2, H / 2, '#aa66ff', 30);
    spawnParticles(W / 2, H / 2, '#ffcc44', 20);

    S.shark.speed = S.shark.savedClaudeSpeed || ((gameVars.fishSpeed + gameVars.sharkSpeedBase) + gameVars.sharkSpeedPerLevel * Math.sqrt(S.level * 2));
    S.gamePaused = false;
    S.claudeActive = false;
    S.claudeAnim = null;
    stOff('claude', 's-claude');
    S.claudeTO = null;
  }, totalDuration);
}

// ─── HELL ───
function activateHell() {
  S.hellAnim = { startTime: Date.now() };
  stOn('hell', 's-hell');
  spawnParticles(S.fish.x, S.fish.y, '#ff0000', 20);

  // After 2s intro animation, begin the active (score-drain) phase
  S.hellTO = clearTO(S.hellTO);
  S.hellTO = setTimeout(() => {
    S.hellActive = true;
    S.hellStartTime = Date.now();
    S.hellTO = setTimeout(deactivateHell, HELL_DURATION);
  }, 2000);
}
function deactivateHell() {
  S.hellActive = false;
  stOff('hell', 's-hell');
  S.hellTO = null;
  achHell();
  // hellAnim continues for outro/end phases — cleared by drawHellAnim after 9.5s total
}

// ═══════════════════════════════════════════════════════════════
// POWER-UP CONFIG TABLE
// ═══════════════════════════════════════════════════════════════

export const pwConfig = {
  frenzy:    { emoji: '🔥', glow: '#ff8800', fn: activateFrenzy,    rarity: 1, ok: () => !S.frenzyActive },
  ice:       { emoji: '❄️',  glow: '#88ddff', fn: activateIce,       rarity: 2, ok: () => !S.iceActive },
  shield:    { emoji: '🛡️', glow: '#44ee88', fn: activateShield,    rarity: 2, ok: () => !S.shieldActive },
  poison:    { emoji: '☠️',  glow: '#44ff00', fn: activatePoison,    rarity: 2, ok: () => true },
  goop:      { emoji: '🧪', glow: '#66cc44', fn: activateGoop,      rarity: 3, ok: () => !S.goopActive },
  hourglass: { emoji: '⏳', glow: '#ffdd44', fn: activateHourglass, rarity: 3, ok: () => !S.hourglassActive },
  buddy:     { emoji: '🐠', glow: '#44ddaa', fn: activateBuddy,     rarity: 3, ok: () => !S.buddyActive },
  hook:      { emoji: '🪝', glow: '#ccaa44', fn: activateHook,      rarity: 3, ok: () => S.treats.length > 0 && !S.hookActive },
  ghost:     { emoji: '👻', glow: '#ff8844', fn: activateGhost,     rarity: 4, ok: () => !S.ghostActive },
  bomb:      { emoji: '💣', glow: '#ff4444', fn: activateBomb,      rarity: 4, ok: () => !S.bombActive },
  decoy:     { emoji: '👁️', glow: '#ffaa44', fn: activateDecoy,     rarity: 4, ok: () => !S.decoyActive },
  swap:      { emoji: '🔄', glow: '#aa44ff', fn: activateSwap,      rarity: 4, ok: () => !S.swapAnim },
  star:      { emoji: '🌟', glow: '#ffee44', fn: activateStar,      rarity: 5, ok: () => !S.starActive },
  double:    { emoji: '💎', glow: '#44ddff', fn: activateDouble,    rarity: 5, ok: () => S.treats.length > 0 },
  magnet:    { emoji: '🧲', glow: '#dd44ff', fn: activateMagnet,    rarity: 5, ok: () => !S.magnetActive  },
  wave:      { emoji: '🌊', glow: '#4488ff', fn: activateWave,      rarity: 5, ok: () => S.treats.length > 0 },
  bodyswap:  { emoji: '🎭', glow: '#ff4488', fn: activateBodySwap,  rarity: 5, ok: () => !S.bodySwapActive },
  crazy:     { emoji: '🍄', glow: '#ff00aa', fn: activateCrazy,     rarity: 6, ok: () => S.level >= 9 && !S.crazyActive, life: CRAZY_ITEM_LIFETIME },
  rainbow:   { emoji: '🌈', glow: '#ff88ff', fn: activateRainbow,  rarity: 6, ok: () => !S.rainbowActive, life: 1500 },
  prompt:    { emoji: '✍️', glow: '#aa66ff', fn: activatePrompt,   rarity: 3, ok: () => !S.promptActive },
  claude:    { emoji: '🤖', glow: '#cc88ff', fn: activateClaude,   rarity: 6, ok: () => !S.claudeActive && S.treats.length > 0, life: CLAUDE_ITEM_LIFETIME },
  hell:      { emoji: '👹', glow: '#ff0000', fn: activateHell,     rarity: 6, ok: () => !S.hellActive && !S.hellAnim, life: 5000, spawnMul: 0.1 },
  card:      { emoji: '🃏', glow: '#bb88ff', fn: activateCard,     rarity: 4, ok: () => !S.cardAnim, life: 4000 },
  nice:      { emoji: '😏', glow: '#ff88cc', fn: activateNice,     rarity: 5, ok: () => true, life: 3000 },
};

// ─── CARD MINI-GAME ───
const CARD_POOL = [
  // Good
  { label: '+69 PTS',     emoji: '😏', good: true,  fn: () => { S.score += 69;  scoreEl.textContent = S.score; } },
  { label: '+30 PTS',     emoji: '💰', good: true,  fn: () => { S.score += 30;  scoreEl.textContent = S.score; } },
  { label: '+75 PTS',     emoji: '💎', good: true,  fn: () => { S.score += 75;  scoreEl.textContent = S.score; } },
  { label: '+150 PTS',    emoji: '🏆', good: true,  fn: () => { S.score += 150; scoreEl.textContent = S.score; } },
  { label: '+7 SECONDS',  emoji: '⏰', good: true,  fn: () => { S.timeLeft += 7;  timerEl.textContent = S.timeLeft; } },
  { label: '+12 SECONDS', emoji: '⌚', good: true,  fn: () => { S.timeLeft += 12; timerEl.textContent = S.timeLeft; } },
  { label: 'FRENZY',      emoji: '🔥', good: true,  fn: () => activateFrenzy() },
  { label: 'SHIELD',      emoji: '🛡', good: true,  fn: () => activateShield() },
  { label: 'STAR POWER',  emoji: '🌟', good: true,  fn: () => activateStar() },
  { label: 'MAGNET',      emoji: '🧲', good: true,  fn: () => activateMagnet() },
  { label: 'ICE SHARK',   emoji: '❄', good: true,  fn: () => activateIce() },
  { label: 'TIME FREEZE', emoji: '⏳', good: true,  fn: () => activateHourglass() },
  { label: 'BUDDY FISH',  emoji: '🐠', good: true,  fn: () => activateBuddy() },
  { label: 'RANDOM OUTFIT', emoji: '👕', good: true, fn: () => {
    let next;
    do { next = Math.floor(Math.random() * SKINS.length); } while (next === S.settings.skin && SKINS.length > 1);
    S.settings.skin = next;
    S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 34, pts: `${SKINS[next].name.toUpperCase()} OUTFIT!`, life: 1.8, decay: 0.015 });
  } },
  // Bad
  { label: '-25 PTS',     emoji: '💸', good: false, fn: () => { S.score = Math.max(0, S.score - 25); scoreEl.textContent = S.score; } },
  { label: '-7 SECONDS',  emoji: '⌛', good: false, fn: () => { S.timeLeft = Math.max(1, S.timeLeft - 7); timerEl.textContent = S.timeLeft; } },
  { label: 'GOOPED',      emoji: '🧪', good: false, fn: () => activateGoop() },
  { label: 'POISONED',    emoji: '☠', good: false, fn: () => activatePoison() },
  { label: 'SHARK RAGE',  emoji: '😡', good: false, fn: () => { S.shark.rageBonus = (S.shark.rageBonus || 0) + 0.8; _cardRageTOs.push(setTimeout(() => { if (S.shark) S.shark.rageBonus = 0; }, 5000)); } },
];

function makeCard() {
  if (Math.random() < 0.01) return { label: 'GAME OVER',  emoji: '💀', good: false, rare: 'death', fn: () => { S.cardDeathPending = true; } };
  if (Math.random() < 0.01) return { label: 'CHAOS!!!',   emoji: '🍄', good: true,  rare: 'crazy', fn: () => activateCrazy() };
  return { ...CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)] };
}

function activateCard() {
  S.cardAnim = {
    cards:       [makeCard(), makeCard(), makeCard(), makeCard(), makeCard()],
    selected:    2,
    phase:       'pick',   // 'pick' | 'flip' | 'reveal'
    flipCard:    -1,
    flipStart:   0,
    revealStart: 0,
    resolved:    false,
  };
  S.gamePaused  = true;
  S.timerFrozen = true;
  startCardMusic();
}


// ═══════════════════════════════════════════════════════════════
// FIREBASE RARITY LOADING
// ═══════════════════════════════════════════════════════════════

export let firebaseRarities = {};

export async function loadRarities() {
  const config = await fetchGameConfig();
  const rarities = config?.rarities;
  if (rarities) {
    firebaseRarities = rarities;
    for (const [key, rarity] of Object.entries(rarities)) {
      if (pwConfig[key] && rarity >= 1 && rarity <= 6) {
        pwConfig[key].rarity = rarity;
      }
    }
  }
  const vars = config?.gameVars;
  if (vars) {
    for (const [key, val] of Object.entries(vars)) {
      if (key in gameVars && typeof val === 'number') {
        gameVars[key] = val;
        firebaseGameVars[key] = val; // persist so initGame() re-applies after difficulty reset
      }
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// FIELD MANAGEMENT — Spawning, updating, drawing power-ups
// ═══════════════════════════════════════════════════════════════

function getFieldBudget() {
  const lv = Math.max(1, S.level) - 1;
  const diff = S.settings.difficulty;
  if (diff === 'easy') return Math.min(20, Math.floor(12 + lv * (8 / 14)));
  if (diff === 'hard') return Math.min(20, Math.floor(7 + lv * (8 / 14)));
  return Math.min(20, Math.floor(7 + lv * (8 / 14)));
}

function getFieldCost() {
  let cost = 0;
  for (const k in S.pwItems) {
    if (S.pwItems[k]) cost += pwConfig[k]?.rarity || 1;
  }
  return cost;
}

function overlapsExisting(x, y, radius) {
  for (const k in S.pwItems) {
    const item = S.pwItems[k];
    if (item && Math.hypot(item.x - x, item.y - y) < radius) return true;
  }
  for (const t of S.treats) {
    if (!t.collected && Math.hypot(t.x - x, t.y - y) < radius) return true;
  }
  return false;
}
// Also exported for treat spawning
export { overlapsExisting };

function spawnPW(type) {
  const cfg = pwConfig[type];
  const lt = cfg.life || (RARITY[cfg.rarity] ? RARITY[cfg.rarity].life : 5000);
  let x, y, attempts = 0;
  do {
    x = rand(50, W - 50);
    y = rand(50, H - 50);
    attempts++;
  } while ((dist({ x, y }, S.fish) < gameVars.pwSpawnRadius || overlapsExisting(x, y, 40)) && attempts < 30);
  return { x, y, r: 16, bobPhase: rand(0, Math.PI * 2), spawnTime: Date.now(), lifetime: lt, type };
}

export function spawnTutorialPowerup() {
  if (S.pwItems.shield || S.pwItems.frenzy) return; // one already on field
  const angle = Math.random() * Math.PI * 2;
  const d = 80 + Math.random() * 60;
  const x = Math.max(50, Math.min(W - 50, S.fish.x + Math.cos(angle) * d));
  const y = Math.max(50, Math.min(H - 50, S.fish.y + Math.sin(angle) * d));
  S.pwItems.shield = { x, y, r: 16, bobPhase: 0, spawnTime: Date.now(), lifetime: 20000, type: 'shield' };
}

export function trySpawnPowerups() {
  if (S.gamePaused) return;
  if (S.tutorialActive) return; // tutorial controls its own spawning

  // Item test: force one copy of each selected type on the field
  if (S.forcedItems && S.forcedItems.size > 0) {
    // Remove items not in the forced set
    for (const k in S.pwItems) {
      if (!S.forcedItems.has(k)) S.pwItems[k] = null;
    }
    // Ensure each forced type has one item
    for (const type of S.forcedItems) {
      if (pwConfig[type] && !S.pwItems[type]) S.pwItems[type] = spawnPW(type);
    }
    return;
  }

  let fieldCount = 0;
  for (const k in S.pwItems) { if (S.pwItems[k]) fieldCount++; }
  if (fieldCount >= MAX_FIELD_ITEMS) return;

  const budget = getFieldBudget();
  const currentCost = getFieldCost();

  for (const [k, c] of Object.entries(pwConfig)) {
    if (fieldCount >= MAX_FIELD_ITEMS) break;
    if (S.pwItems[k] || !c.ok()) continue;
    if (k === S.lastSpawnedPW) continue;

    const r = c.rarity;
    if (currentCost + r > budget) continue;

    const rarityMul = c.spawnMul ?? RARITY[r]?.spawnMul ?? 0.025;
    if (Math.random() < PW_SPAWN_CHANCE * rarityMul) {
      S.pwItems[k] = spawnPW(k);
      S.lastSpawnedPW = k;
      fieldCount++;
    }
  }
}

export function updatePWItems() {
  for (const k in S.pwItems) {
    const item = S.pwItems[k];
    if (!item) continue;

    item.bobPhase += 0.06;

    if (Date.now() - item.spawnTime > item.lifetime) {
      spawnParticles(item.x, item.y, '#333', 4);
      S.pwItems[k] = null;
      continue;
    }

    // During body swap the shark is the player — only the shark can collect items
    const collector = S.bodySwapActive ? S.shark : S.fish;
    if (dist(item, collector) < 26) {
      const cfg = pwConfig[item.type] || pwConfig[k];
      if (cfg) {
        spawnParticles(item.x, item.y, cfg.glow, 12);
        sfxPowerup();
        cfg.fn();
        achPowerup(k);
      }
      if (S.tutorialActive && S.tutorialStep === 3) S.tutorialPowerupGrabbed = true;
      S.pwItems[k] = null;
      continue;
    }

    // Buddy only collects treats, not powerups — no pickup here
  }
}

export function clearAllPowerupTimeouts() {
  [S.frenzyTO, S.iceTO, S.ghostTO, S.hourglassTO, S.buddyTO,
   S.bombTO, S.crazyTO, S.decoyTO, S.starTO, S.rainbowTO,
   S.magnetTO, S.promptTO, S.promptTO2, S.claudeTO, S.bodySwapTO, S.hellTO,
   S.goopTO].forEach(clearTO);
  _claudeTypewriterTOs.forEach(clearTO);
  _claudeTypewriterTOs = [];
  _bodySwapCountdownTOs.forEach(clearTO);
  _bodySwapCountdownTOs = [];
  _cardRageTOs.forEach(clearTO);
  _cardRageTOs = [];
  if (S.shark) S.shark.rageBonus = 0;
}
