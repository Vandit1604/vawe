import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWav } from './wav-read.mjs';
import { bandEnergies, BANDS } from '../../core/tracks/spectrum.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
if (!file) { console.error('usage: node harness/media/spectrum.mjs <file.wav> [--fps 30]'); process.exit(2); }
const fpsAt = process.argv.indexOf('--fps');
const fps = fpsAt > 0 ? Number(process.argv[fpsAt + 1]) : 30;
const abs = path.resolve(repoRoot, file);
if (!fs.existsSync(abs)) { console.error(`no such file: ${file}`); process.exit(1); }

const { sampleRate, mono, frames } = readWav(abs);
const spec = bandEnergies(mono, sampleRate, fps, BANDS);
const out = abs.replace(/\.wav$/i, '.spectrum.json');
fs.writeFileSync(out, JSON.stringify(spec));
const peak = spec.bands.map((b, i) => `${b} ${spec.peak[i].toFixed(4)}${spec.peak[i] < 0.01 ? ' (near-silent)' : ''}`).join(' · ');
console.log(`✓ ${path.relative(repoRoot, out)}  ${spec.frames.length} frames @ ${fps}fps · ${(frames / sampleRate).toFixed(1)}s · ${peak}`);
