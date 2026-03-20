// ═══════════════════════════════════════════════════════════════
// GAME VARS — Runtime-mutable gameplay values (admin-editable)
// ═══════════════════════════════════════════════════════════════

export const gameVars = {
  fishSpeed:          2.5,   // Fish base movement speed
  fishFriction:       0.88,  // How quickly fish decelerates (0=none, 1=instant stop)
  fishAccelRate:      0.003, // Speed gained per frame held
  fishMaxSpeedBonus:  0.8,   // Max extra speed from acceleration
  sharkSpeedBase:     -1.75, // Shark speed offset above fish speed (fishSpeed + offset + level*perLevel)
  sharkSpeedPerLevel: 0.2,   // Shark speed added per level
  treatBase:          5,     // Treats at level 1
  treatPerLevel:      2,     // Extra treats added per level
  levelTimeBase:      35,    // Starting countdown (seconds) — fallback, per-difficulty values below take priority
  levelTimeMin:       18,    // Minimum countdown floor — fallback
  easy_levelTimeBase:     45,  hard_levelTimeBase:     28,  normal_levelTimeBase:   35,
  easy_levelTimeMin:      25,  hard_levelTimeMin:      14,  normal_levelTimeMin:    18,
  pwSpawnRadius:      80,    // Min distance from fish for powerup spawns
  sharkQuipInterval:  5,    // Avg seconds between shark quips
  sharkQuipDuration:  3.5,  // Min seconds each quip stays on screen
};

export const GAME_VAR_META = {
  fishSpeed:          { label: 'Fish Speed',           min: 0.5,  max: 8,    step: 0.1  },
  fishFriction:       { label: 'Fish Friction',        min: 0.5,  max: 0.99, step: 0.01 },
  fishAccelRate:      { label: 'Fish Accel Rate',      min: 0,    max: 0.02, step: 0.001 },
  fishMaxSpeedBonus:  { label: 'Fish Max Speed Bonus', min: 0,    max: 3,    step: 0.1  },
  sharkSpeedBase:     { label: 'Shark Speed Offset',   min: -2,   max: 5,    step: 0.05 },
  sharkSpeedPerLevel: { label: 'Shark Speed/Level',    min: 0,    max: 1,    step: 0.05 },
  treatBase:          { label: 'Treats Base',          min: 1,    max: 30,   step: 1    },
  treatPerLevel:      { label: 'Treats/Level',         min: 0,    max: 15,   step: 1    },
  levelTimeBase:          { label: 'Time Base — fallback (s)',    min: 10, max: 120, step: 1 },
  levelTimeMin:           { label: 'Time Min — fallback (s)',     min: 5,  max: 60,  step: 1 },
  easy_levelTimeBase:     { label: 'Easy: Time Base (s)',         min: 10, max: 120, step: 1 },
  easy_levelTimeMin:      { label: 'Easy: Time Min (s)',          min: 5,  max: 60,  step: 1 },
  normal_levelTimeBase:   { label: 'Normal: Time Base (s)',       min: 10, max: 120, step: 1 },
  normal_levelTimeMin:    { label: 'Normal: Time Min (s)',        min: 5,  max: 60,  step: 1 },
  hard_levelTimeBase:     { label: 'Hard: Time Base (s)',         min: 10, max: 120, step: 1 },
  hard_levelTimeMin:      { label: 'Hard: Time Min (s)',          min: 5,  max: 60,  step: 1 },
  pwSpawnRadius:          { label: 'Powerup Spawn Radius',        min: 0,  max: 300, step: 10 },
  sharkQuipInterval:  { label: 'Shark Quip Interval (s)', min: 1, max: 30,   step: 0.5  },
  sharkQuipDuration:  { label: 'Shark Quip Duration (s)', min: 1, max: 20,   step: 0.5  },
};

export const GAME_VAR_DEFAULTS = { ...gameVars };

// Firebase-loaded overrides — populated by loadRarities(), persists across resets
export const firebaseGameVars = {};
