import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sampleSegment, outHandle, inHandle, outPoint, inPoint, outHandleFromPoint, inHandleFromPoint,
} from '../../harness/author/curve-math.mjs';

test('outPoint/outHandleFromPoint round-trip a handle', () => {
  const h = { influence: 40, speed: 2.5 };
  const p = outPoint(h);
  const back = outHandleFromPoint(p.x, p.y);
  assert.ok(Math.abs(back.influence - h.influence) < 1e-6);
  assert.ok(Math.abs(back.speed - h.speed) < 1e-6);
});

test('inPoint/inHandleFromPoint round-trip a handle', () => {
  const h = { influence: 62, speed: -0.8 };
  const p = inPoint(h);
  const back = inHandleFromPoint(p.x, p.y);
  assert.ok(Math.abs(back.influence - h.influence) < 1e-6);
  assert.ok(Math.abs(back.speed - h.speed) < 1e-6);
});

test('absent handles resolve to the linear side, on the diagonal', () => {
  const o = outHandle({});
  const i = inHandle({});
  const po = outPoint(o), pi = inPoint(i);
  assert.ok(Math.abs(po.y - po.x) < 1e-9, 'a linear side sits on y=x');
  assert.ok(Math.abs(pi.y - pi.x) < 1e-9, 'a linear side sits on y=x');
});

test('sampleSegment matches the segment endpoints and holds for a null-identity prop', () => {
  const a = { t: 0, x: 0 }, b = { t: 1.6, x: 900 };
  const s = sampleSegment(a, b, 'x', 0, 8);
  assert.equal(s.pts[0].v, 0);
  assert.equal(s.pts[s.pts.length - 1].v, 900);

  // `w` is layer-owned (null identity): a track that only one endpoint keys it is not a track.
  assert.equal(sampleSegment({ t: 0 }, { t: 1, w: 200 }, 'w', null, 4), null);
});

test('sampleSegment follows an authored handle, not the named default', () => {
  const a = { t: 0, x: 0, easeOut: { influence: 20, speed: 4 } }, b = { t: 1, x: 100 };
  const s = sampleSegment(a, b, 'x', 0, 100);
  // `fling`-shaped: leaves fast, so well before the midpoint it is already past the halfway value.
  const quarter = s.pts.find((p) => Math.abs(p.t - 0.25) < 1e-6);
  assert.ok(quarter.v > 50, `expected a fast departure past the midpoint value by t=0.25, got ${quarter.v}`);
});
