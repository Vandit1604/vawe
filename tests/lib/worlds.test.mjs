import test from 'node:test';
import assert from 'node:assert/strict';
import { waiverHint } from '../../harness/lib/waivers.mjs';
import { worldIds, worldSpans, stillTime, heldWorlds, TURN_SECONDS_MAX } from '../../harness/lib/worlds.mjs';

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
  const { starterPage } = await import('../../harness/cli/new.mjs');
  const { starterBeats } = await import('../../harness/lib/worlds.mjs');
  const worldCount = (l) => starterBeats(l).length;
  assert.equal(worldCount(4), 2);
  assert.equal(worldCount(12), 6);
  assert.equal(worldCount(1), 2);
  const ids = [...starterPage({ length: 12 }).matchAll(/data-world="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['s1', 's2', 's3', 's4', 's5', 's6']);
  assert.match(starterPage({ length: 12 }), /--beat-5: 8s/);
});

test('no starter world is longer than the world-turns limit, for any length', async () => {
  const { starterBeats } = await import('../../harness/lib/worlds.mjs');
  for (const length of [3, 5, 6, 7.3, 12, 12.4, 20, 30, 61]) {
    for (const b of starterBeats(length)) assert.ok(b.end - b.start <= TURN_SECONDS_MAX + 1e-9, `${length} s: ${b.id} is ${b.end - b.start} s`);
  }
});

const span = (id, start, end) => ({ id, start, end, ground: '#fff' });

test('a world visible longer than the limit is held, and its line names the world', () => {
  const found = heldWorlds([span('s1', 0, 2), span('s2', 2, 5.5), span('s3', 5.5, 7.5)]);
  assert.deepEqual(found, [{ len: 3.5, text: `world held s2 2-5.5 s (3.5 s); ${waiverHint('dead-air@2-5.5')}` }]);
});

test('a world of exactly the limit, measured a few frames long on the frame grid, is not held', () => {
  assert.deepEqual(heldWorlds([span('s2', 1.967, 4.033)]), []);
  assert.equal(heldWorlds([span('s2', 1.9, 4.1)]).length, 1);
});

test('adjacent worlds with the same ground are two turns, not one held world', () => {
  const same = [span('a', 0, 2), span('b', 2, 4), span('c', 4, 6)];
  assert.deepEqual(heldWorlds(same), []);
});

test('a world never shown is not held, and a declared hold covers its world', () => {
  assert.deepEqual(heldWorlds([{ id: 'x', start: null, end: null, ground: null }]), []);
  const authoring = { allow: ['dead-air@2-5.5'], _why: { 'dead-air@2-5.5': 'the held wordmark is the last beat' } };
  assert.deepEqual(heldWorlds([span('s2', 2, 5.5)], TURN_SECONDS_MAX, authoring), []);
});
