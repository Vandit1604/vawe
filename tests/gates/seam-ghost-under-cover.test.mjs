// tests/gates/seam-ghost-under-cover.test.mjs: a film agent's friction log caught an exiting layer's
// fade overlapping a full-frame end card's fade-in, leaving the wordmark ghosted under the card for
// several frames, with `make check`/verify.mjs reporting zero problems. quality/gates/seams.mjs's ghost
// check used to end the question the moment ANYTHING arrived over the outgoing layer's box
// (`arrivingOver`), which is right for ordinary content but wrong for a FULL-FRAME arrival: an end card
// or the frame a cut lands on can itself still be fading in, so what bleeds through under it is never
// measured. The gate now still measures a full-frame cover, and reports what it finds as ADVICE
// (`seam-ghost-under-cover`, a warn, never a fail) naming the ghosted layer's id and the times involved,
// since a legitimately opaque hard cut is common and this is coaching, not a defect.
//
// The mp4 here is SYNTHETIC (ffmpeg xfade of a red box on black into solid white), never a real render:
// deterministic pixels this diff-based check can measure exactly, standing in for a real film's own
// wordmark-into-end-card cut. `out/<name>.mp4` is where quality/gates/seams.mjs looks for a scene's
// render (quality/gates/tile.mjs renderOf), so this writes there and removes it again in `after()`.
//   node tests/gates/seam-ghost-under-cover.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENE_REL = 'tests/fixtures/seam-ghost-under-cover.fixture.json';
const NAME = 'seam-ghost-under-cover.fixture';
const MP4 = path.join(ROOT, 'out', `${NAME}.mp4`);

after(() => { try { fs.unlinkSync(MP4); } catch { /* already gone */ } });

test('a full-frame end card fading in over an exit is measured and advised, not silently skipped', () => {
  execFileSync('ffmpeg', ['-y', '-v', 'error',
    '-f', 'lavfi', '-i', 'color=black:s=1920x1080:d=3:r=10,drawbox=x=200:y=400:w=400:h=200:color=red:t=fill',
    '-f', 'lavfi', '-i', 'color=white:s=1920x1080:d=3:r=10',
    '-filter_complex', '[0:v][1:v]xfade=transition=fade:duration=1.0:offset=1.0,format=yuv420p',
    MP4], { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });

  let out;
  try { out = execFileSync(process.execPath, ['quality/gates/seams.mjs', SCENE_REL], { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { out = e.stdout + e.stderr; } // waived/advisory findings still exit 0; a real defect would exit 1

  assert.match(out, /\[seam-ghost-under-cover\]/, `expected a seam-ghost-under-cover advisory; got:\n${out}`);
  assert.match(out, /"rect#0" \(id "wordmark"\)/, 'the finding must name the ghosted layer\'s id');
  assert.match(out, /full-frame "rect#1" \(id "endcard"\)/, 'the finding must name the covering end card');
  assert.match(out, /past 1s/, 'the finding must name when, relative to the boundary');
  assert.doesNotMatch(out, /\[seam-ghost\]/, 'this is advice, not the hard seam-ghost failure');
  assert.doesNotMatch(out, /✗ \d+ defect/, 'an advisory finding must not fail the gate');
});

console.log('seam-ghost-under-cover.test.mjs: OK (a full-frame cover\'s own fade-in is measured, not trusted blind)');
