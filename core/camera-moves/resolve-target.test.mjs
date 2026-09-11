// core/camera-moves/resolve-target.test.mjs: the pure box->pose arithmetic (resolveCameraTarget), plus
// the two callers that use it: dive-in.js's headroom clamp (a plain targetW/targetH, no `target:"#id"`
// needed to exercise it) and bakeCameraMove's "target: #id" resolution off the layer tree.
//   node core/camera-moves/resolve-target.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCameraTarget } from './resolve-target.js';
import { diveIn } from './dive-in.js';
import { bakeCameraMove } from '../engine/produce.js';

test('resolveCameraTarget: a bigger box gets a smaller max scale', () => {
  const small = resolveCameraTarget({ w: 100, h: 60, cx: 500, cy: 500 }, { canvasW: 1920, canvasH: 1080 });
  const big = resolveCameraTarget({ w: 1000, h: 600, cx: 500, cy: 500 }, { canvasW: 1920, canvasH: 1080 });
  assert.ok(small.s > big.s, `a 100x60 box should allow a larger scale than a 1000x600 one; got ${small.s} vs ${big.s}`);
});

test('resolveCameraTarget: margin shrinks the allowed scale', () => {
  const box = { w: 400, h: 300, cx: 960, cy: 540 };
  const tight = resolveCameraTarget(box, { margin: 0, canvasW: 1920, canvasH: 1080 });
  const loose = resolveCameraTarget(box, { margin: 0.2, canvasW: 1920, canvasH: 1080 });
  assert.ok(loose.s < tight.s, `a bigger margin must shrink the max scale; got tight=${tight.s} loose=${loose.s}`);
});

test('resolveCameraTarget: tx/ty are the box centre, "to" caps but never exceeds the max scale', () => {
  const box = { w: 200, h: 100, cx: 300, cy: 400 };
  const r = resolveCameraTarget(box, { to: 999, canvasW: 1920, canvasH: 1080 });
  assert.equal(r.tx, 300); assert.equal(r.ty, 400);
  assert.ok(r.s < 999, 'an absurd "to" must be capped by the frame-fit scale, not passed through');
});

test('resolveCameraTarget: a "to" under the max scale is respected as-is', () => {
  const box = { w: 100, h: 100, cx: 0, cy: 0 };
  const r = resolveCameraTarget(box, { to: 1.2, canvasW: 1920, canvasH: 1080 });
  assert.equal(r.s, 1.2);
});

test('resolveCameraTarget: refuses a non-finite box', () => {
  assert.throws(() => resolveCameraTarget({ w: NaN, h: 10, cx: 0, cy: 0 }));
});

// --- diveIn's own headroom clamp (fix 3): a crop that is not declared ADAPTS instead of throwing ---

test('diveIn: a "to" past the headroom limit is CLAMPED and reported, not refused', () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  let kf;
  try {
    kf = diveIn({ tx: 960, ty: 540, to: 1.05, targetW: 1400, targetH: 1400, canvasW: 1920, canvasH: 1080 });
  } finally { console.log = orig; }
  const maxScale = Math.min(0.88 * 1920 / 1400, 0.88 * 1080 / 1400);
  assert.ok(kf[1].s <= maxScale + 1e-9, `clamped scale ${kf[1].s} must not exceed the headroom max ${maxScale}`);
  assert.ok(logs.some((l) => /^adapted diveIn-headroom:/.test(l)), `expected an "adapted diveIn-headroom" line, got: ${JSON.stringify(logs)}`);
});

test('diveIn: "crop: true" keeps "to" exactly as authored and prints nothing', () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  let kf;
  try {
    kf = diveIn({ tx: 960, ty: 540, to: 1.05, targetW: 1400, targetH: 1400, canvasW: 1920, canvasH: 1080, crop: true });
  } finally { console.log = orig; }
  assert.equal(kf[1].s, 1.05);
  assert.equal(logs.length, 0);
});

test('diveIn: a "to" already inside the headroom is untouched and silent', () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  let kf;
  try {
    kf = diveIn({ tx: 960, ty: 540, to: 1.2, targetW: 300, targetH: 300, canvasW: 1920, canvasH: 1080 });
  } finally { console.log = orig; }
  assert.equal(kf[1].s, 1.2);
  assert.equal(logs.length, 0);
});

test('diveIn: raw tx/ty/s behave exactly as before when no target is involved', () => {
  const kf = diveIn({ tx: 500, ty: 400, to: 1.5, start: 0, dur: 1.6 });
  assert.deepEqual(kf[0], { t: 0, s: 1, x: 0, y: 0 });
  assert.equal(kf[1].t, 1.6);
  assert.equal(kf[1].s, 1.5);
  assert.equal(kf[1].x, 1920 / 2 - 500);
  assert.equal(kf[1].y, 1080 / 2 - 400);
});

// --- bakeCameraMove: "target: #id" resolved off the layer tree (fix 1) ---

const FRAME = { W: 1920, H: 1080 };
const sceneWithButton = (extra = {}) => ({
  layers: [{ id: 'cta', type: 'rect', x: 1600, y: 900, w: 200, h: 100 }],
  cameraMove: { move: 'diveIn', start: 0, dur: 1.6, target: '#cta', ...extra },
});

test('bakeCameraMove: diveIn target resolves tx/ty to the layer\'s centre', () => {
  const data = sceneWithButton();
  bakeCameraMove(data, FRAME);
  const last = data.camera[data.camera.length - 1];
  assert.equal(last.x, 1920 / 2 - 1700);
  assert.equal(last.y, 1080 / 2 - 950);
});

test('bakeCameraMove: a target near the frame edge gets a smaller resolved scale than a small centred one', () => {
  const edge = { layers: [{ id: 'a', type: 'rect', x: 0, y: 0, w: 1800, h: 1000 }],
    cameraMove: { move: 'diveIn', start: 0, dur: 1, target: '#a' } };
  const small = { layers: [{ id: 'b', type: 'rect', x: 900, y: 500, w: 40, h: 40 }],
    cameraMove: { move: 'diveIn', start: 0, dur: 1, target: '#b' } };
  bakeCameraMove(edge, FRAME); bakeCameraMove(small, FRAME);
  const sEdge = edge.camera[edge.camera.length - 1].s;
  const sSmall = small.camera[small.camera.length - 1].s;
  assert.ok(sEdge < sSmall, `a near-full-frame box should resolve a smaller scale than a tiny one; got ${sEdge} vs ${sSmall}`);
});

test('bakeCameraMove: margin shrinks the resolved scale for a target too', () => {
  const tight = sceneWithButton({ margin: 0 });
  const loose = sceneWithButton({ margin: 0.3 });
  bakeCameraMove(tight, FRAME); bakeCameraMove(loose, FRAME);
  const sTight = tight.camera[tight.camera.length - 1].s;
  const sLoose = loose.camera[loose.camera.length - 1].s;
  assert.ok(sLoose < sTight, `a bigger margin must resolve a smaller scale; got tight=${sTight} loose=${sLoose}`);
});

test('bakeCameraMove: raw tx/ty win over a target named on the same spec', () => {
  const data = { layers: [{ id: 'cta', type: 'rect', x: 1600, y: 900, w: 200, h: 100 }],
    cameraMove: { move: 'diveIn', start: 0, dur: 1, target: '#cta', tx: 10, ty: 20, to: 1.1 } };
  bakeCameraMove(data, FRAME);
  const last = data.camera[data.camera.length - 1];
  assert.equal(last.x, 1920 / 2 - 10);
  assert.equal(last.y, 1080 / 2 - 20);
});

test('bakeCameraMove: an unknown target id is refused by name', () => {
  const data = { layers: [{ id: 'cta', type: 'rect', x: 0, y: 0, w: 10, h: 10 }],
    cameraMove: { move: 'diveIn', start: 0, dur: 1, target: '#missing' } };
  assert.throws(() => bakeCameraMove(data, FRAME), /no layer with id "missing"/);
});

test('bakeCameraMove: a target with no declared size is refused, not guessed', () => {
  const data = { layers: [{ id: 'headline', type: 'text', x: 100, y: 100 }],
    cameraMove: { move: 'diveIn', start: 0, dur: 1, target: '#headline' } };
  assert.throws(() => bakeCameraMove(data, FRAME), /declares no numeric/);
});

test('bakeCameraMove: travel station "target" resolves per-station', () => {
  const data = {
    layers: [
      { id: 'a', type: 'rect', x: 100, y: 100, w: 100, h: 100 },
      { id: 'b', type: 'rect', x: 1500, y: 800, w: 150, h: 150 },
    ],
    cameraMove: { move: 'travel', stations: [{ target: '#a' }, { target: '#b', dur: 1 }] },
  };
  bakeCameraMove(data, FRAME);
  const ts = data.camera.map((k) => k.t);
  assert.equal(ts.length, 2);
  assert.equal(data.camera[0].x, 1920 / 2 - 150);
  assert.equal(data.camera[0].y, 1080 / 2 - 150);
  assert.equal(data.camera[1].x, 1920 / 2 - 1575);
  assert.equal(data.camera[1].y, 1080 / 2 - 875);
});
