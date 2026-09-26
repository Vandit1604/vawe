// tests/tracks/trim.test.mjs: known-answer check for AE Trim Paths (core/tracks/trim.js).
// Run: node tests/tracks/trim.test.mjs
import assert from 'node:assert/strict';
import { trimDash } from '../../core/tracks/trim.js';

const TOTAL = 200;

// start=0, end=1: the whole path is revealed, no gap.
{
  const { dasharray, dashoffset } = trimDash(TOTAL, 0, 1, 0);
  assert.equal(dasharray, '200 0', 'a full trim draws with no gap in the dasharray');
  assert.equal(dashoffset, '0.000', 'a full trim with no offset does not shift the pattern');
}

// start=0, end=0: nothing revealed, a draw-on's very first frame.
{
  const { dasharray } = trimDash(TOTAL, 0, 0, 0);
  assert.equal(dasharray, '0.000 200.000', 'a zero-length segment leaves the whole path in the gap');
}

// A quarter revealed in the middle of the path.
{
  const { dasharray, dashoffset } = trimDash(TOTAL, 0.25, 0.5, 0);
  assert.equal(dasharray, '50.000 150.000', 'end=0.5 minus start=0.25 of a 200px path is a 50px segment');
  assert.equal(dashoffset, '-50.000', 'the segment starts 50px (0.25 of the path) into the pattern');
}

// A reversed pair (start > end, as an offset spin can produce mid-keyframe) is swapped, not refused.
{
  const a = trimDash(TOTAL, 0.5, 0.25, 0);
  const b = trimDash(TOTAL, 0.25, 0.5, 0);
  assert.equal(a.dasharray, b.dasharray, 'start/end reversed reads the same segment length as start<end');
}

// `offset` slides the revealed segment without changing its length.
{
  const at0 = trimDash(TOTAL, 0, 0.2, 0);
  const at1 = trimDash(TOTAL, 0, 0.2, 0.5);
  assert.equal(at0.dasharray, at1.dasharray, 'offset never changes the segment length, only where it sits');
  assert.equal(at1.dashoffset, '-100.000', 'offset 0.5 of a 200px path slides the pattern 100px, a half turn');
}

console.log('trim.test.mjs: AE Trim Paths dasharray/dashoffset match by hand for start/end/offset');
