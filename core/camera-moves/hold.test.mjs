// core/camera-moves/hold.test.mjs: the runnable self-check for `camera: hold`, the explicit way to
// declare the camera LOCKED OFF for a window (AGENTS.md build brief: written 84 times across 21
// storyboards, refused every time, because the only way to say "no camera" was to say nothing at all).
//   node core/camera-moves/hold.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hold } from './hold.js';
import { bakeCameraMove } from '../engine/produce.js';
import { resolvedCamera, cameraErrors } from '../../harness/lib/contract.mjs';

const FRAME = { W: 1920, H: 1080 };

test('hold() emits ZERO keyframes: there is no camera to fake a path for', () => {
  assert.deepEqual(hold({ start: 1, dur: 2 }), []);
});

test('a negative dur is refused, same guard every other move uses', () => {
  assert.throws(() => hold({ start: 0, dur: -1 }), /must be zero or a positive number/);
});

test('`camera: hold` is now a decisive, resolvable move (was refused before this change)', () => {
  assert.deepEqual(resolvedCamera({ camera: 'hold' }), { move: 'hold', params: {} });
  assert.deepEqual(cameraErrors([{ name: 'b1', camera: 'hold' }]), []);
});

test('a lone `hold` spec bakes to an EMPTY data.camera, exactly like an omitted camera:', () => {
  const data = { layers: [], cameraMove: [{ move: 'hold', start: 1, dur: 2 }] };
  bakeCameraMove(data, FRAME);
  assert.deepEqual(data.camera, []);
});

test('CHECKABLE, not merely accepted: a real move reaching into a beat declared `hold` still conflicts', () => {
  const data = { layers: [], cameraMove: [
    { move: 'hold', start: 0, dur: 2 },
    { move: 'slowPush', start: 1, dur: 2, to: 1.1 },
  ] };
  assert.throws(() => bakeCameraMove(data, FRAME), (e) => {
    assert.match(e.message, /"hold" \(0s-2s\)/);
    assert.match(e.message, /"slowPush" \(1s-3s\)/);
    assert.match(e.message, /overlap/);
    return true;
  });
});

test('a `hold` window adjacent to (not overlapping) a real move is allowed', () => {
  const data = { layers: [], cameraMove: [
    { move: 'hold', start: 0, dur: 2 },
    { move: 'slowPush', start: 2, dur: 2, to: 1.1 },
  ] };
  assert.doesNotThrow(() => bakeCameraMove(data, FRAME));
  assert.equal(data.camera.length, 2); // only slowPush's two keys; hold contributed none
});

console.log('ok - camera hold: emits no keyframes, refuses a negative dur, and its window is still checked for a race');
