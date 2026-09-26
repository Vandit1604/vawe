// tests/backgrounds/gradient-shape.test.mjs: gradientFill's `colors` (the ramp) and `stops` (each
// colour's 0..1 position) are easy to swap, since the word "stops" reads like it could mean the
// colours themselves. Before this fix a `stops` array of hex strings reached canvas addColorStop as a
// non-finite offset and crashed deep inside canvas fill code, with nothing pointing at the actual bad
// key. gradientShapeErrors is pure (no ctx) so both gradientFill itself and validate can run it.
//   node --test tests/backgrounds/gradient-shape.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { gradientShapeErrors, gradientFill } from '../../core/backgrounds/fx.js';
import { bgErrors } from '../../core/validate/backgrounds.mjs';

test('stops holding colour strings is named, with a nudge toward `colors`', () => {
  const errs = gradientShapeErrors({ stops: ['#ff0000', '#00ff00'] });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /stops must be an array of NUMBERS/);
  assert.match(errs[0], /did you mean `colors`\?/);
});

test('colors holding non-strings is named', () => {
  const errs = gradientShapeErrors({ colors: [0xff0000, 0x00ff00] });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /colors must be an array of colour strings/);
});

test('the real shape (colors: hex strings, stops: 0..1 numbers) is clean', () => {
  assert.deepEqual(gradientShapeErrors({ colors: ['#ff0000', '#00ff00'], stops: [0, 1] }), []);
});

test('neither key set is clean (both are optional)', () => {
  assert.deepEqual(gradientShapeErrors({}), []);
});

test('gradientFill itself refuses the bad shape before touching the canvas ctx', () => {
  assert.throws(() => gradientFill(null, 100, 100, 0, { stops: ['#ff0000', '#00ff00'] }),
    /stops must be an array of NUMBERS/);
});

test('bgErrors: a composed gradientFill fx with the swapped shape is named', () => {
  const errs = bgErrors({ bg: [{ base: { kind: 'linear' }, fx: [{ type: 'gradientFill', stops: ['#ff0000', '#00ff00'] }] }] });
  assert.ok(errs.some((e) => e.includes('stops must be an array of NUMBERS')), errs.join('\n'));
});

test('bgErrors: the `gradient` preset’s opts get the same shape check', () => {
  const bad = bgErrors({ bg: [{ preset: 'gradient', opts: { stops: ['#ff0000', '#00ff00'] } }] });
  assert.ok(bad.some((e) => e.includes('stops must be an array of NUMBERS')), bad.join('\n'));
  const good = bgErrors({ bg: [{ preset: 'gradient', opts: { colors: ['#ff0000', '#00ff00'], stops: [0, 1] } }] });
  assert.deepEqual(good, []);
});
