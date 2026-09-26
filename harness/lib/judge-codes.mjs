// An unknown code is refused, not warned about; it never blocks a render: quality/gates/judge.mjs still records and ships on an invalid code.
export const JUDGE_CODES = Object.freeze([
  'readability',
  'hierarchy',
  'composition',
  'brand-fidelity',
  'asset-fidelity',
  'produced-not-generated',
  'value',
  'motion-smoothness',
  'temporal-flicker',
  'aesthetic-quality',
  'edge-clip',
  'blank-frame',
]);

const CODE_SET = new Set(JUDGE_CODES);

export function isJudgeCode(code) {
  return CODE_SET.has(code);
}

// "<code>@<beat>" -> { code, beat }; beat stays a string (beats-of.mjs prints "beat N", 1-based), a census counts by position and never does arithmetic on it.
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
