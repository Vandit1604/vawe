// harness/lib/judge-codes.mjs: the closed set of fix codes a judge verdict may use.
//
// One owner per fact: `engine-doctrine/JUDGE.md` names these seven dimensions in prose for a human
// reading the doctrine; this module is where they exist as data for a machine to check against. The
// doc points here rather than restating the list, so the two cannot drift apart.
//
// An unknown code is refused, not warned about: a typo (`"hierachy"`) that silently became its own
// new category is exactly the class of finding that stops being a rule (engine-doctrine/JUDGE.md's
// whole complaint about free-text `--fixes`). The refusal is a determinism concern, not a taste
// judgement, so it is the one place this module says no. It never refuses a FIX verdict itself, and it
// never blocks a render: `quality/gates/judge.mjs` still records and ships on an invalid code, it just
// will not accept the code as one of the seven.
export const JUDGE_CODES = Object.freeze([
  'readability',
  'hierarchy',
  'composition',
  'brand-fidelity',
  'asset-fidelity',
  'produced-not-generated',
  'value',
]);

const CODE_SET = new Set(JUDGE_CODES);

export function isJudgeCode(code) {
  return CODE_SET.has(code);
}

// "<code>@<beat>" -> { code, beat }. `beat` is the label already on the sheet (beats-of.mjs prints
// "beat N", 1-based), kept as a string: a census counts by position, it never does arithmetic on it.
export function parseFix(raw) {
  const s = String(raw ?? '');
  const at = s.lastIndexOf('@');
  if (at < 0) return { code: s, beat: null };
  return { code: s.slice(0, at), beat: s.slice(at + 1) };
}

// Throws with every valid code listed, so the caller's error message never has to restate the set.
export function assertJudgeCode(code) {
  if (!isJudgeCode(code)) {
    throw new Error(`"${code}" is not a judge fix code. Valid codes: ${JUDGE_CODES.join(', ')}`);
  }
}
