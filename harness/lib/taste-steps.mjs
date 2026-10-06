// The taste lines a command prints at its step. They are generated from taste/rules/*.md into
// taste/build/steps.json (harness/dev/taste-build.mjs); each line is keyed by its rule id.
import STEPS from '../../taste/build/steps.json' with { type: 'json' };
import RULES from '../../taste/build/rules.json' with { type: 'json' };

export const TASTE_STEPS = STEPS;

const CARD = 'taste/build/CARD.md';

const format = (header, lines) => [`taste, ${header} (${CARD}):`, ...lines.map((l) => `- ${l.text} (rule ${l.rule})`)];

/** The printed lines of one step: explore, frames, storyboard, motion or check. */
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

const AT = /(?:\bat |@|\bheld )(\d+(?:\.\d+)?)(?: ?s|-)/;

// The acceptance rows (harness/lib/acceptance.mjs DEFAULT_ROWS) that a taste rule owns.
export const ROW_RULES = {
  'frozen runs of 3+ frames inside a shot': 'live-hold',
  'jerky steps': 'no-dead-stop',
  'still windows over 0.5 s outside a declared hold': 'live-hold',
  'near-identical tail tiles': 'moving-tail',
  'text cap height': 'readable-text-size',
  'text contrast': 'text-contrast',
  'read hold per line': 'readable-hold',
  'exits shorter than entrances': 'exits-shorter',
  loudness: 'sound-level',
  peak: 'sound-level',
};
const LINE_MAX = 110;
const clip = (text) => (text.length > LINE_MAX ? `${text.slice(0, LINE_MAX - 3)}...` : text);

/**
 * The rules a draft broke, one per rule id at its first second: [{ id, value, t }] in time order. `findings` are the motion
 * lint findings ({ rule, at, what }); `problems` are the draft check strings; `rows` the acceptance rows. `value` is what was measured. Pure.
 */
export function firedRules(findings, problems, rows = []) {
  const fired = findings.map((f) => ({ id: f.rule, value: f.what, t: f.at }));
  for (const r of rows.filter((x) => x.status === 'advice' && ROW_RULES[x.metric])) {
    const text = [r.measured, ...r.detail.slice(0, 1)].join(' ');
    const at = AT.exec(text);
    fired.push({ id: ROW_RULES[r.metric], value: `${r.metric}: ${text}`, t: at ? Number(at[1]) : null });
  }
  for (const p of problems) {
    const at = AT.exec(p);
    for (const id of rulesOf([p])) fired.push({ id, value: p, t: at ? Number(at[1]) : null });
  }
  const first = new Map();
  for (const f of fired.sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity))) if (!first.has(f.id)) first.set(f.id, f);
  return [...first.values()];
}

/** At most `max` lines naming the rules a draft broke: the second, the measured value, the rule file and its `instead` text. Pure. */
export function firedLines(fired, max = 3, rules = RULES) {
  return fired.slice(0, max).map(({ id, value, t }) => {
    const rule = rules[id];
    const instead = rule?.instead ? `; instead: ${clip(rule.instead.split(/(?<=\.) /)[0])}` : '';
    return `  ${t == null ? '' : `@${t.toFixed(1)}s `}${clip(value)} (rule ${id}, ${rule?.file ?? `taste/rules/${id}.md`})${instead}`;
  });
}
