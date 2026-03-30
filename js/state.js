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
  inputFrozen: false,

  // Power-up items on field (null = not spawned)
  pwItems: {
    frenzy: null, ice: null, shield: null, magnet: null,
    ghost: null, hourglass: null, buddy: null, bomb: null, crazy: null,
    decoy: null, swap: null, star: null, double: null,
    wave: null, poison: null, hook: null, goop: null, rainbow: null,
    prompt: null, claude: null, bodyswap: null, hell: null, card: null, nice: null
  },

  // Active power-up states
  frenzyActive: false, frenzyTimer: 0, frenzyTO: null,
  crazyMultiplier: 1,
  iceActive: false, iceTO: null, iceStartTime: 0,
  shieldActive: false,
  magnetActive: false,
  ghostActive: false, ghostTO: null, ghostStartTime: 0,
  hourglassActive: false, hourglassTO: null, timerFrozen: false, hourglassStartTime: 0,
  buddyActive: false, buddyTO: null, buddyStartTime: 0,
  bombActive: false, bombTO: null, bombStartTime: 0,
  crazyActive: false, crazyTO: null, crazyStartTime: 0,
  decoyActive: false, decoyTO: null, decoyFish: null, decoyStartTime: 0,
  starActive: false, starTO: null, starStartTime: 0,
  hookActive: false,
  goopActive: false, goopTO: null, goopStartTime: 0,
  rainbowActive: false, rainbowTO: null, rainbowStartTime: 0,
  promptActive: false, promptWandering: false, promptWanderAngle: 0, promptWanderTimer: 0, promptTO: null, promptTO2: null, promptStartTime: 0,
  claudeActive: false, claudeAnim: null, claudeTO: null,
  bodySwapActive: false, bodySwapTO: null, bodySwapStartTime: 0, bodySwapAnim: null,
  hellActive: false, hellTO: null, hellStartTime: 0, hellAnim: null,
  cardAnim: null, cardDeathPending: false,

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
  bombAnim: null,

  // Global high score (from Firebase)
  globalHighScore: 0,
  pbNotified: false,

  // Logged-in user (null = anonymous)
  currentUser: null,

  // Admin user (Firebase User object, set on admin login, cleared on logout)
  adminUser: null,

  // Last player name entered (for scoreboard highlight)
  lastPlayerName: null,
  deathPowerup: null,

  // Smart shark position history (ring buffer, filled each frame)
  smartSharkHistory: [],

  // User settings (persisted to localStorage)
  settings: {
    mysteryBlocks: false,
    smartShark: false,
    skin: 0,
    difficulty: 'normal',
    tutorial: false,
    music: true,
    sfx: true,
    musicVolume: 70,
    sfxVolume: 80,
    track: 'chiptune',
    sharkQuips: true,
    fastTreats: false,
    showAds: false,
    lastInitials: '',
  },

  // Tutorial
  tutorialActive: false,
  tutorialStep: 0,
  tutorialStepTime: 0,
  tutorialMoved: false,
  tutorialTreatsCollected: 0,  // treats eaten since last step advance
  tutorialPowerupGrabbed: false, // set true when any powerup grabbed during step 3
};

export default S;
