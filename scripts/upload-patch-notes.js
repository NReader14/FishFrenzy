// Run: node scripts/upload-patch-notes.js <email> <password>
// Or set ADMIN_EMAIL / ADMIN_PASSWORD in .env at the project root.
import https from 'https';
import fs from 'fs';
import path from 'path';
import { NOTES } from '../js/patch-notes-data.js';

// Load .env from project root if present
try {
  const envPath = path.resolve(process.cwd(), '.env');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length && !process.env[k]) process.env[k] = v.join('=');
  }
} catch (_) {}

const API_KEY   = 'AIzaSyBzCQYY27dxfhJS36cFTxiqJsLh-T8hwnE';
const PROJECT   = 'fishfrenzy-b26b8';
const EMAIL     = process.env.ADMIN_EMAIL    || process.argv[2];
const PASSWORD  = process.env.ADMIN_PASSWORD || process.argv[3];

if (!EMAIL || !PASSWORD) {
  console.error('Usage: node scripts/upload-patch-notes.js <email> <password>');
  process.exit(1);
}


function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function patch(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}` }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Signing in...');
  const auth = await post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email: EMAIL, password: PASSWORD, returnSecureToken: true }
  );
  if (!auth.idToken) { console.error('Auth failed:', auth.error?.message); process.exit(1); }
  console.log('Authenticated ✓');

  const notesJson = JSON.stringify(NOTES);
  const result = await patch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/config/patchNotes`,
    { fields: { notes: { stringValue: notesJson } } },
    auth.idToken
  );
  if (result.error) { console.error('Firestore error:', result.error.message); process.exit(1); }
  console.log('Patch notes uploaded to Firebase ✓');
})();
