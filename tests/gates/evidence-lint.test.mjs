// tests/gates/evidence-lint.test.mjs: the judge evidence linter (harness/lib/evidence-lint.mjs).
// A structured judge can pass the old check ("evidence" is a non-empty string) with filler like
// "readability looks fine": nothing anyone could act on. These tests hold the four refusal rules
// down: no concrete observation, the criterion's own name echoed back, a low score with no named
// defect, and two criteria sharing one templated string.
//   node --test tests/gates/evidence-lint.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { lintEvidence, lintCriteriaSet } from '../../harness/lib/evidence-lint.mjs';

const CTX = { code: 'readability', label: 'text legible at size' };

test('accepts evidence naming an element plus a concrete property', () => {
  const good = [
    'the CTA button sits 40px left of centre, off its grid column',
    'headline text fades in 0.3s late against the beat 2 @1.4s hold',
    'the background is washed out grey where the house style calls for cobalt',
  ];
  for (const e of good) assert.deepEqual(lintEvidence(e, CTX), [], `should accept: "${e}"`);
});

test('rejects filler with no concrete observation', () => {
  const bad = ['readability looks fine', 'hierarchy is good', 'looks fine (composition)'];
  for (const e of bad) assert.ok(lintEvidence(e, CTX).length > 0, `should reject: "${e}"`);
});

test('rejects evidence that only echoes the criterion name', () => {
  const reasons = lintEvidence('readability checks out', CTX);
  assert.ok(reasons.length > 0);
});

test('a low score demands a named defect', () => {
  const noDefect = lintEvidence('the CTA button sits at centre', { ...CTX, score: 1 });
  assert.ok(noDefect.some((r) => r.includes('needs a named defect')));

  const withDefect = lintEvidence('the CTA button is clipped off the right edge at 40px', { ...CTX, score: 1 });
  assert.deepEqual(withDefect, []);
});

test('lintCriteriaSet flags two criteria sharing identical evidence', () => {
  const criteria = {
    readability: { score: 3, evidence: 'the headline sits 20px left of centre', label: 'readability' },
    hierarchy: { score: 3, evidence: 'the headline sits 20px left of centre', label: 'hierarchy' },
  };
  const issues = lintCriteriaSet(criteria);
  assert.ok(issues.readability || issues.hierarchy);
  const flagged = issues.readability || issues.hierarchy;
  assert.ok(flagged.some((r) => r.includes('must differ across criteria')));
});

test('lintCriteriaSet passes distinct, specific evidence per criterion', () => {
  const criteria = {
    readability: { score: 3, evidence: 'the headline sits 20px left of centre', label: 'readability' },
    hierarchy: { score: 3, evidence: 'the CTA button is oversized against the headline above it', label: 'hierarchy' },
  };
  assert.deepEqual(lintCriteriaSet(criteria), {});
});
