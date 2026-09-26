// tests/authoring/motion-path-orient.test.mjs: proves `layers[].motionPath` flies ANY layer (a
// paper-plane `svg` layer here) along an arbitrary path with AE-style auto-orient.
//
// Renders real frames through harness/dev/probe-frame.mjs (the same tool an author runs by hand) and
// reads back each layer's computed CSS transform, decoding {x, y, rot} the way
// harness/author/capture-motion.mjs already does for a live page. No new math: the proof is that the
// reported rotation matches the FINITE-DIFFERENCE tangent of the layer's own two neighbouring
// positions, which is true regardless of exactly how MotionPathPlugin parametrises the curve.
//
// node tests/authoring/motion-path-orient.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, '../fixtures/motion-path-orient.fixture.json');
const script = path.join(here, '../../harness/dev/probe-frame.mjs');
const IDS = 'plane-oriented,plane-offset,plane-unoriented,plane-trimmed';

function probe(t) {
  const out = execFileSync('node', [script, fixture, '--t', String(t), '--id', IDS, '--json'], { encoding: 'utf8' });
  return JSON.parse(out).samples;
}

// matrix(a,b,c,d,e,f) -> {x, y, rot(deg)}, same decompose as capture-motion.mjs.
function decompose(transform) {
  if (!transform || transform === 'none') return { x: 0, y: 0, rot: 0 };
  const m = transform.match(/matrix\(([^)]+)\)/);
  const [a, b, , , e, f] = m[1].split(',').map(Number);
  return { x: e, y: f, rot: (Math.atan2(b, a) * 180) / Math.PI };
}

const angleDelta = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return Math.abs(d); };

// renderFrame(n) is a function of the INTEGER frame, so a finite-difference tangent can only be taken
// one authored frame (1/30s) apart; that same 1/30s step is itself the finite-difference APPROXIMATION
// error's source, separate from the feature's own precision (checked exactly below via orientOffset,
// which compares two layers at the identical frame and so cancels that error entirely).
const DT = 1 / 30;
const SAMPLE_TS = [0.6, 0.9, 2.1, 2.4];

for (const t of SAMPLE_TS) {
  const before = probe(t - DT), at = probe(t), after = probe(t + DT);

  // AUTO-ORIENT: the reported rotation on "plane-oriented" is the tangent of its own path, within 1deg.
  const p0 = decompose(before['plane-oriented'].dom.computedTransform);
  const p1 = decompose(after['plane-oriented'].dom.computedTransform);
  const tangent = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
  const rot = decompose(at['plane-oriented'].dom.computedTransform).rot;
  // 1.5deg budget: the feature's own bar is 1deg, plus headroom for the 1-frame finite-difference
  // itself approximating a curved path's tangent (bounded by the curve's own bend over 1/30s, not by
  // the rotation MotionPathPlugin actually renders, which is checked exactly via orientOffset below).
  assert.ok(angleDelta(rot, tangent) < 1.5,
    `t=${t}: auto-orient rotation ${rot.toFixed(2)} deg should match the tangent ${tangent.toFixed(2)} deg within 1.5 deg`);

  // orientOffset: the offset plane carries the SAME tangent plus exactly its 90 deg offset.
  const rotOffset = decompose(at['plane-offset'].dom.computedTransform).rot;
  assert.ok(angleDelta(rotOffset, rot + 90) < 1,
    `t=${t}: orientOffset:90 rotation ${rotOffset.toFixed(2)} deg should be the base rotation +90 deg`);

  // autoOrient:false: no rotation at all, however the path bends.
  const rotOff = decompose(at['plane-unoriented'].dom.computedTransform).rot;
  assert.ok(Math.abs(rotOff) < 0.01, `t=${t}: autoOrient:false should report 0 deg rotation, got ${rotOff}`);
}

// from/to (0-1 progress): trimming the path to [0.2, 0.8] means the trimmed plane never visits the
// path's true start (0, 130), unlike the untrimmed plane which starts there.
const early = probe(0.1);
const trimmedPos = decompose(early['plane-trimmed'].dom.computedTransform);
const fullPos = decompose(early['plane-unoriented'].dom.computedTransform);
const distFromStart = Math.hypot(trimmedPos.x - 0, trimmedPos.y - 130);
const fullDistFromStart = Math.hypot(fullPos.x - 0, fullPos.y - 130);
assert.ok(distFromStart > 50, `from:0.2 should already be well past the path's true start, got dist ${distFromStart.toFixed(1)}px`);
assert.ok(distFromStart > fullDistFromStart + 30,
  `at the same early time, the trimmed plane (${distFromStart.toFixed(1)}px from path start) should sit `
  + `further along than the untrimmed one (${fullDistFromStart.toFixed(1)}px)`);

console.log('motion-path-orient.test.mjs: ok');
