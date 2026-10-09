// Writes track.wav beside this file: 100 BPM, first beat at 0.3 s, 8 s, a strike on every beat and one off-grid stab at 7.1 s.
// The strikes are listed in truth.json. Run `node tests/fixtures/truth/beat/make-track.mjs` after any change here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 11025, SECONDS = 8, BPM = 100, FIRST = 0.3;
const out = new Float32Array(RATE * SECONDS);
let seed = 12345;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 31 - 1; };

function strike(at, amp, kind) {
  const start = Math.round(at * RATE);
  const length = Math.round(0.25 * RATE);
  for (let i = 0; i < length && start + i < out.length; i++) {
    const t = i / RATE, attack = Math.min(1, t / 0.001);
    const body = kind === 'kick' ? Math.sin(2 * Math.PI * (50 * t + 100 * (1 - Math.exp(-30 * t)) / 30)) * Math.exp(-t / 0.08)
      : kind === 'snare' ? (0.7 * noise() + 0.3 * Math.sin(2 * Math.PI * 200 * t)) * Math.exp(-t / 0.05)
        : (Math.sin(2 * Math.PI * 660 * t) + Math.sin(2 * Math.PI * 990 * t)) * 0.5 * Math.exp(-t / 0.06);
    out[start + i] += amp * attack * body;
  }
}

const period = 60 / BPM;
for (let k = 0; FIRST + k * period < SECONDS - 0.3; k++) {
  const at = FIRST + k * period;
  if (k % 4 === 0) strike(at, 0.95, 'kick');
  else if (k % 4 === 2) strike(at, 0.7, 'kick');
  else strike(at, 0.6, 'snare');
}
strike(7.1, 0.8, 'stab');

const pcm = Buffer.alloc(out.length * 2);
out.forEach((v, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'track.wav'), Buffer.concat([header, pcm]));
