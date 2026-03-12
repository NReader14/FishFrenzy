// ═══════════════════════════════════════════════════════════════
// AUDIO — Web Audio API chiptune engine
// 8-bit upbeat music + sound effects
// ═══════════════════════════════════════════════════════════════

import S from './state.js';

let _ctx  = null;
let _master, _sfxBus, _musicBus;

// Volume helpers — base gains scaled by user 0–100 settings
const MUSIC_BASE = 0.18;  // softer than before
const SFX_BASE   = 0.55;
function _musicGain() { return ((S.settings?.musicVolume ?? 70) / 100) * MUSIC_BASE; }
function _sfxGain()   { return ((S.settings?.sfxVolume   ?? 80) / 100) * SFX_BASE; }

// ─── Context ─────────────────────────────────────────────────

function ctx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();

    _master = _ctx.createGain();
    _master.gain.value = 0.85;
    _master.connect(_ctx.destination);

    _musicBus = _ctx.createGain();
    _musicBus.gain.value = _musicGain();
    _musicBus.connect(_master);

    _sfxBus = _ctx.createGain();
    _sfxBus.gain.value = _sfxGain();
    _sfxBus.connect(_master);
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

// ─── Primitives ───────────────────────────────────────────────

function playOsc(freq, type, start, dur, peak, bus) {
  if (!freq || dur <= 0) return;
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(bus || _sfxBus);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.004);
  g.gain.setValueAtTime(peak, start + dur * 0.72);
  g.gain.linearRampToValueAtTime(0, start + dur);
  o.start(start);
  o.stop(start + dur + 0.01);
}

function playNoise(start, dur, gain, lpFreq, bus) {
  const c = ctx();
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = lpFreq;
  const g = c.createGain();
  src.connect(filt); filt.connect(g); g.connect(bus || _sfxBus);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.start(start);
  src.stop(start + dur + 0.01);
}

// ─── Note frequency helper ────────────────────────────────────

function hz(name) {
  if (!name) return null;
  const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = name.match(/^([A-G])(#?)(\d)$/);
  if (!m) return null;
  return 440 * Math.pow(2, (SEMI[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3]) - 4) * 12) / 12);
}

// ─── SFX ─────────────────────────────────────────────────────

export function sfxCollect() {
  if (!S.settings?.sfx) return;
  const t = ctx().currentTime;
  playOsc(660,  'sine', t,        0.07, 0.12, _sfxBus);
  playOsc(990,  'sine', t + 0.04, 0.06, 0.07, _sfxBus);
}

export function sfxCombo(level) {
  if (!S.settings?.sfx) return;
  const freqs = [523, 659, 784, 988, 1319];
  const f = freqs[Math.min(level - 2, 4)];
  const t = ctx().currentTime;
  playOsc(f,       'square', t,        0.09, 0.3,  _sfxBus);
  playOsc(f * 1.5, 'square', t + 0.07, 0.07, 0.18, _sfxBus);
}

export function sfxPowerup() {
  if (!S.settings?.sfx) return;
  const t = ctx().currentTime;
  [523, 659, 784, 1047].forEach((f, i) =>
    playOsc(f, 'square', t + i * 0.065, 0.1, 0.3, _sfxBus)
  );
}

export function sfxLevelUp() {
  if (!S.settings?.sfx) return;
  const t = ctx().currentTime;
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    playOsc(f,       'square',   t + i * 0.1, 0.15, 0.35, _sfxBus);
    playOsc(f * 0.5, 'triangle', t + i * 0.1, 0.15, 0.18, _sfxBus);
  });
}

export function sfxGameOver() {
  if (!S.settings?.sfx) return;
  const t = ctx().currentTime;
  [440, 370, 311, 261].forEach((f, i) =>
    playOsc(f, 'sawtooth', t + i * 0.22, 0.28, 0.4, _sfxBus)
  );
}

export function sfxSharkBite() {
  if (!S.settings?.sfx) return;
  const t = ctx().currentTime;
  playNoise(t,        0.18, 0.8, 600,  _sfxBus);
  playOsc(80, 'sawtooth', t, 0.22, 0.6, _sfxBus);
}

export function sfxMenuClick() {
  if (!S.settings?.sfx) return;
  playOsc(660, 'square', ctx().currentTime, 0.05, 0.18, _sfxBus);
}

// ─── MUSIC ────────────────────────────────────────────────────
// Upbeat 8-bit chiptune, 160 BPM, C major, 8-bar loop
// Sequencer unit = 1 sixteenth note

const BPM       = 160;
const LOOKAHEAD = 0.18;              // schedule this far ahead (s)
const INTERVAL  = 30;               // scheduler runs every N ms

let _tempoMult = 1.0;              // 1.0 = normal, >1 = slower
function T16() { return ((60 / BPM) / 4) * _tempoMult; }

// Each entry: [freq_or_null, duration_in_16th_notes]
const MELODY = [
  // Bar 1
  [hz('E5'),2],[hz('G5'),2],[hz('A5'),2],[hz('G5'),2],
  [hz('E5'),2],[hz('C5'),2],[hz('D5'),2],[hz('E5'),2],
  // Bar 2
  [hz('F5'),2],[hz('A5'),2],[hz('C6'),2],[hz('A5'),2],
  [hz('F5'),2],[hz('D5'),2],[hz('E5'),2],[hz('F5'),2],
  // Bar 3
  [hz('G5'),2],[hz('B5'),2],[hz('C6'),2],[hz('B5'),2],
  [hz('G5'),2],[hz('E5'),2],[hz('F5'),2],[hz('G5'),2],
  // Bar 4
  [hz('C6'),4],[hz('A5'),2],[hz('G5'),2],
  [hz('E5'),2],[hz('D5'),2],[hz('C5'),4],
  // Bar 5 (punchy variation)
  [hz('E5'),2],[hz('E5'),2],[hz('G5'),2],[hz('E5'),2],
  [hz('C6'),2],[hz('B5'),2],[hz('A5'),2],[hz('G5'),2],
  // Bar 6
  [hz('F5'),2],[hz('F5'),2],[hz('A5'),2],[hz('F5'),2],
  [hz('D6'),2],[hz('C6'),2],[hz('B5'),2],[hz('A5'),2],
  // Bar 7 (ascending run)
  [hz('G5'),2],[hz('A5'),2],[hz('B5'),2],[hz('C6'),2],
  [hz('D6'),2],[hz('C6'),2],[hz('B5'),2],[hz('A5'),2],
  // Bar 8 (resolution)
  [hz('G5'),4],[hz('E5'),4],
  [hz('C5'),4],[null,4],
];

const BASS = [
  // Bars 1-2
  [hz('C3'),4],[hz('C3'),4],[hz('G2'),4],[hz('G2'),4],
  [hz('F3'),4],[hz('F3'),4],[hz('G3'),4],[hz('G3'),4],
  // Bars 3-4
  [hz('G2'),4],[hz('G2'),4],[hz('D3'),4],[hz('G2'),4],
  [hz('C3'),4],[hz('E3'),4],[hz('G3'),4],[hz('C3'),4],
  // Bars 5-6
  [hz('C3'),4],[hz('G3'),4],[hz('E3'),4],[hz('G3'),4],
  [hz('F3'),4],[hz('C3'),4],[hz('A3'),4],[hz('F3'),4],
  // Bars 7-8
  [hz('G2'),4],[hz('D3'),4],[hz('B2'),4],[hz('D3'),4],
  [hz('C3'),8],[hz('G3'),4],[hz('C3'),4],
];

// 16-step drum pattern (loops every bar)
// 1=kick, 2=snare, 3=hihat, 4=kick+hihat, 5=snare+hihat, 6=soft hihat (off-beat 16ths)
const DRUMS = [4, 6, 3, 6, 5, 6, 3, 6, 4, 6, 3, 6, 5, 6, 3, 6];

// ─── Card battle music (upbeat, fast, A minor) ────────────────
const CARD_BPM  = 200;
function CT16() { return (60 / CARD_BPM) / 4; }

const CARD_MELODY = [
  // Bar 1 — punchy ascending riff
  [hz('A5'),1],[hz('C6'),1],[hz('E6'),1],[hz('A6'),1],
  [hz('G6'),1],[hz('E6'),1],[hz('D6'),1],[hz('C6'),1],
  [hz('E6'),1],[hz('D6'),1],[hz('C6'),1],[hz('A5'),1],
  [hz('B5'),1],[hz('C6'),1],[hz('D6'),2],
  // Bar 2
  [hz('E6'),1],[hz('G6'),1],[hz('A6'),1],[hz('B6'),1],
  [hz('A6'),2],[hz('G6'),1],[hz('E6'),1],
  [hz('D6'),1],[hz('C6'),1],[hz('B5'),1],[hz('A5'),1],
  [hz('G5'),1],[hz('A5'),1],[hz('C6'),2],
  // Bar 3 — rhythmic stabs
  [hz('A5'),1],[null,1],[hz('E6'),1],[null,1],
  [hz('C6'),1],[null,1],[hz('G6'),1],[null,1],
  [hz('A5'),1],[null,1],[hz('F6'),1],[null,1],
  [hz('E6'),1],[hz('D6'),1],[hz('C6'),2],
  // Bar 4 — resolution run
  [hz('A5'),1],[hz('B5'),1],[hz('C6'),1],[hz('D6'),1],
  [hz('E6'),1],[hz('F6'),1],[hz('G6'),1],[hz('A6'),1],
  [hz('A6'),4],[null,4],
];

const CARD_BASS = [
  [hz('A2'),4],[hz('A2'),4],[hz('E3'),4],[hz('E3'),4],
  [hz('F3'),4],[hz('F3'),4],[hz('E3'),4],[hz('E3'),4],
  [hz('A2'),4],[hz('A2'),4],[hz('G3'),4],[hz('G3'),4],
  [hz('C3'),4],[hz('E3'),4],[hz('A2'),8],
];

const CARD_DRUMS = [4,6,5,6, 4,6,5,6, 4,3,5,3, 4,6,5,4];

let _cActive = false, _cTimer = null, _cNextTime = 0;
let _cmIdx = 0, _cmLeft = 0, _cbIdx = 0, _cbLeft = 0, _cdStep = 0;

function runCardScheduler() {
  if (!_cActive) return;
  const c = ctx();
  while (_cNextTime < c.currentTime + LOOKAHEAD) {
    if (_cmLeft <= 0) {
      const [f, d] = CARD_MELODY[_cmIdx % CARD_MELODY.length];
      _cmIdx++; _cmLeft = d;
      if (f) { playOsc(f, 'square', _cNextTime, d * CT16() * 0.78, 0.28, _musicBus); }
    }
    _cmLeft--;
    if (_cbLeft <= 0) {
      const [f, d] = CARD_BASS[_cbIdx % CARD_BASS.length];
      _cbIdx++; _cbLeft = d;
      if (f) { playOsc(f, 'triangle', _cNextTime, d * CT16() * 0.75, 0.36, _musicBus); }
    }
    _cbLeft--;
    const dtype = CARD_DRUMS[_cdStep % CARD_DRUMS.length];
    if (dtype) schedDrum(dtype, _cNextTime);
    _cdStep++;
    _cNextTime += CT16();
  }
  _cTimer = setTimeout(runCardScheduler, INTERVAL);
}

export function startCardMusic() {
  if (!S.settings?.music) return;
  stopMusic();
  if (_cActive) return;
  _cActive = true;
  _cmIdx = 0; _cmLeft = 0; _cbIdx = 0; _cbLeft = 0; _cdStep = 0;
  _cNextTime = ctx().currentTime + 0.05;
  runCardScheduler();
}

export function stopCardMusic() {
  _cActive = false;
  if (_cTimer) { clearTimeout(_cTimer); _cTimer = null; }
}

// ─── Drum voices ──────────────────────────────────────────────

function schedDrum(type, t) {
  const kick    = type === 1 || type === 4;
  const snare   = type === 2 || type === 5;
  const hat     = type === 3 || type === 4 || type === 5;
  const softHat = type === 6;

  if (kick) {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(_musicBus);
    o.start(t); o.stop(t + 0.22);
  }
  if (snare) {
    playNoise(t, 0.1, 0.55, 4000, _musicBus);
    playOsc(180, 'triangle', t, 0.06, 0.22, _musicBus);
  }
  if (hat) {
    playNoise(t, 0.025, 0.22, 10000, _musicBus);
  }
  if (softHat) {
    playNoise(t, 0.018, 0.09, 10000, _musicBus);
  }
}

// ─── Melody/bass voices ───────────────────────────────────────

function schedMelody(f, steps, t) {
  if (!f) return;
  const dur = steps * T16() * 0.82;
  playOsc(f,       'square',   t, dur, 0.32, _musicBus);
  playOsc(f * 0.5, 'triangle', t, dur * 0.5, 0.08, _musicBus);
}

function schedBass(f, steps, t) {
  if (!f) return;
  playOsc(f, 'triangle', t, steps * T16() * 0.78, 0.42, _musicBus);
}

// ─── Scheduler ───────────────────────────────────────────────

let _mIdx = 0, _mLeft = 0;
let _bIdx = 0, _bLeft = 0;
let _dStep = 0;
let _nextTime  = 0;
let _schedTimer = null;
let _musicActive = false;
let _fishWhisperTimer = null;

function whisperFish() {
  if (!_musicActive) return;
  const ss = window.speechSynthesis;
  if (!ss) return;
  // Clear any stuck queue (Chrome bug)
  ss.cancel();
  const u = new SpeechSynthesisUtterance('fish');
  u.volume = 1.0;
  u.rate   = 0.6;
  u.pitch  = 0.3;
  // Pick a voice if available — prefer a soft English one
  const voices = ss.getVoices();
  const pick = voices.find(v => /en/i.test(v.lang) && /female|zira|samantha|karen/i.test(v.name))
            || voices.find(v => /en/i.test(v.lang))
            || voices[0];
  if (pick) u.voice = pick;
  ss.speak(u);
}

function runScheduler() {
  if (!_musicActive) return;
  const c = ctx();
  while (_nextTime < c.currentTime + LOOKAHEAD) {
    // Melody
    if (_mLeft <= 0) {
      const [f, d] = MELODY[_mIdx % MELODY.length];
      _mIdx++;
      _mLeft = d;
      schedMelody(f, d, _nextTime);
    }
    _mLeft--;

    // Bass
    if (_bLeft <= 0) {
      const [f, d] = BASS[_bIdx % BASS.length];
      _bIdx++;
      _bLeft = d;
      schedBass(f, d, _nextTime);
    }
    _bLeft--;

    // Drums
    const dtype = DRUMS[_dStep % DRUMS.length];
    if (dtype) schedDrum(dtype, _nextTime);
    _dStep++;

    _nextTime += T16();
  }
  _schedTimer = setTimeout(runScheduler, INTERVAL);
}

// ─── Public API ───────────────────────────────────────────────

export function startMusic() {
  if (!S.settings?.music) return;
  if (_musicActive) return;
  _musicActive = true;
  _mIdx = 0; _mLeft = 0;
  _bIdx = 0; _bLeft = 0;
  _dStep = 0;
  _nextTime = ctx().currentTime + 0.08;
  runScheduler();
  // Ensure voices are loaded (Chrome loads them async) then start whisper loop
  const startWhispers = () => {
    _fishWhisperTimer = setInterval(whisperFish, 60000);
  };
  if (window.speechSynthesis) {
    if (window.speechSynthesis.getVoices().length) {
      startWhispers();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', startWhispers, { once: true });
    }
  }
}

export function stopMusic() {
  _musicActive = false;
  if (_schedTimer) { clearTimeout(_schedTimer); _schedTimer = null; }
  if (_fishWhisperTimer) { clearInterval(_fishWhisperTimer); _fishWhisperTimer = null; }
}

export function setMusicTempo(mult) {
  _tempoMult = mult;
}

export function setMusicVolume() {
  if (_musicBus) _musicBus.gain.value = _musicGain();
}

export function setSfxVolume() {
  if (_sfxBus) _sfxBus.gain.value = _sfxGain();
}

// Call once on first user interaction to unlock AudioContext
// Also applies any saved volume settings
export function initAudio() {
  ctx();
  setMusicVolume();
  setSfxVolume();
}
