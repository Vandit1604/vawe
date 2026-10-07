import test from 'node:test';
import assert from 'node:assert/strict';
import { markOf, rangeLines, worldShots } from '../../harness/lib/draft-range.mjs';
import { shotSpans } from '../../harness/lib/ref-measure/transition.mjs';
import { rangeOf } from '../../harness/dev/bar-from-refs.mjs';

const q = (p10, median, p90) => ({ p10, median, p90, n: 5 });
const range = {
  films: 5, cuts: 40,
  metrics: {
    eye_jump_median_fh: q(0.1, 0.2, 0.4), eye_carried_pct: q(10, 40, 50), eye_moved_pct: q(10, 30, 50), eye_centre_pct: q(5, 40, 60),
    eye_travel_median_fh: q(0.1, 0.2, 0.4), ground_changed_pct: q(0, 50, 100), ground_turn_pct: q(0, 25, 100), ground_drift_pct: q(0, 30, 90), overshoot_pct: q(21, 30, 41),
  },
};

test('a value under p10 or over p90 is marked, a value on the edge is not', () => {
  assert.equal(markOf(0.05, { p10: 0.1, p90: 0.4 }), '<');
  assert.equal(markOf(0.5, { p10: 0.1, p90: 0.4 }), '>');
  assert.equal(markOf(0.1, { p10: 0.1, p90: 0.4 }), '');
  assert.equal(markOf(null, { p10: 0.1, p90: 0.4 }), '');
});

test('the block is a header, a column line and one line per measure, with the outside values marked', () => {
  const lines = rangeLines({ eye_jump_median_fh: 0.7, eye_carried_pct: 30, overshoot_pct: 0 }, range);
  assert.equal(lines.length, 11);
  assert.match(lines[0], /5 reference films, 40 cuts.*approximate/);
  assert.match(lines[1], /measure +your draft +reference p10\.\.p90 \(median\)/);
  assert.match(lines[2], /^~ eye jump at a cut \(H\) +0\.7 +0\.1\.\.0\.4 \(0\.2\) +>$/);
  assert.match(lines[3], /30 +10\.\.50 \(40\)$/);
  assert.match(lines[4], /n\/a/);
  assert.match(lines[10], /^ {2}arrivals that overshoot % +0 +21\.\.41 \(30\) +<$/);
});

test('the world spans become frame spans in start order, clamped to the video, never-visible worlds dropped', () => {
  const worlds = [{ id: 'b', start: 2, end: 9 }, { id: 'a', start: 0, end: 2 }, { id: 'x', start: null, end: null }];
  assert.deepEqual(worldShots(worlds, 10, 50), [{ f0: 0, f1: 20 }, { f0: 20, f1: 50 }]);
  assert.deepEqual(worldShots(null, 10, 50), []);
});

test('a world that opens before the last one closes (a cut a frame early) takes the shot from it, so the cut compares the two worlds', () => {
  const worlds = [{ id: 'a', start: 0, end: 2.2 }, { id: 'b', start: 2.17, end: 4.8 }, { id: 'c', start: 4.77, end: 6 }];
  assert.deepEqual(worldShots(worlds, 30, 180), [{ f0: 0, f1: 65 }, { f0: 65, f1: 143 }, { f0: 143, f1: 180 }]);
  assert.deepEqual(worldShots([{ id: 'a', start: 0, end: 3 }, { id: 'b', start: 0, end: 6 }], 10, 60), [{ f0: 0, f1: 30 }, { f0: 0, f1: 60 }]);
});

test('detected transitions split the film into shots that leave out the transition frames', () => {
  assert.deepEqual(shotSpans([{ startFrame: 10, endFrame: 12 }, { startFrame: 20, endFrame: 20 }], 30), [{ f0: 0, f1: 10 }, { f0: 12, f1: 20 }, { f0: 20, f1: 30 }]);
  assert.deepEqual(shotSpans([], 30), [{ f0: 0, f1: 30 }]);
});

test('the committed range holds aggregates only', () => {
  const shape = { films: 3, cuts: 9, eye_jump_median_fh: q(1, 2, 3), eye_carried_pct: q(1, 2, 3), eye_moved_pct: q(1, 2, 3), eye_centre_pct: q(1, 2, 3), eye_travel_median_fh: q(1, 2, 3), ground_changed_pct: q(1, 2, 3), ground_turn_pct: q(1, 2, 3), ground_drift_pct: q(1, 2, 3) };
  const out = rangeOf(shape, { overshoot_pct: q(21, 30, 41) }, '2026-10-07');
  assert.deepEqual(Object.keys(out), ['_source', 'films', 'cuts', 'metrics']);
  assert.equal(Object.keys(out.metrics).length, 9);
  assert.match(out._source, /3 in-scope reference films \(9 cuts/);
  for (const m of Object.values(out.metrics)) assert.deepEqual(Object.keys(m), ['p10', 'median', 'p90', 'n']);
});
