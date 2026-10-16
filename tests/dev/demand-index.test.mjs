import test from 'node:test';
import assert from 'node:assert/strict';
import { logScore, positionIn, autocompleteScore, countsScore, weighted, scorePhrase } from '../../scripts/discovery/demand-index.mjs';

test('logScore is 0 at 0 and 100 at the cap, and clamps above it', () => {
  assert.equal(logScore(0, 4), 0);
  assert.equal(Math.round(logScore(9999, 4)), 100);
  assert.equal(logScore(1e9, 4), 100);
  assert.equal(logScore(null, 4), null);
});

test('positionIn matches the phrase case-insensitively and is 1-based', () => {
  assert.equal(positionIn(['a b', 'Html To Mp4'], 'html to mp4'), 2);
  assert.equal(positionIn(['a b'], 'x'), null);
});

test('autocomplete: first position everywhere is 100, nothing is 0', () => {
  assert.equal(autocompleteScore({ exact: 1, prefixes: { 1: 1 }, tail: 10 }), 100);
  assert.equal(autocompleteScore({ exact: null, prefixes: { 2: null }, tail: 0 }), 0);
});

test('autocomplete: a 2-word prefix hit at position 3 counts 0.85 x 80', () => {
  const s = autocompleteScore({ exact: null, prefixes: { 2: 3 }, tail: 0 });
  assert.ok(Math.abs(s - 0.3 * 80 * 0.85) < 1e-9);
});

test('countsScore averages the all-time and 12-month scores and survives a missing one', () => {
  assert.equal(Math.round(countsScore({ total: 9999, recent: 999 })), 100);
  assert.equal(Math.round(countsScore({ total: 9999, recent: null })), 100);
  assert.equal(countsScore(null), null);
});

test('weighted rescales over the parts that exist', () => {
  assert.equal(weighted({ a: 100, b: null }, { a: 0.4, b: 0.6 }), 100);
  assert.equal(weighted({ a: null, b: null }, { a: 1, b: 1 }), null);
});

test('scorePhrase: index is 0.6 people + 0.4 agent', () => {
  const raw = {
    google: { exact: 1, prefixes: {}, tail: 0 },
    youtube: null, stackoverflow: null, hackernews: null,
    skills: { installs: [0] }, github: { total: 99999 }, context7: null,
  };
  const s = scorePhrase(raw);
  assert.equal(s.people, 50);
  assert.ok(Math.abs(s.agent - 50) < 1);
  assert.ok(Math.abs(s.index - (0.6 * s.people + 0.4 * s.agent)) < 1e-9);
});

test('scorePhrase with every source missing has a null index', () => {
  assert.equal(scorePhrase({}).index, null);
});
