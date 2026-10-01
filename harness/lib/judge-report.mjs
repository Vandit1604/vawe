// The judge text an agent sees in its terminal: the verdict, the scores on one line, the worst fixes.
// The full result stays in out/<name>.judge.json.
export const TOP_FIXES = 3;

export function reportLines(r, file) {
  const scores = Object.entries(r.scores).map(([k, v]) => `${k} ${v}`).join(', ') + (r.worlds != null ? `; worlds ${r.worlds}` : '');
  const lines = [`judge --fresh (${r.stage}): ${r.verdict}`, scores, ...(r.ledger || [])];
  if (r.strongest) lines.push(`strongest: ${r.strongest}, ${r.reason ?? 'no reason given'}`);
  const worst = [...r.fixes].sort((a, b) => a.score - b.score).slice(0, TOP_FIXES);
  for (const x of worst) lines.push(`- ${x.axis} ${x.score}${x.at != null ? ` at ${x.at}` : ''}: ${x.fix}`);
  if (r.anchor?.length) {
    lines.push(`anchor: ${r.anchor.filter((a) => a.yes).length} of ${r.anchor.length} frames YES`);
    for (const a of r.anchor.filter((x) => !x.yes).slice(0, TOP_FIXES)) lines.push(`- anchor ${a.frame}${a.at != null ? ` at ${a.at}` : ''}: NO, ${a.fix}`);
  }
  lines.push(`full report: ${file}`);
  return lines;
}
