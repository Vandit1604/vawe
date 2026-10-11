import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseCrf } from '../../harness/lib/clip-budget.mjs';

const MB = 1024 * 1024;

test('a clip that fits at the render crf keeps it', () => {
  assert.deepEqual(chooseCrf(() => MB), { crf: 16, bytes: MB, fits: true });
});

test('the first crf, in steps of 3, whose size fits is chosen and no later one is tried', () => {
  const tried = [];
  const sizes = { 16: 14 * MB, 19: 9 * MB, 22: 5 * MB, 25: 1.9 * MB, 28: MB };
  const r = chooseCrf((crf) => { tried.push(crf); return sizes[crf]; });
  assert.deepEqual(tried, [16, 19, 22, 25]);
  assert.equal(r.crf, 25);
  assert.ok(r.fits);
});

test('when nothing fits the cap is the last crf tried and fits is false', () => {
  const tried = [];
  const r = chooseCrf((crf) => { tried.push(crf); return 9 * MB; });
  assert.deepEqual(tried, [16, 19, 22, 25, 28, 31]);
  assert.deepEqual(r, { crf: 31, bytes: 9 * MB, fits: false });
});

test('the budget, start, step and cap are options', () => {
  assert.equal(chooseCrf((crf) => (crf >= 20 ? 1 : 99), { budget: 50, from: 14, step: 2, cap: 40 }).crf, 20);
});
