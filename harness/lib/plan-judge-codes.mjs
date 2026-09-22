// harness/lib/plan-judge-codes.mjs: the closed set of finding codes the plan judge may use.
//
// Same shape as harness/lib/judge-codes.mjs (the vision judge's own closed set), one owner per fact:
// the five questions are named in prose in harness/author/critics.mjs's buildPlanJudgeBrief, this is
// where they exist as data a recorded verdict is checked against. An unknown code is refused rather
// than silently minting a new category, same reasoning judge-codes.mjs gives for its own seven.
export const PLAN_JUDGE_CODES = Object.freeze([
  'through-line',
  'beat-pacing',
  'spectacle',
  'eye-path',
  'motion-variety',
]);

const CODE_SET = new Set(PLAN_JUDGE_CODES);

export function isPlanJudgeCode(code) {
  return CODE_SET.has(code);
}

export function assertPlanJudgeCode(code) {
  if (!isPlanJudgeCode(code)) {
    throw new Error(`"${code}" is not a plan-judge finding code. Valid codes: ${PLAN_JUDGE_CODES.join(', ')}`);
  }
}
