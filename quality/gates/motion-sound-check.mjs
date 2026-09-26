#!/usr/bin/env node
// quality/gates/motion-sound-check.mjs: does a SOUND land where the PICTURE moves, in the rendered mp4?
//
// THE BUG THIS EXISTS TO CATCH. `vawe-flow-2.json` shipped three renders with a card sliding in at
// 9.6s and sliding off at 12.6s, both dead silent, and every gate passed every time. audio-check.mjs
// reads the scene JSON (declared vs chosen silence); audio-render-check.mjs reads the RENDER against
// the scene's DECLARATION (is a declared cue heard at the time it says). Neither opens the render and
// asks the one question that actually found the bug: is a big visual change ever accompanied by
// sound, regardless of what the JSON declared? audio-render-check.mjs's own header names this as its
// documented blind spot: `audio.tactile` motion sound is generated from the built DOM, not the JSON,
// so it has no timestamp for this gate to check against. This gate carries no notion of "declared" at
// all. It reads two tracks off the SAME render and asks whether they agree with each other.
//
// THE METHOD, one ffmpeg pass per track, then a bucket compare. Same shape as the by-hand pass that
// found the bug:
//   video: harness/lib/frame-forensics.mjs frameDeltaSweep (a gridStatsSweep sibling: one decode, one
//     process, max per-pixel gray delta between consecutive frames on a 64x36 grid).
//   audio: one ffmpeg pass to mono PCM at 8kHz, then RMS dB per 0.2s window in one pass over the
//     samples. This is deliberately NOT audio-render-check.mjs's onset/floor-trail envelope: that
//     detector answers "did a sound START here", tuned to place an instant within 150ms; this one
//     answers "is there ANY sound in this whole 200ms slice", a coarser question that does not care
//     when in the bucket it happened. Reusing the onset detector here would either miss a sustained
//     bed (never "starts" mid-bucket) or misreport a bucket that is mid-decay from an onset just
//     before it. Two different questions, two different arithmetics; sharing one would answer neither
//     correctly.
//
// THE THRESHOLD IS DERIVED FROM THE FILM'S OWN MOTION, NOT A MAGIC NUMBER. "Large" is the 85th
// percentile of this film's own nonzero bucket deltas (floored at 0.20 so a nearly-static film, whose
// 85th percentile is itself noise, cannot manufacture a "large" event out of nothing). A number fitted
// to one film travels badly: vawe-flow-2's busiest bucket and a talking-head film's busiest bucket are
// not the same kind of frame, so each film is measured against itself.
//
// TWO DIRECTIONS, BOTH REAL. `silent-motion`: a bucket clears the "large" threshold and NO bucket
// carries audible sound (RMS above -40dB, the encoder's own noise floor) at that same instant.
// `sound-over-stillness`: a run of >= 0.6s where the frame barely moves (every bucket under a small
// floor) while sound in that span reads clearly audible (-28dB or louder), e.g. plucks playing over a
// frozen frame. Exact-bucket comparison, no search window: a search window wide enough to reach a
// neighbouring cue is wide enough to paper over the exact bug this gate exists to catch (measured:
// a +-0.4s window let the 9.6s slide-in "find" an unrelated voice line at 10.0s and went quiet).
//
// A CHOSEN ABSENCE IS NOT A DEFECT. A silent cut and a held frame under narration are both real
// authorial choices this gate cannot tell from an oversight by pixels alone, so it never blocks:
// REPORT only, same tier edge-check.mjs ships at, until a run across real films shows it is quiet
// enough to trust with more. Waive an instance with the one mechanism every gate here uses:
//   {"authoring":{"allow":["silent-motion@9.60s"],"_why":{"silent-motion@9.60s":"…"}}}
//
//   node quality/gates/motion-sound-check.mjs films/scene/<film>.json     ·     make check GATE=motion-sound-check D=<file>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { frameDeltaSweep, probeFps, requireTool } from '../../harness/lib/frame-forensics.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { isWaivedBy } from '../../harness/lib/waivers.mjs';
import { gradeable } from './tile.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('usage: node quality/gates/motion-sound-check.mjs films/scene/<film>.json');
  process.exit(2);
}
const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
const allow = (scene.authoring && Array.isArray(scene.authoring.allow)) ? scene.authoring.allow : [];
const name = path.basename(file).replace(/\.(expanded\.)?json$/, '');

const F = gateFindings({ scene: file, indent: '  ',
  line: (r, g) => `  ${g} [${r.code}] ${r.waived ? 'waived via authoring.allow: ' : ''}${r.summary}` });

console.log(`\n  motion-sound-check · ${path.basename(file)}`);

if (scene.audio && scene.audio.silent === true) {
  console.log(`  ✓ audio.silent:true, no track to compare`);
  F.emit();
  process.exit(0);
}

const ready = gradeable(file, path.join(ROOT, 'out', `${name}.mp4`));
if (!ready.ok) { console.error(`✗ ${ready.why}.\n  fix: ${ready.fix}`); process.exit(1); }
const mp4 = ready.mp4;

requireTool('ffmpeg');
const fps = probeFps(mp4) || 30;

// ---- video: one decode, per-frame max grid delta, bucketed to 0.2s -------------------------------
// Bucket keys are INTEGER indices, never a float built from t/BUCKET_S: 9.6/0.2 is 47.99999999999999
// in floating point, so a float key silently folded the 9.6s bucket into 9.4s's and the exact bug this
// gate exists to catch (a silent slide-in at 9.6s) read as "found sound nearby" from the neighbour it
// had just been merged with. Integer indices have no such collision.
const BUCKET_S = 0.2;
const frames = frameDeltaSweep(mp4, 64, 36);
if (!frames.length) { console.error(`✗ ${mp4} carries no readable video track.`); process.exit(2); }
const bucketIdx = (t) => Math.floor(t / BUCKET_S + 1e-9);
const bucketT = (idx) => +(idx * BUCKET_S).toFixed(2);
const visByBucket = new Map();
for (const fr of frames) {
  const t = fr.frame / fps;
  const idx = bucketIdx(t);
  visByBucket.set(idx, Math.max(visByBucket.get(idx) ?? 0, fr.delta));
}

// ---- audio: one decode, RMS dB per the same 0.2s buckets -----------------------------------------
const SR = 8000;
const ar = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vn', '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'],
  { maxBuffer: 1 << 29 });
const samples = (ar.stdout && ar.stdout.length >= 2)
  ? new Int16Array(ar.stdout.buffer, ar.stdout.byteOffset, Math.floor(ar.stdout.length / 2))
  : new Int16Array(0);
const dbByBucket = new Map();
const totalT = frames.length / fps;
const nBuckets = bucketIdx(totalT) + 1;
for (let idx = 0; idx < nBuckets; idx++) {
  const t = idx * BUCKET_S;
  const s0 = Math.floor(t * SR), s1 = Math.floor((t + BUCKET_S) * SR);
  let sum = 0, n = 0;
  for (let i = s0; i < s1 && i < samples.length; i++) { const v = samples[i] / 32768; sum += v * v; n++; }
  const rms = n ? Math.sqrt(sum / n) : 0;
  dbByBucket.set(idx, rms > 0 ? 20 * Math.log10(rms) : -99);
}

// ---- threshold: this film's own 85th percentile of its non-trivial motion, floored ---------------
const VIS_PCT = 0.85, VIS_FLOOR = 0.20, SILENCE_DB = -40;
const nonTrivial = [...visByBucket.values()].filter((v) => v > 0.005).sort((a, b) => a - b);
const visThresh = nonTrivial.length ? Math.max(VIS_FLOOR, nonTrivial[Math.floor(VIS_PCT * nonTrivial.length)]) : VIS_FLOOR;

// ---- direction A: a large visual event, no sound at that same instant ----------------------------
const bucketIdxs = [...visByBucket.keys()].sort((a, b) => a - b);
for (const idx of bucketIdxs) {
  const vis = visByBucket.get(idx);
  if (vis < visThresh) continue;
  const db = dbByBucket.get(idx) ?? -99;
  if (db > SILENCE_DB) continue;
  const at = `${bucketT(idx).toFixed(2)}s`;
  const summary = `the picture moves hard at ${at} (${Math.round(vis * 100)}% of the frame changed, `
    + `this film's own large-motion floor is ${Math.round(visThresh * 100)}%) but the render is silent there `
    + `(${db.toFixed(1)}dB). Fix: give the move a cue (an authored \`audio.cues[]\` entry, or check `
    + `\`audio.tactile\` actually covers this layer's motion track), or if the silence is chosen, `
    + `waive with {"authoring":{"allow":["silent-motion@${at}"]}}.`;
  if (isWaivedBy(allow, 'silent-motion', at)) F.finding({ code: 'silent-motion', severity: 'warn', summary, at, waived: true });
  else F.warn('silent-motion', summary, { at });
}

// ---- direction B: sound plays over a run of frames that do not move ------------------------------
// STILL_FLOOR: no external source answers "how little pixel change counts as stillness" as a standalone
// perceptual claim (same shape as motion-floor.mjs's DEAD). LOUD_DB is Group C (a colour/signal
// constant, a separate pass). engine-doctrine/RESEARCH/TIMING-SOURCES.md part 6.
const STILL_FLOOR = 0.06, LOUD_DB = -28, HOLD_S = 0.6;
const HOLD_BUCKETS = Math.round(HOLD_S / BUCKET_S);
let runStart = null;
const flushRun = (endIdx) => {
  if (runStart === null) return;
  if (endIdx - runStart < HOLD_BUCKETS) { runStart = null; return; }
  const span = bucketIdxs.filter((idx) => idx >= runStart && idx < endIdx);
  const loud = span.filter((idx) => (dbByBucket.get(idx) ?? -99) > LOUD_DB);
  if (loud.length) {
    const peakDb = Math.max(...loud.map((idx) => dbByBucket.get(idx)));
    const at = `${bucketT(runStart).toFixed(2)}s-${bucketT(endIdx).toFixed(2)}s`;
    const summary = `the frame barely moves from ${at} but the render plays sound there (peak ${peakDb.toFixed(1)}dB). `
      + `Fix: confirm the held frame IS the beat (a deliberate hold under a VO/bed reads fine and just needs a `
      + `waiver), or that the layer meant to move during this span actually has a motion window here. Waive with `
      + `{"authoring":{"allow":["sound-over-stillness@${at}"]}}.`;
    if (isWaivedBy(allow, 'sound-over-stillness', at)) F.finding({ code: 'sound-over-stillness', severity: 'warn', summary, at, waived: true });
    else F.warn('sound-over-stillness', summary, { at });
  }
  runStart = null;
};
for (const idx of bucketIdxs) {
  const still = visByBucket.get(idx) < STILL_FLOOR;
  if (still) { if (runStart === null) runStart = idx; }
  else flushRun(idx);
}
flushRun(bucketIdxs.length ? bucketIdxs[bucketIdxs.length - 1] + 1 : 0);

F.emit();
console.log(F.count ? `\n  → ${F.count} finding(s), large-motion floor ${Math.round(visThresh * 100)}%.\n` : '\n  → clean.\n');
process.exitCode = 0; // report, never block
