import test from 'node:test';
import assert from 'node:assert/strict';
import { groundOf, paintsGround, stopsOf } from '../../harness/lib/ground-paint.mjs';

const ground = [10, 10, 10];
const layer = (over) => ({ op: 1, tag: 'div', ...over });

test('stopsOf reads rgb, rgba with a fraction or a percent alpha, and hex stops', () => {
  assert.deepEqual(stopsOf('linear-gradient(rgb(10, 20, 30), rgba(1, 2, 3, 0.5) 40%, #ff0000)'), [[10, 20, 30, 1], [1, 2, 3, 0.5], [255, 0, 0, 1]]);
  assert.deepEqual(stopsOf('rgb(1 2 3 / 25%)'), [[1, 2, 3, 0.25]]);
  assert.deepEqual(stopsOf(null), []);
});

test('groundOf is the largest opaque background, else mid grey', () => {
  const boxes = [
    { bg: [200, 0, 0, 1], op: 1, box: [0, 0, 10, 10] },
    { bg: [0, 0, 200, 1], op: 1, box: [0, 0, 100, 100] },
    { bg: [0, 200, 0, 0.5], op: 1, box: [0, 0, 500, 500] },
  ];
  assert.deepEqual(groundOf(boxes), [0, 0, 200]);
  assert.deepEqual(groundOf([]), [128, 128, 128]);
});

test('a layer with no paint string counts in full, and its opacity scales it', () => {
  assert.equal(paintsGround(layer({ tag: 'img' }), ground), true);
  assert.equal(paintsGround(layer({ tag: 'img', op: 0.02 }), ground), false);
});

test('texture paints nothing: a blend overlay, a tiled or grain image, a gradient close to the ground, an empty canvas', () => {
  assert.equal(paintsGround(layer({ blend: 'overlay' }), ground), false);
  assert.equal(paintsGround(layer({ paint: 'url(grain.png)' }), ground), false);
  assert.equal(paintsGround(layer({ paint: 'url(a.png)', tilePx: 64 }), ground), false);
  assert.equal(paintsGround(layer({ paint: 'linear-gradient(rgb(10, 10, 10), rgb(12, 12, 12))' }), ground), false);
  assert.equal(paintsGround(layer({ canvasVaries: 0 }), ground), false);
});

test('a large image, a gradient that leaves the ground and a varying canvas paint', () => {
  assert.equal(paintsGround(layer({ paint: 'url(photo.jpg)', tilePx: 0 }), ground), true);
  assert.equal(paintsGround(layer({ paint: 'linear-gradient(rgb(10, 10, 10), rgb(200, 40, 40))' }), ground), true);
  assert.equal(paintsGround(layer({ canvasVaries: 0.8 }), ground), true);
});

test('a blurred glow counts by its alpha times its distance from the ground', () => {
  assert.equal(paintsGround(layer({ blurred: true, bg: [250, 250, 250, 0.9] }), ground), true);
  assert.equal(paintsGround(layer({ blurred: true, bg: [11, 11, 11, 1] }), ground), false);
});
