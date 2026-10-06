import test from 'node:test';
import assert from 'node:assert/strict';
import { peakValue, overshoots } from '../../harness/lib/ease-curve.mjs';
import { EASE } from '../../core/motion/presets.js';
import { curveToLinear, CURVES } from '../../core/motion/springs.js';

test('the named eases: only EASE.pop goes past rest', () => {
  assert.deepEqual(Object.keys(EASE).filter((name) => overshoots(EASE[name])), ['pop']);
  assert.ok(peakValue(EASE.pop) > 1.1);
});

test('the overshoot spring curve overshoots and the plain spring does not', () => {
  assert.equal(overshoots(curveToLinear(CURVES.overshoot)), true);
  assert.equal(overshoots(curveToLinear(CURVES.spring)), false);
});

test('css keywords and cubic-bezier() are read', () => {
  for (const keyword of ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']) assert.equal(overshoots(keyword), false, keyword);
  assert.equal(overshoots('cubic-bezier(0.34, 1.56, 0.64, 1)'), true);
  assert.equal(overshoots('cubic-bezier(0.2, 0, 0, 1)'), false);
});

test('linear() reads its stop values and ignores their positions', () => {
  assert.equal(overshoots('linear(0 0%, 0.6 30%, 1.08 60%, 1 100%)'), true);
  assert.equal(overshoots('linear(0, 0.5, 1)'), false);
  assert.equal(overshoots('linear(0, 1.005, 1)'), false, 'under the tolerance');
});

test('a string it cannot read is null, not false', () => {
  for (const bad of ['inferred', 'steps(1, start)', 'cubic-bezier(1, 2)', 'linear()', '']) assert.equal(overshoots(bad), null, bad);
});
