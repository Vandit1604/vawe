import test from 'node:test';
import assert from 'node:assert/strict';
import { spring, approach, springLinear, springDuration, track, SPRINGS } from '../../core/motion/springs.js';

test('every preset spring starts at 0 and settles to 1', () => {
  for (const { k, d } of Object.values(SPRINGS)) {
    assert.equal(spring(0, k, d), 0);
    assert.ok(Math.abs(spring(5, k, d) - 1) < 1e-6);
  }
});

test('spring matches a numeric integration of the same oscillator', () => {
  for (const [k, d] of [[170, 26], [220, 12], [90, 22]]) {
    let x = 0, v = 0;
    const dt = 1e-5;
    for (let i = 0; i < 30000; i++) { v += (k * (1 - x) - d * v) * dt; x += v * dt; }
    assert.ok(Math.abs(x - spring(0.3, k, d)) < 2e-3, `${k},${d}`);
  }
});

test('approach equals the per-frame recurrence', () => {
  let x = 10;
  for (let f = 1; f <= 20; f++) { x += (50 - x) * 0.15; assert.ok(Math.abs(x - approach(f, 10, 50, 0.15)) < 1e-9); }
});

test('springLinear is a linear() from 0 to 1', () => {
  const s = springLinear();
  const m = /^linear\((.+)\)$/.exec(s);
  const v = m[1].split(', ').map(Number);
  assert.equal(v[0], 0);
  assert.equal(v.at(-1), 1);
  assert.ok(v.every(Number.isFinite));
  assert.ok(springDuration() > 0.2 && springDuration() < 3);
});

test('track is continuous when a target changes', () => {
  const keys = [[0, 0], [1, 100]];
  assert.ok(Math.abs(track(1 - 1e-9, keys) - track(1 + 1e-9, keys)) < 1e-6);
});
