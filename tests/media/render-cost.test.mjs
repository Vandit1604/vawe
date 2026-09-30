// The --profile cost table: deterministic counts per film second, costliest second first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { costLines } from '../../harness/media/render-page.mjs';

test('the cost table counts subframes and screenshots per second and ranks the costliest', () => {
  const kArr = [1, 1, 16, 16];
  const lines = costLines({ kArr, reused: [0, 1, 0, 0], fps: 2, from: 0, prepassMs: 100, captureMs: 3300, encodeMs: 500 });
  assert.match(lines[0], /4 frames, 34 subframes, 33 screenshots \(1 reused\), max 16/);
  assert.match(lines[1], /capture 3\.3 s \(100 ms a screenshot\)/);
  assert.match(lines[3], /^ {2}1-2 +2 +32 +32 +3\.2$/);
  assert.match(lines[4], /^ {2}0-1 +2 +2 +1 +0\.1$/);
});
