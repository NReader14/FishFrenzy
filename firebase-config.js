// ═══════════════════════════════════════════════════════════════
// FIREBASE CONFIG & OPERATIONS
// All Firebase interactions are isolated in this file.
// ═══════════════════════════════════════════════════════════════
const DEBUG = false; // set true to enable verbose Firebase logging

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  addDoc,
  doc,
  query,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzCQYY27dxfhJS36cFTxiqJsLh-T8hwnE",
  authDomain: "fishfrenzy-b26b8.firebaseapp.com",
  projectId: "fishfrenzy-b26b8",
  storageBucket: "fishfrenzy-b26b8.firebasestorage.app",
  messagingSenderId: "376208699039",
  appId: "1:376208699039:web:0488b7220aff653ae8fcaa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const SCORES_COLLECTION = "highscores";
const MAX_SCORES = 5;
const MAX_SCORE_VALUE = 99999;
const MAX_NAME_LENGTH = 3;

let currentUser = null;
let isOnline = true;

// ─── AUTH ───

export async function initAuth() {
  // Handle Google redirect result if we're returning from a signInWithRedirect flow
  try {
    await getRedirectResult(auth);
    // onAuthStateChanged will fire with the signed-in user if redirect succeeded
  } catch (err) {
    DEBUG && console.warn("[Firebase] Redirect result error:", err.message);
  }

  if (auth.currentUser) {
    currentUser = auth.currentUser;
    DEBUG && console.log("[Firebase] Existing session:", currentUser.uid);
    return currentUser;
  }

  try {
    const result = await signInAnonymously(auth);
    currentUser = result.user;
    DEBUG && console.log("[Firebase] Anonymous auth successful");
    return currentUser;
  } catch (err) {
    console.warn("[Firebase] Anonymous auth failed:", err.message);
    isOnline = false;
    return null;
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

// ─── USER AUTH (Google + Email/Password) ───

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
  // Page will reload after redirect — result handled by getRedirectResult in initAuth
}

export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  currentUser = result.user;
  return result.user;
}

export async function registerWithEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  currentUser = result.user;
  return result.user;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function signOutUser() {
  await signOut(auth);
  // Re-establish anonymous session so score saving still works
  try {
    const result = await signInAnonymously(auth);
    currentUser = result.user;
  } catch (_) {}
}

export async function saveUserSettings(uid, settings) {
  try {
    await setDoc(doc(db, 'users', uid), { settings, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Could not save user settings:', err.message);
  }
}

export async function loadUserSettings(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data().settings || null : null;
  } catch (err) {
    console.warn('[Firebase] Could not load user settings:', err.message);
    return null;
  }
}

export async function saveUserAchievements(uid, data) {
  // data = { unlocked: [...ids], stats: {...} }
  try {
    await setDoc(doc(db, 'users', uid), { achievements: data, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Could not save achievements:', err.message);
  }
}

export async function loadUserAchievements(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data().achievements || null : null;
  } catch (err) {
    console.warn('[Firebase] Could not load achievements:', err.message);
    return null;
  }
}

export async function saveAchievementBoard(uid, name, count) {
  try {
    await setDoc(doc(db, 'achievementBoard', uid), {
      name: String(name).toUpperCase().slice(0, 3) || '???',
      count,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Could not save achievement board:', err.message);
  }
}

export async function fetchAchievementLeaders(max = 10) {
  try {
    const q = query(
      collection(db, 'achievementBoard'),
      orderBy('count', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    const leaders = [];
    snap.forEach(d => leaders.push({ uid: d.id, ...d.data() }));
    return leaders;
  } catch (err) {
    console.warn('[Firebase] Could not fetch achievement leaders:', err.message);
    return [];
  }
}

// ─── SCORES ───

export async function fetchAllScores(max = 100) {
  try {
    const q = query(
      collection(db, SCORES_COLLECTION),
      orderBy("score", "desc"),
      limit(max)
    );
    const snapshot = await getDocs(q);
    const scores = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      scores.push({ id: docSnap.id, name: data.name || "???", score: data.score || 0, level: data.level || 1 });
    });
    isOnline = true;
    return scores;
  } catch (err) {
    console.warn("[Firebase] Failed to fetch all scores:", err.message);
    isOnline = false;
    return getOfflineScores();
  }
}

export async function fetchHighScores() {
  try {
    const q = query(
      collection(db, SCORES_COLLECTION),
      orderBy("score", "desc"),
      limit(MAX_SCORES)
    );
    const snapshot = await getDocs(q);
    const scores = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      scores.push({
        id: docSnap.id,
        name: data.name || "???",
        score: data.score || 0,
        level: data.level || 1,
        uid: data.uid || null,
        skin: data.skinC1 ? {
          c1: data.skinC1, c2: data.skinC2, c3: data.skinC3,
          fishType: data.skinFishType || 'standard',
          hatKey:    data.skinHat    || 'none',
          maskKey:   data.skinMask   || 'none',
          outfitKey: data.skinOutfit || 'none',
        } : null,
      });
    });

    isOnline = true;
    localStorage.setItem("fishFrenzyScoresCache", JSON.stringify(scores));
    return scores;
  } catch (err) {
    console.warn("[Firebase] Failed to fetch scores:", err.message);
    isOnline = false;
    return getOfflineScores();
  }
}

export async function saveHighScore(name, sc, lv, skinSnapshot = null) {
  const cleanName = String(name).toUpperCase().slice(0, MAX_NAME_LENGTH);
  const cleanScore = Math.min(Math.max(0, Math.floor(Number(sc))), MAX_SCORE_VALUE);
  const cleanLevel = Math.max(1, Math.floor(Number(lv)));

  if (cleanName.trim() === "" || cleanName.length !== MAX_NAME_LENGTH) {
    console.warn("[Firebase] Invalid name rejected:", name);
    return -1;
  }

  try {
    const docRef = doc(db, SCORES_COLLECTION, cleanName);
    const existing = await getDoc(docRef);

    if (existing.exists()) {
      const existingScore = existing.data().score || 0;
      if (cleanScore <= existingScore) {
        DEBUG && console.log("[Firebase] Existing score is higher, not updating.");
        // Still link uid to the existing doc if the user is now signed in
        if (currentUser && !currentUser.isAnonymous && !existing.data().uid) {
          setDoc(docRef, { uid: currentUser.uid }, { merge: true }).catch(() => {});
        }
        const scores = await fetchHighScores();
        return scores.findIndex(s => s.name === cleanName);
      }
    }

    const payload = {
      name: cleanName,
      score: cleanScore,
      level: cleanLevel,
      timestamp: serverTimestamp(),
      ...(currentUser && !currentUser.isAnonymous ? { uid: currentUser.uid } : {})
    };
    if (skinSnapshot) {
      payload.skinC1       = skinSnapshot.c1       || '#4488ff';
      payload.skinC2       = skinSnapshot.c2       || '#2244aa';
      payload.skinC3       = skinSnapshot.c3       || '#66aaff';
      payload.skinFishType = skinSnapshot.fishType || 'standard';
      payload.skinHat      = skinSnapshot.hatKey   || 'none';
      payload.skinMask     = skinSnapshot.maskKey  || 'none';
      payload.skinOutfit   = skinSnapshot.outfitKey|| 'none';
    }
    await setDoc(docRef, payload);

    DEBUG && console.log("[Firebase] Score saved:", cleanName, cleanScore);
    isOnline = true;

    const scores = await fetchHighScores();
    return scores.findIndex(s => s.name === cleanName);

  } catch (err) {
    console.warn("[Firebase] Failed to save score:", err.message);
    isOnline = false;
    return saveOfflineScore(cleanName, cleanScore, cleanLevel);
  }
}

// ─── ADMIN ───

export async function adminWipeScores(email, password) {
  try {
    const adminCred = await signInWithEmailAndPassword(auth, email, password);
    DEBUG && console.log("[Firebase] Admin login successful, UID:", adminCred.user.uid);

    const snapshot = await getDocs(collection(db, SCORES_COLLECTION));

    const deletePromises = [];
    snapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, SCORES_COLLECTION, docSnap.id)));
    });
    await Promise.all(deletePromises);

    DEBUG && console.log("[Firebase] All scores wiped by admin.");

    await signOut(auth);
    currentUser = null;

    return true;
  } catch (err) {
    console.error("[Firebase] Admin wipe failed:", err.message);
    throw err;
  }
}

export async function verifyAdminCredentials(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await signOut(auth);
  return cred.user;
}

export async function setMaintenance(enabled, email, password) {
  const adminCred = await signInWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "config", "maintenance"), {
    enabled,
    updatedBy: adminCred.user.uid,
    timestamp: serverTimestamp()
  });

  await signOut(auth);
  return true;
}

// ─── MAINTENANCE CHECK ───

export async function fetchMaintenance() {
  try {
    const docRef = doc(db, "config", "maintenance");
    const snap = await getDoc(docRef);

    if (snap.exists() && snap.data().enabled === true) return true;
    return false;
  } catch (err) {
    console.warn("[Firebase] Could not check maintenance:", err.message);
    return false;
  }
}

// ─── GAME CONFIG ───

export async function fetchGameConfig() {
  try {
    const snap = await getDoc(doc(db, "config", "game"));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn("[Firebase] Could not fetch game config:", err.message);
    return null;
  }
}

export async function saveGameConfig(config, email, password) {
  let adminCred;

  try {
    adminCred = await signInWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "config", "game"), {
      ...config,
      updatedBy: adminCred.user.uid,
      timestamp: serverTimestamp()
    }, { merge: true });

    return true;
  } catch (err) {
    console.error("[Firebase] saveGameConfig failed:", err.message);
    throw err;
  } finally {
    try {
      await signOut(auth);
    } catch (_) {
      /* ignore */
    }
  }
}

// ─── CUSTOM SKINS ───

export async function fetchCustomSkins() {
  try {
    const q = query(
      collection(db, 'customSkins'),
      orderBy('savedAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const skins = [];
    snapshot.forEach(d => skins.push({ id: d.id, ...d.data() }));
    return skins;
  } catch (err) {
    console.warn('[Firebase] Could not fetch custom skins:', err.message);
    return [];
  }
}

export async function saveCustomSkin(skinData) {
  const id = skinData.name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
  await setDoc(doc(db, 'customSkins', id), {
    name: skinData.name,
    c1: skinData.c1,
    c2: skinData.c2,
    c3: skinData.c3,
    hat:    skinData.hat    || 'none',
    mask:   skinData.mask   || 'none',
    outfit: skinData.outfit || 'none',
    savedAt: serverTimestamp(),
  });
  return id;
}

// ─── OFFLINE FALLBACK ───

function getOfflineScores() {
  try {
    const cached = JSON.parse(localStorage.getItem("fishFrenzyScoresCache"));
    if (Array.isArray(cached)) return cached;
  } catch (_) {}
  return [];
}

function saveOfflineScore(name, sc, lv) {
  console.warn("[Firebase] Saving score to localStorage fallback.");
  const scores = getOfflineScores();
  const existingIdx = scores.findIndex(s => s.name === name);

  if (existingIdx !== -1) {
    scores[existingIdx].score = Math.max(scores[existingIdx].score, sc);
    scores[existingIdx].level = Math.max(scores[existingIdx].level, lv);
  } else {
    scores.push({ name, score: sc, level: lv });
  }

  scores.sort((a, b) => b.score - a.score || b.level - a.level);
  const trimmed = scores.slice(0, MAX_SCORES);
  localStorage.setItem("fishFrenzyScoresCache", JSON.stringify(trimmed));
  return trimmed.findIndex(s => s.name === name);
}

export function isFirebaseOnline() {
  return isOnline;
}

// ─── PATCH NOTES ───

export async function fetchPatchNotes() {
  try {
    const snap = await getDoc(doc(db, 'config', 'patchNotes'));
    return snap.exists() ? snap.data().notes : null;
  } catch (err) {
    console.warn('[Firebase] Could not fetch patch notes:', err.message);
    return null;
  }
}

export async function savePatchNotes(notesJson, email, password) {
  const adminCred = await signInWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'config', 'patchNotes'), {
    notes: notesJson,
    updatedBy: adminCred.user.uid,
    timestamp: serverTimestamp(),
  });
  await signOut(auth);
  return true;
}

// ─── FEEDBACK ───
// NOTE: Firestore rules must allow: match /feedback/{doc} { allow create: if true; }

export async function saveFeedback(type, message) {
  await addDoc(collection(db, 'feedback'), {
    type,
    message: message.trim().slice(0, 1000),
    timestamp: serverTimestamp(),
  });
}

export async function deleteFeedback(email, password, id) {
  let adminCred = null;
  try {
    adminCred = await signInWithEmailAndPassword(auth, email, password);
    await deleteDoc(doc(db, 'feedback', id));
  } catch (err) {
    console.warn('[Firebase] Could not delete feedback:', err.message);
    throw err;
  } finally {
    if (adminCred) await signOut(auth);
  }
}

export async function fetchFeedback(email, password, max = 30) {
  let adminCred = null;
  try {
    adminCred = await signInWithEmailAndPassword(auth, email, password);
    const q = query(
      collection(db, 'feedback'),
      orderBy('timestamp', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    const results = [];
    snap.forEach(d => results.push({ id: d.id, ...d.data() }));
    return results;
  } catch (err) {
    console.warn('[Firebase] Could not fetch feedback:', err.message);
    return [];
  } finally {
    if (adminCred) await signOut(auth);
  }
}