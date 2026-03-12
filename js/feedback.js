// ═══════════════════════════════════════════════════════════════
// FEEDBACK — Player feedback form + EmailJS notification
// ═══════════════════════════════════════════════════════════════

import { saveFeedback } from '../firebase-config.js';

const EMAILJS_PUBLIC_KEY  = 's27S-6EeVt9VKmu27';
const EMAILJS_SERVICE_ID  = 'service_05uresw';
const EMAILJS_TEMPLATE_ID = 'template_naruhfk';

const GAME_LINK = window.location.href;

// Initialise EmailJS once at load time
if (typeof emailjs !== 'undefined') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
} else {
  console.warn('[Feedback] EmailJS SDK not loaded');
}

let _fbType = 'bug';

export function setupFeedbackForm() {
  // Open feedback overlay
  document.getElementById('feedback-btn')?.addEventListener('click', () => {
    document.getElementById('feedback-overlay')?.classList.remove('hidden');
  });

  // Close feedback overlay
  document.getElementById('feedback-close-btn')?.addEventListener('click', () => {
    document.getElementById('feedback-overlay')?.classList.add('hidden');
  });

  // Type toggle — Bug
  document.getElementById('fb-type-bug')?.addEventListener('click', () => {
    _fbType = 'bug';
    document.getElementById('fb-type-bug').classList.add('selected');
    document.getElementById('fb-type-sug').classList.remove('selected');
    document.getElementById('fb-type-bug').style.borderColor = '#ee5566';
    document.getElementById('fb-type-bug').style.color = '#ee5566';
    document.getElementById('fb-type-sug').style.borderColor = '';
    document.getElementById('fb-type-sug').style.color = '';
  });

  // Type toggle — Suggestion
  document.getElementById('fb-type-sug')?.addEventListener('click', () => {
    _fbType = 'suggestion';
    document.getElementById('fb-type-sug').classList.add('selected');
    document.getElementById('fb-type-bug').classList.remove('selected');
    document.getElementById('fb-type-sug').style.borderColor = '#44ddff';
    document.getElementById('fb-type-sug').style.color = '#44ddff';
    document.getElementById('fb-type-bug').style.borderColor = '';
    document.getElementById('fb-type-bug').style.color = '';
  });

  document.getElementById('fb-send-btn')?.addEventListener('click', submitFeedback);
}

async function submitFeedback() {
  const text = document.getElementById('fb-text')?.value?.trim();
  const statusEl = document.getElementById('fb-status');
  const btn = document.getElementById('fb-send-btn');

  if (!text) {
    if (statusEl) { statusEl.textContent = 'PLEASE WRITE SOMETHING FIRST'; statusEl.style.color = '#ee5566'; }
    return;
  }

  if (btn) btn.disabled = true;
  if (statusEl) { statusEl.textContent = 'SENDING...'; statusEl.style.color = '#5588aa'; }

  const typeLabel = _fbType === 'bug' ? 'BUG REPORT' : 'SUGGESTION';

  try {
    // Save to Firebase
    await saveFeedback(_fbType, text);

    // Send email via EmailJS
    if (typeof emailjs !== 'undefined') {
      try {
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          title:   `🐟 Fish Frenzy — ${typeLabel}`,
          message: `${text}\n\n${GAME_LINK}`,
          time:    new Date().toLocaleString(),
        });
      } catch (emailErr) {
        console.warn('[Feedback] EmailJS failed:', emailErr);
        if (statusEl) { statusEl.textContent = `EMAIL ERR: ${emailErr?.status ?? emailErr?.message ?? emailErr}`; statusEl.style.color = '#ffaa44'; }
      }
    }

    // Success
    if (statusEl) { statusEl.textContent = '✓ SENT — THANKS!'; statusEl.style.color = '#44ff88'; }
    document.getElementById('fb-text').value = '';
    setTimeout(() => {
      if (statusEl) statusEl.textContent = '';
      document.getElementById('feedback-overlay')?.classList.add('hidden');
    }, 2500);

  } catch (err) {
    console.warn('[Feedback] Submit failed:', err);
    if (statusEl) { statusEl.textContent = '✗ FAILED — TRY AGAIN'; statusEl.style.color = '#ee5566'; }
  } finally {
    if (btn) btn.disabled = false;
  }
}
