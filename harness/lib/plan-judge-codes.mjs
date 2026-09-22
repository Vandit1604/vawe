// harness/lib/plan-judge-codes.mjs: the closed set of finding codes the plan judge may use.
//
// Same shape as harness/lib/judge-codes.mjs (the vision judge's own closed set), one owner per fact:
// the six questions are named in prose in harness/author/critics.mjs's buildPlanJudgeBrief, this is
// where they exist as data a recorded verdict is checked against. An unknown code is refused rather
// than silently minting a new category, same reasoning judge-codes.mjs gives for its own seven.
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

// PLAN_JUDGE_PRIORITY: Murch's Rule of Six ranks a finding by WHAT KIND of thing it is wrong about,
// never by how many of them there are. Cited in this repo already at engine-doctrine/CRAFT/
// TRANSITIONS.md:3,14, engine-doctrine/CRAFT/EYE-TRACE.md:170 and engine-doctrine/RESEARCH/
// MOTION-CANON.md:206; the source is Walter Murch, "In the Blink of an Eye" (1995), the editor's own
// six reasons to cut, in HIS descending order: emotion (51%), story (23%), rhythm (10%), eye-trace
// (7%), the two-dimensional plane of the screen (5%), three-dimensional space/continuity (4%).
//
// The five original plan-judge codes are not Murch's six names, they are this repo's own five
// questions (harness/author/critics.mjs's buildPlanJudgeBrief), so each one is placed at the Murch
// category its question actually asks, not matched by string:
//   spectacle       -> emotion:   "is the nominated SPECTACLE the loudest moment" IS the emotional peak
//   through-line     -> story:     "is there ONE through-line" is Murch's story question by name
//   beat-pacing      -> rhythm:    "does every beat earn its seconds" is a cutting-rhythm question
//   eye-path         -> eye-trace: "does the eye path hold across beats" is eye-trace by name
//   motion-variety   -> screen-plane/continuity: Murch's two lowest categories (5%+4%) have no separate
//                       code here; "does the motion plan vary or repeat" is a composition/continuity
//                       question over a beat's cutting decision, so it inherits both of Murch's lowest
//                       ranks and sits last.
// Five codes over six categories is a lossy fit, not a hidden sixth number: nothing here adds a
// percentage back in (see the ratchet note below), only an ORDER.
//
// field-craft is the sixth code and sits OUTSIDE Murch's six on purpose: Murch's list ranks reasons
// to CUT, one shot against the next; field-craft asks whether a single craft line is checkable against
// a picture at all ("one eyedropped violet/magenta haze" names a hex, not a treatment). That is a
// precondition on the other five, not a rival cutting reason, so it does not compete for one of
// Murch's ranks. It is placed LAST by convention, after the lowest Murch rank: a plan that fails it is
// wrong about what the reference shows, which is worth flagging, but the ranking above still orders
// findings by what an editor would fix first once the plan is grounded in the right picture.
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
