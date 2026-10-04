// The taste lines a command prints at its step. They are generated from taste/rules/*.md into
// taste/build/steps.json (harness/dev/taste-build.mjs); each line is keyed by its rule id.
import STEPS from '../../taste/build/steps.json' with { type: 'json' };

export const TASTE_STEPS = STEPS;

const CARD = 'taste/build/CARD.md';

const format = (header, lines) => [`taste, ${header} (${CARD}):`, ...lines.map((l) => `- ${l.text} (rule ${l.rule})`)];

/** The printed lines of one step: concept, motion, sound or preship. */
export function tasteLines(step, steps = TASTE_STEPS) {
  const s = steps[step];
  if (!s) throw new Error(`taste-steps: no step "${step}"; valid: ${Object.keys(steps).join(' ')}`);
  return format(s.title, s.lines);
}

const PROBLEM_RULES = [[/^(world held|blank frame)/, 'world-turns'], [/^static window/, 'live-hold'], [/^sound:/, 'sound-level']];

/** Rule ids behind draft check problem strings: a "(rule <id>" in the text, else by its kind. */
export function rulesOf(problems) {
  const rules = new Set();
  for (const p of problems) {
    const named = /\(rule ([a-z][a-z0-9-]*)/.exec(p);
    if (named) rules.add(named[1]);
    for (const [re, id] of PROBLEM_RULES) if (re.test(p)) rules.add(id);
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
