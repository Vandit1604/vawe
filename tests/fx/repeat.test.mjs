// tests/fx/repeat.test.mjs: known-answer check for the AE Repeater modifier (core/fx/repeat.js).
// Run: node tests/fx/repeat.test.mjs
import assert from 'node:assert/strict';
import { resolve, repeaterK, repeaterCell, repeaterOpacity, repeaterEntrance } from '../../core/fx/repeat.js';

const L = { id: 'ring' };

// ---- resolve: validation and defaults ----
{
  const cfg = resolve({ copies: 12, offset: { rot: 30 } }, L);
  assert.equal(cfg.copies, 12);
  assert.equal(cfg.from, 'start', 'from defaults to "start"');
  assert.equal(cfg.stagger, 0, 'stagger defaults to 0, every copy plays from frame one');
  assert.equal(cfg.offset.scale, 1, 'a scale offset of 1 means no per-step size change');
  assert.throws(() => resolve({ copies: 0 }, L), /1 to 64/, 'copies below 1 is refused');
  assert.throws(() => resolve({ copies: 4, from: 'sideways' }, L), /start\/center\/end/, 'an unknown `from` is refused');
  assert.throws(() => resolve({ copies: 4, offset: { skew: 1 } }, L), /unknown offset key/, 'an unknown offset key is refused');
}

// ---- repeaterK: which copy is signed 0 (unmoved), per `from` ----
{
  assert.deepEqual([0, 1, 2, 3].map((i) => repeaterK(i, 4, 'start')), [0, 1, 2, 3]);
  assert.deepEqual([0, 1, 2, 3].map((i) => repeaterK(i, 4, 'end')), [-3, -2, -1, 0]);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => repeaterK(i, 5, 'center')), [-2, -1, 0, 1, 2]);
}

// ---- repeaterCell: a ring of 12 copies at 30deg apart closes a full circle ----
{
  const offset = { x: 0, y: 0, rot: 30, scale: 1 };
  const last = repeaterCell(repeaterK(11, 12, 'start'), offset);
  assert.equal(last.rot, 330, 'the 12th spoke (k=11) of a 30deg step sits at 330deg, one short of a full turn');
}

// ---- repeaterCell: scale compounds outward from the origin, never negative ----
{
  const offset = { x: 40, y: 0, rot: 0, scale: 0.9 };
  const c2 = repeaterCell(2, offset);
  assert.equal(c2.x, 80, 'position offset accumulates linearly: step 2 of 40px is 80px out');
  assert.ok(Math.abs(c2.scale - 0.81) < 1e-9, 'scale compounds: 0.9 twice is 0.81, never 0.9*2');
  const cNeg2 = repeaterCell(-2, offset);
  assert.equal(cNeg2.scale, c2.scale, 'a symmetric step (center `from`) shrinks the same amount either side');
}

// ---- repeaterOpacity: AE Start/End opacity across the ABSOLUTE index, not the signed step ----
{
  assert.equal(repeaterOpacity(0, 5, 0.2), 1, 'the first copy always sits at the start opacity, 1');
  assert.ok(Math.abs(repeaterOpacity(4, 5, 0.2) - 0.2) < 1e-9, 'the last of 5 copies reaches the given end opacity');
  assert.ok(Math.abs(repeaterOpacity(2, 5, 0.2) - 0.6) < 1e-9, 'the middle copy is halfway between 1 and the end opacity');
  assert.equal(repeaterOpacity(2, 5, null), 1, 'no end opacity given means every copy stays fully opaque');
}

// ---- repeaterEntrance: each copy's own staggered fade-in ----
{
  assert.equal(repeaterEntrance(0, 3, 0), 1, 'stagger 0 means every copy is already in at frame one');
  assert.equal(repeaterEntrance(0, 3, 0.05), 0, 'copy 3, staggered 0.15s, has not arrived yet at t=0');
  assert.equal(repeaterEntrance(0.45, 3, 0.05, 0.3), 1, 'copy 3 has fully arrived once its own 0.3s fade completes (0.15s delay + 0.3s fade)');
  const mid = repeaterEntrance(0.3, 3, 0.05, 0.3);
  assert.ok(Math.abs(mid - 0.5) < 1e-9, 'halfway through its own fade window, a staggered copy sits at half opacity');
}

console.log('repeat.test.mjs: the AE Repeater\'s index math, opacity ramp and stagger clock match by hand');
