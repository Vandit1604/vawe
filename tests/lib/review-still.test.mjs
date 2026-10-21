import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewStillSecond } from '../../harness/lib/worlds.mjs';

const spans = [{ id: 'a', start: 0, end: 2 }, { id: 'b', start: 2, end: 7 }, { id: 'c', start: null, end: null }];

test('the spectacle second wins', () => {
  assert.equal(reviewStillSecond(spans, 1.5), 1.5);
});

test('without a spectacle it is the middle of the longest world', () => {
  assert.equal(reviewStillSecond(spans, null), 4.5);
});

test('with no world shown it is null', () => {
  assert.equal(reviewStillSecond([], null), null);
  assert.equal(reviewStillSecond(null, null), null);
});
