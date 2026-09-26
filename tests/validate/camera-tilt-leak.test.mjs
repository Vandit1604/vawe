// tests/validate/camera-tilt-leak.test.mjs: core/timeline/sequence.js cameraAt holds the camera's LAST
// keyframe past its own end, on purpose, and that is the right default for a camera's POSITION. It is
// a trap for an ANGLE: `orbit`'s own last keyframe leaves `ry` non-zero, so every layer rendered after
// the move's own window still inherits the tilt, film-wide, with no error. Engine friction: this
// visibly skewed unrelated HTML blocks and tripped an unrelated ancestor-kills error 24s later, ~20
// minutes and 2 renders before the actual cause (the camera, not the layer) was found.
//   node --test tests/validate/camera-tilt-leak.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraTiltLeakErrors } from '../../core/validate/camera.mjs';

test('an orbit that ends tilted, with the film continuing after it, is named', () => {
  const errs = cameraTiltLeakErrors({
    duration: 30,
    cameraMove: { move: 'orbit', start: 2, dur: 4, deg: 12 },
  });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /leaves ry=12\.0deg tilted/);
  assert.match(errs[0], /holds for the rest of the film \(to 30s/);
});

test('the tilt is fine when it is the film’s actual last frame', () => {
  assert.deepEqual(cameraTiltLeakErrors({
    duration: 6, cameraMove: { move: 'orbit', start: 2, dur: 4, deg: 12 },
  }), []);
});

test('a following leg that returns the camera to rest clears the warning', () => {
  const errs = cameraTiltLeakErrors({
    duration: 30,
    cameraMove: [
      { move: 'orbit', start: 2, dur: 4, deg: 12 },
      { move: 'orbit', start: 20, dur: 2, deg: 0.0001 }, // settles back near 0
    ],
  });
  assert.deepEqual(errs, []);
});

test('a raw camera keyframe array is checked the same way as cameraMove sugar', () => {
  const errs = cameraTiltLeakErrors({
    duration: 30,
    camera: [{ t: 0, ry: 0 }, { t: 6, ry: 12 }],
  });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /leaves ry=12\.0deg tilted/);
});

test('a move with no 3D angle at all is clean', () => {
  assert.deepEqual(cameraTiltLeakErrors({ duration: 30, cameraMove: { move: 'slowPush', to: 1.2 } }), []);
});

test('no camera at all is clean', () => {
  assert.deepEqual(cameraTiltLeakErrors({}), []);
});
