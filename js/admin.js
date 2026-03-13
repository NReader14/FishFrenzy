// ═══════════════════════════════════════════════════════════════
// ADMIN — Local admin commands (item test, etc.)
// ═══════════════════════════════════════════════════════════════-

import S from './state.js';
import { pwConfig } from './powerups.js';

function renderForcedTags() {
  const container = document.getElementById('item-test-tags');
  const msg       = document.getElementById('item-test-msg');
  if (!container) return;

  container.innerHTML = '';
  if (!S.forcedItems || S.forcedItems.size === 0) {
    if (msg) { msg.textContent = 'ITEM TEST OFF'; msg.style.color = '#5588aa'; }
    return;
  }

  for (const type of S.forcedItems) {
    const cfg = pwConfig[type];
    const tag = document.createElement('span');
    tag.style.cssText = 'display:inline-flex;align-items:center;gap:3px;background:#0a2a1a;border:1px solid #44ff88;color:#44ff88;font-size:6px;padding:2px 5px;border-radius:3px;cursor:pointer;';
    tag.textContent = (cfg?.emoji || '') + ' ' + type.toUpperCase() + ' ✕';
    tag.title = 'Click to remove';
    tag.addEventListener('click', () => {
      S.forcedItems.delete(type);
      S.pwItems[type] = null;
      renderForcedTags();
    });
    container.appendChild(tag);
  }

  if (msg) {
    msg.textContent = `FORCING ${S.forcedItems.size}: ` + [...S.forcedItems].join(', ').toUpperCase();
    msg.style.color = '#44ff88';
  }
}

function buildItemTestSelect() {
  const sel = document.getElementById('item-test-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">+ ADD ITEM</option>';
  for (const [key, cfg] of Object.entries(pwConfig)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = cfg.emoji + ' ' + key.toUpperCase();
    sel.appendChild(opt);
  }
  sel.value = '';
}

export function setupItemTestEvents() {
  if (!S.forcedItems) S.forcedItems = new Set();
  buildItemTestSelect();
  renderForcedTags();

  document.getElementById('item-test-select')?.addEventListener('change', e => {
    const val = e.target.value;
    e.target.value = ''; // reset dropdown back to placeholder
    if (!val) return;
    if (S.forcedItems.size >= 10) {
      const msg = document.getElementById('item-test-msg');
      if (msg) { msg.textContent = 'MAX 10 ITEMS'; msg.style.color = '#ffaa44'; }
      return;
    }
    S.forcedItems.add(val);
    renderForcedTags();
  });

  document.getElementById('item-test-reset-btn')?.addEventListener('click', () => {
    S.forcedItems.clear();
    for (const k in S.pwItems) S.pwItems[k] = null;
    renderForcedTags();
  });
}
