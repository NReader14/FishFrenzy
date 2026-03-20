// ═══════════════════════════════════════════════════════════════
// ACHIEVEMENTS — 50 achievement definitions + unlock logic
// Persisted to localStorage under 'fishFrenzyAchievements'
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { saveUserAchievements, loadUserAchievements } from '../firebase-config.js';

const STORAGE_KEY = 'fishFrenzyAchievements';

// ─── Definitions ──────────────────────────────────────────────
export const ACHIEVEMENTS = [
  // ── PROGRESSION ──
  { id: 'first_treat',    icon: '🪱', name: 'FIRST BITE',       desc: 'Collect your first treat.' },
  { id: 'level_5',        icon: '🐟', name: 'FIVE DEEP',         desc: 'Reach level 5.' },
  { id: 'level_10',       icon: '🌊', name: 'DEEP WATER',        desc: 'Reach level 10.' },
  { id: 'level_20',       icon: '🏆', name: 'ABYSS SWIMMER',     desc: 'Reach level 20.' },
  { id: 'score_100',      icon: '💯', name: 'TRIPLE DIGITS',     desc: 'Score 100 points.' },
  { id: 'score_500',      icon: '⭐', name: 'FIVE HUNDRED',      desc: 'Score 500 points.' },
  { id: 'score_1000',     icon: '💫', name: 'FOUR FIGURES',      desc: 'Score 1,000 points.' },
  { id: 'score_5000',     icon: '🌟', name: 'FIVE THOUSAND',     desc: 'Score 5,000 points.' },
  { id: 'score_10000',    icon: '👑', name: 'TEN THOUSAND',      desc: 'Score 10,000 points.' },
  { id: 'centurion',      icon: '💎', name: 'CENTURION',         desc: 'Collect 100 treats in one game.' },

  // ── DIFFICULTY ──
  { id: 'easy_game',      icon: '😌', name: 'EASY RIDER',        desc: 'Complete level 3 on Easy.' },
  { id: 'normal_game',    icon: '😎', name: 'JUST RIGHT',        desc: 'Complete level 5 on Normal.' },
  { id: 'hard_game',      icon: '🔥', name: 'HARD BOILED',       desc: 'Complete level 5 on Hard.' },
  { id: 'hard_level_10',  icon: '😈', name: 'MASOCHIST',         desc: 'Reach level 10 on Hard.' },
  { id: 'daredevil',      icon: '⚡', name: 'DAREDEVIL',         desc: 'Complete level 5 with Hard + Smart Shark.' },

  // ── SKILL ──
  { id: 'speed_run',      icon: '⏩', name: 'SPEED RUN',         desc: 'Complete a level in under 10 seconds.' },
  { id: 'speed_extreme',  icon: '⚡', name: 'LIGHTNING FISH',    desc: 'Complete a level in under 5 seconds.' },
  { id: 'untouchable',    icon: '🛡️', name: 'UNTOUCHABLE',       desc: 'Complete a level without the shark getting within 120px.' },
  { id: 'close_call',     icon: '😰', name: 'CLOSE CALL',        desc: 'Survive within 25px of the shark.' },
  { id: 'blitz',          icon: '💥', name: 'BLITZ',             desc: 'Collect 5 treats in under 2 seconds.' },
  { id: 'chain_5',        icon: '⚡', name: 'CHAIN MASTER',      desc: 'Reach a x5 combo.' },
  { id: 'combo_king',     icon: '👊', name: 'COMBO KING',        desc: 'Reach x5 combo 10 times total.' },
  { id: 'perfectionist',  icon: '✨', name: 'PERFECTIONIST',     desc: 'Complete a game to level 5 without collecting any powerups.' },
  { id: 'treat_hoarder',  icon: '🍽️', name: 'TREAT HOARDER',    desc: 'Collect 500 treats across all games.' },
  { id: 'marathon',       icon: '🏃', name: 'MARATHON',          desc: 'Play for 30 minutes total.' },

  // ── POWERUPS ──
  { id: 'first_powerup',  icon: '✨', name: 'POWERED UP',        desc: 'Collect your first powerup.' },
  { id: 'use_frenzy',     icon: '🔥', name: 'FEEDING FRENZY',    desc: 'Use the Frenzy powerup.' },
  { id: 'use_ice',        icon: '❄️', name: 'ICE ICE BABY',      desc: 'Use the Ice powerup.' },
  { id: 'use_ghost',      icon: '👻', name: 'BOO!',              desc: 'Use the Ghost powerup.' },
  { id: 'use_star',       icon: '⭐', name: 'STAR POWER',        desc: 'Use the Star powerup.' },
  { id: 'use_bodyswap',   icon: '🎭', name: 'BODY SNATCHER',     desc: 'Use the Body Swap powerup.' },
  { id: 'use_hell',       icon: '👹', name: 'HELL AND BACK',     desc: 'Survive the Hell powerup.' },
  { id: 'use_rainbow',    icon: '🌈', name: 'OVER THE RAINBOW',  desc: 'Use the Rainbow powerup.' },
  { id: 'use_claude',     icon: '🤖', name: 'AI FISH',           desc: 'Use The Claude powerup.' },
  { id: 'use_bomb',       icon: '💣', name: 'KABOOM',            desc: 'Use the Bomb powerup.' },
  { id: 'power_collector',icon: '🎮', name: 'POWER COLLECTOR',   desc: 'Use 8 different powerup types in one game.' },
  { id: 'power_mad',      icon: '🌀', name: 'POWER MAD',         desc: 'Collect 50 powerups total.' },

  // ── CUSTOMISATION ──
  { id: 'signed_in',      icon: '🔑', name: 'WELCOME BACK',      desc: 'Sign in with a Google or email account.' },
  { id: 'designer',       icon: '🎨', name: 'FISH DESIGNER',     desc: 'Create a custom fish skin.' },
  { id: 'play_goldfish',  icon: '🐠', name: 'GOLDFISH',          desc: 'Play a game as a Goldfish.' },
  { id: 'play_clownfish', icon: '🤡', name: 'CLOWNFISH',         desc: 'Play a game as a Clownfish.' },
  { id: 'play_angler',    icon: '🎣', name: 'ANGLER',            desc: 'Play a game as an Angler Fish.' },
  { id: 'play_pufferfish',icon: '🐡', name: 'PUFFERFISH',        desc: 'Play a game as a Pufferfish.' },
  { id: 'fashionista',    icon: '👗', name: 'FASHIONISTA',        desc: 'Use 5 different skins.' },
  { id: 'music_explorer', icon: '🎵', name: 'MUSIC EXPLORER',    desc: 'Listen to 5 different music tracks.' },
  { id: 'full_house',     icon: '🃏', name: 'FULL HOUSE',        desc: 'Play with Hard + Smart Shark + Mystery Blocks + Fast Treats.' },

  // ── MISC ──
  { id: 'night_swimmer',  icon: '🌙', name: 'NIGHT SWIMMER',     desc: 'Score 1,000+ points without collecting any powerups.' },
  { id: 'overachiever',   icon: '🏅', name: 'OVERACHIEVER',      desc: 'Unlock 25 achievements.' },

  // ── SUPER HARD ──
  { id: 'sh_100k',        icon: '💀', name: 'ONE HUNDRED K',     desc: 'Score 100,000 points in a single game.', superhard: true },
  { id: 'sh_level_50',    icon: '💀', name: 'THE VOID',          desc: 'Reach level 50.', superhard: true },
  { id: 'sh_iron_fish',   icon: '💀', name: 'IRON FISH',         desc: 'Reach level 10 on Hard + Smart Shark without collecting a single powerup.', superhard: true },
  { id: 'sh_speed_god',   icon: '💀', name: 'SPEED GOD',         desc: 'Complete 3 consecutive levels each in under 4 seconds.', superhard: true },
  { id: 'sh_hell_x5',     icon: '💀', name: 'HELL GAUNTLET',     desc: 'Survive the Hell powerup 5 times in a single game.', superhard: true },
];

// ─── State ────────────────────────────────────────────────────

let _unlocked = new Set();
let _stats = {
  totalTreats: 0,
  totalPowerups: 0,
  totalPlayMs: 0,
  combo5Count: 0,
  skinsUsed: new Set(),
  tracksUsed: new Set(),
  powerupsUsed: new Set(),     // per game, reset on start
};

// ─── Per-game tracking ────────────────────────────────────────
let _gameStats = {
  treats: 0,
  powerupTypes: new Set(),
  minSharkDist: 9999,
  levelMinSharkDist: 9999,
  treatTimes: [],       // timestamps for blitz
  noPowerups: true,
  hellSurviveCount: 0,
  consecutiveFastLevels: 0, // levels cleared under 4s in a row
  gameStartTime: 0,
};

// ─── Persistence ─────────────────────────────────────────────

function _load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw) return;
    if (Array.isArray(raw.unlocked)) _unlocked = new Set(raw.unlocked);
    if (raw.stats) {
      const rs = raw.stats;
      if (typeof rs.totalTreats   === 'number') _stats.totalTreats   = rs.totalTreats;
      if (typeof rs.totalPowerups === 'number') _stats.totalPowerups = rs.totalPowerups;
      if (typeof rs.totalPlayMs   === 'number') _stats.totalPlayMs   = rs.totalPlayMs;
      if (typeof rs.combo5Count   === 'number') _stats.combo5Count   = rs.combo5Count;
      if (Array.isArray(rs.skinsUsed))  _stats.skinsUsed  = new Set(rs.skinsUsed);
      if (Array.isArray(rs.tracksUsed)) _stats.tracksUsed = new Set(rs.tracksUsed);
    }
  } catch (_) {}
}

function _buildPayload() {
  return {
    unlocked: [..._unlocked],
    stats: {
      totalTreats:   _stats.totalTreats,
      totalPowerups: _stats.totalPowerups,
      totalPlayMs:   _stats.totalPlayMs,
      combo5Count:   _stats.combo5Count,
      skinsUsed:     [..._stats.skinsUsed],
      tracksUsed:    [..._stats.tracksUsed],
    }
  };
}

function _save() {
  const payload = _buildPayload();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
  // Fire-and-forget cloud save when logged in
  if (S.currentUser && !S.currentUser.isAnonymous) {
    saveUserAchievements(S.currentUser.uid, payload);
  }
}

export async function syncAchievementsFromCloud(uid) {
  const cloud = await loadUserAchievements(uid);
  if (!cloud) return;
  // Merge: union of unlocked sets, max of numeric stats
  if (Array.isArray(cloud.unlocked)) {
    for (const id of cloud.unlocked) _unlocked.add(id);
  }
  if (cloud.stats) {
    const cs = cloud.stats;
    if (typeof cs.totalTreats   === 'number') _stats.totalTreats   = Math.max(_stats.totalTreats,   cs.totalTreats);
    if (typeof cs.totalPowerups === 'number') _stats.totalPowerups = Math.max(_stats.totalPowerups, cs.totalPowerups);
    if (typeof cs.totalPlayMs   === 'number') _stats.totalPlayMs   = Math.max(_stats.totalPlayMs,   cs.totalPlayMs);
    if (typeof cs.combo5Count   === 'number') _stats.combo5Count   = Math.max(_stats.combo5Count,   cs.combo5Count);
    if (Array.isArray(cs.skinsUsed))  for (const s of cs.skinsUsed)  _stats.skinsUsed.add(s);
    if (Array.isArray(cs.tracksUsed)) for (const t of cs.tracksUsed) _stats.tracksUsed.add(t);
  }
  // Write merged result back to both stores
  const merged = _buildPayload();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (_) {}
  saveUserAchievements(uid, merged);
}

// ─── Toast notification ───────────────────────────────────────

function _toast(id) {
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def) return;

  const container = document.getElementById('achievement-toasts');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'achievement-toast';
  el.innerHTML = `<span class="ach-toast-icon">${def.icon}</span>
    <div class="ach-toast-text">
      <div class="ach-toast-label">ACHIEVEMENT UNLOCKED</div>
      <div class="ach-toast-name">${def.name}</div>
    </div>`;
  container.appendChild(el);

  // Animate out after 3.5s then remove
  setTimeout(() => el.classList.add('ach-toast-out'), 3200);
  setTimeout(() => el.remove(), 3700);
}

// ─── Unlock helper ────────────────────────────────────────────

function unlock(id) {
  if (_unlocked.has(id)) return;
  _unlocked.add(id);
  _save();
  _toast(id);

  // Check overachiever immediately after any unlock
  if (_unlocked.size >= 25 && !_unlocked.has('overachiever')) {
    unlock('overachiever');
  }
}

// ─── Public event hooks ───────────────────────────────────────

export function initAchievements() {
  _load();
}

export function onGameStart() {
  _gameStats = {
    treats: 0,
    powerupTypes: new Set(),
    minSharkDist: 9999,
    levelMinSharkDist: 9999,
    treatTimes: [],
    noPowerups: true,
    hellSurviveCount: 0,
    consecutiveFastLevels: 0,
    gameStartTime: Date.now(),
  };

  // Skin-based achievements
  const skinIdx = S.settings.skin;
  _stats.skinsUsed.add(skinIdx);
  _save();

  // Full house: hard + smartShark + mysteryBlocks + fastTreats
  if (S.settings.difficulty === 'hard' && S.settings.smartShark &&
      S.settings.mysteryBlocks && S.settings.fastTreats) {
    unlock('full_house');
  }

  // Track skin achievements (skin indices from skins.js: 0=Classic,1=Gold,2=Clown,3=Angler,4=Goldfish,5=Clownfish,6=Pufferfish)
  if (skinIdx === 4) unlock('play_goldfish');
  if (skinIdx === 5) unlock('play_clownfish');
  if (skinIdx === 3) unlock('play_angler');
  if (skinIdx === 6) unlock('play_pufferfish');

  // Fashionista: 5+ different skins used
  if (_stats.skinsUsed.size >= 5) unlock('fashionista');
}

export function onLevelStart(level) {
  _gameStats.levelMinSharkDist = 9999;
}

export function onTreatCollected() {
  _gameStats.treats++;
  _stats.totalTreats++;
  _save();

  const now = Date.now();
  _gameStats.treatTimes.push(now);
  // Keep only last 10 timestamps
  if (_gameStats.treatTimes.length > 10) _gameStats.treatTimes.shift();

  unlock('first_treat');

  // Centurion
  if (_gameStats.treats >= 100) unlock('centurion');

  // Treat hoarder (500 cumulative)
  if (_stats.totalTreats >= 500) unlock('treat_hoarder');

  // Blitz: 5 treats in 2 seconds
  if (_gameStats.treatTimes.length >= 5) {
    const window = now - _gameStats.treatTimes[_gameStats.treatTimes.length - 5];
    if (window <= 2000) unlock('blitz');
  }
}

export function onScoreUpdate(score) {
  if (score >= 100)    unlock('score_100');
  if (score >= 500)    unlock('score_500');
  if (score >= 1000)   unlock('score_1000');
  if (score >= 5000)   unlock('score_5000');
  if (score >= 10000)  unlock('score_10000');
  if (score >= 100000) unlock('sh_100k');

  // Night swimmer: 1000 points with zero powerups
  if (score >= 1000 && _gameStats.noPowerups) unlock('night_swimmer');
}

export function onComboReached(combo) {
  if (combo >= 5) {
    unlock('chain_5');
    _stats.combo5Count++;
    _save();
    if (_stats.combo5Count >= 10) unlock('combo_king');
  }
}

export function onLevelComplete(level, timeLeft) {
  const levelTime = S.maxTime - timeLeft;

  // Speed run achievements
  if (levelTime <= 10) unlock('speed_run');
  if (levelTime <= 5)  unlock('speed_extreme');

  // Speed God: 3 consecutive levels under 4 seconds
  if (levelTime <= 4) {
    _gameStats.consecutiveFastLevels++;
    if (_gameStats.consecutiveFastLevels >= 3) unlock('sh_speed_god');
  } else {
    _gameStats.consecutiveFastLevels = 0;
  }

  // Untouchable: shark never got within 120px this level
  if (_gameStats.levelMinSharkDist >= 120) unlock('untouchable');

  // Progression
  if (level >= 5)  unlock('level_5');
  if (level >= 10) unlock('level_10');
  if (level >= 20) unlock('level_20');
  if (level >= 50) unlock('sh_level_50');

  // Difficulty-based
  const diff = S.settings.difficulty;
  if (diff === 'easy'   && level >= 3) unlock('easy_game');
  if (diff === 'normal' && level >= 5) unlock('normal_game');
  if (diff === 'hard'   && level >= 5) unlock('hard_game');
  if (diff === 'hard'   && level >= 10) unlock('hard_level_10');
  if (diff === 'hard' && S.settings.smartShark && level >= 5) unlock('daredevil');

  // Iron Fish: level 10 on Hard + Smart Shark with no powerups
  if (diff === 'hard' && S.settings.smartShark && level >= 10 && _gameStats.noPowerups) unlock('sh_iron_fish');

  // Perfectionist: made it to level 5 without any powerups
  if (level >= 5 && _gameStats.noPowerups) unlock('perfectionist');
}

export function onSharkDistanceFrame(d) {
  if (d < _gameStats.minSharkDist)      _gameStats.minSharkDist      = d;
  if (d < _gameStats.levelMinSharkDist) _gameStats.levelMinSharkDist = d;

  // Close call: survived within 25px
  if (d < 25) unlock('close_call');
}

export function onPowerupCollected(type) {
  _gameStats.noPowerups = false;
  _gameStats.powerupTypes.add(type);
  _stats.totalPowerups++;
  _save();

  unlock('first_powerup');
  if (_stats.totalPowerups >= 50) unlock('power_mad');
  if (_gameStats.powerupTypes.size >= 8) unlock('power_collector');

  switch (type) {
    case 'frenzy':   unlock('use_frenzy');   break;
    case 'ice':      unlock('use_ice');      break;
    case 'ghost':    unlock('use_ghost');    break;
    case 'star':     unlock('use_star');     break;
    case 'bodyswap': unlock('use_bodyswap'); break;
    case 'rainbow':  unlock('use_rainbow');  break;
    case 'claude':   unlock('use_claude');   break;
    case 'bomb':     unlock('use_bomb');     break;
  }
}

export function onHellSurvived() {
  unlock('use_hell');
  _gameStats.hellSurviveCount++;
  if (_gameStats.hellSurviveCount >= 5) unlock('sh_hell_x5');
}

export function onGameOver(score, level) {
  // Accumulate play time
  if (_gameStats.gameStartTime) {
    _stats.totalPlayMs += Date.now() - _gameStats.gameStartTime;
    _save();
  }
  // Marathon: 30 minutes total
  if (_stats.totalPlayMs >= 30 * 60 * 1000) unlock('marathon');
}

export function onSignIn() {
  unlock('signed_in');
}

export function onCustomSkinCreated() {
  unlock('designer');
}

export function onTrackChanged(trackId) {
  _stats.tracksUsed.add(trackId);
  _save();
  if (_stats.tracksUsed.size >= 5) unlock('music_explorer');
}

// ─── UI helpers ───────────────────────────────────────────────

export function getUnlocked() {
  return _unlocked;
}

export function buildAchievementsHTML() {
  const normal = ACHIEVEMENTS.filter(a => !a.superhard);
  const superhard = ACHIEVEMENTS.filter(a => a.superhard);
  const total = ACHIEVEMENTS.length;
  const count = _unlocked.size;

  let html = `<div class="ach-summary">${count} / ${total} UNLOCKED</div>`;

  html += '<div class="ach-grid">';
  for (const a of normal) {
    const got = _unlocked.has(a.id);
    html += `<div class="ach-card ${got ? 'ach-unlocked' : 'ach-locked'}">
      <div class="ach-icon">${got ? a.icon : '?'}</div>
      <div class="ach-name">${got ? a.name : '???'}</div>
      <div class="ach-desc">${got ? a.desc : 'Keep playing to unlock!'}</div>
    </div>`;
  }
  html += '</div>';

  html += '<div class="ach-superhard-header">☠ SUPER HARD ☠</div>';
  html += '<div class="ach-grid">';
  for (const a of superhard) {
    const got = _unlocked.has(a.id);
    html += `<div class="ach-card ach-card-sh ${got ? 'ach-unlocked-sh' : 'ach-locked'}">
      <div class="ach-icon">${got ? '💀' : '💀'}</div>
      <div class="ach-name ach-name-sh">${got ? a.name : a.name}</div>
      <div class="ach-desc">${a.desc}</div>
      ${got ? '<div class="ach-sh-cleared">CLEARED</div>' : ''}
    </div>`;
  }
  html += '</div>';

  return html;
}
