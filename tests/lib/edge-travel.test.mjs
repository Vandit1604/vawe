import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeTravel, edgeTravelDeltas } from '../../harness/lib/edge-travel.mjs';

test('a plain move travels its distance', () => {
  assert.equal(edgeTravel([0, 0, 10, 10, 0], [3, 4, 10, 10, 0]), 5);
});

test('a box that moves and grows the same way travels by both at its far edge', () => {
  assert.equal(edgeTravel([0, 0, 100, 100, 0], [10, 0, 110, 100, 0]), 20);
});

test('an inset clip that closes moves the visible edge while the box stays put', () => {
  assert.equal(edgeTravel([0, 0, 1000, 500, 0, 0, 0, 0, 0], [0, 0, 1000, 500, 0, 0, 120, 0, 0]), 120);
});

test('a turn sweeps the corner even when the bounding box does not change', () => {
  const d = edgeTravel([0, 0, 200, 200, 40], [0, 0, 200, 200, 50]);
  assert.ok(Math.abs(d - (10 * Math.PI / 180) * Math.hypot(200, 200) / 2) < 1e-9, String(d));
});

test('a turn across 360 degrees counts the short way round', () => {
  assert.ok(edgeTravel([0, 0, 100, 100, 355], [0, 0, 100, 100, 5]) < 13);
});

test('edgeTravelDeltas takes the fastest element per step', () => {
  assert.deepEqual(edgeTravelDeltas([[[0, 0, 10, 10, 0], [3, 4, 10, 10, 0]], [[0, 0, 10, 10, 0], [0, 0, 10, 10, 0]]]), [5]);
});
