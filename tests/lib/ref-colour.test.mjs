import test from 'node:test';
import assert from 'node:assert/strict';
import { rgbToLab, labOf, labToHex, measureColour, mergeClusters } from '../../harness/lib/ref-measure/colour.mjs';
import { worldTurns } from '../../harness/lib/ref-measure/world-turns.mjs';
import { measureMotionRegions, countRegions } from '../../harness/lib/ref-measure/motion-regions.mjs';

const W = 32, H = 18;

// Each frame is a list of [x0, x1, colour] vertical stripes.
function film(frames) {
  const rgb = Buffer.alloc(frames.length * W * H * 3);
  frames.forEach((stripes, f) => {
    for (const [x0, x1, c] of stripes) for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) rgb.set(c, ((f * H + y) * W + x) * 3);
  });
  return { w: W, h: H, n: frames.length, rgb };
}

const RED = [220, 30, 30], BLUE = [30, 30, 220], GREEN = [30, 200, 60], NEAR_RED = [210, 40, 40], BLACK = [0, 0, 0], WHITE = [255, 255, 255];
const flat = (c, n) => Array.from({ length: n }, () => [[0, W, c]]);
const split = (a, b, n) => Array.from({ length: n }, () => [[0, W / 2, a], [W / 2, W, b]]);

test('white is L 100, black is L 0, red has positive a', () => {
  const lab = new Float32Array(3);
  rgbToLab(255, 255, 255, lab);
  assert.ok(Math.abs(lab[0] - 100) < 0.1 && Math.abs(lab[1]) < 0.1 && Math.abs(lab[2]) < 0.1, String(lab));
  rgbToLab(0, 0, 0, lab);
  assert.equal(lab[0], 0);
  rgbToLab(255, 0, 0, lab);
  assert.ok(lab[1] > 70);
});

test('mergeClusters joins clusters closer than the limit and keeps the share', () => {
  const m = mergeClusters([[50, 0, 0], [53, 0, 0], [80, 40, 0]], [0.3, 0.2, 0.5], 10);
  assert.equal(m.length, 2);
  assert.ok(Math.abs(m.find((c) => c.lab[0] < 60).share - 0.5) < 1e-9);
});

test('colours per shot and per film count flat colours, and two near colours merge', () => {
  const V = film([...split(RED, BLUE, 6), ...flat(GREEN, 6), ...flat(NEAR_RED, 6)]);
  const shots = [{ f0: 0, f1: 6 }, { f0: 6, f1: 12 }, { f0: 12, f1: 18 }];
  const c = measureColour(V, shots, 6);
  assert.deepEqual(c.perShot.map((s) => s.colours), [2, 1, 1]);
  assert.equal(c.coloursDistinct, 3);
  assert.equal(c.coloursPerShotMedian, 1);
});

test('value structure reports the dark and light shares', () => {
  const V = film([...split(BLACK, WHITE, 4)]);
  const c = measureColour(V, [{ f0: 0, f1: 4 }], 4);
  assert.equal(c.shareDark, 0.5);
  assert.equal(c.shareLight, 0.5);
  assert.ok(c.lStd > 49 && c.lStd < 51, String(c.lStd));
});

test('a world turn is a dominant colour that moves more than deltaE 15 between shots', () => {
  const V = film([...flat(RED, 6), ...flat(NEAR_RED, 6), ...flat(GREEN, 6)]);
  const shots = [{ f0: 0, f1: 6 }, { f0: 6, f1: 12 }, { f0: 12, f1: 18 }];
  const c = measureColour(V, shots, 6);
  const t = worldTurns(c.perShot, 3);
  assert.equal(t.count, 1);
  assert.deepEqual(t.times, [2]);
  assert.equal(t.per10s, 3.333);
});

test('the same frames give the same numbers twice', () => {
  const V = film([...split(RED, BLUE, 6), ...flat(GREEN, 6)]);
  const shots = [{ f0: 0, f1: 6 }, { f0: 6, f1: 12 }];
  assert.deepEqual(measureColour(V, shots, 6), measureColour(V, shots, 6));
});

function grayFilm(n, draw, w = 80, h = 45) {
  const gray = new Uint8Array(n * w * h);
  for (let f = 0; f < n; f++) draw(gray.subarray(f * w * h, (f + 1) * w * h), f);
  return { w, h, n, gray };
}

const square = (g, x0, y0, size, v) => { for (let y = y0; y < y0 + size; y++) for (let x = x0; x < x0 + size; x++) g[y * 80 + x] = v; };

test('two squares that move are two regions, and a still frame has none', () => {
  const moving = grayFilm(8, (g, f) => { square(g, 4 + f * 3, 4, 5, 200); square(g, 50 - f * 3, 28, 5, 200); });
  const m = measureMotionRegions(moving, [], 10);
  assert.equal(m.median, 2);
  const still = grayFilm(8, (g) => square(g, 10, 10, 10, 200));
  assert.equal(measureMotionRegions(still, [], 10).p90, 0);
});

test('grain does not make regions', () => {
  let seed = 7;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const grainy = grayFilm(8, (g) => { for (let i = 0; i < g.length; i++) g[i] = 100 + Math.round((rand() - 0.5) * 16); }, 320, 180);
  assert.equal(measureMotionRegions(grainy, [], 10).p90, 0);
});

test('a transition is left out of the differences', () => {
  const cut = grayFilm(6, (g, f) => g.fill(f < 3 ? 20 : 220));
  assert.equal(measureMotionRegions(cut, [{ startFrame: 3, endFrame: 3 }], 10).p90, 0);
  assert.equal(countRegions(new Float32Array(80 * 45).fill(20), new Float32Array(80 * 45).fill(220), 80, 45), 1);
});

test('labOf gives the table result for whole numbers and takes fractions', () => {
  const lab = new Float32Array(3);
  rgbToLab(220, 30, 30, lab);
  const viaLabOf = labOf([220, 30, 30]);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(lab[i] - viaLabOf[i]) < 1e-3);
  assert.ok(Number.isFinite(labOf([220.5, 30.2, 29.9])[0]));
});

test('labToHex undoes labOf', () => {
  for (const rgb of [[220, 30, 30], [10, 120, 200], [255, 255, 255], [0, 0, 0]]) {
    assert.equal(labToHex(labOf(rgb)), `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`);
  }
});

test('the tile and hex distances are the one Lab distance', async () => {
  const { labDeltaE } = await import('../../harness/lib/tile.mjs');
  const { deltaE: hexDeltaE } = await import('../../harness/lib/color-delta.mjs');
  assert.ok(Math.abs(labDeltaE([0, 0, 0], [255, 255, 255]) - 100) < 0.1);
  assert.ok(Math.abs(hexDeltaE('#000000', '#ffffff') - labDeltaE([0, 0, 0], [255, 255, 255])) < 1e-9);
  assert.equal(labDeltaE(null, [1, 2, 3]), null);
});
