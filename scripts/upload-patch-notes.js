// Run once:   node scripts/upload-patch-notes.js
// Watch mode: node scripts/upload-patch-notes.js --watch
// Credentials read from .env at project root, or pass as args: <email> <password>
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const NOTES_FILE = path.join(ROOT, 'js', 'patch-notes-data.js');

// Load .env
try {
  const lines = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n');
  for (const line of lines) {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length && !process.env[k]) process.env[k] = v.join('=');
  }
} catch (_) {}

const API_KEY  = 'AIzaSyBzCQYY27dxfhJS36cFTxiqJsLh-T8hwnE';
const PROJECT  = 'fishfrenzy-b26b8';
const EMAIL    = process.env.ADMIN_EMAIL    || process.argv.find((a, i) => i > 1 && !a.startsWith('--'));
const PASSWORD = process.env.ADMIN_PASSWORD || process.argv.find((a, i) => i > 2 && !a.startsWith('--'));
const WATCH    = process.argv.includes('--watch');

if (!EMAIL || !PASSWORD) {
  console.error('No credentials found. Add ADMIN_EMAIL and ADMIN_PASSWORD to .env, or pass as arguments.');
  process.exit(1);
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function patch(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}` }
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

async function upload() {
  // Dynamically re-import so watch mode picks up file changes
  const fileUrl = new URL(`file:///${NOTES_FILE.replace(/\\/g, '/')}?t=${Date.now()}`);
  const { NOTES } = await import(fileUrl);
  console.log(`[${new Date().toLocaleTimeString()}] Uploading patch notes...`);
  const auth = await post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email: EMAIL, password: PASSWORD, returnSecureToken: true }
  );
  if (!auth.idToken) { console.error('Auth failed:', auth.error?.message); return; }
  const result = await patch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/config/patchNotes`,
    { fields: { notes: { stringValue: JSON.stringify(NOTES) } } },
    auth.idToken
  );
  if (result.error) { console.error('Firestore error:', result.error.message); return; }
  console.log(`[${new Date().toLocaleTimeString()}] ✓ Uploaded to Firebase`);
}

await upload();

if (WATCH) {
  console.log(`Watching ${NOTES_FILE} for changes...`);
  let debounce = null;
  fs.watch(NOTES_FILE, () => {
    clearTimeout(debounce);
    debounce = setTimeout(upload, 500);
  });
}
