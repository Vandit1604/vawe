// The judge text an agent sees in its terminal: the verdict, the scores on one line, the worst fixes.
// The full result stays in out/<name>.judge.json.
import { barReport } from './judge-bar.mjs';
import { trickLines } from './judge-tricks.mjs';

export const TOP_FIXES = 3;

const at = (t) => (t != null ? ` at ${t}` : '');

/** The notes (rule id first), the waiver verdicts, and the sameness and template answers. */
function findingLines(r) {
  const lines = (r.notes || []).slice(0, TOP_FIXES * 2).map((n) => `- ${n.rule ?? 'no rule'}${at(n.t)}: ${n.verdict}, ${n.note}`);
  if (r.waivers?.length) lines.push(`waivers: ${r.waivers.map((w) => `${w.code} ${w.earned ? 'earned' : 'not earned'}`).join(', ')}`);
  if (r.sameness) lines.push(`sameness: ${r.sameness.sibling ? `like ${r.sameness.films.join(', ') || 'a sibling'}: ${r.sameness.shared ?? 'no detail'}` : 'no sibling'}`);
  if (r.template) lines.push(`template: ${r.template.tell ? `yes${at(r.template.t)}: ${r.template.why ?? 'no reason given'}` : 'no'}`);
  return lines;
}

export function reportLines(r, file) {
  const scores = Object.entries(r.scores).map(([k, v]) => `${k} ${v}`).join(', ') + (r.worlds != null ? `; worlds ${r.worlds}` : '');
  const lines = [`judge --fresh (${r.stage}): ${r.verdict}`, scores, ...(r.ledger || [])];
  if (r.strongest) lines.push(`strongest: ${r.strongest}, ${r.reason ?? 'no reason given'}`);
  const worst = [...r.fixes].sort((a, b) => a.score - b.score).slice(0, TOP_FIXES);
  for (const x of worst) lines.push(`- ${x.axis} ${x.score}${x.at != null ? ` at ${x.at}` : ''} [${x.rule ?? 'no rule'}]: ${x.fix}`);
  lines.push(...findingLines(r), ...trickLines(r.tricks));
  if (r.anchor?.length) {
    lines.push(`anchor: ${r.anchor.filter((a) => a.yes).length} of ${r.anchor.length} frames YES`);
    for (const a of r.anchor.filter((x) => !x.yes).slice(0, TOP_FIXES)) lines.push(`- anchor ${a.frame}${a.at != null ? ` at ${a.at}` : ''}: NO, ${a.fix}`);
  }
  if (r.bar?.length) lines.push(...barReport(r.bar));
  lines.push(`full report: ${file}`);
  return lines;
}
