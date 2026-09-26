// tests/validate/svg-degenerate.test.mjs: the runnable self-check for svgDegeneratePathErrors
// (core/validate/cli.mjs). Bug: an svg layer whose `d` is a lone moveto ("M0 0") is valid SVG and
// paints nothing, so it used to validate clean and render invisible with no error naming why.
//   node --test tests/validate/svg-degenerate.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { svgDegeneratePathErrors } from '../../core/validate/cli.mjs';

test('a lone moveto is refused, named, with the layer index', () => {
  const errors = svgDegeneratePathErrors({ layers: [{ type: 'svg', d: 'M0 0' }] });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /layer\[0\]/);
  assert.match(errors[0], /degenerate/);
});

test('an empty or missing `d` is refused the same way', () => {
  assert.equal(svgDegeneratePathErrors({ layers: [{ type: 'svg', d: '' }] }).length, 1);
  assert.equal(svgDegeneratePathErrors({ layers: [{ type: 'svg' }] }).length, 1);
});

test('a real path (a moveto plus a draw command) passes clean', () => {
  const errors = svgDegeneratePathErrors({ layers: [{ type: 'svg', d: 'M50 5 L95 95 L5 95 Z' }] });
  assert.deepEqual(errors, []);
});

test('a non-svg layer is never inspected, even with the same degenerate shape of `d`', () => {
  const errors = svgDegeneratePathErrors({ layers: [{ type: 'rect', d: 'M0 0' }] });
  assert.deepEqual(errors, []);
});
