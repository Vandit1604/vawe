// tests/gates/ground-flip.test.mjs: the pure functions harness/lib/ground-flip.mjs exports, moved
// here from quality/gates/ground-arc.mjs's own `--self-test` when that gate (a TASTE gate:
// engine-doctrine/SAFEGUARDS.md) was retired. The measurement stayed: quality/gates/plan-vs-render.mjs
// still calls measureGroundFlips for its OBJECTIVE `ground-value-mismatch` check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findFlips, isDeclared, beatsAround, measureTransition, planDeclaresGround, declaredCrossfadeSeconds,
} from '../../harness/lib/ground-flip.mjs';

test('ground-flip: known-truth fixture finds all four real flips', () => {
  // vawe-flow-2's real render measures white 0s, dark 1.5-4.5s, white 5-7s, dark 7.5-9s, white
  // 9.5-11s on top-strip luma.
  const knownTruth = [
    { t: 0, lum: 250 }, { t: 0.5, lum: 240 }, { t: 1, lum: 90 }, { t: 1.5, lum: 42 }, { t: 2, lum: 48 },
    { t: 4, lum: 44 }, { t: 4.5, lum: 43 }, { t: 5, lum: 250 }, { t: 6, lum: 250 }, { t: 7, lum: 245 },
    { t: 7.5, lum: 60 }, { t: 8, lum: 55 }, { t: 9, lum: 52 }, { t: 9.5, lum: 250 }, { t: 10.5, lum: 255 },
  ];
  assert.equal(findFlips(knownTruth).length, 4);
});

test('ground-flip: a steady-luma fixture reports zero flips', () => {
  const steady = [{ t: 0, lum: 250 }, { t: 1, lum: 248 }, { t: 2, lum: 252 }];
  assert.equal(findFlips(steady).length, 0);
});

test('ground-flip: isDeclared reads schedule proximity, not the verdict', () => {
  const cfg = { bg: [{ from: 0, to: 1.2 }, { from: 1.25, to: 2.75 }], recipes: [{ at: 4.7 }] };
  assert.ok(isDeclared(cfg, 1.3), 'a flip at a bg boundary must read as declared');
  assert.ok(isDeclared(cfg, 4.9), 'a flip near a recipe join must read as declared');
  assert.ok(!isDeclared(cfg, 9.0), 'a flip with no schedule point nearby must not read as declared');
});

test('ground-flip: beatsAround names the beat on each side of a flip', () => {
  const beats = [{ n: 1, t0: 0, t1: 1.2 }, { n: 2, t0: 1.25, t1: 2.5 }];
  const { before, after } = beatsAround(beats, 1.22);
  assert.equal(before?.n, 1);
  assert.equal(after?.n, 2);
});

test('ground-flip: a 0.5s crossfade measures as carried, a 3-frame jump does not, even with a schedule point on it', () => {
  const smooth = []; for (let t = 0; t <= 1; t += 1 / 30) smooth.push({ t: +t.toFixed(4), lum: t < 0.25 ? 250 : t > 0.75 ? 40 : 250 - (t - 0.25) / 0.5 * 210 });
  const smoothTrans = measureTransition(smooth, 0.5, { fps: 30 });
  assert.ok(smoothTrans && smoothTrans.duration >= 0.3, `expected a carried crossfade, got ${JSON.stringify(smoothTrans)}`);

  const abrupt = [{ t: 0, lum: 250 }, { t: 0.033, lum: 250 }, { t: 0.066, lum: 145 }, { t: 0.1, lum: 40 }, { t: 0.2, lum: 40 }];
  const abruptTrans = measureTransition(abrupt, 0.066, { fps: 30 });
  assert.ok(abruptTrans && abruptTrans.duration < 0.3, `expected a flash, got ${JSON.stringify(abruptTrans)}`);

  const scheduledCfg = { bg: [{ from: 0, to: 0.066 }, { from: 0.066, to: 0.2 }] };
  assert.ok(isDeclared(scheduledCfg, 0.066), 'the fixture must have a schedule point at the flip');
});

test('ground-flip: planDeclaresGround reads the plan, not the schedule', () => {
  assert.ok(!planDeclaresGround('', null, null), 'an empty plan must not read as declaring a ground change');
  const noPlan = 'color: "just a plain white background, nothing changes"';
  assert.ok(!planDeclaresGround(noPlan, null, null));
  const withPlan = 'color: "the dark terminal ground crossfades to the white-first ground"';
  assert.ok(planDeclaresGround(withPlan, null, null));
  assert.equal(declaredCrossfadeSeconds('crossfade over 0.4s'), 0.4);
});
