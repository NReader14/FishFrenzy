// ═══════════════════════════════════════════════════════════════
// ADMIN — Local admin commands (item test, etc.)
// ═══════════════════════════════════════════════════════════════-

import S from './state.js';
import { pwConfig } from './powerups.js';

function buildItemTestSelect() {
  const sel = document.getElementById('item-test-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- SELECT ITEM --</option>';
  for (const [key, cfg] of Object.entries(pwConfig)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = cfg.emoji + ' ' + key.toUpperCase();
    sel.appendChild(opt);
  }
  // Reflect current state
  sel.value = S.forcedItem || '';
}

export function setupItemTestEvents() {
  buildItemTestSelect();

  document.getElementById('item-test-select')?.addEventListener('change', e => {
    const val = e.target.value;
    S.forcedItem = val || null;
    // Clear existing field items so the forced one spawns fresh
    for (const k in S.pwItems) S.pwItems[k] = null;
    const msg = document.getElementById('item-test-msg');
    if (msg) {
      msg.textContent = val ? 'FORCING: ' + val.toUpperCase() : 'ITEM TEST OFF';
      msg.style.color = val ? '#44ff88' : '#5588aa';
    }
  });

  document.getElementById('item-test-reset-btn')?.addEventListener('click', () => {
    S.forcedItem = null;
    for (const k in S.pwItems) S.pwItems[k] = null;
    const sel = document.getElementById('item-test-select');
    if (sel) sel.value = '';
    const msg = document.getElementById('item-test-msg');
    if (msg) { msg.textContent = 'ITEM TEST OFF'; msg.style.color = '#5588aa'; }
  });
}
