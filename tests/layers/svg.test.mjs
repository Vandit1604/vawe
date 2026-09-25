// tests/layers/svg.test.mjs: the runnable self-check for the `svg` layer's `draw` reveal.
// Bug: a path with an arc (`A`) command showed a disconnected round-cap dot at u≈0, at the seam
// between the line and the arc, before the real stroke sweep began there (engine-doctrine/MISTAKES.md). The cause
// was `pathLength="1"` normalising the dash to the browser's own (arc-inaccurate) length estimate;
// the fix measures the path's REAL length with getTotalLength() and dashes in real units instead.
// drawOffset(total, u) is the pure arithmetic left over from that fix, no DOM required to assert it.
//   node tests/layers/svg.test.mjs
import assert from 'node:assert/strict';
import { drawOffset } from '../../core/layers/svg.js';

const TOTAL = 66.61; // roughly the post-halyard mark's real length (line + two semicircle arcs)

// At u=0 nothing is revealed: the offset equals the whole length, so the visible dash (length TOTAL,
// starting TOTAL along a dasharray whose period is 2*TOTAL) has not reached the path yet.
assert.equal(drawOffset(TOTAL, 0), TOTAL, 'u=0 must hide the entire path (offset == total length)');

// At u=1 the path is fully revealed.
assert.equal(drawOffset(TOTAL, 1), 0, 'u=1 must reveal the entire path (offset == 0)');

// Monotonic, non-increasing as u climbs 0→1: the revealed length only ever grows, at ANY total length
// and at every path (including one that is one straight line, no arc at all) equally.
for (const total of [0, 1, 66.61, 500]) {
  let prev = Infinity;
  for (let i = 0; i <= 100; i++) {
    const u = i / 100;
    const off = drawOffset(total, u);
    assert.ok(off <= prev + 1e-9, `drawOffset(${total}, u) must be non-increasing: at u=${u} got ${off} after ${prev}`);
    assert.ok(off >= -1e-9 && off <= total + 1e-9, `drawOffset(${total}, ${u})=${off} must stay within [0, total]`);
    prev = off;
  }
}

// Clamped: a u outside [0,1] (an eased overshoot, or a caller that forgot to clamp) never produces a
// negative reveal or one past the full path, the two ways an out-of-range offset would paint a seam.
assert.equal(drawOffset(TOTAL, -0.5), TOTAL, 'u<0 clamps to fully hidden');
assert.equal(drawOffset(TOTAL, 1.5), 0, 'u>1 clamps to fully revealed');
