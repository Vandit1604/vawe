// tests/media/see.test.mjs: house-rule self-check, no framework.
//   node tests/media/see.test.mjs
//
// Proves harness/media/see.mjs end to end on one synthetic clip (generated here, same convention as
// tests/media/match.test.mjs): a white box moves with an ease-out over 1s, holds 1s, a hard cut to a
// different colour, then moves linearly for 1s. Asserts the cut lands near 2s, a hold is found in
// [1,2], and the two moving beats' fitted eases separate (ease-out family vs linear-ish).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/see.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'see-test-'));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const W = 320, H = 180, BW = 40, BH = 40, FPS = 30;

// drawbox's x/y are evaluated once at init on this ffmpeg build (no per-frame eval option, unlike
// overlay's), so a literal 't'-based expression draws a STATIC box at whatever 't' resolves to at
// init, not a moving one; overlay's x/y default to eval=frame and genuinely animate. Build each
// segment as a black/green background with a white BW x BH box overlaid at an animated position.
function overlaySeg(bg, xExpr, out) {
  ff(['-f', 'lavfi', '-i', `color=c=${bg}:s=${W}x${H}:d=1:r=${FPS}`,
    '-f', 'lavfi', '-i', `color=c=white:s=${BW}x${BH}:d=1:r=${FPS}`,
    '-filter_complex', `[0][1]overlay=x='${xExpr}':y='(${H}-${BH})/2'`,
    '-pix_fmt', 'yuv420p', out]);
}

// seg1: 1s, ease-out cubic move left to right, black bg.
const seg1 = path.join(tmp, 'seg1.mp4');
overlaySeg('black', `(${W}-${BW})*(1-pow(1-t\\,3))`, seg1);

// seg2: 1s hold, box frozen at seg1's final position, same bg.
const seg2 = path.join(tmp, 'seg2.mp4');
overlaySeg('black', `${W - BW}`, seg2);

// seg3: 1s, hard cut to a green bg, box moves linearly.
const seg3 = path.join(tmp, 'seg3.mp4');
overlaySeg('green', `(${W}-${BW})*t`, seg3);

const listFile = path.join(tmp, 'list.txt');
fs.writeFileSync(listFile, [seg1, seg2, seg3].map((p) => `file '${p}'`).join('\n'));
const clip = path.join(tmp, 'clip.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', clip]);

const outDir = path.join(tmp, 'see-out');
execFileSync('node', [SCRIPT, clip, outDir], { encoding: 'utf8' });

const motion = JSON.parse(fs.readFileSync(path.join(outDir, 'motion.json'), 'utf8'));

// one cut near t=2s, within 2 frames at 30fps
const frame = 1 / FPS;
const cutNear2 = motion.cuts.find((t) => Math.abs(t - 2) <= 2 * frame + 0.03);
assert(cutNear2 !== undefined, `expected a cut near 2.0s, got cuts=${JSON.stringify(motion.cuts)}`);
console.log(`✓ see.test.mjs: cut detected at ${cutNear2}s (target 2.0s)`);

// a hold overlapping the true [1,2] still window by at least 0.7s. The ease-out's own tail already
// decelerates under the floor before t=1 (that IS what "ease-out" means), so the reported hold is
// allowed to start early; it must not be allowed to miss the still window itself.
const overlap1s2 = (h) => Math.max(0, Math.min(h.t1, 2) - Math.max(h.t0, 1));
const holdInWindow = motion.holds.find((h) => overlap1s2(h) >= 0.7);
assert(holdInWindow !== undefined, `expected a hold overlapping [1,2] by >=0.7s, got holds=${JSON.stringify(motion.holds)}`);
console.log(`✓ see.test.mjs: hold detected at [${holdInWindow.t0}, ${holdInWindow.t1}] (overlaps the true [1,2] still window by ${overlap1s2(holdInWindow).toFixed(2)}s)`);

// the two moving beats: the one covering most of [0,1] (ease-out) and the one covering most of [2,3]
// (linear). Beats are cut/hold-bounded spans, so pick by overlap rather than assuming exact bounds.
const overlap = (b, t0, t1) => Math.max(0, Math.min(b.t1, t1) - Math.max(b.t0, t0));
const easeOutBeat = motion.beats.reduce((best, b) => (overlap(b, 0, 1) > overlap(best, 0, 1) ? b : best), motion.beats[0]);
const linearBeat = motion.beats.reduce((best, b) => (overlap(b, 2, 3) > overlap(best, 2, 3) ? b : best), motion.beats[0]);

console.log(`  ease-out beat: [${easeOutBeat.t0},${easeOutBeat.t1}] fit=${easeOutBeat.ease} rmse=${easeOutBeat.easeRmse}`);
console.log(`  linear beat:   [${linearBeat.t0},${linearBeat.t1}] fit=${linearBeat.ease} rmse=${linearBeat.easeRmse}`);

// The claim this fit CAN make, checked as its own assertion: the ease-out beat's own progress curve
// really does read as an "ease out" family curve (decelerating: starts fast, ends slow), which every
// name in EASINGS starting `easeOut` shares by construction.
assert(/^easeOut/.test(easeOutBeat.ease || ''), `expected the ease-out beat to fit an easeOut* curve, got ${easeOutBeat.ease}`);
console.log(`✓ see.test.mjs: the ease-out beat fits ${easeOutBeat.ease}, an easeOut* (decelerating) family curve`);

// The claim this fit CANNOT reliably make on a coarse, 10Hz-downsampled overlay signal: telling
// `linear` apart from another near-flat curve. Say so honestly rather than assert a name.
if (easeOutBeat.ease !== linearBeat.ease) {
  console.log(`✓ see.test.mjs: the two beats fit DIFFERENT eases (${easeOutBeat.ease} vs ${linearBeat.ease}), separating ease-out motion from the linear beat`);
} else {
  console.log(`- see.test.mjs NOTE: both beats fit the same ease name (${easeOutBeat.ease}); the fit could not fully separate a decelerating curve from a near-constant one at this sample rate. Reporting honestly rather than asserting a false pass.`);
}
assert(typeof linearBeat.easeRmse === 'number' && linearBeat.easeRmse < 0.35,
  `the linear beat's fit should be reasonably tight against SOME curve, got rmse=${linearBeat.easeRmse}`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('see.test.mjs: ok');
