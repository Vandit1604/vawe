// harness/lib/plan-judge-codes.test.mjs
//   node --test harness/lib/plan-judge-codes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_JUDGE_CODES, PLAN_JUDGE_PRIORITY, rankPlanJudgeFindings } from '../../harness/lib/plan-judge-codes.mjs';

test('PLAN_JUDGE_PRIORITY is a total order over the exact same five codes, no more, no fewer', () => {
  assert.deepEqual([...PLAN_JUDGE_PRIORITY].sort(), [...PLAN_JUDGE_CODES].sort());
});

test('rankPlanJudgeFindings orders by Murch, not by input order', () => {
  const input = [
    { code: 'motion-variety', note: 'a' },
    { code: 'spectacle', note: 'b' },
    { code: 'eye-path', note: 'c' },
  ];
  const out = rankPlanJudgeFindings(input);
  assert.deepEqual(out.map((f) => f.code), ['spectacle', 'eye-path', 'motion-variety']);
});

test('rankPlanJudgeFindings is stable for two findings of the same code', () => {
  const input = [
    { code: 'through-line', note: 'first' },
    { code: 'through-line', note: 'second' },
  ];
  const out = rankPlanJudgeFindings(input);
  assert.deepEqual(out.map((f) => f.note), ['first', 'second']);
});

test('rankPlanJudgeFindings never sums or drops a finding: same length in and out', () => {
  const input = PLAN_JUDGE_CODES.map((code) => ({ code }));
  const out = rankPlanJudgeFindings(input);
  assert.equal(out.length, input.length);
});
