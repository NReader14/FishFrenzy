// ═══════════════════════════════════════════════════════════════
// DOM — Cached DOM references. Grabbed once at startup.
// ═══════════════════════════════════════════════════════════════

export const canvas  = document.getElementById('game');
export const ctx     = canvas.getContext('2d');

// Overlays
export const overlay           = document.getElementById('overlay');
export const nameEntryOverlay  = document.getElementById('name-entry-overlay');
export const endScreenOverlay  = document.getElementById('end-screen-overlay');
export const winOverlay        = document.getElementById('win-overlay');
export const scoreboardOverlay = document.getElementById('scoreboard-overlay');
export const rulesOverlay      = document.getElementById('rules-overlay');
export const adminOverlay      = document.getElementById('admin-overlay');
export const loadingOverlay    = document.getElementById('loading-overlay');
export const loadingMessage    = document.getElementById('loading-message');

// HUD elements
export const scoreEl     = document.getElementById('score');
export const timerEl     = document.getElementById('timer');
export const timerBar    = document.getElementById('timer-bar');
export const levelEl     = document.getElementById('level');
export const treatsLeftEl = document.getElementById('treats-left');

// Buttons
export const startBtn          = document.getElementById('start-btn');
export const rulesBtn          = document.getElementById('rules-btn');
export const rulesBackBtn      = document.getElementById('rules-back-btn');
export const scoreboardBtn     = document.getElementById('scoreboard-btn');
export const closeScoreboardBtn = document.getElementById('close-scoreboard-btn');

// Admin form
export const adminEmailInput    = document.getElementById('admin-email');
export const adminPasswordInput = document.getElementById('admin-password');
export const adminLoginBtn      = document.getElementById('admin-login-btn');
export const adminCancelBtn     = document.getElementById('admin-cancel-btn');
export const adminError         = document.getElementById('admin-error');

// Scoreboard content
export const scoreboardContent = document.getElementById('scoreboard-content');

// Status bar indicators
export const st = {};
['frenzy','ice','shield','magnet','ghost','time','buddy','bomb','crazy','combo',
 'decoy','star','hook','goop','rainbow'].forEach(
  k => st[k] = document.getElementById('st-' + k)
);
