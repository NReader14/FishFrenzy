// ═══════════════════════════════════════════════════════════════
// AUTH UI — Google + Email/Password login, session management
// ═══════════════════════════════════════════════════════════════

import S from './state.js';
import {
  onAuthChange,
  signInWithEmail,
  registerWithEmail,
  resetPassword,
  signOutUser,
} from '../firebase-config.js';
import { syncSettingsFromCloud } from './settings.js';
import { onSignIn as achSignIn, syncAchievementsFromCloud } from './achievements.js';

export function initAuthUI() {
  const overlay  = document.getElementById('overlay');
  const loginOv  = document.getElementById('login-overlay');

  // ─── Auth state listener ───
  onAuthChange(async (user) => {
    if (user && !user.isAnonymous) {
      const isNew = !S.currentUser;
      S.currentUser = user;
      await Promise.all([
        syncSettingsFromCloud(user.uid),
        syncAchievementsFromCloud(user.uid),
      ]);
      if (isNew) achSignIn();
    } else {
      S.currentUser = null;
    }
    _updateAuthUI();
  });

  // ─── Open login overlay ───
  document.getElementById('signin-btn')?.addEventListener('click', () => {
    overlay.classList.add('hidden');
    loginOv.classList.remove('hidden');
    _resetLoginForm();
  });

  document.getElementById('login-back-btn')?.addEventListener('click', () => {
    loginOv.classList.add('hidden');
    overlay.classList.remove('hidden');
  });

  // ─── Email form ───
  let _isRegister = false;

  document.getElementById('auth-mode-toggle')?.addEventListener('click', () => {
    _isRegister = !_isRegister;
    _setAuthError('');
    const toggleBtn = document.getElementById('auth-mode-toggle');
    const submitBtn = document.getElementById('email-submit-btn');
    const forgotBtn = document.getElementById('auth-forgot-btn');
    if (toggleBtn) toggleBtn.textContent = _isRegister ? 'SIGN IN INSTEAD' : 'CREATE ACCOUNT';
    if (submitBtn) submitBtn.textContent = _isRegister ? 'CREATE ACCOUNT' : 'SIGN IN';
    if (forgotBtn) forgotBtn.style.display = _isRegister ? 'none' : 'block';
  });

  document.getElementById('email-submit-btn')?.addEventListener('click', async () => {
    const email    = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    if (!email || !password) { _setAuthError('ENTER EMAIL AND PASSWORD'); return; }
    _setAuthError('');
    const btn = document.getElementById('email-submit-btn');
    if (btn) btn.disabled = true;
    try {
      if (_isRegister) {
        await registerWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      loginOv.classList.add('hidden');
      overlay.classList.remove('hidden');
    } catch (err) {
      _setAuthError(_friendlyError(err.code));
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.getElementById('auth-forgot-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-email')?.value.trim();
    if (!email) { _setAuthError('ENTER YOUR EMAIL FIRST'); return; }
    try {
      await resetPassword(email);
      _setAuthError('RESET EMAIL SENT!');
    } catch (err) {
      _setAuthError(_friendlyError(err.code));
    }
  });

  // ─── Sign out ───
  document.getElementById('signout-btn')?.addEventListener('click', async () => {
    await signOutUser();
  });
}

function _updateAuthUI() {
  const signinBtn   = document.getElementById('signin-btn');
  const signedInEl  = document.getElementById('signed-in-status');
  const nameEl      = document.getElementById('auth-display-name');
  const anonHint    = document.getElementById('anon-hint');
  const user = S.currentUser;

  if (user) {
    signinBtn?.classList.add('hidden');
    signedInEl?.classList.remove('hidden');
    if (nameEl) nameEl.textContent = user.displayName || user.email?.split('@')[0] || 'PLAYER';
    if (anonHint) anonHint.style.display = 'none';
  } else {
    signinBtn?.classList.remove('hidden');
    signedInEl?.classList.add('hidden');
    if (anonHint) anonHint.style.display = 'block';
  }
}

function _resetLoginForm() {
  const emailEl    = document.getElementById('auth-email');
  const passEl     = document.getElementById('auth-password');
  const toggleBtn  = document.getElementById('auth-mode-toggle');
  const submitBtn  = document.getElementById('email-submit-btn');
  const forgotBtn  = document.getElementById('auth-forgot-btn');
  if (emailEl)   emailEl.value   = '';
  if (passEl)    passEl.value    = '';
  if (toggleBtn) toggleBtn.textContent = 'CREATE ACCOUNT';
  if (submitBtn) submitBtn.textContent = 'SIGN IN';
  if (forgotBtn) forgotBtn.style.display = 'block';
  _setAuthError('');
}

function _setAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

function _friendlyError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':    return 'INVALID EMAIL OR PASSWORD';
    case 'auth/email-already-in-use': return 'ACCOUNT ALREADY EXISTS';
    case 'auth/weak-password':     return 'PASSWORD TOO WEAK (6+ CHARS)';
    case 'auth/invalid-email':     return 'INVALID EMAIL ADDRESS';
    case 'auth/too-many-requests': return 'TOO MANY ATTEMPTS — TRY LATER';
    case 'auth/popup-closed-by-user': return '';
    default: return 'SOMETHING WENT WRONG';
  }
}
