// tests/media/page-check-spectacle.test.mjs: a film with a declared spectacle at 3 s. Moving until the
// hit is flagged with motion in luma per frame (never a bare number next to seconds);
// holding still for 0.6 s first is not flagged. Needs Chrome and ffmpeg.
//   node --test tests/media/page-check-spectacle.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const check = (page) => spawnSync(process.execPath, ['quality/gates/page-check.mjs', `tests/fixtures/pages/spectacle/${page}`, '--skip', 'audio,cuts,live'], { encoding: 'utf8' }).stdout;

test('motion before the spectacle names its unit and the second it starts', () => {
  assert.match(check('moving.html'), /quiet-before-spectacle\] in the 0\.4s before the spectacle the picture changes [\d.]+ luma per frame \(the hit itself [\d.]+\)/);
});

test('a held frame before the spectacle raises no finding', () => {
  assert.doesNotMatch(check('quiet.html'), /quiet-before-spectacle\]/);
});
