import test from 'node:test';
import assert from 'node:assert/strict';
import { imagePoints, regions, pixelOf } from '../../core/surfaces/image-points.js';

function image(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data.set(fn(x, y), (y * w + x) * 4);
  }
  return { width: w, height: h, data };
}
const grey = (v) => [v, v, v, 255];
const base = { count: 20000, seed: 5, jitter: 0, edgeBoost: 0 };
const xs = (cloud) => cloud.positions.filter((v, i) => i % 3 === 0);
const leftShare = (cloud) => xs(cloud).filter((v) => v < 0).length / cloud.count;

test('the same seed gives the same cloud, another seed another', () => {
  const img = image(32, 32, (x, y) => grey(40 + x * 6 + y));
  const a = imagePoints(img, { count: 500, seed: 9 }), b = imagePoints(img, { count: 500, seed: 9 }), c = imagePoints(img, { count: 500, seed: 10 });
  assert.deepEqual(a.positions, b.positions);
  assert.deepEqual(a.normals, b.normals);
  assert.notDeepEqual(a.positions, c.positions);
});

test('no point lands on a pixel under the threshold', () => {
  const img = image(40, 40, (x) => grey(x < 20 ? 5 : 200));
  const cloud = imagePoints(img, { ...base, threshold: 0.1 });
  assert.ok(cloud.luma.every((l) => l > 0.1));
  assert.ok(xs(cloud).every((v) => v >= 0), 'the dark left half has no point');
});

test('a bright half gets more points than a dim half in the gamma ratio', () => {
  const img = image(40, 40, (x) => grey(x < 20 ? 100 : 200));
  const threshold = 0.04, gamma = 1.6;
  const wl = (100 / 255 - threshold) ** gamma, wr = (200 / 255 - threshold) ** gamma;
  const cloud = imagePoints(img, { ...base, count: 60000, threshold, gamma });
  assert.ok(Math.abs(leftShare(cloud) - wl / (wl + wr)) < 0.01, `left share ${leftShare(cloud)}`);
});

test('edgeBoost raises the share of points on an edge', () => {
  const img = image(64, 64, (x) => grey(x < 32 ? 120 : 220));
  const share = (edgeBoost) => {
    const cloud = imagePoints(img, { ...base, edgeBoost });
    return xs(cloud).filter((v) => Math.abs(v) < 0.07).length / cloud.count;
  };
  assert.ok(share(2) > share(0) * 1.5);
});

test('a mask by alpha or by luma excludes areas', () => {
  const img = image(40, 40, () => grey(200));
  const byAlpha = image(40, 40, (x) => [255, 255, 255, x < 20 ? 0 : 255]);
  const byLuma = image(20, 20, (x) => grey(x < 10 ? 255 : 0));
  assert.equal(leftShare(imagePoints(img, { ...base, mask: byAlpha })), 0);
  assert.equal(leftShare(imagePoints(img, { ...base, mask: byLuma })), 1);
});

test('everything under the threshold throws', () => {
  assert.throws(() => imagePoints(image(8, 8, () => grey(2)), { count: 10 }), /no pixel has weight/);
});

test('regions labels each point by the colour under it', () => {
  const labels = image(40, 20, (x) => (x < 20 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
  const cloud = imagePoints(image(40, 20, () => grey(200)), base);
  const part = regions(labels, [[255, 0, 0], '#0000ff'], cloud);
  for (let n = 0; n < cloud.count; n++) assert.equal(part[n], cloud.positions[n * 3] < 0 ? 0 : 1);
  assert.deepEqual(pixelOf(-1, 0, 40, 20), [0, 10]);
});

test('positions keep the aspect and y points up', () => {
  const cloud = imagePoints(image(40, 20, (x, y) => grey(y < 10 ? 250 : 0)), base);
  for (let n = 0; n < cloud.count; n++) {
    assert.ok(Math.abs(cloud.positions[n * 3]) <= 1);
    assert.ok(cloud.positions[n * 3 + 1] >= 0 && cloud.positions[n * 3 + 1] <= 0.5);
  }
});

test('z comes from a depth image in its red channel, else from luma', () => {
  const img = image(20, 20, () => grey(200));
  const depth = image(10, 10, (x) => [x < 5 ? 0 : 255, 0, 0, 255]);
  const cloud = imagePoints(img, { ...base, depthScale: 1, depth });
  for (let n = 0; n < cloud.count; n++) assert.ok(Math.abs(cloud.positions[n * 3 + 2] - (cloud.positions[n * 3] < 0 ? -0.5 : 0.5)) < 1e-6);
  const flat = imagePoints(img, { ...base, depthScale: 1 });
  assert.ok(Math.abs(flat.positions[2] - (200 / 255 - 0.5)) < 1e-3);
});

test('normals are unit length and tilt away from a rising luma', () => {
  const cloud = imagePoints(image(32, 32, (x) => grey(60 + x * 5)), base);
  for (let n = 0; n < cloud.count; n++) assert.ok(Math.abs(Math.hypot(...cloud.normals.slice(n * 3, n * 3 + 3)) - 1) < 1e-5);
  assert.ok(cloud.normals[0] < 0 && cloud.normals[2] > 0);
});
