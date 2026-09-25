// core/layers/falloff.test.mjs: fast pure-JS asserts for `falloffMask` (core/layers/util.js), the
// AE gradient-ramp operator: a value going 1 at a point to 0 with distance, expressed as a CSS
// mask-image radial-gradient. No DOM needed: the function under test is pure.
//
//   node --test core/layers/falloff.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { falloffMask } from '../../core/layers/util.js';

test('default: opaque at the centre, transparent by the outer radius (1 at source, 0 with distance)', () => {
  const g = falloffMask();
  assert.match(g, /at 50\.0% 50\.0%/);
  assert.match(g, /rgba\(0,0,0,1\) 0%/);
  assert.match(g, /rgba\(0,0,0,0\) 60\.0%\)$/);
});

test('cx/cy move the source; radius sets where alpha reaches 0', () => {
  const g = falloffMask({ cx: 0.2, cy: 0.8, radius: 0.3 });
  assert.match(g, /at 20\.0% 80\.0%/);
  assert.match(g, /rgba\(0,0,0,0\) 30\.0%\)$/);
});

test('invert: 0 at the source, growing to `amount` with distance, the vignette shape', () => {
  const g = falloffMask({ invert: true });
  assert.match(g, /rgba\(0,0,0,0\) 0%/);
  assert.match(g, /rgba\(0,0,0,1\) 60\.0%\)$/);
});

test('amount caps the far end below full opacity: a dim, not a cut', () => {
  const g = falloffMask({ invert: true, amount: 0.6 });
  assert.match(g, /rgba\(0,0,0,0\.6\) 60\.0%\)$/);
});

test('amount is clamped to [0,1] and feather to [0,1], never NaN or a negative stop', () => {
  const g = falloffMask({ amount: 5, feather: -1 });
  assert.doesNotMatch(g, /NaN|-\d/);
});
