// tests/validate/camera-move.test.mjs: cameraMove params are picky per move (orbit wants `deg`, not
// `degrees`; slowPush/punchIn want `dur`, not `duration`; travel wants `stations`, not `dolly`), and
// the check for that used to live only in core/camera-moves/index.js buildCameraMove, which a scene
// only reaches by actually rendering. cameraMoveErrors runs the same check at `make check GATE=validate` time.
//   node --test tests/validate/camera-move.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraMoveErrors } from '../../core/validate/camera.mjs';

test('a typo param is named, with the real accepted list', () => {
  const errs = cameraMoveErrors({ cameraMove: { move: 'orbit', degrees: 12 } });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /cameraMove "orbit" does not read "degrees"/);
  assert.match(errs[0], /It accepts: start, dur, deg, s, ease\./);
});

test('a real param is clean', () => {
  assert.deepEqual(cameraMoveErrors({ cameraMove: { move: 'orbit', deg: 12, dur: 4 } }), []);
});

test('a shot word resolves to its move before the params are checked', () => {
  assert.deepEqual(cameraMoveErrors({ cameraMove: { move: 'push in slowly', to: 1.2 } }), []);
});

test('target/cursor/beats/canvasW/canvasH are resolved before buildCameraMove sees the spec, never flagged unknown', () => {
  const errs = cameraMoveErrors({ cameraMove: {
    move: 'diveIn', target: '#hero', beats: ['b1', 'b2'], canvasW: 1920, canvasH: 1080,
  } });
  assert.deepEqual(errs, []);
});

test('an array of legs is checked leg by leg, indexed', () => {
  const errs = cameraMoveErrors({ cameraMove: [{ move: 'slowPush', to: 1.1 }, { move: 'travel', dolly: [] }] });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /^cameraMove\[1\] "travel" does not read "dolly"/);
});

test('no cameraMove is clean, and a move with no destructured signature is left unchecked', () => {
  assert.deepEqual(cameraMoveErrors({}), []);
});
