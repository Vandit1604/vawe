// core/layers/content-start.test.mjs: fast pure-JS asserts for `contentStart`, the group child's
// CONTENT clock (core/layers/util.js childContentStart, read by video.js sourceTime, text.js
// typing/expose, count.js frame). No DOM needed: every function under test is pure.
//
//   node --test core/layers/content-start.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { childContentStart } from '../../core/layers/util.js';
import { sourceTime } from '../../core/layers/video.js';

test('absent contentStart: identical to the child\'s own delay (visibility start)', () => {
  const rootL = { start: 2, duration: 5 };
  assert.equal(childContentStart({}, rootL, 1), 3); // rootL.start + delay
});

test('explicit contentStart earlier than delay: pre-roll while hidden', () => {
  const rootL = { start: 2, duration: 5 };
  // delay: 1 (visible at t=3), contentStart: 0 (content clock starts at t=2, 1s of pre-roll)
  assert.equal(childContentStart({ contentStart: 0 }, rootL, 1), 2);
});

test('negative contentStart: named error', () => {
  assert.throws(() => childContentStart({ contentStart: -1 }, { start: 0, duration: 5 }, 0),
    /contentStart.*non-negative/);
});

test('non-numeric contentStart: named error', () => {
  assert.throws(() => childContentStart({ contentStart: 'soon' }, { start: 0, duration: 5 }, 0),
    /contentStart.*non-negative/);
});

test('contentStart past the group\'s end: clamped, not thrown', () => {
  const rootL = { start: 2, duration: 5 };
  assert.equal(childContentStart({ contentStart: 99 }, rootL, 0), 7); // rootL.start + duration
});

test('video sourceTime: contentStart 1s before a delay:1 child shows source time 1.0 on its first visible frame', () => {
  // A child visible from t=1 (delay:1 off a group starting at 0); contentStart:0 means its content
  // clock started a full second earlier, so by the moment it is seen the clip already reads 1.0s in.
  const L = { start: 1, contentStart: 0, in: 0, rate: 1 };
  assert.equal(sourceTime(L, 1), 1);
});

test('video sourceTime: absent contentStart is byte-identical to today', () => {
  const L = { start: 1, in: 0, rate: 1 };
  assert.equal(sourceTime(L, 1), 0);
});
