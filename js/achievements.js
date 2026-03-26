// ═══════════════════════════════════════════════════════════════
// ACHIEVEMENTS — 100 achievement definitions + unlock logic
// Persisted to localStorage under 'fishFrenzyAchievements'
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import { saveUserAchievements, loadUserAchievements, saveAchievementBoard } from '../firebase-config.js';
import { SKINS } from './skins.js';

const STORAGE_KEY = 'fishFrenzyAchievements';

// ─── Definitions ──────────────────────────────────────────────
// tier: 'easy' | 'medium' | 'hard' | 'extrahard' | 'alx' | 'secret'
export const ACHIEVEMENTS = [
  // ── EASY ──
  { id: 'first_treat',    tier:'easy', icon: '🪱', name: 'FIRST BITE',       desc: 'Collect your first treat.',                                   hint: 'Collect any treat on the field.' },
  { id: 'score_100',      tier:'easy', icon: '💯', name: 'TRIPLE DIGITS',    desc: 'Score 100 points.',                                           hint: 'Score 100 points.' },
  { id: 'score_500',      tier:'easy', icon: '⭐', name: 'FIVE HUNDRED',     desc: 'Score 500 points.',                                           hint: 'Score 500 points.' },
  { id: 'score_1000',     tier:'easy', icon: '💫', name: 'FOUR FIGURES',     desc: 'Score 1,000 points.',                                         hint: 'Score 1,000 points.' },
  { id: 'score_2500',     tier:'easy', icon: '💰', name: 'GETTING THERE',    desc: 'Score 2,500 points.',                                         hint: 'Score 2,500 points.' },
  { id: 'level_5',        tier:'easy', icon: '🐟', name: 'FIVE DEEP',        desc: 'Reach level 5.',                                              hint: 'Make it to level 5.' },
  { id: 'easy_game',      tier:'easy', icon: '😌', name: 'EASY RIDER',       desc: 'Complete level 3 on Easy.',                                   hint: 'Set difficulty to Easy and reach level 3.' },
  { id: 'normal_game',    tier:'easy', icon: '😎', name: 'JUST RIGHT',       desc: 'Complete level 5 on Normal.',                                 hint: 'Play on Normal and reach level 5.' },
  { id: 'first_game',     tier:'easy', icon: '🎮', name: 'BORN TO SWIM',     desc: 'Complete your first game.',                                   hint: 'Finish any game (even dying counts).' },
  { id: 'first_powerup',  tier:'easy', icon: '✨', name: 'POWERED UP',       desc: 'Collect your first powerup.',                                 hint: 'Pick up any glowing powerup on the field.' },
  { id: 'use_frenzy',     tier:'easy', icon: '🔥', name: 'FEEDING FRENZY',   desc: 'Use the Frenzy powerup.',                                     hint: 'Collect the 🔥 Frenzy powerup.' },
  { id: 'use_ice',        tier:'easy', icon: '❄️', name: 'ICE ICE BABY',     desc: 'Use the Ice powerup.',                                        hint: 'Collect the ❄️ Ice powerup.' },
  { id: 'use_ghost',      tier:'easy', icon: '👻', name: 'BOO!',             desc: 'Use the Ghost powerup.',                                      hint: 'Collect the 👻 Ghost powerup.' },
  { id: 'use_star',       tier:'easy', icon: '⭐', name: 'STAR POWER',       desc: 'Use the Star powerup.',                                       hint: 'Collect the 🌟 Star powerup.' },
  { id: 'use_rainbow',    tier:'easy', icon: '🌈', name: 'OVER THE RAINBOW', desc: 'Use the Rainbow powerup.',                                    hint: 'Collect the 🌈 Rainbow powerup.' },
  { id: 'use_bodyswap',   tier:'easy', icon: '🎭', name: 'BODY SNATCHER',    desc: 'Use the Body Swap powerup.',                                  hint: 'Collect the 🎭 Body Swap powerup.' },
  { id: 'use_bomb',       tier:'easy', icon: '💣', name: 'KABOOM',           desc: 'Use the Bomb powerup.',                                       hint: 'Collect the 💣 Bomb powerup.' },
  { id: 'use_claude',     tier:'easy', icon: '🤖', name: 'AI FISH',          desc: 'Use The Claude powerup.',                                     hint: 'Collect the 🤖 Claude powerup.' },
  { id: 'use_hell',       tier:'easy', icon: '👹', name: 'HELL AND BACK',    desc: 'Survive the Hell powerup.',                                   hint: 'Collect the 👹 Hell powerup and survive it.' },
  { id: 'use_magnet',     tier:'easy', icon: '🧲', name: 'ATTRACTION',       desc: 'Use the Magnet powerup.',                                     hint: 'Collect the 🧲 Magnet powerup.' },
  { id: 'use_hook',       tier:'easy', icon: '🪝', name: 'HOOKED',           desc: 'Use the Hook powerup.',                                       hint: 'Collect the 🪝 Hook powerup.' },
  { id: 'use_card',       tier:'easy', icon: '🃏', name: 'WILD CARD',        desc: 'Use the Playing Card powerup.',                               hint: 'Collect the 🃏 Playing Card powerup.' },
  { id: 'use_hourglass',  tier:'easy', icon: '⏳', name: 'TIME WARP',        desc: 'Use the Hourglass powerup.',                                  hint: 'Collect the ⏳ Hourglass powerup.' },
  { id: 'use_goop',       tier:'easy', icon: '🧪', name: 'GOOPED',           desc: 'Survive the Goop powerup.',                                   hint: 'Collect the 🧪 Goop powerup and survive it.' },
  { id: 'use_decoy',      tier:'easy', icon: '👁️', name: 'COPYCAT',          desc: 'Use the Decoy Fish powerup.',                                 hint: 'Collect the 👁️ Decoy Fish powerup.' },
  { id: 'close_call',     tier:'easy', icon: '😰', name: 'CLOSE CALL',       desc: 'Survive within 25px of the shark.',                           hint: 'Let the shark get very close — and survive.' },
  { id: 'play_goldfish',  tier:'easy', icon: '🐠', name: 'GOLDFISH',         desc: 'Play a game as a Goldfish.',                                  hint: 'Select the Goldfish body type in the skin picker.' },
  { id: 'play_clownfish', tier:'easy', icon: '🤡', name: 'CLOWNFISH',        desc: 'Play a game as a Clownfish.',                                 hint: 'Select the Clownfish body type in the skin picker.' },
  { id: 'play_angler',    tier:'easy', icon: '🎣', name: 'ANGLER',           desc: 'Play a game as an Angler Fish.',                              hint: 'Select the Angler Fish body type in the skin picker.' },
  { id: 'play_pufferfish',tier:'easy', icon: '🐡', name: 'PUFFERFISH',       desc: 'Play a game as a Pufferfish.',                                hint: 'Select the Pufferfish body type in the skin picker.' },
  { id: 'signed_in',      tier:'easy', icon: '🔑', name: 'WELCOME BACK',     desc: 'Sign in with an account.',                                    hint: 'Sign in using the button on the main menu.' },
  { id: 'designer',       tier:'easy', icon: '🎨', name: 'FISH DESIGNER',    desc: 'Create a custom fish skin.',                                  hint: 'Go to Settings → Customise → Skins and create a custom fish.' },

  // ── MEDIUM ──
  { id: 'score_5000',        tier:'medium', icon: '🌟', name: 'FIVE THOUSAND',   desc: 'Score 5,000 points.',                                       hint: 'Score 5,000 points in one game.' },
  { id: 'score_7500',        tier:'medium', icon: '💥', name: 'SIX SEVEN',      desc: 'Score 6,700 points.',                                       hint: 'Score 7,500 points in one game.' },
  { id: 'score_10000',       tier:'medium', icon: '👑', name: 'TEN THOUSAND',    desc: 'Score 10,000 points.',                                      hint: 'Score 10,000 points in one game.' },
  { id: 'score_15000',       tier:'medium', icon: '🔮', name: 'FIFTEEN K',       desc: 'Score 15,000 points.',                                      hint: 'Score 15,000 points in one game.' },
  { id: 'med_score_25k',     tier:'medium', icon: '🌊', name: 'BIG FISH',        desc: 'Score 25,000 points in a single game.',                     hint: 'Score 25,000 in one run — try Hard + Smart Shark.' },
  { id: 'level_10',          tier:'medium', icon: '🌊', name: 'DEEP WATER',      desc: 'Reach level 10.',                                           hint: 'Survive until level 10.' },
  { id: 'level_15',          tier:'medium', icon: '🌀', name: 'FIFTEEN DEEP',    desc: 'Reach level 15.',                                           hint: 'Survive until level 15.' },
  { id: 'hard_game',         tier:'medium', icon: '🔥', name: 'HARD BOILED',     desc: 'Complete level 5 on Hard.',                                 hint: 'Set difficulty to Hard and reach level 5.' },
  { id: 'level_hard_7',      tier:'medium', icon: '😬', name: 'GOING DEEPER',    desc: 'Reach level 7 on Hard.',                                    hint: 'Survive to level 7 on Hard difficulty.' },
  { id: 'tutorial_complete', tier:'medium', icon: '🎓', name: 'GRADUATED',       desc: 'Complete the Tutorial difficulty.',                          hint: 'Clear any level in Tutorial mode.' },
  { id: 'blitz',             tier:'medium', icon: '💥', name: 'BLITZ',           desc: 'Collect 5 treats in under 2 seconds.',                      hint: 'Collect 5 treats extremely fast — try Frenzy or Magnet.' },
  { id: 'chain_5',           tier:'medium', icon: '⚡', name: 'CHAIN MASTER',    desc: 'Reach a x5 combo.',                                         hint: 'Collect 5 treats in a row without the combo timer expiring.' },
  { id: 'hot_streak',        tier:'medium', icon: '🔥', name: 'HOT STREAK',      desc: 'Reach x3 combo or higher 5 times in one game.',             hint: 'Keep building combos throughout a game — aim for x3+.' },
  { id: 'speed_run',         tier:'medium', icon: '⏩', name: 'SPEED RUN',       desc: 'Complete a level in under 10 seconds.',                     hint: 'Collect all treats before 10 seconds have passed.' },
  { id: 'last_second',       tier:'medium', icon: '⏰', name: 'PHOTO FINISH',    desc: 'Complete a level with less than 2 seconds on the clock.',   hint: 'Collect the last treat with almost no time left.' },
  { id: 'centurion',         tier:'medium', icon: '💎', name: 'CENTURION',       desc: 'Collect 100 treats in one game.',                           hint: 'Survive long enough to collect 100 treats in one run.' },
  { id: 'treat_200',         tier:'medium', icon: '🍽️', name: 'GLUTTON',         desc: 'Collect 200 treats in a single game.',                      hint: 'Collect 200 treats in one run — survive as long as possible.' },
  { id: 'close_call_5',      tier:'medium', icon: '🫀', name: 'LUCKY FISH',      desc: 'Survive within 25px of the shark 5 times in one game.',     hint: 'Let the shark get dangerously close 5 separate times.' },
  { id: 'ice_ghost',         tier:'medium', icon: '❄️', name: 'TWO FOR ONE',     desc: 'Use Ice and Ghost in the same game.',                       hint: 'Collect both the ❄️ Ice and 👻 Ghost powerups in one game.' },
  { id: 'power_collector',   tier:'medium', icon: '🎮', name: 'POWER COLLECTOR', desc: 'Use 8 different powerup types in one game.',                hint: 'Collect 8 different types of powerup in a single run.' },
  { id: 'med_all_powerups',  tier:'medium', icon: '🕹️', name: 'COMPLETIONIST',   desc: 'Use 10 different powerup types across all your games.',     hint: 'Find 10 different powerup types across multiple games.' },
  { id: 'survivor',          tier:'medium', icon: '🏊', name: 'VETERAN',         desc: 'Play 20 total games.',                                      hint: 'Play 20 games in total.' },
  { id: 'lucky_777',         tier:'medium', icon: '🎰', name: 'LUCKY SEVEN',     desc: 'Score exactly 777 points.',                                 hint: 'End a level at exactly 777 points — try stopping on purpose.' },
  { id: 'fashionista',       tier:'medium', icon: '👗', name: 'FASHIONISTA',     desc: 'Use 5 different skins.',                                    hint: 'Play games using 5 different skin types.' },
  { id: 'music_explorer',    tier:'medium', icon: '🎵', name: 'MUSIC EXPLORER',  desc: 'Listen to 5 different music tracks.',                       hint: 'Switch to 5 different tracks in Settings → Customise → Music.' },
  { id: 'night_swimmer',     tier:'medium', icon: '🌙', name: 'NIGHT SWIMMER',   desc: 'Score 1,000+ points without collecting any powerups.',      hint: 'Score 1,000 points while avoiding all powerups.' },

  // ── HARD ──
  { id: 'level_20',          tier:'hard', icon: '🏆', name: 'ABYSS SWIMMER',          desc: 'Reach level 20.',                                                          hint: 'Survive until level 20.' },
  { id: 'level_25',          tier:'hard', icon: '🌑', name: 'QUARTER CENTURY',        desc: 'Reach level 25.',                                                          hint: 'Survive until level 25.' },
  { id: 'med_level_30',      tier:'hard', icon: '🏔️', name: 'THIRTY DEEP',            desc: 'Reach level 30.',                                                          hint: 'Survive until level 30.' },
  { id: 'score_35000',       tier:'hard', icon: '💸', name: 'ALMOST THERE',           desc: 'Score 35,000 points.',                                                     hint: 'Score 35,000 points in one game — Hard + Smart Shark helps.' },
  { id: 'hard_level_10',     tier:'hard', icon: '😈', name: 'MASOCHIST',              desc: 'Reach level 10 on Hard.',                                                  hint: 'Survive to level 10 on Hard difficulty.' },
  { id: 'hard_20',           tier:'hard', icon: '☠️', name: 'GLUTTON FOR PUNISHMENT', desc: 'Reach level 20 on Hard.',                                                  hint: 'Survive to level 20 on Hard difficulty.' },
  { id: 'daredevil',         tier:'hard', icon: '⚡', name: 'DAREDEVIL',              desc: 'Complete level 5 with Hard + Smart Shark.',                                hint: 'Enable Hard difficulty and Smart Shark, reach level 5.' },
  { id: 'speed_extreme',     tier:'hard', icon: '⚡', name: 'LIGHTNING FISH',         desc: 'Complete a level in under 5 seconds.',                                     hint: 'Collect all treats in under 5 seconds — try Frenzy.' },
  { id: 'med_speed_chain',   tier:'hard', icon: '🏎️', name: 'SPEEDSTER',              desc: 'Complete 5 consecutive levels each in under 10 seconds.',                  hint: 'Complete 5 levels in a row each under 10 seconds.' },
  { id: 'speed_chain_10',    tier:'hard', icon: '🚀', name: 'UNSTOPPABLE',            desc: 'Complete 10 consecutive levels each in under 10 seconds.',                 hint: 'Complete 10 levels in a row under 10 seconds each.' },
  { id: 'untouchable',       tier:'hard', icon: '🛡️', name: 'UNTOUCHABLE',            desc: 'Complete a level without the shark getting within 120px.',                 hint: 'Clear a full level while keeping the shark far away.' },
  { id: 'med_no_powerup_hard',tier:'hard',icon: '🔥', name: 'PURIST',                 desc: 'Reach level 7 on Hard without collecting any powerups.',                   hint: 'Reach level 7 on Hard, ignoring every powerup on the field.' },
  { id: 'med_combo_spree',   tier:'hard', icon: '👊', name: 'ON FIRE',                desc: 'Hit x5 combo 3 times in a single game.',                                   hint: 'Reach a x5 combo chain 3 separate times in one game.' },
  { id: 'true_combo_5',      tier:'hard', icon: '💥', name: 'CHAIN REACTION',         desc: 'Hit x5 combo 5 times in a single game.',                                   hint: 'Reach x5 combo 5 separate times in one game.' },
  { id: 'combo_king',        tier:'hard', icon: '👊', name: 'COMBO KING',             desc: 'Reach x5 combo 10 times total.',                                           hint: 'Build a x5 combo 10 times across all your games.' },
  { id: 'perfectionist',     tier:'hard', icon: '✨', name: 'PERFECTIONIST',          desc: 'Reach level 5 without collecting any powerups.',                           hint: 'Ignore all powerups and survive to level 5.' },
  { id: 'triple_threat',     tier:'hard', icon: '🎆', name: 'TRIPLE THREAT',          desc: 'Use Frenzy, Star, and Rainbow in the same game.',                          hint: 'Collect 🔥 Frenzy, 🌟 Star, and 🌈 Rainbow all in one game.' },
  { id: 'treat_hoarder',     tier:'hard', icon: '🍽️', name: 'TREAT HOARDER',         desc: 'Collect 500 treats across all games.',                                     hint: 'Collect 500 treats total across all your games.' },
  { id: 'treat_2000',        tier:'hard', icon: '🌊', name: 'TREAT VACUUM',           desc: 'Collect 2,000 treats total.',                                              hint: 'Collect 2,000 treats total across all your games.' },
  { id: 'power_mad',         tier:'hard', icon: '🌀', name: 'POWER MAD',              desc: 'Collect 50 powerups total.',                                               hint: 'Collect 50 powerups total across all your games.' },
  { id: 'power_mad_100',     tier:'hard', icon: '🌪️', name: 'POWERUP ADDICT',        desc: 'Collect 100 powerups total.',                                              hint: 'Collect 100 powerups total across all your games.' },
  { id: 'full_house',        tier:'hard', icon: '🃏', name: 'FULL HOUSE',             desc: 'Play with Hard + Smart Shark + Mystery Blocks + Fast Treats.',             hint: 'Enable all four: Hard, Smart Shark, Mystery Blocks, Fast Treats.' },
  { id: 'marathon',          tier:'hard', icon: '🏃', name: 'MARATHON',               desc: 'Play for 30 minutes total.',                                               hint: 'Accumulate 30 minutes of total game time.' },
  { id: 'marathon_2h',       tier:'hard', icon: '🏅', name: 'IRON SWIMMER',           desc: 'Play for 2 hours total.',                                                  hint: 'Accumulate 2 hours of total game time.' },
  { id: 'overachiever',      tier:'hard', icon: '🏅', name: 'OVERACHIEVER',           desc: 'Unlock 25 achievements.',                                                  hint: 'Unlock 25 other achievements.' },
  { id: 'overachiever_50',   tier:'hard', icon: '🏆', name: 'HALL OF FAME',           desc: 'Unlock 50 achievements.',                                                  hint: 'Unlock 50 other achievements.' },

  // ── EXTRA HARD ──
  { id: 'sh_50k',               tier:'extrahard', icon: '💀', name: 'FIFTY GRAND',      desc: 'Score 50,000 points in a single game.',                                   hint: 'Score 50,000 in one run.' },
  { id: 'sh_score_75k',         tier:'extrahard', icon: '💀', name: 'SEVENTY FIVE K',   desc: 'Score 75,000 points in a single game.',                                   hint: 'Score 75,000 in one run.' },
  { id: 'sh_level_50',          tier:'extrahard', icon: '💀', name: 'THE VOID',         desc: 'Reach level 35.',                                                         hint: 'Survive until level 35.' },
  { id: 'sh_level_45',          tier:'extrahard', icon: '💀', name: 'THE GAUNTLET',    desc: 'Reach level 30 on Hard + Smart Shark.',                                   hint: 'Reach level 30 with both Hard difficulty and Smart Shark on.' },
  { id: 'sh_iron_fish',         tier:'extrahard', icon: '💀', name: 'IRON FISH',        desc: 'Reach level 10 on Hard + Smart Shark without collecting a single powerup.', hint: 'Hard + Smart Shark, reach level 10, touch zero powerups.' },
  { id: 'sh_no_powerup_hard_15',tier:'extrahard', icon: '💀', name: 'THE MONK',         desc: 'Reach level 15 on Hard without collecting any powerups.',                 hint: 'Reach level 15 on Hard, ignoring every powerup.' },
  { id: 'sh_speed_god',         tier:'extrahard', icon: '💀', name: 'SPEED GOD',        desc: 'Complete 3 consecutive levels each in under 6 seconds.',                  hint: 'Clear 3 levels in a row in under 6 seconds each.' },
  { id: 'sh_speed_demon',       tier:'extrahard', icon: '💀', name: 'SPEED DEMON',      desc: 'Complete 5 consecutive levels each in under 6 seconds.',                  hint: 'Clear 5 levels in a row in under 6 seconds each.' },
  { id: 'sh_hell_x5',           tier:'extrahard', icon: '💀', name: 'HELL GAUNTLET',    desc: 'Survive the Hell powerup 3 times in a single game.',                      hint: 'Survive Hell 3 times in one game.' },
  { id: 'sh_hell_x10',          tier:'extrahard', icon: '💀', name: 'INFERNO',          desc: 'Survive the Hell powerup 3 times total across all games.',                hint: 'Survive Hell 3 times total across all your games.' },

  // ── ALX CHALLENGE ──
  { id: 'alx_challenge',  tier:'alx', icon: '🐟', name: 'THE ALX CHALLENGE', desc: 'Score 100,000 points. We see you.', hint: 'Score 100,000 points in a single game. Good luck.' },

  // ── SECRET ──
  { id: 'death_card',        tier:'secret', icon: '🂡', name: 'DEATH CARD',      desc: 'Draw the Death card from the Playing Card powerup.' },
  { id: 'secret_score_69',   tier:'secret', icon: '😏', name: 'NICE',            desc: 'Score exactly 69 points.' },
  { id: 'secret_1px',        tier:'secret', icon: '😱', name: 'THAT WAS CLOSE',  desc: 'Survive within 5px of the shark.' },
  { id: 'secret_night_owl',  tier:'secret', icon: '🦉', name: 'NIGHT OWL',       desc: 'Play between midnight and 2am.' },
  { id: 'secret_gotta_catch',tier:'secret', icon: '🏊', name: 'GOTTA CATCH EM',  desc: 'Use 16+ different powerup types in a single game.' },
  { id: 'secret_kamikaze',   tier:'secret', icon: '💥', name: 'KAMIKAZE',        desc: 'Die while at a x5 combo.' },
];

// ─── State ────────────────────────────────────────────────────

let _unlocked = new Set();
let _stats = {
  totalTreats: 0,
  totalPowerups: 0,
  totalPlayMs: 0,
  combo5Count: 0,
  gamesPlayed: 0,
  totalHellSurvivals: 0,
  skinsUsed: new Set(),
  tracksUsed: new Set(),
  allPowerupTypes: new Set(),  // cumulative across all games
};

// ─── Per-game tracking ────────────────────────────────────────
let _gameStats = {
  treats: 0,
  powerupTypes: new Set(),
  minSharkDist: 9999,
  levelMinSharkDist: 9999,
  treatTimes: [],
  noPowerups: true,
  hellSurviveCount: 0,
  consecutiveFastLevels: 0,    // levels under 4s in a row
  consecutiveMedFastLevels: 0, // levels under 10s in a row
  gameCombo5Count: 0,          // x5 combos this game
  combo3PlusCount: 0,          // x3+ combos this game
  closeCallsThisGame: 0,       // <25px close calls this game
  lastCloseCallTime: 0,        // timestamp for close call cooldown
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
      if (typeof rs.totalTreats        === 'number') _stats.totalTreats        = rs.totalTreats;
      if (typeof rs.totalPowerups      === 'number') _stats.totalPowerups      = rs.totalPowerups;
      if (typeof rs.totalPlayMs        === 'number') _stats.totalPlayMs        = rs.totalPlayMs;
      if (typeof rs.combo5Count        === 'number') _stats.combo5Count        = rs.combo5Count;
      if (typeof rs.gamesPlayed        === 'number') _stats.gamesPlayed        = rs.gamesPlayed;
      if (typeof rs.totalHellSurvivals === 'number') _stats.totalHellSurvivals = rs.totalHellSurvivals;
      if (Array.isArray(rs.skinsUsed))       _stats.skinsUsed       = new Set(rs.skinsUsed);
      if (Array.isArray(rs.tracksUsed))      _stats.tracksUsed      = new Set(rs.tracksUsed);
      if (Array.isArray(rs.allPowerupTypes)) _stats.allPowerupTypes = new Set(rs.allPowerupTypes);
    }
  } catch (_) {}
}

function _buildPayload() {
  return {
    unlocked: [..._unlocked],
    stats: {
      totalTreats:        _stats.totalTreats,
      totalPowerups:      _stats.totalPowerups,
      totalPlayMs:        _stats.totalPlayMs,
      combo5Count:        _stats.combo5Count,
      gamesPlayed:        _stats.gamesPlayed,
      totalHellSurvivals: _stats.totalHellSurvivals,
      skinsUsed:          [..._stats.skinsUsed],
      tracksUsed:         [..._stats.tracksUsed],
      allPowerupTypes:    [..._stats.allPowerupTypes],
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
    if (typeof cs.totalTreats        === 'number') _stats.totalTreats        = Math.max(_stats.totalTreats,        cs.totalTreats);
    if (typeof cs.totalPowerups      === 'number') _stats.totalPowerups      = Math.max(_stats.totalPowerups,      cs.totalPowerups);
    if (typeof cs.totalPlayMs        === 'number') _stats.totalPlayMs        = Math.max(_stats.totalPlayMs,        cs.totalPlayMs);
    if (typeof cs.combo5Count        === 'number') _stats.combo5Count        = Math.max(_stats.combo5Count,        cs.combo5Count);
    if (typeof cs.gamesPlayed        === 'number') _stats.gamesPlayed        = Math.max(_stats.gamesPlayed,        cs.gamesPlayed);
    if (typeof cs.totalHellSurvivals === 'number') _stats.totalHellSurvivals = Math.max(_stats.totalHellSurvivals, cs.totalHellSurvivals);
    if (Array.isArray(cs.skinsUsed))       for (const s of cs.skinsUsed)       _stats.skinsUsed.add(s);
    if (Array.isArray(cs.tracksUsed))      for (const t of cs.tracksUsed)      _stats.tracksUsed.add(t);
    if (Array.isArray(cs.allPowerupTypes)) for (const p of cs.allPowerupTypes) _stats.allPowerupTypes.add(p);
  }
  // Write merged result back to both stores
  const merged = _buildPayload();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (_) {}
  saveUserAchievements(uid, merged);

  // Push count to public board with whatever name we have
  if (S.currentUser && !S.currentUser.isAnonymous && _unlocked.size > 0) {
    const name = S.settings.lastInitials || S.currentUser.displayName || '???';
    saveAchievementBoard(uid, name, _unlocked.size);
  }
}

// ─── Toast queue ──────────────────────────────────────────────

let _toastQueue = [];
let _toastBusy  = false;

function _toast(id) {
  _toastQueue.push(id);
  if (!_toastBusy) _nextToast();
}

function _nextToast() {
  if (_toastQueue.length === 0) { _toastBusy = false; return; }
  _toastBusy = true;

  const id  = _toastQueue.shift();
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def) { _nextToast(); return; }

  const container = document.getElementById('achievement-toasts');
  if (!container) { _nextToast(); return; }

  const el = document.createElement('div');
  el.className = 'achievement-toast';
  el.innerHTML = `<span class="ach-toast-icon">${def.icon}</span>
    <div class="ach-toast-text">
      <div class="ach-toast-label">ACHIEVEMENT UNLOCKED</div>
      <div class="ach-toast-name">${def.name}</div>
    </div>`;
  container.appendChild(el);

  setTimeout(() => el.classList.add('ach-toast-out'), 2800);
  setTimeout(() => { el.remove(); _nextToast(); }, 3200);
}

// ─── Unlock helper ────────────────────────────────────────────

function unlock(id) {
  if (_unlocked.has(id)) return;
  _unlocked.add(id);
  _save();
  _toast(id);

  // Push updated count to public achievement board when signed in
  if (S.currentUser && !S.currentUser.isAnonymous) {
    const name = S.settings.lastInitials || S.currentUser.displayName || '???';
    saveAchievementBoard(S.currentUser.uid, name, _unlocked.size);
  }

  // Check milestone overachievers after any unlock
  if (_unlocked.size >= 25 && !_unlocked.has('overachiever'))    unlock('overachiever');
  if (_unlocked.size >= 50 && !_unlocked.has('overachiever_50')) unlock('overachiever_50');
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
    consecutiveMedFastLevels: 0,
    gameCombo5Count: 0,
    combo3PlusCount: 0,
    closeCallsThisGame: 0,
    lastCloseCallTime: 0,
    gameStartTime: Date.now(),
  };

  // Night owl: playing between midnight and 2am
  const hour = new Date().getHours();
  if (hour < 2) unlock('secret_night_owl');

  // Skin-based achievements
  const skinIdx = S.settings.skin;
  _stats.skinsUsed.add(skinIdx);
  _save();

  // Full house: hard + smartShark + mysteryBlocks + fastTreats
  if (S.settings.difficulty === 'hard' && S.settings.smartShark &&
      S.settings.mysteryBlocks && S.settings.fastTreats) {
    unlock('full_house');
  }

  // Skin achievements — check fishType so custom skins with those bodies also count
  const fishType = SKINS[skinIdx]?.fishType || 'standard';
  if (fishType === 'goldfish')   unlock('play_goldfish');
  if (fishType === 'clownfish')  unlock('play_clownfish');
  if (fishType === 'angler')     unlock('play_angler');
  if (fishType === 'pufferfish') unlock('play_pufferfish');

  // Fashionista: 5+ different skins used
  if (_stats.skinsUsed.size >= 5) unlock('fashionista');
}

export function onLevelStart(_level) {
  _gameStats.levelMinSharkDist = 9999;
}

export function onTreatCollected() {
  _gameStats.treats++;
  _stats.totalTreats++;
  _save();

  const now = Date.now();
  _gameStats.treatTimes.push(now);
  if (_gameStats.treatTimes.length > 10) _gameStats.treatTimes.shift();

  unlock('first_treat');

  if (_gameStats.treats >= 100) unlock('centurion');
  if (_gameStats.treats >= 200) unlock('treat_200');
  if (_stats.totalTreats >= 500)  unlock('treat_hoarder');
  if (_stats.totalTreats >= 2000) unlock('treat_2000');

  // Blitz: 5 treats in 2 seconds
  if (_gameStats.treatTimes.length >= 5) {
    const window5 = now - _gameStats.treatTimes[_gameStats.treatTimes.length - 5];
    if (window5 <= 2000) unlock('blitz');
  }
}

export function onScoreUpdate(score) {
  if (score >= 100)    unlock('score_100');
  if (score >= 500)    unlock('score_500');
  if (score >= 1000)   unlock('score_1000');
  if (score >= 2500)   unlock('score_2500');
  if (score >= 5000)   unlock('score_5000');
  if (score >= 6700)   unlock('score_7500');
  if (score >= 10000)  unlock('score_10000');
  if (score >= 15000)  unlock('score_15000');
  if (score >= 25000)  unlock('med_score_25k');
  if (score >= 35000)  unlock('score_35000');
  if (score >= 50000)  unlock('sh_50k');
  if (score >= 75000)  unlock('sh_score_75k');
  if (score >= 100000) unlock('alx_challenge');

  if (score === 777)   unlock('lucky_777');
  if (score === 69)    unlock('secret_score_69');

  // Night swimmer: 1000 points with zero powerups
  if (score >= 1000 && _gameStats.noPowerups) unlock('night_swimmer');
}

export function onComboReached(combo) {
  if (combo >= 3) {
    _gameStats.combo3PlusCount++;
    if (_gameStats.combo3PlusCount >= 5) unlock('hot_streak');
  }
  if (combo >= 5) {
    unlock('chain_5');
    _stats.combo5Count++;
    _gameStats.gameCombo5Count++;
    _save();
    if (_stats.combo5Count >= 10)        unlock('combo_king');
    if (_gameStats.gameCombo5Count >= 3) unlock('med_combo_spree');
    if (_gameStats.gameCombo5Count >= 5) unlock('true_combo_5');
  }
}

export function onLevelComplete(level, timeLeft) {
  // Accumulate play time on each level complete too (not just on death)
  if (_gameStats.gameStartTime) {
    _stats.totalPlayMs += Date.now() - _gameStats.gameStartTime;
    _gameStats.gameStartTime = Date.now(); // reset for next level
    _save();
  }
  if (_stats.totalPlayMs >= 30 * 60 * 1000)     unlock('marathon');
  if (_stats.totalPlayMs >= 2 * 60 * 60 * 1000) unlock('marathon_2h');

  const levelTime = S.maxTime - timeLeft;

  // Speed achievements
  if (levelTime <= 10) unlock('speed_run');
  if (levelTime <= 5)  unlock('speed_extreme');

  // Photo Finish: less than 2 seconds left on clock
  if (timeLeft < 2) unlock('last_second');

  // Speed chains
  if (levelTime <= 6) {
    _gameStats.consecutiveFastLevels++;
    if (_gameStats.consecutiveFastLevels >= 3) unlock('sh_speed_god');
    if (_gameStats.consecutiveFastLevels >= 5) unlock('sh_speed_demon');
  } else {
    _gameStats.consecutiveFastLevels = 0;
  }

  if (levelTime <= 10) {
    _gameStats.consecutiveMedFastLevels++;
    if (_gameStats.consecutiveMedFastLevels >= 5)  unlock('med_speed_chain');
    if (_gameStats.consecutiveMedFastLevels >= 10) unlock('speed_chain_10');
  } else {
    _gameStats.consecutiveMedFastLevels = 0;
  }

  // Untouchable: shark never got within 120px this level
  if (_gameStats.levelMinSharkDist >= 120) unlock('untouchable');

  // Difficulty-based
  const diff = S.settings.difficulty;

  // Level progression
  if (level >= 5)  unlock('level_5');
  if (level >= 10) unlock('level_10');
  if (level >= 15) unlock('level_15');
  if (level >= 20) unlock('level_20');
  if (level >= 25) unlock('level_25');
  if (level >= 30) unlock('med_level_30');
  if (level >= 35) unlock('sh_level_50');
  if (diff === 'hard' && S.settings.smartShark && level >= 30) unlock('sh_level_45');
  if (diff === 'easy'     && level >= 3)  unlock('easy_game');
  if (diff === 'normal'   && level >= 5)  unlock('normal_game');
  if (diff === 'hard'     && level >= 5)  unlock('hard_game');
  if (diff === 'hard'     && level >= 7)  unlock('level_hard_7');
  if (diff === 'hard'     && level >= 10) unlock('hard_level_10');
  if (diff === 'hard'     && level >= 20) unlock('hard_20');
  // tutorial_complete is unlocked by onTutorialComplete() when the player finishes the full tutorial
  if (diff === 'hard' && S.settings.smartShark && level >= 5) unlock('daredevil');

  // Powerup-free runs
  if (_gameStats.noPowerups) {
    if (level >= 5)                                   unlock('perfectionist');
    if (diff === 'hard' && level >= 7)                unlock('med_no_powerup_hard');
    if (diff === 'hard' && level >= 15)               unlock('sh_no_powerup_hard_15');
    if (diff === 'hard' && S.settings.smartShark && level >= 10) unlock('sh_iron_fish');
  }

  // Combo powerup combinations (check after level, using whole-game types)
  const pt = _gameStats.powerupTypes;
  if (pt.has('frenzy') && pt.has('star') && pt.has('rainbow')) unlock('triple_threat');
  if (pt.has('ice') && pt.has('ghost'))                         unlock('ice_ghost');

  // Hell survived by completing the level while hell was still active
  if (S.hellActive) onHellSurvived();
}

export function onSharkDistanceFrame(d) {
  if (d < _gameStats.minSharkDist)      _gameStats.minSharkDist      = d;
  if (d < _gameStats.levelMinSharkDist) _gameStats.levelMinSharkDist = d;

  if (d < 5)  unlock('secret_1px');
  if (d < 25) {
    unlock('close_call');
    const now = Date.now();
    if (now - _gameStats.lastCloseCallTime > 2000) {
      _gameStats.closeCallsThisGame++;
      _gameStats.lastCloseCallTime = now;
      if (_gameStats.closeCallsThisGame >= 5) unlock('close_call_5');
    }
  }
}

export function onPowerupCollected(type) {
  _gameStats.noPowerups = false;
  _gameStats.powerupTypes.add(type);
  _stats.totalPowerups++;
  _stats.allPowerupTypes.add(type);
  _save();

  unlock('first_powerup');
  if (_stats.totalPowerups >= 50)  unlock('power_mad');
  if (_stats.totalPowerups >= 100) unlock('power_mad_100');
  if (_gameStats.powerupTypes.size >= 8)  unlock('power_collector');
  if (_stats.allPowerupTypes.size >= 10)  unlock('med_all_powerups');
  if (_gameStats.powerupTypes.size >= 16) unlock('secret_gotta_catch');

  switch (type) {
    case 'frenzy':    unlock('use_frenzy');    break;
    case 'ice':       unlock('use_ice');       break;
    case 'ghost':     unlock('use_ghost');     break;
    case 'star':      unlock('use_star');      break;
    case 'swap':      unlock('use_bodyswap');  break;
    case 'rainbow':   unlock('use_rainbow');   break;
    case 'claude':    unlock('use_claude');    break;
    case 'bomb':      unlock('use_bomb');      break;
    case 'magnet':    unlock('use_magnet');    break;
    case 'hook':      unlock('use_hook');      break;
    case 'card':      unlock('use_card');      break;
    case 'hourglass': unlock('use_hourglass'); break;
    case 'goop':      unlock('use_goop');      break;
    case 'decoy':     unlock('use_decoy');     break;
  }
}

export function onHellSurvived() {
  unlock('use_hell');
  _gameStats.hellSurviveCount++;
  _stats.totalHellSurvivals++;
  _save();
  if (_gameStats.hellSurviveCount >= 3)  unlock('sh_hell_x5');
  if (_stats.totalHellSurvivals >= 3)    unlock('sh_hell_x10');
}

export function onGameOver(_score, _level) {
  // Accumulate play time
  if (_gameStats.gameStartTime) {
    _stats.totalPlayMs += Date.now() - _gameStats.gameStartTime;
  }
  _stats.gamesPlayed++;
  _save();

  unlock('first_game');
  if (_stats.gamesPlayed >= 20)                          unlock('survivor');
  if (_stats.totalPlayMs >= 30 * 60 * 1000)              unlock('marathon');
  if (_stats.totalPlayMs >= 2 * 60 * 60 * 1000)          unlock('marathon_2h');
}

export function onDeathWithCombo(combo) {
  if (combo >= 5) unlock('secret_kamikaze');
}

export function onTutorialComplete() {
  unlock('tutorial_complete');
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

export function getUnlocked() { return _unlocked; }
export function getUnlockedCount() { return _unlocked.size; }
export function getNonSecretCount() { return ACHIEVEMENTS.filter(a => a.tier !== 'secret').length; }
export function getStats() { return _stats; }
export function onDeathCard() { unlock('death_card'); }

// Progress definitions for locked numeric achievements
const _PROGRESS = {
  treat_hoarder:    { val: () => _stats.totalTreats,          max: 500 },
  treat_2000:       { val: () => _stats.totalTreats,          max: 2000 },
  survivor:         { val: () => _stats.gamesPlayed,          max: 20 },
  marathon:         { val: () => Math.floor(_stats.totalPlayMs / 60000), max: 30, suffix: 'min' },
  marathon_2h:      { val: () => Math.floor(_stats.totalPlayMs / 60000), max: 120, suffix: 'min' },
  power_mad:        { val: () => _stats.totalPowerups,        max: 50 },
  power_mad_100:    { val: () => _stats.totalPowerups,        max: 100 },
  combo_king:       { val: () => _stats.combo5Count,          max: 10 },
  overachiever:     { val: () => _unlocked.size,              max: 25 },
  overachiever_50:  { val: () => _unlocked.size,              max: 50 },
  fashionista:      { val: () => _stats.skinsUsed.size,       max: 5 },
  music_explorer:   { val: () => _stats.tracksUsed.size,      max: 5 },
  med_all_powerups: { val: () => _stats.allPowerupTypes.size, max: 10 },
  sh_hell_x10:      { val: () => _stats.totalHellSurvivals,   max: 3 },
};

function _achCard(a, extraClass = '') {
  const got = _unlocked.has(a.id);
  const lockedText = a.hint || 'Keep playing to unlock!';

  let progressHtml = '';
  if (!got && _PROGRESS[a.id]) {
    const p   = _PROGRESS[a.id];
    const cur = Math.min(p.val(), p.max);
    const pct = Math.round((cur / p.max) * 100);
    const label = p.suffix ? `${cur}${p.suffix} / ${p.max}${p.suffix}` : `${cur} / ${p.max}`;
    progressHtml = `<div class="ach-progress-wrap">
      <div class="ach-progress-bar" style="width:${pct}%"></div>
      <span class="ach-progress-label">${label}</span>
    </div>`;
  }

  return `<div class="ach-card ${extraClass} ${got ? 'ach-unlocked' : 'ach-locked'}" title="${got ? a.desc : lockedText}">
    <div class="ach-icon">${got ? a.icon : '?'}</div>
    <div class="ach-name">${got ? a.name : '???'}</div>
    <div class="ach-desc">${got ? a.desc : lockedText}</div>
    ${progressHtml}
  </div>`;
}

const TIERS = [
  { key: 'easy',      label: '🟢 EASY',        headerClass: 'ach-header-easy',      cardClass: '',                countLabel: true },
  { key: 'medium',    label: '⚡ MEDIUM',       headerClass: 'ach-header-medium',    cardClass: 'ach-card-medium', countLabel: true },
  { key: 'hard',      label: '🔴 HARD',         headerClass: 'ach-header-hard',      cardClass: 'ach-card-hard',   countLabel: true },
  { key: 'extrahard', label: '☠ EXTRA HARD ☠', headerClass: 'ach-header-sh',        cardClass: 'ach-card-sh',     countLabel: false },
  { key: 'alx',       label: '🐟 THE ALX CHALLENGE 🐟', headerClass: 'ach-header-alx', cardClass: 'ach-card-alx', countLabel: false },
];

export function buildAchievementsHTML() {
  const visibleAchs = ACHIEVEMENTS.filter(a => a.tier !== 'secret');
  const total = visibleAchs.length;
  const count = [..._unlocked].filter(id => {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    return a && a.tier !== 'secret';
  }).length;

  let html = `<div class="ach-summary">${count} / ${total} UNLOCKED</div>`;

  for (const tier of TIERS) {
    const list = ACHIEVEMENTS.filter(a => a.tier === tier.key);
    const tierUnlocked = list.filter(a => _unlocked.has(a.id)).length;
    const countStr = tier.countLabel ? ` <span class="ach-tier-count">${tierUnlocked}/${list.length}</span>` : '';

    html += `<div class="ach-section-header ${tier.headerClass}">${tier.label}${countStr}</div>`;

    const gridClass = tier.key === 'alx' ? 'ach-grid ach-grid-alx' : 'ach-grid';
    html += `<div class="${gridClass}">`;

    for (const a of list) {
      const got = _unlocked.has(a.id);
      if (tier.key === 'extrahard') {
        const shHint = a.hint || a.desc;
        html += `<div class="ach-card ach-card-sh ${got ? 'ach-unlocked-sh' : 'ach-locked'}" title="${got ? a.desc : shHint}">
          <div class="ach-icon">💀</div>
          <div class="ach-name ach-name-sh">${a.name}</div>
          <div class="ach-desc">${got ? a.desc : shHint}</div>
          ${got ? '<div class="ach-sh-cleared">CLEARED</div>' : ''}
        </div>`;
      } else if (tier.key === 'alx') {
        const alxHint = a.hint || a.desc;
        html += `<div class="ach-card ach-card-alx ${got ? 'ach-unlocked-alx' : 'ach-locked'}" title="${got ? a.desc : alxHint}">
          <div class="ach-icon">${got ? '🐟' : '🔒'}</div>
          <div class="ach-name ach-name-alx">${a.name}</div>
          <div class="ach-desc">${got ? a.desc : alxHint}</div>
          ${got ? '<div class="ach-alx-cleared">LEGENDARY</div>' : ''}
        </div>`;
      } else {
        html += _achCard(a, tier.cardClass);
      }
    }
    html += '</div>';
  }

  // Secret achievements
  const secrets = ACHIEVEMENTS.filter(a => a.tier === 'secret');
  const unlockedSecrets = secrets.filter(a => _unlocked.has(a.id));
  html += '<div class="ach-section-header ach-header-secret">🔮 SECRET</div>';
  html += '<div class="ach-grid">';
  if (unlockedSecrets.length > 0) {
    for (const a of unlockedSecrets) {
      html += `<div class="ach-card ach-card-secret ach-unlocked-secret" title="${a.desc}">
        <div class="ach-icon">${a.icon}</div>
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
      </div>`;
    }
  }
  const remaining = secrets.length - unlockedSecrets.length;
  for (let i = 0; i < remaining; i++) {
    html += `<div class="ach-card ach-card-secret ach-locked" title="A secret awaits...">
      <div class="ach-icon">🔮</div>
      <div class="ach-name">???</div>
      <div class="ach-desc">A secret awaits...</div>
    </div>`;
  }
  html += '</div>';

  return html;
}

// ─── Stats page ───────────────────────────────────────────────

export function buildStatsHTML() {
  const s = _stats;
  const totalMs = s.totalPlayMs;
  const hours   = Math.floor(totalMs / 3600000);
  const mins    = Math.floor((totalMs % 3600000) / 60000);
  const secs    = Math.floor((totalMs % 60000) / 1000);
  const timeStr = hours > 0
    ? `${hours}h ${mins}m`
    : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const nonSecret = getNonSecretCount();
  const unlocked  = [..._unlocked].filter(id => {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    return a && a.tier !== 'secret';
  }).length;
  const secrets = ACHIEVEMENTS.filter(a => a.tier === 'secret' && _unlocked.has(a.id)).length;

  const statRows = [
    ['🎮', 'GAMES PLAYED',        s.gamesPlayed.toLocaleString()],
    ['⏱',  'TIME PLAYED',         timeStr],
    ['🪱',  'TREATS EATEN',        s.totalTreats.toLocaleString()],
    ['✨',  'POWERUPS COLLECTED',  s.totalPowerups.toLocaleString()],
    ['⚡',  'X5 COMBOS',           s.combo5Count.toLocaleString()],
    ['👹',  'HELL SURVIVALS',      s.totalHellSurvivals.toLocaleString()],
    ['🎭',  'SKINS TRIED',         s.skinsUsed.size + ' / 7'],
    ['🎵',  'TRACKS HEARD',        s.tracksUsed.size],
    ['🕹',  'POWERUP TYPES FOUND', s.allPowerupTypes.size + ' / 16'],
    ['🏅',  'ACHIEVEMENTS',        `${unlocked} / ${nonSecret}${secrets > 0 ? ` + ${secrets} 🔮` : ''}`],
  ];

  let html = '<div class="stats-grid">';
  for (const [icon, label, val] of statRows) {
    html += `<div class="stats-row">
      <span class="stats-icon">${icon}</span>
      <span class="stats-label">${label}</span>
      <span class="stats-val">${val}</span>
    </div>`;
  }
  html += '</div>';
  return html;
}
