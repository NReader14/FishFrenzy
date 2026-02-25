// ═══════════════════════════════════════════════════════════════
// STATE — All mutable game state lives here.
// Every module imports S and reads/writes S.fish, S.score, etc.
// This avoids circular dependencies entirely.
// ═══════════════════════════════════════════════════════════════

const S = {
  // Core entities
  fish: null,
  shark: null,
  treats: [],
  particles: [],
  bubbles: [],
  scorePopups: [],
  buddy: null,

  // Game state
  score: 0,
  level: 1,
  timeLeft: 30,
  maxTime: 30,
  gameRunning: false,
  gameLoop: null,
  timerInterval: null,

  // Input tracking
  keys: {},
  nameEntryActive: false,

  // Power-up items on field (null = not spawned)
  pwItems: {
    frenzy: null, ice: null, shield: null, magnet: null,
    ghost: null, hourglass: null, buddy: null, bomb: null, crazy: null,
    decoy: null, swap: null, star: null, double: null,
    wave: null, poison: null, hook: null, goop: null, rainbow: null
  },

  // Active power-up states
  frenzyActive: false, frenzyTimer: 0, frenzyTO: null,
  iceActive: false, iceTO: null, iceStartTime: 0,
  shieldActive: false,
  magnetActive: false,
  ghostActive: false, ghostTO: null,
  hourglassActive: false, hourglassTO: null, timerFrozen: false, hourglassStartTime: 0,
  buddyActive: false, buddyTO: null,
  bombActive: false, bombTO: null,
  crazyActive: false, crazyTO: null,
  decoyActive: false, decoyTO: null, decoyFish: null,
  starActive: false, starTO: null,
  hookActive: false,
  goopActive: false, goopTO: null, goopStartTime: 0,
  rainbowActive: false, rainbowTO: null,

  // Combo system
  comboCount: 0,
  comboTimer: 0,

  // Progressive speed
  accelBonus: 0,
  lastMoveDir: { x: 0, y: 0 },

  // Shark start delay
  sharkDelay: 0,

  // Duplicate prevention
  lastSpawnedPW: null,

  // Pause
  gamePaused: false,

  // Animation states
  hookLine: null,
  swapAnim: null,
  chompAnim: null,

  // Global high score (from Firebase)
  globalHighScore: 0,
  pbNotified: false,

  // Admin credentials (temporary)
  adminCredentials: null,

  // User settings (persisted to localStorage)
  settings: {
    mysteryBlocks: false,
  },
};

export default S;
