import test from 'node:test';
import assert from 'node:assert/strict';
import { settledMoments } from '../../harness/lib/key-frames.mjs';

// 10 fps motion for a 10 s film: a transition every 2 s (1.8 to 2.0 s), still elsewhere
const motion = Array.from({ length: 99 }, (_, i) => ({ t: (i + 1) / 10, d: ((i + 1) / 10) % 2 >= 1.8 ? 20 : 0.3 }));
const inFlight = (t) => t % 2 >= 1.7;

test('settled moments: the spec Words settle times when the brief has them', () => {
  const words = [{ settle: 3.4 }, { settle: 1.2 }, { settle: null }, { settle: 12 }];
  assert.deepEqual(settledMoments({ words, shots: [], motion, dur: 10 }), [1.2, 3.4]);
});

test('settled moments: with no settle times, the calmest frame of each shot, never one in flight', () => {
  const shots = [{ start: 0, end: 4 }, { start: 4, end: 7 }, { start: 7, end: 10 }];
  const times = settledMoments({ words: [], shots, motion, dur: 10 });
  assert.equal(times.length, 3);
  times.forEach((t, i) => {
    assert.ok(t >= shots[i].start && t <= shots[i].end);
    assert.ok(!inFlight(t), `${t} is mid-transition`);
  });
});

test('settled moments: with no shots either, the film is cut into equal slices', () => {
  const times = settledMoments({ words: [], shots: [], motion, dur: 10, count: 4 });
  assert.equal(times.length, 4);
  assert.ok(times.every((t) => !inFlight(t)));
});

test('settled moments: more settle times than frames are spread over the film, and close ones are dropped', () => {
  const words = Array.from({ length: 12 }, (_, i) => ({ settle: 0.5 + i * 0.7 }));
  const times = settledMoments({ words, shots: [], motion, dur: 10, count: 6 });
  assert.equal(times.length, 6);
  assert.equal(times[0], 0.5);
  assert.deepEqual(settledMoments({ words: [{ settle: 2 }, { settle: 2.2 }], shots: [], motion, dur: 10 }), [2]);
});
