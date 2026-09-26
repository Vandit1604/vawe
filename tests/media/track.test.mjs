// tests/media/track.test.mjs: house-rule self-check, no framework.
//   node tests/media/track.test.mjs
//
// Proves harness/media/track.mjs on a synthetic clip (generated here, not a committed binary): a white
// box stepping right across a black frame must come back as keyframes whose x strictly increases, at
// full opacity and constant scale, with a linear ease (constant per-step speed).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/track.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'track-test-'));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

// Five 0.4s segments, a 20x20 white box stepping 20px right each time: constant speed by construction.
const STEPS = [0, 20, 40, 60, 80];
const segs = STEPS.map((x, i) => {
  const p = path.join(tmp, `seg${i}.mp4`);
  ff(['-f', 'lavfi', '-i', `color=c=black:s=120x60:d=0.4:r=10,drawbox=x=${x}:y=20:w=20:h=20:color=white:t=fill`,
    '-pix_fmt', 'yuv420p', p]);
  return p;
});
const listFile = path.join(tmp, 'list.txt');
fs.writeFileSync(listFile, segs.map((p) => `file '${p}'\n`).join(''));
const clip = path.join(tmp, 'track.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', clip]);

try {
  const stdout = execFileSync('node', [SCRIPT, clip, '--box', '0,0,120,60', '--from', '0', '--to', '2', '--fps', '5'],
    { cwd: ROOT, encoding: 'utf8' });
  const result = JSON.parse(stdout);

  assert(Array.isArray(result.keyframes) && result.keyframes.length >= 5, `expected several keyframes, got ${JSON.stringify(result)}`);
  const seen = result.keyframes.filter((k) => k.x != null);
  assert(seen.length === result.keyframes.length, `every sampled frame should see the box: ${JSON.stringify(result.keyframes)}`);

  for (let i = 1; i < seen.length; i++)
    assert(seen[i].x >= seen[i - 1].x, `x must never go backwards on a right-only move: ${seen[i - 1].x} -> ${seen[i].x}`);
  assert(seen[seen.length - 1].x > seen[0].x + 40, `the box must have moved a real distance: ${seen[0].x} -> ${seen[seen.length - 1].x}`);

  for (const k of seen) {
    assert(Math.abs(k.scale - 1) < 0.05, `a box of constant size must keep scale near 1, got ${k.scale}`);
    assert(k.opacity > 0.9, `a fully-covered box must read as near-full opacity, got ${k.opacity}`);
  }
  assert(result.ease === 'linear', `a constant-speed step must be read as linear, got ${result.ease}`);

  console.log(`✓ track.test.mjs: x rises monotonically ${seen[0].x} -> ${seen[seen.length - 1].x}, ease ${result.ease}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('track.test.mjs: ok');
