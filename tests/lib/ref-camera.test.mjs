import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateCamera, halfRes, slowCamera, warp } from '../../harness/lib/ref-measure/camera.mjs';

const texture = (x, y) => 128 + 55 * Math.sin(x * 0.31) * Math.cos(y * 0.23) + 40 * Math.sin((x + 2 * y) * 0.13) + (((x >> 3) + (y >> 3)) % 2 ? 18 : -18);
const plane = (w, h, at) => Uint8Array.from({ length: w * h }, (_, i) => Math.max(0, Math.min(255, Math.round(at(i % w, Math.floor(i / w))))));

const W = 96, H = 54;
const A = plane(W, H, texture);

test('a picture against itself is no camera', () => {
  assert.deepEqual(estimateCamera(A, A, W, H), { s: 1, dx: 0, dy: 0 });
});

test('a pan of a few pixels is found with its sign', () => {
  const B = plane(W, H, (x, y) => texture(x - 4, y - 2));
  const cam = estimateCamera(A, B, W, H);
  assert.ok(Math.abs(cam.dx - 4) < 0.6 && Math.abs(cam.dy - 2) < 0.6, JSON.stringify(cam));
  assert.ok(Math.abs(cam.s - 1) < 0.03);
});

test('a zoom in is a scale above 1 about the centre', () => {
  const c = (W - 1) / 2, d = (H - 1) / 2;
  const B = plane(W, H, (x, y) => texture(c + (x - c) / 1.08, d + (y - d) / 1.08));
  const cam = estimateCamera(A, B, W, H);
  assert.ok(cam.s > 1.04 && cam.s < 1.12, JSON.stringify(cam));
});

test('warp carries A onto B by the camera it was estimated as, better than no warp', () => {
  const B = plane(W, H, (x, y) => texture(x - 4, y - 2));
  const cam = estimateCamera(A, B, W, H);
  const error = (P) => P.reduce((s, v, i) => s + Math.abs(v - B[i]), 0);
  assert.ok(error(warp(A, B, W, H, { ...cam, dx: cam.dx / 2, dy: cam.dy / 2 })) < error(A));
});

test('halfRes averages each 2 by 2 block', () => {
  const g = Uint8Array.from([0, 4, 8, 8, 4, 0, 8, 8]);
  assert.deepEqual([...halfRes(g, 4, 2)], [2, 8]);
});

test('slowCamera finds a pan of 0.6 px a frame that frame pairs miss, and leaves a still shot alone', () => {
  const FW = 2 * W, FH = 2 * H, frames = 9;
  const moving = (f) => plane(FW, FH, (x, y) => texture(x / 2 - 0.6 * f, y / 2));
  const V = { w: FW, h: FH, frame: (i) => moving(i) };
  const cams = Array.from({ length: frames }, () => ({ s: 1, dx: 0, dy: 0 }));
  slowCamera(V, cams, [{ f0: 0, f1: frames }], 4);
  assert.ok(cams.slice(1, 5).every((c) => Math.abs(c.dx - 0.6) < 0.2 && Math.abs(c.dy) < 0.2), JSON.stringify(cams.slice(1, 5)));
  const still = Array.from({ length: frames }, () => ({ s: 1, dx: 0, dy: 0 }));
  slowCamera({ w: FW, h: FH, frame: () => plane(FW, FH, texture) }, still, [{ f0: 0, f1: frames }], 4);
  assert.ok(still.every((c) => c.dx === 0 && c.dy === 0 && c.s === 1));
});
