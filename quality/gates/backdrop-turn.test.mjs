// quality/gates/backdrop-turn.test.mjs
//   node --test quality/gates/backdrop-turn.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { turns } from './backdrop-turn.mjs';

test('no bg[] at all: ungraded, not a false pass', () => {
  assert.equal(turns({}), null);
});

test('one window: never turns', () => {
  assert.equal(turns({ bg: [{ preset: 'plain', from: 0, to: 10 }] }), false);
});

test('two windows, identical preset and options: still never turns', () => {
  assert.equal(turns({ bg: [{ preset: 'plain', tint: '#111', from: 0, to: 5 }, { preset: 'plain', tint: '#111', from: 5, to: 10 }] }), false);
});

test('two windows, different preset: turns', () => {
  assert.equal(turns({ bg: [{ preset: 'plain', from: 0, to: 5 }, { preset: 'grid', from: 5, to: 10 }] }), true);
});

test('two windows, same preset different option: turns (the tone itself differs, not just the clock)', () => {
  assert.equal(turns({ bg: [{ preset: 'plain', tint: '#111', from: 0, to: 5 }, { preset: 'plain', tint: '#eee', from: 5, to: 10 }] }), true);
});

test('a single bg object (not an array) is treated as one window: never turns', () => {
  assert.equal(turns({ bg: { preset: 'plain', from: 0, to: 10 } }), false);
});
