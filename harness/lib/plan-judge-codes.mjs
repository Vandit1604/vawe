// Same shape as harness/lib/judge-codes.mjs's own closed set: an unknown code is refused rather than silently minting a new category.
export const PLAN_JUDGE_CODES = Object.freeze([
  'through-line',
  'beat-pacing',
  'spectacle',
  'eye-path',
  'motion-variety',
  'field-craft',
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

// Murch's Rule of Six (Walter Murch, "In the Blink of an Eye", 1995): emotion 51%, story 23%, rhythm 10%, eye-trace 7%, screen-plane 5%, continuity 4%, cited at engine-doctrine/CRAFT/TRANSITIONS.md:3,14 and EYE-TRACE.md:170.
// field-craft is a sixth code outside Murch's six, placed last on purpose: it is a precondition on the other five, not a rival cutting reason.
export const PLAN_JUDGE_PRIORITY = Object.freeze([
  'spectacle',
  'through-line',
  'beat-pacing',
  'eye-path',
  'motion-variety',
  'field-craft',
]);

const PRIORITY_INDEX = new Map(PLAN_JUDGE_PRIORITY.map((code, i) => [code, i]));

/**
 * rankPlanJudgeFindings(findings): sort findings by Murch's Rule of Six order, stable on ties (there
 * are none: PLAN_JUDGE_PRIORITY is a total order over the five codes). This is an ORDER, never a
 * SCORE: nothing here sums, weights or averages a finding, because a total would be a threshold by
 * the back door (the percentages above describe weight, not arithmetic, and are not read by this
 * function). An unknown code sorts last and is left for assertPlanJudgeCode to refuse elsewhere.
 */
export function rankPlanJudgeFindings(findings) {
  const rank = (fd) => PRIORITY_INDEX.get(fd && fd.code) ?? PLAN_JUDGE_PRIORITY.length;
  return findings
    .map((fd, i) => ({ fd, i }))
    .sort((a, b) => (rank(a.fd) - rank(b.fd)) || (a.i - b.i))
    .map(({ fd }) => fd);
}
