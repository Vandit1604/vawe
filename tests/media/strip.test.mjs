import test from 'node:test';
import assert from 'node:assert/strict';
import { stripProblem, stripWindow, worldCuts, shotCuts, motionRead, motionLines, energyLines, filmNameOf } from '../../harness/media/see/strip-math.mjs';
import { captureEtaMs, firstCapture } from '../../harness/lib/ship-status.mjs';
import { compareProblem } from '../../harness/media/compare-frames.mjs';

const series = (from, values) => values.map((v, i) => ({ t: +(from + i * 0.1).toFixed(3), v }));
const FLOOR = 0.6;

test('stripWindow: centred on the moment, kept inside the film', () => {
  assert.deepEqual(stripWindow(8.4, 1, 20), { from: 7.9, to: 8.9 });
  assert.deepEqual(stripWindow(0.2, 1, 20), { from: 0, to: 1 });
  assert.deepEqual(stripWindow(19.9, 1, 20), { from: 19, to: 20 });
  assert.deepEqual(stripWindow(1, 4, 2), { from: 0, to: 2 });
});

test('stripProblem: names the flag at fault', () => {
  assert.equal(stripProblem({ at: '8.4', cuts: false, span: 1, fps: 8 }), null);
  assert.equal(stripProblem({ at: undefined, cuts: true, span: 1, fps: 8 }), null);
  assert.match(stripProblem({ cuts: false, span: 1, fps: 8 }), /--at/);
  assert.match(stripProblem({ at: '2', cuts: true, span: 1, fps: 8 }), /not both/);
  assert.match(stripProblem({ at: 'x', cuts: false, span: 1, fps: 8 }), /not a number/);
  assert.match(stripProblem({ at: '2', cuts: false, span: 0, fps: 8 }), /--span/);
  assert.match(stripProblem({ at: '2', cuts: false, span: 1, fps: 99 }), /--fps/);
});

test('worldCuts: the middle between a world ending and the next starting, never-shown worlds skipped', () => {
  const spans = [
    { id: 's2', start: 3.4, end: 6 },
    { id: 's1', start: 0, end: 3 },
    { id: 'ghost', start: null, end: null },
    { id: 's3', start: 5.8, end: 9 },
  ];
  assert.deepEqual(worldCuts(spans), [{ at: 3.2, from: 's1', to: 's2' }, { at: 5.9, from: 's2', to: 's3' }]);
  assert.deepEqual(worldCuts([{ id: 'only', start: 0, end: 5 }]), []);
});

test('shotCuts: one cut at the start of each shot after the first', () => {
  assert.deepEqual(shotCuts([{ start: 0 }, { start: 1.5 }, { start: 4 }]), [{ at: 1.5, from: 'shot 1', to: 'shot 2' }, { at: 4, from: 'shot 2', to: 'shot 3' }]);
  assert.deepEqual(shotCuts([{ start: 0 }]), []);
});

test('motionRead: a move that starts and settles inside the strip', () => {
  const r = motionRead(series(8, [0.1, 0.1, 4, 6, 3, 1.5, 0.7, 0.2, 0.1, 0.1]), 8, 9, FLOOR);
  assert.equal(r.moving, true);
  assert.equal(r.start, 8.2);
  assert.equal(r.peak, 6);
  assert.equal(r.peakAt, 8.3);
  assert.equal(r.settle, 8.7);
  assert.equal(r.settled, true);
  assert.equal(r.startedBefore, false);
  assert.equal(r.bursts.length, 1);
});

test('motionRead: already moving at the strip start, still moving at its end', () => {
  const r = motionRead(series(2, [5, 5, 4, 4, 3]), 2, 2.5, FLOOR);
  assert.equal(r.startedBefore, true);
  assert.equal(r.settled, false);
});

test('motionRead: a dip of under 0.2 s stays one burst, a longer dip makes two', () => {
  assert.equal(motionRead(series(0, [0, 5, 0.1, 5, 0, 0, 0, 0, 0, 0]), 0, 1, FLOOR).bursts.length, 1);
  const two = motionRead(series(0, [0, 5, 0.1, 0.1, 5, 0, 0, 0, 0, 0]), 0, 1, FLOOR);
  assert.equal(two.bursts.length, 2);
  assert.deepEqual(two.bursts, [{ t0: 0.1, t1: 0.2 }, { t0: 0.4, t1: 0.5 }]);
});

test('motionRead: nothing above the floor is no motion; no samples is null', () => {
  assert.deepEqual(motionRead(series(0, [0.1, 0.3, 0.2]), 0, 0.3, FLOOR), { moving: false, peak: 0.3 });
  assert.equal(motionRead([], 0, 1, FLOOR), null);
});

test('motionLines and energyLines print the numbers an agent acts on', () => {
  const energy = series(8, [0.1, 0.1, 4, 6, 3, 1.5, 0.7, 0.2, 0.1, 0.1]);
  const lines = motionLines(motionRead(energy, 8, 9, FLOOR), FLOOR);
  assert.equal(lines[0], 'motion: starts 8.20 s, peaks 6 at 8.30 s, settles 8.70 s; 1 burst');
  assert.match(motionLines({ moving: false, peak: 0.2 }, FLOOR)[0], /nothing moves/);
  assert.equal(energyLines(energy, 8, 8.3, { compact: true })[0], 'energy per 0.1 s from 8.0 s: 0.1 0.1 4.0');
  assert.equal(energyLines(energy, 8, 8.3).length, 4);
});

test('filmNameOf: draft and web suffixes name the same film', () => {
  assert.equal(filmNameOf('out/s11a-loomline.mp4'), 's11a-loomline');
  assert.equal(filmNameOf('/x/out/s11a-loomline-draft.mp4'), 's11a-loomline');
  assert.equal(filmNameOf('out/a.web.mp4'), 'a');
});

test('compareProblem accepts --at cuts', () => {
  assert.equal(compareProblem({ ours: 'out/a.mp4', at: 'cuts' }), null);
  assert.match(compareProblem({ ours: 'out/a.mp4', at: 'soon' }), /--at/);
});

test('captureEtaMs counts only time since the first capture line', () => {
  const first = { done: 10, total: 1000 };
  assert.equal(captureEtaMs({ first, firstAt: 0, done: 110, total: 1000, now: 10_000 }), 89_000);
  assert.equal(captureEtaMs({ first, firstAt: 0, done: 10, total: 1000, now: 1000 }), null);
});

test('captureEtaMs: a long set-up before the capture does not inflate the estimate', () => {
  const setupMs = 600_000;
  const first = { done: 0, total: 1000 };
  const eta = captureEtaMs({ first, firstAt: setupMs, done: 500, total: 1000, now: setupMs + 60_000 });
  assert.equal(eta, 60_000);
});

test('firstCapture reads the first progress line of a render log', () => {
  assert.deepEqual(firstCapture('checks ok\n\r  capturing 12/3400 subframe(s)...\r  capturing 30/3400 subframe(s)...'), { done: 12, total: 3400 });
  assert.equal(firstCapture('page load'), null);
});
