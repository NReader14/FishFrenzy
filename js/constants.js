// ═══════════════════════════════════════════════════════════════
// CONSTANTS — All tuneable values and utility functions
// ═══════════════════════════════════════════════════════════════

// Power-up durations (ms)
export const FRENZY_DURATION    = 3000;
export const ICE_DURATION       = 4000;
export const GHOST_DURATION     = 3000;
export const HOURGLASS_DURATION = 3500;
export const BUDDY_DURATION     = 3000;
export const BOMB_DURATION      = 2000;
export const CRAZY_DURATION     = 5000;
export const GOOP_DURATION      = 4000;
export const DECOY_DURATION     = 4000;
export const STAR_DURATION      = 3000;

// Rarity system
export const RARITY = {
  1: { name: 'Common',   spawnMul: 1.2,  life: 5000 },
  2: { name: 'Uncommon', spawnMul: 0.75, life: 4500 },
  3: { name: 'Rare',     spawnMul: 0.4,  life: 3500 },
  4: { name: 'Epic',     spawnMul: 0.18, life: 2500 },
  5: { name: 'Mythical', spawnMul: 0.08, life: 2000 },
};
export const CRAZY_ITEM_LIFETIME = 900;
export const MAX_FIELD_ITEMS     = 3;

// Fish movement
export const FISH_BASE_SPEED      = 2.5;
export const FISH_ACCEL_RATE      = 0.003;
export const FISH_MAX_SPEED_BONUS = 0.8;
export const FRENZY_SPEED_BOOST   = 1.2;

// Shark
export const SHARK_START_DELAY = 90;

// Gameplay
export const COMBO_WINDOW    = 1200;
export const PW_SPAWN_CHANCE = 0.007;
export const MAX_SCORES      = 5;

// Canvas
export const W = 720;
export const H = 480;

// Name entry character set
export const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('');

// Utilities
export const rand = (a, b) => Math.random() * (b - a) + a;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
