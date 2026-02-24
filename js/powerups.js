// ═══════════════════════════════════════════════════════════════
// POWERUPS — Activation functions, config, spawning, field mgmt
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { st, timerBar, timerEl, treatsLeftEl } from './dom.js';
import { spawnParticles } from './particles.js';
import {
  FRENZY_DURATION, ICE_DURATION, GHOST_DURATION, HOURGLASS_DURATION,
  BUDDY_DURATION, BOMB_DURATION, CRAZY_DURATION, GOOP_DURATION,
  CRAZY_ITEM_LIFETIME, MAX_FIELD_ITEMS, RARITY, PW_SPAWN_CHANCE,
  FISH_BASE_SPEED, FRENZY_SPEED_BOOST,
  W, H, rand, dist
} from './constants.js';
import { fetchGameConfig } from '../firebase-config.js';

// ─── HELPERS ───
export function clearTO(t) { if (t) clearTimeout(t); return null; }
function stOn(key, cls)  { if (st[key]) st[key].classList.add('s-on', cls); }
function stOff(key, cls) { if (st[key]) st[key].classList.remove('s-on', cls); }

// Forward reference for endGame (set by main.js to avoid circular import)
let _endGame = null;
export function setEndGame(fn) { _endGame = fn; }

// Forward reference for spawnTreat
let _spawnTreat = null;
export function setSpawnTreat(fn) { _spawnTreat = fn; }

// ─── FRENZY ───
function activateFrenzy() {
  S.frenzyActive = true;
  S.frenzyTimer = Date.now();
  S.fish.speed = FISH_BASE_SPEED + FRENZY_SPEED_BOOST;
  stOn('frenzy', 's-frenzy');
  S.frenzyTO = clearTO(S.frenzyTO);
  S.frenzyTO = setTimeout(deactivateFrenzy, FRENZY_DURATION);
}

function deactivateFrenzy() {
  S.frenzyActive = false;
  S.fish.speed = FISH_BASE_SPEED;
  stOff('frenzy', 's-frenzy');
  S.frenzyTO = null;
}

// ─── ICE ───
function activateIce() {
  S.iceActive = true;
  S.iceStartTime = Date.now();
  S.shark.savedSpeed = S.shark.speed;
  S.shark.speed *= 0.25;
  stOn('ice', 's-ice');
  S.iceTO = clearTO(S.iceTO);
  S.iceTO = setTimeout(deactivateIce, ICE_DURATION);
}

function deactivateIce() {
  S.iceActive = false;
  S.shark.speed = S.shark.savedSpeed || (0.75 + S.level * 0.2);
  stOff('ice', 's-ice');
  S.iceTO = null;
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
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'MAGNET!', life: 0.05, decay: 0.03 });
  setTimeout(() => { S.magnetActive = false; stOff('magnet', 's-magnet'); }, 500);
}

// ─── GHOST ───
function activateGhost() {
  S.ghostActive = true;
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
  S.shark.savedSpeed2 = S.shark.speed;
  S.shark.speed = 0;
  timerBar.classList.add('frozen');
  stOn('time', 's-time');
  S.scorePopups.push({ x: W / 2, y: H / 2, pts: 'TIME STOP!', life: 1.2, decay: 0.025 });
  S.hourglassTO = clearTO(S.hourglassTO);
  S.hourglassTO = setTimeout(deactivateHourglass, HOURGLASS_DURATION);
}

function deactivateHourglass() {
  S.hourglassActive = false;
  S.timerFrozen = false;
  S.shark.speed = S.shark.savedSpeed2 || (0.75 + S.level * 0.2);
  if (S.iceActive) S.shark.speed *= 0.25;
  timerBar.classList.remove('frozen');
  stOff('time', 's-time');
  S.hourglassTO = null;
}

// ─── BUDDY ───
function activateBuddy() {
  S.buddyActive = true;
  S.buddy = { x: W - S.fish.x, y: H - S.fish.y, dir: -S.fish.dir, tailPhase: rand(0, Math.PI * 2) };
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
  stOn('crazy', 's-crazy');
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 30, pts: 'CHAOS! 5 SECONDS!', life: 2, decay: 0.015 });
  spawnParticles(S.fish.x, S.fish.y, '#ff00aa', 40);

  const toSpawn = (5 + S.level * 2) * 20;
  for (let i = 0; i < toSpawn; i++) _spawnTreat();
  treatsLeftEl.textContent = S.treats.length;

  S.crazyTO = clearTO(S.crazyTO);
  S.crazyTO = setTimeout(() => {
    if (S.gameRunning && _endGame) _endGame(false, 'OVERDOSE!');
  }, CRAZY_DURATION);
}

// ─── DECOY ───
function activateDecoy() {
  S.decoyActive = true;
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
  S.decoyTO = setTimeout(deactivateDecoy, 4000);
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
  stOn('star', 's-star');
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'STAR!', life: 1, decay: 0.03 });
  spawnParticles(S.fish.x, S.fish.y, '#ffee44', 20);
  S.starTO = clearTO(S.starTO);
  S.starTO = setTimeout(deactivateStar, 3000);
}

function deactivateStar() {
  S.starActive = false;
  stOff('star', 's-star');
  S.starTO = null;
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
}

// ─── WAVE ───
function activateWave() {
  for (const t of S.treats) {
    if (t.collected) continue;
    const dLeft = t.x, dRight = W - t.x, dTop = t.y, dBottom = H - t.y;
    const minDist = Math.min(dLeft, dRight, dTop, dBottom);
    if (minDist === dLeft) t.x = 20;
    else if (minDist === dRight) t.x = W - 20;
    else if (minDist === dTop) t.y = 20;
    else t.y = H - 20;
    spawnParticles(t.x, t.y, '#4488ff', 3);
  }
  S.scorePopups.push({ x: W / 2, y: H / 2, pts: 'WAVE!', life: 1, decay: 0.03 });
  spawnParticles(S.fish.x, S.fish.y, '#4488ff', 16);
}

// ─── POISON ───
function activatePoison() {
  S.timeLeft = Math.max(0, S.timeLeft - 3);
  timerEl.textContent = Math.max(0, S.timeLeft);
  timerBar.style.width = (S.timeLeft / S.maxTime * 100) + '%';
  spawnParticles(S.fish.x, S.fish.y, '#44ff00', 16);
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: '-3 SEC!', life: 1.5, decay: 0.02 });
  timerBar.classList.add('danger');
  setTimeout(() => { if (S.timeLeft > 10) timerBar.classList.remove('danger'); }, 500);
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

// ─── GOOP ───
function activateGoop() {
  S.goopActive = true;
  S.goopStartTime = Date.now();
  S.fish.speed = FISH_BASE_SPEED * 0.5;
  stOn('goop', 's-goop');
  spawnParticles(S.fish.x, S.fish.y, '#66cc44', 16);
  S.scorePopups.push({ x: S.fish.x, y: S.fish.y - 20, pts: 'GOOPED!', life: 1.5, decay: 0.02 });
  S.goopTO = clearTO(S.goopTO);
  S.goopTO = setTimeout(() => {
    S.goopActive = false;
    S.fish.speed = S.frenzyActive ? FISH_BASE_SPEED + FRENZY_SPEED_BOOST : FISH_BASE_SPEED;
    stOff('goop', 's-goop');
    S.goopTO = null;
  }, GOOP_DURATION);
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
  magnet:    { emoji: '🧲', glow: '#dd44ff', fn: activateMagnet,    rarity: 5, ok: () => !S.magnetActive },
  wave:      { emoji: '🌊', glow: '#4488ff', fn: activateWave,      rarity: 5, ok: () => S.treats.length > 0 },
  crazy:     { emoji: '🍄', glow: '#ff00aa', fn: activateCrazy,     rarity: 0, ok: () => S.level > 9 && !S.crazyActive, life: CRAZY_ITEM_LIFETIME }
};


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
      if (pwConfig[key] && rarity >= 1 && rarity <= 5) {
        pwConfig[key].rarity = rarity;
      }
    }
    console.log("[Config] Rarities loaded from Firebase:", rarities);
  }
}


// ═══════════════════════════════════════════════════════════════
// FIELD MANAGEMENT — Spawning, updating, drawing power-ups
// ═══════════════════════════════════════════════════════════════

function getFieldBudget() {
  return Math.min(15, Math.floor(7 + (Math.max(1, S.level) - 1) * (8 / 14)));
}

function getFieldCost() {
  let cost = 0;
  for (const k in S.pwItems) {
    if (S.pwItems[k]) {
      const r = pwConfig[k]?.rarity || 0;
      if (r > 0) cost += r; else if (r === 0) cost += 5;
    }
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
  } while ((dist({ x, y }, S.fish) < 80 || overlapsExisting(x, y, 40)) && attempts < 30);
  return { x, y, r: 16, bobPhase: rand(0, Math.PI * 2), spawnTime: Date.now(), lifetime: lt, type };
}

export function trySpawnPowerups() {
  if (S.gamePaused) return;
  let fieldCount = 0;
  for (const k in S.pwItems) { if (S.pwItems[k]) fieldCount++; }
  if (fieldCount >= MAX_FIELD_ITEMS) return;

  const budget = getFieldBudget();
  const currentCost = getFieldCost();

  for (const [k, c] of Object.entries(pwConfig)) {
    if (fieldCount >= MAX_FIELD_ITEMS) break;
    if (S.pwItems[k] || !c.ok()) continue;
    if (k === S.lastSpawnedPW) continue;

    const r = c.rarity === 0 ? 5 : c.rarity;
    if (currentCost + r > budget) continue;

    const rarityMul = c.rarity === 0 ? 0.15 : RARITY[c.rarity].spawnMul;
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

    if (dist(item, S.fish) < 26) {
      spawnParticles(item.x, item.y, pwConfig[k].glow, 12);
      pwConfig[k].fn();
      S.pwItems[k] = null;
      continue;
    }

    if (S.buddyActive && S.buddy && dist(item, S.buddy) < 26) {
      spawnParticles(item.x, item.y, pwConfig[k].glow, 12);
      pwConfig[k].fn();
      S.pwItems[k] = null;
    }
  }
}

export function clearAllPowerupTimeouts() {
  [S.frenzyTO, S.iceTO, S.ghostTO, S.hourglassTO, S.buddyTO,
   S.bombTO, S.crazyTO, S.decoyTO, S.starTO].forEach(clearTO);
}
