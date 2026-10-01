import test from 'node:test';
import assert from 'node:assert/strict';
import { specTimes, wordChecks, objectChecks, cutChecks, checkLines, APPEAR_TOL_S, LAYOUT_TOL_PCT } from '../../harness/lib/spec-conformance.mjs';

const frame = { frameW: 1000, frameH: 500 };
const word = { text: 'Ship it', appear: 1, settle: 1.5, cap: 8, x: 10, y: 40 };

test('specTimes: a 0.05 s grid, 0.25 s each side of each spec time, and the settle time', () => {
  const t = specTimes({ words: [word], objects: [{ in: 0.1, settle: 0.5, out: 2 }] });
  assert.deepEqual(t.text.slice(0, 3), [0.75, 0.8, 0.85]);
  assert.ok(t.text.includes(1.5) && t.text.includes(1.25));
  assert.equal(t.boxes[0], 0);
  assert.ok(t.boxes.includes(2.25));
});

const textSamples = (firstVisible, line) => specTimes({ words: [word] }).text.map((t) => ({ t, lines: t >= firstVisible ? [line] : [] }));

test('wordChecks: appear time, then cap height and position at settle', () => {
  // 1% of a 500 px frame is 5 px; fontPx 57.14 gives cap 0.7 * 57.14 / 500 = 8%
  const line = { text: 'Ship it', fontPx: 57.14, box: [100, 200, 300, 60] };
  const checks = wordChecks([word], textSamples(1.05, line), frame);
  assert.deepEqual(checks.map((c) => [c.label, +c.dev.toFixed(2)]), [['"Ship it" appears', 0.05], ['"Ship it" cap height at 1.5 s', 0], ['"Ship it" x at 1.5 s', 0], ['"Ship it" y at 1.5 s', 0]]);
  assert.deepEqual(checkLines(checks, APPEAR_TOL_S), []);
});

test('wordChecks: late text and a wrong size are named with spec and film values', () => {
  const line = { text: 'Ship it', fontPx: 35, box: [150, 200, 300, 60] };
  const checks = wordChecks([word], textSamples(1.2, line), frame);
  const lines = [...checkLines(checks.filter((c) => c.unit === 's'), APPEAR_TOL_S), ...checkLines(checks.filter((c) => c.unit === '%'), LAYOUT_TOL_PCT)];
  assert.deepEqual(lines, ['"Ship it" appears: spec 1.00 s, film 1.20 s', '"Ship it" cap height at 1.5 s: spec 8.0%, film 4.9%', '"Ship it" x at 1.5 s: spec 10.0%, film 15.0%']);
});

test('wordChecks: a word that never shows is not found, not silently fine', () => {
  const checks = wordChecks([word], textSamples(99, null), frame);
  assert.ok(checks.every((c) => c.dev === Infinity));
  assert.match(checkLines(checks, APPEAR_TOL_S)[0], /not found within the sampled window/);
});

function boxes(o, alphaFrom, restFrom) {
  const times = specTimes({ objects: [o] }).boxes;
  const track = times.map((t) => [t < restFrom ? 100 + (restFrom - t) * 200 : 100, 50, 80, 80, t >= alphaFrom ? 1 : 0, 1]);
  return { times, tracks: [track], matched: [0] };
}

test('objectChecks: in, settle and out are read from the box track', () => {
  const o = { id: 'mark', selector: '.mark', in: 0.3, settle: 0.9, out: 2 };
  const checks = objectChecks([o], boxes(o, 0.3, 0.9), frame);
  assert.deepEqual(checks.map((c) => [c.label, c.got]), [['mark in', 0.3], ['mark settle', 0.9], ['mark out', null]]);
  assert.equal(checks[0].dev, 0);
});

test('objectChecks: a missing selector is reported', () => {
  const checks = objectChecks([{ id: 'x', selector: '.x', in: 1 }], { times: [], tracks: [], matched: [-1] }, frame);
  assert.match(checkLines(checks, 0.05)[0], /x \(\.x\) found: not found/);
});

test('cutChecks: a hard jump near a shot start must land within one frame; soft changes are left alone', () => {
  const shots = [{ id: 'S1', start: 0 }, { id: 'S2', start: 2 }, { id: 'S3', start: 4 }];
  const checks = cutChecks(shots, [2.1], 30);
  assert.equal(checks.length, 1);
  assert.equal(Math.round(checks[0].dev), 3);
  assert.deepEqual(cutChecks(shots, [2.03], 30).map((c) => c.dev <= 1), [true]);
  assert.match(checkLines(checks, 1)[0], /S2 cut: spec 2.00 s, film 2.10 s \(3.0 frames off\)/);
});
