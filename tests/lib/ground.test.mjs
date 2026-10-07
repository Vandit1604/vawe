import test from 'node:test';
import assert from 'node:assert/strict';
import { borderGround, lightMap, lightDrift, hueOf, measureGround } from '../../harness/lib/ref-measure/ground.mjs';

const labImage = (w, h, at) => {
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.set(at(x, y), (y * w + x) * 3);
  return out;
};

test('the ground is the edge tone, not the centred object', () => {
  const lab = labImage(40, 20, (x, y) => (x > 10 && x < 30 && y > 5 && y < 15 ? [90, 0, 0] : [20, 10, -10]));
  assert.deepEqual(borderGround(lab, 40, 20), [20, 10, -10]);
});

test('light map averages L per cell and drift ignores a small moving object', () => {
  const a = labImage(80, 40, () => [30, 0, 0]);
  const b = labImage(80, 40, (x, y) => (x < 10 && y < 10 ? [90, 0, 0] : [30, 0, 0]));
  assert.equal(lightMap(a, 80, 40).length, 8 * 4);
  assert.equal(lightDrift(lightMap(a, 80, 40), lightMap(b, 80, 40)), 0);
  const c = labImage(80, 40, () => [38, 0, 0]);
  assert.equal(lightDrift(lightMap(a, 80, 40), lightMap(c, 80, 40)), 8);
});

test('hue is the angle of a and b in degrees', () => {
  assert.equal(hueOf([50, 10, 0]), 0);
  assert.equal(hueOf([50, 0, 10]), 90);
  assert.equal(hueOf([50, 0, -10]), 270);
});

function film(frames, colourAt) {
  const w = 32, h = 18, rgb = new Uint8Array(frames * w * h * 3), gray = new Uint8Array(frames * w * h);
  for (let f = 0; f < frames; f++) for (let i = 0; i < w * h; i++) rgb.set(colourAt(f), (f * w * h + i) * 3);
  return { w, h, n: frames, rgb, gray };
}

function pixelFilm(frames, colourAt) {
  const w = 32, h = 18, rgb = new Uint8Array(frames * w * h * 3), gray = new Uint8Array(frames * w * h);
  for (let f = 0; f < frames; f++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rgb.set(colourAt(f, x, y), ((f * h + y) * w + x) * 3);
  return { w, h, n: frames, rgb, gray };
}

test('a cut from a black ground to a white ground is a change, a cut to the same ground is not', () => {
  const V = film(30, (f) => (f < 10 ? [0, 0, 0] : f < 20 ? [255, 255, 255] : [255, 255, 255]));
  const g = measureGround(V, [{ f0: 0, f1: 10 }, { f0: 10, f1: 20 }, { f0: 20, f1: 30 }], 10);
  assert.equal(g.cuts.length, 2);
  assert.ok(g.cuts[0].dE > 90);
  assert.equal(g.cuts[1].dE, 0);
  assert.equal(g.summary.changedShare, 0.5);
});

test('a cut between two pastel blob grounds on one white is a change; a small object at the edge is not', () => {
  const white = [255, 255, 255], lilac = [200, 180, 235], mint = [190, 235, 210];
  const V = pixelFilm(30, (f, x) => (f < 10 ? (x < 10 ? lilac : white) : (x > 22 ? mint : white)));
  const g = measureGround(V, [{ f0: 0, f1: 10 }, { f0: 10, f1: 30 }], 10);
  assert.ok(g.cuts[0].dE >= 6, `dE ${g.cuts[0].dE}`);
  assert.equal(g.summary.changedShare, 1);
  const edge = pixelFilm(20, (f, x, y) => (f >= 10 && x < 3 && y < 4 ? [20, 20, 20] : white));
  assert.equal(measureGround(edge, [{ f0: 0, f1: 10 }, { f0: 10, f1: 20 }], 10).cuts[0].dE, 0);
});

test('a ground that brightens inside a shot is a drift', () => {
  const V = film(20, (f) => [10 + f * 10, 10 + f * 10, 10 + f * 10]);
  const g = measureGround(V, [{ f0: 0, f1: 20 }], 10);
  assert.ok(g.perShot[0].lightDrift > 3);
  assert.equal(g.summary.driftShotShare, 1);
});
