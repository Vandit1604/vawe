// tests/lib/text-timing-ref-holds.test.mjs: a short reading hold that the reference has too is not a finding.
//   node --test tests/lib/text-timing-ref-holds.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdsBeyondRef } from '../../harness/lib/text-timing.mjs';

const row = (readable, hold) => ({ readable, hold, leave: readable + hold, text: 'x', words: 3, need: 1.8 });
const refRuns = [{ t0: 2, t1: 2.9 }];

test('a hold within 0.1 s of the reference hold is dropped', () => {
  assert.equal(holdsBeyondRef([row(2.1, 1.05)], refRuns, 0.1).length, 0);
});

test('a hold shorter than the reference hold by more than 0.1 s stays', () => {
  assert.equal(holdsBeyondRef([row(2.1, 0.6)], refRuns, 0.1).length, 1);
});

test('a hold with no reference line near its start stays', () => {
  assert.equal(holdsBeyondRef([row(6, 1.0)], refRuns, 0.1).length, 1);
});
