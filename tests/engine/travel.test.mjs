// core/camera-moves/travel.test.mjs: the interior stations of a `travel` default to velocity-CONTINUOUS
// (`ease: "through"`, core/timeline/sequence.js), not `linear`: two straight segments at different
// speeds still kink at the shared station (engine-doctrine/MISTAKES.md, the "not smooth / jerky" report). This
// checks the fix at the level it actually plays at: the sampled camera curve, not the raw keyframes.
//   node core/camera-moves/travel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { travel } from '../../core/camera-moves/travel.js';
import { cameraAt } from '../../core/timeline/sequence.js';

// Four stations so the interior junction under test (station 2) sits between two `through` segments,
// not against the final arrival's own settle ease (a separate, smaller residual the settle owns on
// purpose, see the report).
const stations = [
  {},
  { tx: 480, ty: 270, s: 1.2, dur: 1.5 },
  { tx: 900, ty: 500, s: 1.4, dur: 1 },
  { tx: 1440, ty: 810, s: 1, dur: 1 },
];

test('interior stations default to `through`, the final arrival keeps its settle', () => {
  const kf = travel({ stations });
  assert.equal(kf[1].ease, 'through', 'the first interior station is velocity-continuous, not linear');
  assert.equal(kf[2].ease, 'through', 'the second interior station is velocity-continuous, not linear');
  assert.equal(kf[3].ease, 'easeOutCubic', 'the final arrival still settles');
});

test('the path still passes through every station at its authored time', () => {
  const kf = travel({ stations });
  for (const k of kf) {
    const at = cameraAt(kf, k.t);
    assert.ok(Math.abs(at.s - k.s) < 1e-9, `s at t=${k.t} should hit the station exactly, got ${at.s}`);
    assert.ok(Math.abs(at.x - k.x) < 1e-9, `x at t=${k.t} should hit the station exactly, got ${at.x}`);
  }
});

test('velocity is continuous across the interior station (left and right finite-difference speeds agree)', () => {
  const kf = travel({ stations });
  const dt = 1 / 1000;
  const t = kf[1].t; // both its neighbouring segments are governed by `through`, unlike kf[2] next to the settle
  const left = (cameraAt(kf, t).s - cameraAt(kf, t - dt).s) / dt;
  const right = (cameraAt(kf, t + dt).s - cameraAt(kf, t).s) / dt;
  assert.ok(Math.abs(left - right) < 0.05,
    `left/right speed either side of the interior station should agree, got ${left} vs ${right}`);
});

// `through`'s tangent is a chordal finite difference, not monotone-clamped (Fritsch-Carlson), so a
// station sequence that reverses direction can overshoot by a small amount right at the reversal (this
// one: ~0.1% of the range at the s:1.4 peak). The clamp this test actually enforces is the hard one
// dollyZ requires: s must never cross into non-positive, whatever the curve does on the way.
test('s stays positive and within a small tolerance of the authored range (no wild overshoot)', () => {
  const kf = travel({ stations });
  const sVals = kf.map((k) => k.s);
  const lo = Math.min(...sVals), hi = Math.max(...sVals);
  const tol = (hi - lo) * 0.02;
  const N = 200;
  for (let i = 0; i <= N; i++) {
    const t = kf[0].t + (kf[kf.length - 1].t - kf[0].t) * (i / N);
    const s = cameraAt(kf, t).s;
    assert.ok(s > 0, `s=${s} at t=${t} must stay positive (dollyZ's own clamp)`);
    assert.ok(s >= lo - tol && s <= hi + tol,
      `s=${s} at t=${t} overshoots the authored [${lo}, ${hi}] range by more than the 2% tolerance`);
  }
});

// engine-doctrine/MISTAKES.md #626: a real travel (vawe-flow-2.json) whose tail is all s >= 1 still pulled the
// camera BELOW every authored station, because the finite-difference tangent at a station shared by an
// unequal segment (s:1.08 -> s:1) and an equal one (s:1 -> s:1) carried velocity into the flat segment
// and bowed it downward. `tangentAt` is now Fritsch-Carlson clamped, so this must hold for exact,
// not-just-tolerant, equality.
test('a flat-tailed travel never dips below (or rises above) its own authored min/max', () => {
  const tailStations = [
    { s: 1.5, tx: 400, ty: 300, dur: 1 },
    { s: 1.08, dur: 1.95 },
    { s: 1, dur: 0.3 },
    { s: 1, dur: 2.3, tx: 960, ty: 540 },
    { s: 1, dur: 0.326 },
    { s: 1, dur: 0.724 },
    { s: 1, dur: 1.47 },
  ];
  const kf = travel({ stations: tailStations });
  const sVals = kf.map((k) => k.s);
  const lo = Math.min(...sVals), hi = Math.max(...sVals);
  const N = 2000;
  for (let i = 0; i <= N; i++) {
    const t = kf[0].t + (kf[kf.length - 1].t - kf[0].t) * (i / N);
    const s = cameraAt(kf, t).s;
    assert.ok(s >= lo - 1e-9 && s <= hi + 1e-9,
      `s=${s} at t=${t} leaves the authored [${lo}, ${hi}] range (the ground-rim regression)`);
  }
});
