import test from 'node:test';
import assert from 'node:assert/strict';
import { tailTimes, tailMoving } from '../../harness/lib/tail-motion.mjs';

test('the tail is sampled inside its last second, the last sample before the end', () => {
  assert.deepEqual(tailTimes(12), [11.1, 11.5, 11.9]);
  assert.deepEqual(tailTimes(0.5), [0, 0, 0.4]);
});

test('the tail moves when an animation runs on a visible element at every sample', () => {
  assert.equal(tailMoving([2, 1, 1]), true);
  assert.equal(tailMoving([2, 0, 1]), false);
});

test('a page that was not sampled, or has no animation, is not called moving', () => {
  assert.equal(tailMoving(null), false);
  assert.equal(tailMoving([]), false);
  assert.equal(tailMoving([0, 0, 0]), false);
});
