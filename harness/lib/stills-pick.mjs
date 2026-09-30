// When `vawe dev` runs the stills judge on a film's three directions, and the three lines it prints.
// Pure: harness/media/directions-judge.mjs reads the files and runs the judge.
import { createHash } from 'node:crypto';
import { parseDirections, isFilled } from './directions.mjs';

/** The content key of what the stills judge sees: directions.html and the brief's three slots. */
export function stillsKey(html, brief) {
  const slots = parseDirections(brief).slots.map((s) => [s.id, s.fields]);
  return createHash('sha1').update(JSON.stringify([html, slots])).digest('hex').slice(0, 16);
}

/** 'skip' (nothing to judge), 'cached' (judged at this key already) or 'run'. */
export function stillsAction({ brief, html, cached }) {
  if (brief == null || html == null) return 'skip';
  if (parseDirections(brief).slots.filter(isFilled).length < 3) return 'skip';
  return cached?.key === stillsKey(html, brief) ? 'cached' : 'run';
}

/** Three lines: the pick with each direction's score, the reason, and the fix to make first. */
export function stillsLines(r, { cached = false } = {}) {
  const scores = (r.directions || []).map((d) => `${d.id} ${d.score}`).join(', ');
  const axes = Object.entries(r.scores || {}).map(([k, v]) => `${k} ${v}`).join(', ');
  return [
    `stills judge${cached ? ' (unchanged since the last run)' : ''}: pick ${r.strongest ?? '?'} (${scores || 'no scores'}; ${axes})`,
    `  why: ${r.reason ?? 'no reason given'}`,
    `  fix first: ${r.fixFirst ?? 'nothing under 8'}`,
  ];
}
