// ═══════════════════════════════════════════════════════════════
// FIREBASE CONFIG & OPERATIONS
// All Firebase interactions are isolated in this file.
// The game code (game.js) imports functions from here.
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


// ─── FIREBASE PROJECT CONFIGURATION ───
// These values connect the app to Nathan's Firebase project.
// They are public-facing keys — security is enforced via
// Firestore rules (see SETUP-ADMIN.md), not by hiding these.
const firebaseConfig = {
  apiKey: "AIzaSyBzCQYY27dxfhJS36cFTxiqJsLh-T8hwnE",
  authDomain: "fishfrenzy-b26b8.firebaseapp.com",
  projectId: "fishfrenzy-b26b8",
  storageBucket: "fishfrenzy-b26b8.firebasestorage.app",
  messagingSenderId: "376208699039",
  appId: "1:376208699039:web:0488b7220aff653ae8fcaa"
};


// ─── INITIALISE FIREBASE SERVICES ───
const app = initializeApp(firebaseConfig);

// Firestore: NoSQL database used to store high scores
const db = getFirestore(app);

// Auth: Used for anonymous sessions (players) and email login (admin)
const auth = getAuth(app);


// ─── CONSTANTS ───
const SCORES_COLLECTION = "highscores";  // Firestore collection name
const MAX_SCORES = 5;                    // Only top 5 displayed
const MAX_SCORE_VALUE = 99999;           // Cap to reject injected scores
const MAX_NAME_LENGTH = 3;              // 3-character initials only


// ─── STATE ───
let currentUser = null;       // Holds the current auth user object
let isOnline = true;          // Tracks whether Firebase is reachable


// ─── ANONYMOUS AUTHENTICATION ───
// Every player gets an anonymous session. This is required so
// Firestore rules can verify that writes come from authenticated
// users (i.e. from the app, not random API calls).

/**
 * Sign in anonymously. Called once when the game loads.
 * Returns the user object or null on failure.
 */
export async function initAuth() {
  try {
    const result = await signInAnonymously(auth);
    currentUser = result.user;
    console.log("[Firebase] Anonymous auth successful, UID:", currentUser.uid);
    return currentUser;
  } catch (err) {
    console.warn("[Firebase] Anonymous auth failed:", err.message);
    isOnline = false;
    return null;
  }
}

/**
 * Listen for auth state changes (e.g. if session expires).
 */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});


// ─── SCORE OPERATIONS ───

/**
 * Fetch the top scores from Firestore.
 * Returns an array of { name, score, level } objects, sorted
 * by score descending, limited to MAX_SCORES.
 *
 * HOW IT WORKS:
 * - Queries the "highscores" collection
 * - Orders by "score" field descending
 * - Limits to top 5 results
 * - Falls back to localStorage if Firestore is unreachable
 */
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

    // Cache in localStorage as offline fallback
    localStorage.setItem("fishFrenzyScoresCache", JSON.stringify(scores));
    return scores;
  } catch (err) {
    console.warn("[Firebase] Failed to fetch scores:", err.message);
    isOnline = false;
    return getOfflineScores();
  }
}

/**
 * Save or update a high score in Firestore.
 *
 * HOW IT WORKS:
 * - Uses the uppercase name as the document ID so each name
 *   maps to exactly one document (best-score-per-name)
 * - If the name already exists, only updates if the new score is higher
 * - Validates inputs before writing (name length, score cap, types)
 * - Includes a server timestamp so Firestore rules can rate-limit
 * - Falls back to localStorage if Firestore is unreachable
 *
 * @param {string} name  - 3-character uppercase initials
 * @param {number} sc    - The player's score
 * @param {number} lv    - The level reached
 * @returns {number}     - The rank index (0-based) or -1 if not in top 5
 */
export async function saveHighScore(name, sc, lv) {
  // ── Input validation (also enforced in Firestore rules) ──
  const cleanName = String(name).toUpperCase().slice(0, MAX_NAME_LENGTH);
  const cleanScore = Math.min(Math.max(0, Math.floor(Number(sc))), MAX_SCORE_VALUE);
  const cleanLevel = Math.max(1, Math.floor(Number(lv)));

  if (cleanName.trim() === "" || cleanName.length !== MAX_NAME_LENGTH) {
    console.warn("[Firebase] Invalid name rejected:", name);
    return -1;
  }

  try {
    // Check if this name already has a score
    const docRef = doc(db, SCORES_COLLECTION, cleanName);
    const existing = await getDoc(docRef);

    if (existing.exists()) {
      const existingScore = existing.data().score || 0;
      // Only update if new score is better
      if (cleanScore <= existingScore) {
        console.log("[Firebase] Existing score is higher, not updating.");
        // Still fetch and return rank
        const scores = await fetchHighScores();
        return scores.findIndex(s => s.name === cleanName);
      }
    }

    // Write the score document
    // The document ID is the name, so duplicate names overwrite
    await setDoc(docRef, {
      name: cleanName,
      score: cleanScore,
      level: cleanLevel,
      uid: currentUser ? currentUser.uid : "unknown",
      timestamp: serverTimestamp()
    });

    console.log("[Firebase] Score saved:", cleanName, cleanScore);
    isOnline = true;

    // Fetch updated scores and find rank
    const scores = await fetchHighScores();
    return scores.findIndex(s => s.name === cleanName);

  } catch (err) {
    console.warn("[Firebase] Failed to save score:", err.message);
    isOnline = false;
    return saveOfflineScore(cleanName, cleanScore, cleanLevel);
  }
}

/**
 * Wipe all scores from Firestore (admin only).
 *
 * HOW IT WORKS:
 * - Signs in with email/password (admin credentials)
 * - Fetches all documents in the highscores collection
 * - Deletes each one individually (Firestore has no bulk delete)
 * - Signs back out and re-authenticates anonymously
 * - Firestore rules enforce that only the admin UID can delete
 *
 * @param {string} email    - Admin email
 * @param {string} password - Admin password
 * @returns {boolean}       - True if wipe succeeded
 */
export async function adminWipeScores(email, password) {
  try {
    // Step 1: Sign in as admin with email/password
    const adminCred = await signInWithEmailAndPassword(auth, email, password);
    console.log("[Firebase] Admin login successful, UID:", adminCred.user.uid);

    // Step 2: Fetch all score documents
    const snapshot = await getDocs(collection(db, SCORES_COLLECTION));

    // Step 3: Delete each document
    const deletePromises = [];
    snapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, SCORES_COLLECTION, docSnap.id)));
    });
    await Promise.all(deletePromises);

    console.log("[Firebase] All scores wiped by admin.");

    // Step 4: Sign out admin session
    await signOut(auth);

    // Step 5: Re-authenticate anonymously for normal game use
    await initAuth();

    // Clear local cache too
    localStorage.removeItem("fishFrenzyScoresCache");

    return true;
  } catch (err) {
    console.error("[Firebase] Admin wipe failed:", err.message);

    // If admin login failed, make sure we still have anon auth
    try {
      await signOut(auth);
      await initAuth();
    } catch (_) { /* ignore */ }

    throw err; // Re-throw so the UI can show the error message
  }
}


// ─── OFFLINE FALLBACK ───
// If Firebase is unreachable, scores are stored in localStorage.
// These are NOT synced back to Firebase — they're a temporary
// fallback so the game remains playable offline.

function getOfflineScores() {
  try {
    const cached = JSON.parse(localStorage.getItem("fishFrenzyScoresCache"));
    if (Array.isArray(cached)) return cached;
  } catch (_) { /* ignore */ }
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


// ─── STATUS CHECK ───

/**
 * Returns whether Firebase is currently reachable.
 * The game uses this to show an "offline" notice.
 */
export function isFirebaseOnline() {
  return isOnline;
}
