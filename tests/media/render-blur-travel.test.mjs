// A fast move needs enough subframes that neighbours sit a few px apart, or it renders as ghost copies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { subframesForTravel, SHUTTER } from '../../harness/media/render-page.mjs';

test('a still or slow frame keeps one subframe', () => {
  assert.equal(subframesForTravel(0, 16), 1);
  assert.equal(subframesForTravel(5, 16), 1);
});

test('subframes grow in powers of two with travel', () => {
  assert.equal(subframesForTravel(12, 16), 2);
  assert.equal(subframesForTravel(40, 16), 8);
});

test('the step between subframes stays small until the cap', () => {
  for (const px of [10, 30, 90]) assert.ok((px * SHUTTER) / subframesForTravel(px, 16) <= 3);
  assert.equal(subframesForTravel(400, 16), 16);
  assert.equal(subframesForTravel(400, 3), 3);
});
