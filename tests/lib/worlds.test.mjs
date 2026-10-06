import test from 'node:test';
import assert from 'node:assert/strict';
import { worldIds, worldSpans, stillTime } from '../../harness/lib/worlds.mjs';

const at = (t, ...shown) => ({ t, worlds: [['a', '#111111'], ['b', '#eeeeee'], ['c', null]].map(([id, ground]) => ({ id, visible: shown.includes(id), ground })) });
const samples = [at(0.5, 'a'), at(1.5, 'a'), at(2.5, 'a', 'b'), at(3.5, 'b'), at(4.5, 'b')];

test('worldIds keeps page order', () => {
  assert.deepEqual(worldIds(samples), ['a', 'b', 'c']);
});

test('a span runs from the first to the last visible sample, widened by half a step', () => {
  const spans = worldSpans(samples, { step: 1, dur: 5 });
  assert.deepEqual(spans[0], { id: 'a', start: 0, end: 3, ground: '#111111' });
  assert.deepEqual(spans[1], { id: 'b', start: 2, end: 5, ground: '#eeeeee' });
});

test('a span stays inside the film and a world never shown has null times', () => {
  const spans = worldSpans([at(0.2, 'b'), at(0.7, 'b')], { step: 1, dur: 0.9 });
  assert.deepEqual(spans[1], { id: 'b', start: 0, end: 0.9, ground: '#eeeeee' });
  assert.deepEqual(spans[2], { id: 'c', start: null, end: null, ground: null });
});

test('stillTime is the middle of the span, and 0 for a world never shown', () => {
  assert.equal(stillTime({ start: 2, end: 5 }), 3.5);
  assert.equal(stillTime({ start: null, end: null }), 0);
  assert.equal(stillTime(undefined), 0);
});

test('the starter has one data-world element per beat, with ids s1, s2, ...', async () => {
  const { starterPage, worldCount } = await import('../../harness/cli/new.mjs');
  assert.equal(worldCount(4), 2);
  assert.equal(worldCount(12), 5);
  assert.equal(worldCount(1), 2);
  const ids = [...starterPage({ length: 12 }).matchAll(/data-world="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['s1', 's2', 's3', 's4', 's5']);
  assert.match(starterPage({ length: 12 }), /--beat-5: 9\.6s/);
});
