// beatmap.mjs: detect a track's pulse and write it beside the audio.
//
//   node scripts/media/beatmap.mjs assets/music/calm.wav
//   make beatmap MUSIC=assets/music/calm.wav
//
// Writes assets/music/<name>.beats.json = { bpm, confidence, beats[], downbeats[] }.
// Authors then snap cut times to it (core/beats.js snapToBeat), so a transition lands ON the pulse
// instead of near it. Deterministic: same wav in, same grid out, so a beat-matched video stays
// reproducible. Maths lives in core/beats.js and is asserted by `make lib-test`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onsetEnvelope, estimateTempo, estimatePhase, beatGrid, downbeats } from '../../core/beats.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/media/beatmap.mjs <file.wav>'); process.exit(2); }
const abs = path.resolve(repoRoot, file);
if (!fs.existsSync(abs)) { console.error(`no such file: ${file}`); process.exit(1); }

/** Minimal PCM WAV reader: walks the chunk table rather than assuming a 44-byte header. */
function readWav(p) {
  const b = fs.readFileSync(p);
  if (b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WAVE') throw new Error('not a RIFF/WAVE file');
  let off = 12, fmt = null, data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('latin1', off, off + 4), size = b.readUInt32LE(off + 4), body = off + 8;
    if (id === 'fmt ') fmt = { channels: b.readUInt16LE(body + 2), rate: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
    else if (id === 'data') data = { start: body, size: Math.min(size, b.length - body) };
    off = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('missing fmt/data chunk');
  if (fmt.bits !== 16) throw new Error(`only 16-bit PCM supported (got ${fmt.bits}-bit)`);
  const frames = Math.floor(data.size / 2 / fmt.channels);
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) { // downmix to mono
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) s += b.readInt16LE(data.start + (i * fmt.channels + c) * 2) / 32768;
    out[i] = s / fmt.channels;
  }
  return { samples: out, rate: fmt.rate, duration: frames / fmt.rate };
}

const { samples, rate, duration } = readWav(abs);
const { env, hopSeconds } = onsetEnvelope(samples, rate);
const { bpm, periodFrames, confidence } = estimateTempo(env, hopSeconds);
const phase = estimatePhase(env, periodFrames);
const beats = beatGrid(periodFrames, phase, hopSeconds, duration);
const bars = downbeats(beats, 4);

const name = path.basename(abs).replace(/\.wav$/i, '');
const out = path.join(path.dirname(abs), `${name}.beats.json`);
fs.writeFileSync(out, JSON.stringify({ track: name, seconds: +duration.toFixed(2), bpm: +bpm.toFixed(2),
  confidence: +confidence.toFixed(2), beatCount: beats.length, beats, downbeats: bars }, null, 1) + '\n');

const verdict = confidence >= 2.5 ? 'strong' : confidence >= 1.6 ? 'usable' : 'WEAK, ambient/rubato, do not snap to this';
console.log(`✓ ${name}: ${bpm.toFixed(1)} BPM · ${beats.length} beats · ${bars.length} bars · confidence ${confidence.toFixed(2)} (${verdict})`);
console.log(`  first bars: ${bars.slice(0, 6).map((b) => b.toFixed(2)).join('s, ')}s`);
console.log(`  → ${path.relative(repoRoot, out)}`);
