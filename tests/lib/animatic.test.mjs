import test from 'node:test';
import assert from 'node:assert/strict';
import { animaticHolds } from '../../harness/lib/animatic.mjs';

const shots = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('each world holds for its cut span and the frames tile the timeline', () => {
  const holds = animaticHolds(shots, [[0, 1.26], [1.26, 3.14], [3.14, 5]], 10);
  assert.deepEqual(holds.map((h) => h.frames), [13, 18, 19]);
  assert.equal(holds.reduce((n, h) => n + h.frames, 0), 50);
  assert.deepEqual(holds.map((h) => +h.hold.toFixed(2)), [1.26, 1.88, 1.86]);
});

test('spans under one frame get none, so later cuts stay on time', () => {
  const holds = animaticHolds(shots, [[0, 0.02], [0.02, 0.04], [0.04, 2]], 10);
  assert.deepEqual(holds.map((h) => h.frames), [0, 0, 20]);
});

test('a world with no span gets none', () => {
  const holds = animaticHolds(shots, [[0, 1], [1, 2], [NaN, NaN]], 10);
  assert.deepEqual(holds.map((h) => h.frames), [10, 10, 0]);
});
