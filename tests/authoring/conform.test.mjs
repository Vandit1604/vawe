// tests/authoring/conform.test.mjs: hermetic fixture for `node harness/dev/conform.mjs`.
// node tests/authoring/conform.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, '../fixtures/probe-frame.fixture.json');
const script = path.join(here, '../../harness/dev/conform.mjs');

// "back" and "front" are two full-frame rects at the SAME box for the whole 8s: they must fail an
// overlap claim, and either one must fail a sub-second max-hold claim (both sit dead still). "aside" is
// off in a corner (x:40,y:40,w:100,h:60), clear of both: an overlap claim against it must pass. A line
// this DSL cannot parse is kept as a JUDGE-ONLY leftover, never silently dropped.
const brief = [
  'overlap: back !x front',
  'overlap: aside-child !x front',
  'hold: max 0.5',
  'a stray brief line no pattern here matches',
].join('\n');

// exits non-zero because two of the claims below fail on purpose; the fixture is here to prove the
// tool measures, not to prove this fixture conforms.
let out;
try { out = execFileSync('node', [script, fixture, '--brief', brief], { encoding: 'utf8' }); }
catch (e) { out = e.stdout; }

assert.match(out, /\[FAIL\] overlap back !x front/, 'same-box rects must fail the overlap claim');
assert.match(out, /\[PASS\] overlap aside-child !x front/, 'a corner box clear of the frame must pass');
assert.match(out, /\[FAIL\] hold max 0\.5s/, 'an 8s static rect must fail a 0.5s hold ceiling');
assert.match(out, /JUDGE-ONLY/, 'an unparsed line must surface as a judge-only leftover, not vanish');
assert.match(out, /a stray brief line no pattern here matches/, 'the leftover line itself must be printed verbatim');

// The bug this closes: an authored motion track (`idle: drift`) is not proof of visible motion. Build a
// real render with a 2s span that only ever drifts 1px/frame (imperceptible) followed by 1s of a big,
// fast, unmistakably moving box, then check that `hold: max 1.0` still fails on the drifting span: the
// claim must read the RENDERED PIXELS, not whether some track was authored.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'conform-hold-'));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
const W = 320, H = 180, FPS = 30;

// scene JSON first: gradeable() refuses a render older than the scene it claims to be for.
const scenePath = path.join(tmp, 'hold-fixture.json');
fs.writeFileSync(scenePath, JSON.stringify({ module: 'scene', duration: 3, layers: [] }));

const drift = path.join(tmp, 'drift.mp4'); // 2s, a 3x3 box creeping 1px/frame: real motion, invisible per frame
ff(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:d=2:r=${FPS}`,
  '-f', 'lavfi', '-i', `color=c=white:s=3x3:d=2:r=${FPS}`,
  '-filter_complex', "[0][1]overlay=x='trunc(n)':y='(H-3)/2'",
  '-pix_fmt', 'yuv420p', drift]);

const moving = path.join(tmp, 'moving.mp4'); // 1s, a 60x60 box sweeping the full width: unmistakably moving
ff(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:d=1:r=${FPS}`,
  '-f', 'lavfi', '-i', `color=c=white:s=60x60:d=1:r=${FPS}`,
  '-filter_complex', `[0][1]overlay=x='(${W}-60)*t':y='(${H}-60)/2'`,
  '-pix_fmt', 'yuv420p', moving]);

const listFile = path.join(tmp, 'list.txt');
fs.writeFileSync(listFile, [drift, moving].map((p) => `file '${p}'`).join('\n'));
fs.mkdirSync(path.join(tmp, 'out'), { recursive: true });
const clip = path.join(tmp, 'out', 'hold-fixture.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', clip]);

let holdOut;
try { holdOut = execFileSync('node', [script, scenePath, '--brief', 'hold: max 1.0'], { encoding: 'utf8', cwd: tmp }); }
catch (e) { holdOut = e.stdout; }

assert.match(holdOut, /hold claims read motion from/, 'a fresh render must be used, not the DOM fallback');
assert.match(holdOut, /\[FAIL\] hold max 1s/, 'a 1px\\/frame drift held for 2s must still fail a 1.0s hold ceiling');
const m = /longest static run ([\d.]+)s/.exec(holdOut);
assert.ok(m, `expected a reported static run, got: ${holdOut}`);
const worstRun = Number(m[1]);
assert.ok(worstRun >= 1.7, `the drift span is ~2s of imperceptible motion; expected the reported hold to name most of it, got ${worstRun}s`);
console.log(`✓ conform.test.mjs: video-measured hold caught the ${worstRun}s drift span, not fooled by real (but invisible) per-frame motion`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('conform.test.mjs: ok');
