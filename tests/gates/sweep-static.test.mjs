// tests/gates/sweep-static.test.mjs: assert self-check for the metric + verdict logic in
// sweep-static.mjs. No render needed: synthesize the tiny grayscale buffers by hand.
//
//   node tests/gates/sweep-static.test.mjs
import assert from 'node:assert/strict';
import { meanAbsDiff, verdict } from '../../quality/gates/sweep-static.mjs';

// ---- meanAbsDiff ----------------------------------------------------------------------------------
{
  const a = Buffer.alloc(9, 100);
  const b = Buffer.alloc(9, 100);
  assert.equal(meanAbsDiff(a, b), 0, 'identical frames diff to exactly 0');
}
{
  const a = Buffer.alloc(9, 0);
  const b = Buffer.alloc(9, 255);
  assert.equal(meanAbsDiff(a, b), 1, 'fully opposite frames diff to exactly 1 (normalized)');
}
{
  // half the pixels flip fully black->white: mean diff should land at 0.5
  const a = Buffer.from([0, 0, 0, 0, 255, 255, 255, 255]);
  const b = Buffer.from([255, 255, 255, 255, 255, 255, 255, 255]);
  assert.equal(meanAbsDiff(a, b), 0.5, 'partial change averages correctly');
}
{
  assert.equal(meanAbsDiff(null, Buffer.alloc(4)), null, 'a missing frame reads as unreadable, not zero change');
  assert.equal(meanAbsDiff(Buffer.alloc(4), Buffer.alloc(5)), null, 'mismatched sizes read as unreadable');
}

// ---- verdict: persistence-aware fail logic --------------------------------------------------------
{
  // a whole film frozen: every consecutive pair reads as no-change -> FAIL
  const allFrozen = [0, 0.0001, 0, 0.0002, 0];
  assert.equal(verdict(allFrozen, 10).fail, true, 'every pair below threshold over a long film fails');
}
{
  // one held beat is legitimate: a single near-zero pair among real motion -> PASS
  const oneHeld = [0.08, 0.0001, 0.12, 0.06];
  assert.equal(verdict(oneHeld, 10).fail, false, 'a single frozen pair among real motion does not fail');
}
{
  // real motion throughout -> PASS, and the max change is reported
  const moving = [0.05, 0.09, 0.03, 0.11];
  const v = verdict(moving, 10);
  assert.equal(v.fail, false);
  assert.equal(v.maxChange, 0.11);
}
{
  // a short film (title card / stinger) never fails, even fully frozen
  const allFrozen = [0, 0, 0];
  assert.equal(verdict(allFrozen, 2).fail, false, 'a film under the minimum duration is exempt');
}
{
  // no readable pairs at all: cannot render a verdict, so it must not fail
  assert.equal(verdict([null, null], 10).fail, false, 'no readable pairs never fails silently as static');
  assert.equal(verdict([null, null], 10).maxChange, null);
}

console.log('✓ sweep-static.test.mjs: all assertions passed');
