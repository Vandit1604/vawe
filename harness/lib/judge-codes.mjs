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

export function parseFix(raw) {
  const s = String(raw ?? '');
  const at = s.lastIndexOf('@');
  if (at < 0) return { code: s, beat: null };
  return { code: s.slice(0, at), beat: s.slice(at + 1) };
}

export function assertJudgeCode(code) {
  if (!isJudgeCode(code)) {
    throw new Error(`"${code}" is not a judge fix code. Valid codes: ${JUDGE_CODES.join(', ')}`);
  }
}
