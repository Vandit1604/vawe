// quality/gates/speed.test.mjs: findVelocitySpikes is `make speed`'s velocity-spike finding, a
// REPORT with no auto-fix. Pure-JS: an `evalSpeed(t, dt)` stand-in is enough, no scene needed.
//   node quality/gates/speed.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findVelocitySpikes, VELOCITY_SPIKE_PX_S } from './speed.mjs';

test('flags a step past the threshold', () => {
  // a speed function that jumps from 100 to 900 px/s right at t=0.5 (a hard kink)
  const evalSpeed = (t) => (t < 0.5 ? 100 : 900);
  const spikes = findVelocitySpikes(evalSpeed, 0, 1, 30, VELOCITY_SPIKE_PX_S, []);
  assert.ok(spikes.length >= 1, 'a jump past the threshold is flagged');
});

test('a smooth ramp under the threshold is silent', () => {
  const evalSpeed = (t) => 100 + t * 50; // 50 px/s^2, well under the per-frame threshold at 30fps
  const spikes = findVelocitySpikes(evalSpeed, 0, 1, 30, VELOCITY_SPIKE_PX_S, []);
  assert.equal(spikes.length, 0, 'a gentle ramp reports no spikes');
});

test('a declared cut at the jump is excluded, not flagged', () => {
  const evalSpeed = (t) => (t < 0.5 ? 100 : 900);
  const spikes = findVelocitySpikes(evalSpeed, 0, 1, 30, VELOCITY_SPIKE_PX_S, [0.5]);
  assert.equal(spikes.length, 0, 'the frame landing on a declared cut is not a jolt, it is a cut');
});
