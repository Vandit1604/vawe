import test from 'node:test';
import assert from 'node:assert/strict';
import { tailTimes, tailMoving } from '../../harness/lib/tail-motion.mjs';

test('the tail is sampled inside its last second, the last sample before the end', () => {
  assert.deepEqual(tailTimes(12), [11.1, 11.5, 11.9]);
  assert.deepEqual(tailTimes(0.5), [0, 0, 0.4]);
});

const part = { id: 'caret', props: ['opacity'], duration: 1, fullFrame: false, decorative: false };
const camera = { id: 'camera', props: ['transform'], duration: 3, fullFrame: true, decorative: false };
const stage = { id: 'push', props: ['scale'], duration: 4, fullFrame: true, decorative: false };
const ground = { id: 'drift', props: ['translate'], duration: 6, fullFrame: false, decorative: true };

test('the tail moves when an animation runs on a visible part at every sample', () => {
  assert.equal(tailMoving([[part, camera], [part], [part]]), true);
  assert.equal(tailMoving([[part], [], [part]]), false);
});

test('a camera push, a whole-frame element or a decorative ground drift is not a part moving', () => {
  assert.equal(tailMoving([[camera], [camera], [camera]]), false);
  assert.equal(tailMoving([[stage], [stage], [stage]]), false);
  assert.equal(tailMoving([[ground], [ground], [ground]]), false);
  assert.equal(tailMoving([[camera, stage, ground], [camera, part], [part]]), false);
});

test('a page that was not sampled, or has no animation, is not called moving', () => {
  assert.equal(tailMoving(null), false);
  assert.equal(tailMoving([]), false);
  assert.equal(tailMoving([[], [], []]), false);
  assert.equal(tailMoving([2, 1, 1]), false);
});
