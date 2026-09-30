// tests/media/page-check-contrast.test.mjs: page-check flags pale text on white and stays quiet for black
// text on white plus a text run that is clipped away and never painted. Needs Chrome and ffmpeg.
//   node --test tests/media/page-check-contrast.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const check = (page) => spawnSync(process.execPath, ['quality/gates/page-check.mjs', `tests/fixtures/pages/invariants/${page}`, '--skip', 'audio,cuts'], { encoding: 'utf8' }).stdout;

test('pale text on white is flagged in every sample', () => {
  assert.match(check('contrast-low.html'), /text-low-contrast\] "Pale words" reads 1\.6:1 .* 9 of 9 sample/);
});

test('black text on white and clipped-away text raise no contrast finding', () => {
  assert.doesNotMatch(check('contrast-ok.html'), /text-low-contrast/);
});
