// ═══════════════════════════════════════════════════════════════
// FIREBASE CONFIG & OPERATIONS
// All Firebase interactions are isolated in this file. .
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
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
  if (auth.currentUser) {
    currentUser = auth.currentUser;
    console.log("[Firebase] Existing session:", currentUser.uid);
    return currentUser;
  }

  try {
    const result = await signInAnonymously(auth);
    currentUser = result.user;
    console.log("[Firebase] Anonymous auth successful");
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

// ─── SCORES ───

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
        level: data.level || 1
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

export async function saveHighScore(name, sc, lv) {
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
        console.log("[Firebase] Existing score is higher, not updating.");
        const scores = await fetchHighScores();
        return scores.findIndex(s => s.name === cleanName);
      }
    }

    await setDoc(docRef, {
      name: cleanName,
      score: cleanScore,
      level: cleanLevel,
      timestamp: serverTimestamp()
    });

    console.log("[Firebase] Score saved:", cleanName, cleanScore);
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
    console.log("[Firebase] Admin login successful, UID:", adminCred.user.uid);

    const snapshot = await getDocs(collection(db, SCORES_COLLECTION));

    const deletePromises = [];
    snapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, SCORES_COLLECTION, docSnap.id)));
    });
    await Promise.all(deletePromises);

    console.log("[Firebase] All scores wiped by admin.");

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
    });

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