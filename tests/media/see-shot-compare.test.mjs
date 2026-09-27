// tests/media/see-shot-compare.test.mjs: house-rule self-check, no framework.
//   node tests/media/see-shot-compare.test.mjs
//
// Proves harness/media/see.mjs's --shot and --compare flags end to end on synthetic clips (generated
// here, same convention as tests/media/see.test.mjs and tests/media/match.test.mjs): a clip with a
// moving box, --shot on a window of it, --compare of the clip against ITSELF (every window equal, no
// "too still"), and --compare against a FROZEN first-frame render of it (every window "too still").
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/see.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'see-sc-test-'));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const W = 320, H = 180, BW = 40, BH = 40, FPS = 24, DUR = 2;

// A box sliding left to right over the whole clip: real per-frame motion, no cuts.
const clip = path.join(tmp, 'clip.mp4');
ff(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:d=${DUR}:r=${FPS}`,
  '-f', 'lavfi', '-i', `color=c=white:s=${BW}x${BH}:d=${DUR}:r=${FPS}`,
  '-filter_complex', `[0][1]overlay=x='(${W}-${BW})*t/${DUR}':y='(${H}-${BH})/2'`,
  '-pix_fmt', 'yuv420p', clip]);

// A frozen render: the clip's own first frame, held for the same duration. Genuinely no motion.
const frozenFrame = path.join(tmp, 'frozen.png');
ff(['-i', clip, '-vframes', '1', frozenFrame]);
const frozen = path.join(tmp, 'frozen.mp4');
ff(['-loop', '1', '-i', frozenFrame, '-t', String(DUR), '-r', String(FPS), '-pix_fmt', 'yuv420p', frozen]);

try {
  // ── --shot: a dense strip of one window, plus its motion curve ────────────────────────────────────
  const shotOut = path.join(tmp, 'shot-out');
  const shotStdout = execFileSync('node', [SCRIPT, clip, shotOut, '--shot', '0-1', '--fps', '4'], { encoding: 'utf8' });
  assert(/shot 0-1s/.test(shotStdout), `expected the shot range echoed back: ${shotStdout}`);
  const shotDir = path.join(shotOut, 'shot-0-1');
  const shotMotion = JSON.parse(fs.readFileSync(path.join(shotDir, 'motion.json'), 'utf8'));
  assert(shotMotion.from === 0 && shotMotion.to === 1, `expected from/to 0/1, got ${JSON.stringify(shotMotion)}`);
  assert(Array.isArray(shotMotion.curve) && shotMotion.curve.length === 2,
    `expected two 0.5s windows over a 1s shot, got ${shotMotion.curve.length}`);
  assert(fs.existsSync(path.join(shotDir, 'grid-01.png')), 'shot mode must write at least one grid');
  assert(fs.existsSync(path.join(shotDir, 'index.md')), 'shot mode must write index.md');
  console.log(`✓ see-shot-compare.test.mjs: --shot wrote ${shotMotion.curve.length} window(s), grid-01.png, index.md`);

  // ── --compare, reference vs itself: every window must read equal, none "too still" ────────────────
  const selfOut = path.join(tmp, 'self-out');
  const selfStdout = execFileSync('node', [SCRIPT, clip, selfOut, '--compare', clip], { encoding: 'utf8' });
  const selfMotion = JSON.parse(fs.readFileSync(path.join(selfOut, 'compare', 'motion.json'), 'utf8'));
  assert(selfMotion.windows.length >= 3, `expected several 0.5s windows over a ${DUR}s clip, got ${selfMotion.windows.length}`);
  for (const w of selfMotion.windows) {
    assert(!w.tooStill, `a clip compared against itself must never read "too still": ${JSON.stringify(w)}`);
    assert(Math.abs(w.refMean - w.draftMean) < 1e-6, `self-compare must score identical energy per window: ${JSON.stringify(w)}`);
  }
  assert(/proceed to the next post-draft step/.test(selfStdout), `expected the all-clear next-step line: ${selfStdout}`);
  console.log(`✓ see-shot-compare.test.mjs: self-compare, all ${selfMotion.windows.length} window(s) equal, no "too still"`);

  // ── --compare, reference vs a frozen still: every window must read "too still" ─────────────────────
  const frozenOut = path.join(tmp, 'frozen-out');
  const frozenStdout = execFileSync('node', [SCRIPT, clip, frozenOut, '--compare', frozen], { encoding: 'utf8' });
  const frozenMotion = JSON.parse(fs.readFileSync(path.join(frozenOut, 'compare', 'motion.json'), 'utf8'));
  assert(frozenMotion.windows.length >= 3, `expected several windows, got ${frozenMotion.windows.length}`);
  for (const w of frozenMotion.windows)
    assert(w.tooStill, `a frozen draft against a moving reference must read "too still" in every window: ${JSON.stringify(w)}`);
  assert(frozenMotion.draftLongestStill.len >= DUR - 0.5,
    `a frozen draft's longest still span should cover nearly the whole clip, got ${frozenMotion.draftLongestStill.len}`);
  assert(/marked "too still"/.test(frozenStdout), `expected the too-still next-step line: ${frozenStdout}`);
  assert(fs.existsSync(path.join(frozenOut, 'compare', 'side-01.png')), 'compare mode must write at least one side-by-side grid');
  console.log(`✓ see-shot-compare.test.mjs: frozen draft, all ${frozenMotion.windows.length} window(s) "too still", `
    + `longest still ${frozenMotion.draftLongestStill.len.toFixed(2)}s`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('see-shot-compare.test.mjs: ok');
