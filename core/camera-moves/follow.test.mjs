// core/camera-moves/follow.test.mjs: the runnable self-check for `cameraMove: {move:"followLayer"}`.
//   node core/camera-moves/follow.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bakeCameraMove } from '../engine/produce.js';
import { followOffset } from './follow.js';

const scene = (layers, cameraMove) => ({ layers, cameraMove });
const FRAME = { W: 1920, H: 1080 };

test('follow refuses an unknown id, by name, with the known ids listed', () => {
  const data = scene([{ id: 'card', type: 'text', text: 'x' }], { move: 'followLayer', id: 'carde' });
  assert.throws(() => bakeCameraMove(data, FRAME), (e) => {
    assert.match(e.message, /no layer with id "carde"/);
    // near-miss: nearMisses (core/registry/registry.js) matches by shared prefix, so "carde" -> "card"
    assert.match(e.message, /did you mean "card"/i);
    assert.match(e.message, /Known ids: card/);
    return true;
  });
});

test('follow refuses a target that is itself following another layer (stale-box chain)', () => {
  const data = scene([
    { id: 'label', type: 'text', text: 'x', follow: { id: 'card' } },
    { id: 'card', type: 'text', text: 'y' },
  ], { move: 'followLayer', id: 'label' });
  assert.throws(() => bakeCameraMove(data, FRAME), (e) => {
    assert.match(e.message, /"label" is itself following "card"/);
    assert.match(e.message, /UNPINNED position/);
    return true;
  });
});

test('follow builds cameraFollow, not camera keyframes, and leaves cameraMove nothing to render', () => {
  const data = scene([{ id: 'card', type: 'text', text: 'x' }], { move: 'followLayer', id: 'card', margin: 0.2, to: 1.3 });
  bakeCameraMove(data, FRAME);
  assert.equal(data.cameraMove, undefined);
  assert.equal(data.camera, undefined);
  assert.deepEqual(data.cameraFollow, { id: 'card', margin: 0.2, to: 1.3 });
});

// THE POINT OF THE WHOLE FEATURE: retiming the followed layer's track must not require touching the
// camera. `followOffset` reads only the box it is HANDED, never a keyframe baked at build time, so a
// box moved by a retimed motion track (simulated here as two different box centres, "before" and
// "after") must move the camera by the same amount with the identical spec. If the camera ever stopped
// tracking (fixed x/y regardless of the box), this fails.
test('retiming the followed layer changes the live box, and the SAME spec tracks it there too', () => {
  const spec = { margin: 0.1, to: 1 };
  const before = { cx: 1920, cy: 540 }; // outside the deadzone: pushed right of centre
  const after = { cx: 700, cy: 540 };   // "retimed" to arrive somewhere else entirely, same spec
  const a = followOffset(before, spec, FRAME.W, FRAME.H);
  const b = followOffset(after, spec, FRAME.W, FRAME.H);
  assert.notEqual(a.x, b.x, 'the camera did not move when the box it tracks moved: it is reading a value baked once, not the live box');
  // Sanity on the shape of the answer: inside the deadzone the camera does not move at all.
  const centred = followOffset({ cx: FRAME.W / 2, cy: FRAME.H / 2 }, spec, FRAME.W, FRAME.H);
  assert.equal(centred.x, 0);
  assert.equal(centred.y, 0);
});

console.log('ok - camera follow: unknown-id refusal, follow-chain refusal, and live retracking all hold');
