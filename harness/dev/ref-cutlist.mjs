#!/usr/bin/env node
// harness/dev/ref-cutlist.mjs: measure a reference clip's real cut points and write beats.md from
// them, so an agent edits a MEASURED list instead of guessing beat windows off a hand-scrubbed
// contact sheet (quality/refs/kinetic-promo/friction.jsonl: a 42-frame sheet missed that the real
// clip ran ~2x faster and had an outro the sheet never showed at all).
//
// Reuses harness/media/shot-detect.mjs's own `detectCuts` (ffmpeg `select='gt(scene,T)'`, the same
// scene-score reader `make study` already uses), so this is only the beats.md-shaped output around
// an existing measurement, not a second detector.
//
// Usage: bin/vawe ref-cutlist REF=<ref-name> [THRESHOLD=0.3]
//   Writes quality/refs/<ref-name>/study/stills/ (one PNG per cut + one per second, gitignored) and
//   OVERWRITES quality/refs/<ref-name>/beats.md with one heading per cut-to-cut window, each pointing
//   at its stills. Heading label and technique are left "TODO": look at the stills, then fill them in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCuts } from '../media/shot-detect.mjs';
import { probeSize } from '../lib/frame-forensics.mjs';
import { ffmpegOrDie } from '../lib/scratch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const KV = Object.fromEntries(argv.filter((a) => /^[A-Z_]+=/.test(a)).map((a) => {
  const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)];
}));
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(2); };

const REF = KV.REF || process.env.REF;
const THRESHOLD = Number(KV.THRESHOLD || process.env.THRESHOLD || 0.3);
if (!REF) die('usage: bin/vawe ref-cutlist REF=<ref-name> [THRESHOLD=0.3]');

const refDir = path.join(ROOT, 'quality/refs', REF);
const sourceMp4 = path.join(refDir, 'source.mp4');
if (!fs.existsSync(sourceMp4)) die(`quality/refs/${REF}/source.mp4 is missing (local-only, per quality/refs/README.md)`);

const { duration } = probeSize(sourceMp4);
if (!duration) die(`${sourceMp4} has no readable duration.`);

const stillsDir = path.join(refDir, 'study', 'stills');
fs.mkdirSync(stillsDir, { recursive: true });
for (const f of fs.readdirSync(stillsDir)) fs.rmSync(path.join(stillsDir, f));

const scratchDir = fs.mkdtempSync(path.join(ROOT, 'out', '.cutlist-'));
const { peak, near, cuts } = detectCuts(sourceMp4, scratchDir, THRESHOLD, 0.4);
fs.rmSync(scratchDir, { recursive: true, force: true });

// window boundaries: t=0, every detected cut, deduped against near-duplicates from clustering.
const bounds = [0, ...cuts.map((c) => c.t)].filter((t, i, a) => i === 0 || t - a[i - 1] > 0.05);

// one still per cut boundary, plus one per second, so a beat with no cut in it is still visible.
const perSecond = Array.from({ length: Math.floor(duration) + 1 }, (_, i) => i);
const stillTimes = [...new Set([...bounds, ...perSecond])]
  .map((t) => Math.min(t, duration - 1 / 30)) // a seek at/after the container's own duration finds no frame
  .sort((a, b) => a - b);

function grabStill(t) {
  const out = path.join(stillsDir, `t${t.toFixed(2)}s.png`);
  ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', sourceMp4, '-frames:v', '1', out], out, 'ref-cutlist still');
  return path.relative(ROOT, out);
}
const stillPaths = new Map(stillTimes.map((t) => [t, grabStill(t)]));

const windows = bounds.map((start, i) => ({ start, end: i + 1 < bounds.length ? bounds[i + 1] : duration }));

const lines = [
  `# ${REF} beats`, '',
  `Auto-measured cut list: ffmpeg scene-detect threshold ${THRESHOLD} on ${path.relative(ROOT, sourceMp4)}`
    + ` (${duration.toFixed(1)}s, peak scene score ${peak.toFixed(3)}, ${near} near-misses below threshold).`,
  `Stills: ${path.relative(ROOT, stillsDir)}/ (one per cut + one per second).`, '',
  'Look at the stills before naming a beat: rename each "TODO" heading and technique line by eye.', '',
];
for (const [i, w] of windows.entries()) {
  const shown = stillTimes.filter((t) => t >= w.start && t < w.end).map((t) => stillPaths.get(t));
  lines.push(`## Beat ${i + 1}: TODO`, `- window: ${w.start.toFixed(1)}-${w.end.toFixed(1)}s`,
    `- technique: TODO (look at ${shown.join(', ') || stillPaths.get(w.start)})`, '');
}
fs.writeFileSync(path.join(refDir, 'beats.md'), lines.join('\n'));
console.log(`✓ wrote quality/refs/${REF}/beats.md (${windows.length} measured windows) and `
  + `${stillPaths.size} stills under ${path.relative(ROOT, stillsDir)}/`);
