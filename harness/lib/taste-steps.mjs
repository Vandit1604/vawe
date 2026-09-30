// The taste lines a command prints at its step. The text lives in engine-doctrine/taste-steps.json;
// each line quotes its rule row in engine-doctrine/TASTE-CARD.md (`card`), and cardMismatches finds a
// line whose quote left the card.
import STEPS from '../../engine-doctrine/taste-steps.json' with { type: 'json' };

export const TASTE_STEPS = STEPS;

const CARD = 'engine-doctrine/TASTE-CARD.md';

const format = (header, lines) => [`taste, ${header} (${CARD}):`, ...lines.map((l) => `- ${l.text} (rule ${l.rule})`)];

/** The printed lines of one step: concept, motion, sound or preship. */
export function tasteLines(step, steps = TASTE_STEPS) {
  const s = steps[step];
  if (!s) throw new Error(`taste-steps: no step "${step}"; valid: ${Object.keys(steps).join(' ')}`);
  return format(s.title, s.lines);
}

const PROBLEM_RULES = [[/^(static window|world held|blank frame)/, 2], [/^sound:/, 13]];

/** Card rule numbers behind draft check problem strings: a "(rule N" in the text, else by its kind. */
export function rulesOf(problems) {
  const rules = new Set();
  for (const p of problems) {
    const named = /\(rule (\d+)/.exec(p);
    if (named) rules.add(Number(named[1]));
    for (const [re, n] of PROBLEM_RULES) if (re.test(p)) rules.add(n);
  }
  return rules;
}

/** After a draft check: the lines for the rules behind its problems, else the motion step. */
export function draftTasteLines(problems, steps = TASTE_STEPS) {
  const rules = rulesOf(problems);
  const seen = new Set();
  const lines = Object.values(steps).flatMap((s) => s.lines)
    .filter((l) => rules.has(l.rule) && !seen.has(l.text) && seen.add(l.text));
  return lines.length ? format('the rules behind these problems', lines) : tasteLines('motion', steps);
}

/** The table row of rule n in the card text, or ''. */
export function cardRow(cardText, n) {
  return cardText.split('\n').find((l) => l.startsWith(`| ${n} |`)) || '';
}

/** Lines whose `card` quote is not in their rule's row of the card, or that are not a contrast pair. */
export function cardMismatches(cardText, steps = TASTE_STEPS) {
  const bad = [];
  for (const [step, s] of Object.entries(steps)) {
    for (const l of s.lines) {
      if (!cardRow(cardText, l.rule).includes(l.card)) bad.push(`${step}: rule ${l.rule} row has no "${l.card}"`);
      if (!/, not /.test(l.text)) bad.push(`${step}: "${l.text}" is not a "do X, not Y" pair`);
    }
  }
  return bad;
}
