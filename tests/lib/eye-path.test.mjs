import test from 'node:test';
import assert from 'node:assert/strict';
import { weightedCentroid, heaviestRegion, contrastWeights, eyeDistance, jumpShares, centreShare, measureEye } from '../../harness/lib/ref-measure/eye-path.mjs';

test('the centroid of one cell is the centre of that cell', () => {
  const w = new Float32Array(20 * 10);
  w[3 * 20 + 5] = 7;
  assert.deepEqual(weightedCentroid(w, 20, 10), { x: 5.5, y: 3.5, mass: 7 });
  assert.equal(weightedCentroid(new Float32Array(9), 3, 3), null);
});

test('the centroid weighs cells by their weight', () => {
  const w = new Float32Array(10);
  w[0] = 1; w[8] = 3;
  assert.equal(weightedCentroid(w, 10, 1).x, (0.5 + 3 * 8.5) / 4);
});

test('the heaviest region drops a lighter region far away', () => {
  const w = new Float32Array(30 * 10);
  w[2 * 30 + 3] = 2;
  for (let x = 20; x < 24; x++) w[7 * 30 + x] = 5;
  const c = weightedCentroid(heaviestRegion(w, 30, 10), 30, 10);
  assert.ok(c.x > 20 && c.x < 24 && c.y > 7 && c.y < 8);
});

test('contrast weights are zero on a flat frame and peak at an edge', () => {
  const flat = new Float32Array(16).fill(50);
  assert.ok(contrastWeights(flat, 4, 4).every((v) => v === 0));
  const edge = Float32Array.from({ length: 8 * 4 }, (_, i) => (i % 8 < 4 ? 0 : 100));
  const c = weightedCentroid(contrastWeights(edge, 8, 4), 8, 4);
  assert.ok(Math.abs(c.x - 4) < 0.6);
});

test('distance is in frame heights: a full width of a 16:9 frame is 16/9', () => {
  assert.equal(eyeDistance({ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, 16 / 9), 16 / 9);
  assert.equal(eyeDistance({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, 16 / 9), 1);
});

test('jump shares split carried, in between and moved', () => {
  assert.deepEqual(jumpShares([0.05, 0.1, 0.2, 0.5]), { carried: 0.5, moved: 0.25 });
  assert.deepEqual(jumpShares([]), { carried: null, moved: null });
});

test('centre share counts the points within the radius of the centre', () => {
  const pts = [{ x: 0.5, y: 0.5 }, { x: 0.55, y: 0.5 }, { x: 0.9, y: 0.1 }, null];
  assert.equal(centreShare(pts, 1), 0.667);
  assert.equal(centreShare([], 1), null);
});

function film(frames, draw) {
  const w = 64, h = 36, gray = new Uint8Array(frames * w * h), rgb = new Uint8Array(frames * w * h * 3);
  for (let f = 0; f < frames; f++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = draw(f, x, y);
    gray[(f * h + y) * w + x] = v;
    rgb.fill(v, ((f * h + y) * w + x) * 3, ((f * h + y) * w + x) * 3 + 3);
  }
  return { w, h, n: frames, gray, rgb };
}

test('a block that moves in the top left is the eye point of its shot, and the cut jump is measured to the next shot', () => {
  const fps = 20;
  const V = film(40, (f, x, y) => {
    if (f < 20) return x >= 4 + f && x < 12 + f && y >= 4 && y < 12 ? 255 : 0;
    return x >= 40 - (f - 20) && x < 50 - (f - 20) && y >= 24 && y < 32 ? 255 : 0;
  });
  const eye = measureEye(V, [{ f0: 0, f1: 20 }, { f0: 20, f1: 40 }], fps);
  const [a, b] = eye.perShot;
  assert.equal(a.start.src, 'motion');
  assert.ok(a.start.x < 0.4 && a.start.y < 0.4);
  assert.ok(b.end.x < 0.5 && b.end.y > 0.6);
  assert.ok(b.start.x > a.end.x);
  assert.equal(eye.cuts.length, 1);
  assert.ok(eye.cuts[0].jump > 0.35);
  assert.equal(eye.summary.cuts, 1);
});

test('a static shot falls back to contrast and sits at the bright block', () => {
  const V = film(10, (f, x, y) => (x >= 44 && x < 56 && y >= 10 && y < 20 ? 255 : 10));
  const eye = measureEye(V, [{ f0: 0, f1: 10 }], 20);
  assert.equal(eye.perShot[0].start.src, 'contrast');
  assert.ok(eye.perShot[0].start.x > 0.65);
});
