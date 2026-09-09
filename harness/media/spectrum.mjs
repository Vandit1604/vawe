// spectrum.mjs: bake a track's per-frame band energy beside the audio.
//
//   node harness/media/spectrum.mjs assets/music/launch.wav [--fps 30]
//   make spectrum MUSIC=assets/music/launch.wav
//
// Writes assets/music/<name>.spectrum.json = { fps, bands, frames: [[low,mid,high], …] }, one row per
// video frame. A scene points at it with `audio.spectrum` and layers react with `react: {…}`.
//
// This is the whole audio-reactivity determinism story: the ANALYSIS happens once, here, offline. The
// render never touches a decoder. It reads row `n` of a table. So renderFrame(412) is as pure as it
// was before, which is why this ships instead of sitting in ROADMAP Tier 5 with the sims.
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
// report the ABSOLUTE peak per band: the normalised columns all reach 1.0 by construction, so
// printing those told the author nothing about whether a band actually carries anything.
const peak = spec.bands.map((b, i) => `${b} ${spec.peak[i].toFixed(4)}${spec.peak[i] < 0.01 ? ' (near-silent)' : ''}`).join(' · ');
console.log(`✓ ${path.relative(repoRoot, out)}  ${spec.frames.length} frames @ ${fps}fps · ${(frames / sampleRate).toFixed(1)}s · ${peak}`);
