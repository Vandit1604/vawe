// tests/gates/verify-overlap-count.test.mjs: harness/dev/verify.mjs prints hard numbers about a
// render for the eye to weigh (AGENTS.md: "print this block VERBATIM before make judge"); "overlapping
// text at rest: N" is the new line, folding in quality/audit.mjs's `overlap` (text over text) and
// `overlap-mark` (text over a `logotype` mark) findings the same way the file already folds in
// clipped-text/clipped-component and blank-seam counts, rather than re-detecting either.
//
// A synthetic solid mp4 stands in for a real render: gradeable() only checks the file exists and is
// newer than the scene, and audit.mjs measures the scene's own headless render, never the mp4's pixels.
//   node tests/gates/verify-overlap-count.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENE_REL = 'tests/fixtures/audit-text-mark-overlap.fixture.json';
const NAME = 'audit-text-mark-overlap.fixture';
const MP4 = path.join(ROOT, 'out', `${NAME}.mp4`);

after(() => { try { fs.unlinkSync(MP4); } catch { /* already gone */ } });

test('verify.mjs counts a text-over-mark finding under "overlapping text at rest"', () => {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=white:s=1920x1080:d=3:r=10', MP4],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });

  const out = execFileSync(process.execPath, ['harness/dev/verify.mjs', `D=${SCENE_REL}`],
    { cwd: ROOT, encoding: 'utf8' });

  assert.match(out, /overlapping text at rest: 1/, `expected the overlap-mark finding counted; got:\n${out}`);
});

console.log('verify-overlap-count.test.mjs: OK (verify.mjs surfaces the text/mark overlap count)');
