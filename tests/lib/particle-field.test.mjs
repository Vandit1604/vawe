import test from 'node:test';
import assert from 'node:assert/strict';
import { readParticleField, directionWord, spritesOf, commonShift } from '../../harness/lib/ref-measure/particle-field.mjs';

const W = 200, H = 200;

// A dark ground with `n` white 3 x 3 sprites on a fixed grid, the whole field shifted by (dx, dy) px per frame; some rows are drawn at random heights.
function frames(count, dx, dy, n = 40) {
  const seeds = Array.from({ length: n }, (_, i) => ({ x: 10 + ((i * 37) % 150), y: 10 + ((i * 53) % 150) }));
  return Array.from({ length: count }, (_, f) => {
    const g = new Uint8Array(W * H).fill(20);
    for (const s of seeds) {
      const x0 = Math.round(s.x + dx * f), y0 = Math.round(s.y + dy * f);
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
        const px = x0 + x, py = y0 + y;
        if (px >= 0 && px < W && py >= 0 && py < H) g[py * W + px] = 240;
      }
    }
    return g;
  });
}

test('spritesOf finds small bright spots and not a large panel', () => {
  const g = frames(1, 0, 0, 10)[0];
  for (let y = 100; y < 180; y++) for (let x = 100; x < 180; x++) g[y * W + x] = 200;
  const found = spritesOf(g, W, H);
  assert.ok(found.length >= 9 && found.length <= 12);
});

test('readParticleField reports count, direction, speed and spread of a drifting field', () => {
  const field = readParticleField(frames(6, -2, 4), W, H, 15);
  assert.ok(field.count.median >= 30);
  assert.equal(field.direction, 'down-left');
  assert.ok(Math.abs(field.speed - (Math.hypot(2, 4) * 15) / H) < 0.05, `speed ${field.speed}`);
  assert.ok(field.coherence > 0.8);
  assert.ok(field.spread.x > 0.5 && field.spread.y > 0.5);
});

test('readParticleField is null for a frame with a few parts', () => {
  assert.equal(readParticleField(frames(4, 1, 1, 4), W, H, 15), null);
});

test('directionWord names eight directions on screen coordinates', () => {
  assert.equal(directionWord(1, 0), 'right');
  assert.equal(directionWord(0, 1), 'down');
  assert.equal(directionWord(-1, -1), 'up-left');
});

test('commonShift picks the shared displacement among decoys', () => {
  const a = [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 90, y: 20 }];
  const b = [{ x: 13, y: 12 }, { x: 53, y: 52 }, { x: 93, y: 22 }, { x: 70, y: 70 }];
  const s = commonShift(a, b, 20);
  assert.deepEqual([s.dx, s.dy], [3, 2]);
  assert.equal(s.share, 1);
});
