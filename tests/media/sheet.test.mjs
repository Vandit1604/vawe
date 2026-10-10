import test from 'node:test';
import assert from 'node:assert/strict';
import { tileLabel, evenSeconds, storyboardSeconds } from '../../harness/media/sheet.mjs';

test('a tile label carries the second, then the world when it has one', () => {
  assert.equal(tileLabel(1.2, null), '1.2s');
  assert.equal(tileLabel(1.2, 'hot'), '1.2s hot');
});

test('the default seconds are the middle of each world, else evenly spread', () => {
  assert.deepEqual(storyboardSeconds([{ id: 'a', start: 0, end: 1 }, { id: 'b', start: 1, end: 3 }], 3), [0.5, 2]);
  assert.deepEqual(storyboardSeconds([], 4), evenSeconds(4));
  assert.equal(evenSeconds(12).length, 12);
});
