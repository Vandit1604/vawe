// tests/media/blank-shot.test.mjs: when a screenshot is taken again (pure, no browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BLANK_RETRIES, isBlankShot, shouldRetake } from '../../harness/lib/blank-shot.mjs';

test('a capture that collapses to a few KB after a real picture is blank', () => {
  assert.equal(isBlankShot(2500, 60000), true);
  assert.equal(isBlankShot(2500, 14000), false);
});

test('a lighter picture, a quiet start and a first frame are not blank', () => {
  assert.equal(isBlankShot(30000, 60000), false);
  assert.equal(isBlankShot(2500, 4000), false);
  assert.equal(isBlankShot(2500, undefined), false);
});

test('the first frame of a slice is taken once more, a later frame only while it is blank, and never more than BLANK_RETRIES times', () => {
  assert.equal(shouldRetake(90000, undefined, 0), true);
  assert.equal(shouldRetake(90000, undefined, 1), false);
  assert.equal(shouldRetake(90000, 60000, 0), false);
  assert.equal(shouldRetake(2500, 60000, 0), true);
  assert.equal(shouldRetake(2500, 60000, BLANK_RETRIES - 1), true);
  assert.equal(shouldRetake(2500, 60000, BLANK_RETRIES), false);
});
