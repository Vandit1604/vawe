// gen-audio.mjs — synthesize license-free audio (no deps, deterministic).
// Writes a subtle music bed + a small SFX library used by the audio mixer.
//   node scripts/media/gen-audio.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSETS = path.join(root, 'assets');
const SFX = path.join(ASSETS, 'sfx');
fs.mkdirSync(SFX, { recursive: true });

const SR = 44100;
const sec = (s) => Math.round(s * SR);
const TAU = Math.PI * 2;

// deterministic noise
let _s = 0x9e3779b1;
const noise = () => { _s = (Math.imul(_s, 1664525) + 1013904223) >>> 0; return (_s / 4294967296) * 2 - 1; };

const osc = (type, f, t) => {
  const ph = TAU * f * t;
  if (type === 'tri') return (2 / Math.PI) * Math.asin(Math.sin(ph));
  if (type === 'saw') return 2 * ((f * t) % 1) - 1;
  if (type === 'square') return Math.sin(ph) >= 0 ? 1 : -1;
  return Math.sin(ph);
};

function writeWav(file, samples) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, samples[i])); buf.writeInt16LE(Math.round(v * 32767), o); o += 2; }
  fs.writeFileSync(file, buf);
}

// a plucked/bell tone with exponential decay + harmonics
function tone(freq, dur, { type = 'sine', attack = 0.004, decay = 0.25, gain = 0.6, harmonics = [] } = {}) {
  const n = sec(dur), out = new Float32Array(n), aN = sec(attack);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = osc(type, freq, t);
    for (const [mult, amp] of harmonics) v += amp * osc(type, freq * mult, t);
    const e = i < aN ? i / aN : Math.exp(-(t - attack) / decay);
    out[i] = v * e * gain;
  }
  return out;
}
const add = (dst, src, atSec, g = 1) => { const off = sec(atSec); for (let i = 0; i < src.length && off + i < dst.length; i++) dst[off + i] += src[i] * g; };

// ---- SFX ----
// tick: crisp click for the countdown
writeWav(path.join(SFX, 'tick.wav'), tone(1180, 0.055, { decay: 0.014, gain: 0.5, harmonics: [[2.01, 0.25]] }));

// countdown beeps before the reveal: two equal beeps + a higher "go" beep
writeWav(path.join(SFX, 'beep.wav'), tone(680, 0.16, { type: 'sine', attack: 0.006, decay: 0.1, gain: 0.5, harmonics: [[2, 0.16]] }));
writeWav(path.join(SFX, 'beep3.wav'), tone(960, 0.22, { type: 'sine', attack: 0.006, decay: 0.14, gain: 0.55, harmonics: [[2, 0.18]] }));

// whoosh: band-ish noise swept up then down (card enter)
(() => {
  const dur = 0.32, n = sec(dur), out = new Float32Array(n); let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n; const cut = 0.04 + 0.5 * Math.sin(Math.min(1, t) * Math.PI); // sweep cutoff up then down
    lp += cut * (noise() - lp); // one-pole lowpass
    const amp = Math.sin(Math.min(1, t) * Math.PI); // bell
    out[i] = lp * amp * 0.5;
  }
  writeWav(path.join(SFX, 'whoosh.wav'), out);
})();

// reveal: sub thump + bright upward chirp (the answer lands)
(() => {
  const dur = 0.5, n = sec(dur), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const subF = 90 - 38 * Math.min(1, t / 0.25);              // 90 -> 52 Hz drop
    const sub = Math.sin(TAU * subF * t) * Math.exp(-t / 0.16) * 0.85;
    const chF = 320 + 680 * Math.min(1, t / 0.14);             // rising chirp
    const chirp = Math.sin(TAU * chF * t) * Math.exp(-t / 0.1) * 0.3;
    const click = i < sec(0.01) ? noise() * 0.4 * (1 - i / sec(0.01)) : 0;
    out[i] = sub + chirp + click;
  }
  writeWav(path.join(SFX, 'reveal.wav'), out);
})();

// correct: two bright bell notes (positive, "ding-ding")
(() => {
  const out = new Float32Array(sec(0.62));
  const bell = (f) => tone(f, 0.55, { decay: 0.34, gain: 0.5, harmonics: [[2, 0.35], [3, 0.12]] });
  add(out, bell(659.25), 0, 1);     // E5
  add(out, bell(987.77), 0.11, 0.9); // B5
  writeWav(path.join(SFX, 'correct.wav'), out);
})();

// wrong: short descending buzz (optional, for the loser/trap)
(() => {
  const dur = 0.34, n = sec(dur), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; const f = 220 - 70 * (t / dur); out[i] = osc('square', f, t) * Math.exp(-t / 0.13) * 0.22; }
  writeWav(path.join(SFX, 'wrong.wav'), out);
})();

// ---- music bed: subtle anticipation loop (soft pulse + low pad + airy shimmer) ----
(() => {
  const LOOP = 8, n = sec(LOOP), out = new Float32Array(n);
  const lf = (f) => Math.round(f * LOOP) / LOOP; // snap to integer cycles -> seamless loop
  // low pad (A minor-ish), very quiet
  const pad = [lf(110), lf(164.8), lf(220)];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const trem = 0.7 + 0.3 * Math.sin(TAU * lf(0.25) * t);
    let v = 0;
    for (const f of pad) v += Math.sin(TAU * f * t);
    out[i] += (v / pad.length) * 0.05 * trem;
    out[i] += Math.sin(TAU * lf(880) * t) * 0.018 * (0.6 + 0.4 * Math.sin(TAU * lf(0.125) * t)); // airy shimmer
  }
  // soft heartbeat pulse every 0.5s (clock tension)
  const pulse = tone(58, 0.18, { decay: 0.1, gain: 0.18, harmonics: [[2, 0.2]] });
  for (let b = 0; b < LOOP / 0.5; b++) add(out, pulse, b * 0.5, b % 2 === 0 ? 1 : 0.7);
  // quiet hat tick every 0.25s for motion
  const hat = (() => { const m = sec(0.03), a = new Float32Array(m); for (let i = 0; i < m; i++) a[i] = noise() * Math.exp(-i / sec(0.008)) * 0.06; return a; })();
  for (let b = 0; b < LOOP / 0.25; b++) add(out, hat, b * 0.25, 1);
  writeWav(path.join(ASSETS, 'music.wav'), out);
})();

console.log('✓ audio assets written:');
console.log('  music.wav (8s loop) +', fs.readdirSync(SFX).join(', '));
