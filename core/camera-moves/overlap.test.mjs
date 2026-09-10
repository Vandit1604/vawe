// core/camera-moves/overlap.test.mjs: bakeCameraMove is the ONE funnel every cameraMove spec passes
// through, regardless of who wrote it (a hand-authored scene, harness/author/assemble.mjs's per-beat
// `camera:` lines, or a camera-kind recipe like `window-dolly` appended at render-time expand). Those
// writers never see each other's work, so the refusal and the ordering fix both have to live here.
//   node core/camera-moves/overlap.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bakeCameraMove } from '../engine/produce.js';

const FRAME = { W: 1920, H: 1080 };
const scene = (cameraMove) => ({ layers: [], cameraMove });

test('two specs whose windows overlap are refused, both named with their windows', () => {
  const data = scene([
    { move: 'diveIn', start: 0, dur: 1.5, tx: 960, ty: 300, to: 1.4 },
    { move: 'slowPush', start: 1.0, dur: 1.5, to: 1.05 },
  ]);
  assert.throws(() => bakeCameraMove(data, FRAME), (e) => {
    assert.match(e.message, /"diveIn" \(0s-1\.5s\)/);
    assert.match(e.message, /"slowPush" \(1s-2\.5s\)/);
    assert.match(e.message, /overlap/);
    return true;
  });
});

test('specs written out of time order are SORTED before concatenating, not trusted in array order', () => {
  // the later-starting spec is listed FIRST in cameraMove, the way a camera-kind recipe appends its
  // leg to whatever the array already held, with no regard for where it lands in time.
  const data = scene([
    { move: 'slowPush', start: 3, dur: 1.5, to: 1.05 },
    { move: 'diveIn', start: 0, dur: 1.5, tx: 960, ty: 300, to: 1.4 },
  ]);
  bakeCameraMove(data, FRAME);
  const ts = data.camera.map((k) => k.t);
  const sorted = [...ts].sort((a, b) => a - b);
  assert.deepEqual(ts, sorted, `camera keyframes must already be time-ascending, got ${JSON.stringify(ts)}`);
  assert.equal(ts[0], 0, 'the earlier-starting spec (diveIn, start 0) must come first despite being written second');
});

test('adjacent specs sharing one boundary (one ends exactly where the next begins) are allowed', () => {
  const data = scene([
    { move: 'diveIn', start: 0, dur: 1.5, tx: 960, ty: 300, to: 1.4 },
    { move: 'slowPush', start: 1.5, dur: 1.5, to: 1.05 },
  ]);
  assert.doesNotThrow(() => bakeCameraMove(data, FRAME));
  const ts = data.camera.map((k) => k.t);
  assert.deepEqual(ts, [0, 1.5, 1.5, 3]);
});

console.log('ok - camera overlap: racing specs refused, out-of-order specs sorted, a shared boundary allowed');
