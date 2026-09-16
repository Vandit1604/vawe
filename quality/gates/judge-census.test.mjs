// quality/gates/judge-census.test.mjs: prove the count against inputs worked out by hand.
//
// There is currently ~one real receipt in the whole repo (engine-doctrine's own words about this plan),
// so this is the only place the counting logic is actually exercised. Three fixture receipts, by hand:
//
//   film A: fixes at beats 1, 3, 5 (three distinct beats) -> ranks 0,1,2 of 3 -> first, middle, last
//   film B: fixes at beats 2, 2 (one distinct beat, twice) -> single distinct beat -> both land "middle"
//   film C: legacy free-text `--fixes` string, no structured fixes at all -> counted as unparsedLegacy,
//           contributes nothing to byDimension/byBeatPosition
//
//   node quality/gates/judge-census.test.mjs
import assert from 'node:assert/strict';
import { census, loadReceipts } from './judge-census.mjs';
import { JUDGE_CODES } from '../../harness/lib/judge-codes.mjs';

// --- census() over hand-built receipts, no filesystem involved --------------------------------------
const receipts = [
  { verdict: 'FIX', fixes: [
    { code: 'hierarchy', beat: '1' },
    { code: 'composition', beat: '3' },
    { code: 'value', beat: '5' },
  ] },
  { verdict: 'FIX', fixes: [
    { code: 'readability', beat: '2' },
    { code: 'readability', beat: '2' },
  ] },
  { verdict: 'FIX', fixes: 'looked rough around the middle' }, // pre-Task-2 free-text shape
  { verdict: 'PASS' }, // a clean film: looked at, nothing to fix, no fixes array at all
];

const c = census(receipts);

assert.equal(c.totalReceipts, 4);
assert.equal(c.receiptsWithFixes, 2, 'the legacy-prose and PASS-with-no-fixes receipts do not count as "with fixes"');
assert.equal(c.totalFixes, 5);
assert.equal(c.unparsedLegacy, 1);

assert.equal(c.byDimension.hierarchy, 1);
assert.equal(c.byDimension.composition, 1);
assert.equal(c.byDimension.value, 1);
assert.equal(c.byDimension.readability, 2);
for (const code of JUDGE_CODES) if (!['hierarchy', 'composition', 'value', 'readability'].includes(code)) {
  assert.equal(c.byDimension[code], 0, `${code} was never flagged in the fixture and must read 0`);
}

// film A: 3 distinct beats -> first/middle/last, one each. film B: 1 distinct beat, twice -> both middle.
assert.equal(c.byBeatPosition.first, 1);
assert.equal(c.byBeatPosition.middle, 3);
assert.equal(c.byBeatPosition.last, 1);

assert.deepEqual(c.unknownCodes, {}, 'every code in the fixture is one of the seven; nothing should land in unknownCodes');

// an unrecognised code must be counted, never silently dropped (the #401 lesson)
const withUnknown = census([{ fixes: [{ code: 'hierachy', beat: '1' }] }]); // the exact typo the doc-comment warns about
assert.equal(withUnknown.unknownCodes.hierachy, 1);
assert.equal(withUnknown.byDimension.hierarchy, 0, 'a typo must not silently credit the real dimension');

// --- loadReceipts() against a real (empty) directory, so the read path itself is exercised -----------
assert.deepEqual(loadReceipts('/nonexistent/judge-census-test-dir'), [], 'a missing receipts directory reads as zero receipts, never a crash');

console.log('✓ judge-census.test.mjs: dimension counts, relative beat position (first/middle/last), and unparsed/unknown codes all match by hand');
