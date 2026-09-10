// harness/lib/why.mjs: `make why D=<film> [N=5]`. Prints the last N runs logged for a film
// (harness/lib/runlog.mjs) as a short table, then the diff between the last two: what newly fired,
// what stopped firing. This is the answer to "when a render is bad, re-derive what the harness did by
// hand": read the log instead.
//
// Usage: node harness/lib/why.mjs <film> [N]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRuns } from './runlog.mjs';

const codesOf = (run) => run.checks.flatMap((c) => c.codes || []);
const waivedOf = (run) => run.checks.flatMap((c) => c.waived || []);
const blockedCount = (run) => run.checks.filter((c) => c.blocked).length;
const firedCount = (run) => run.checks.reduce((s, c) => s + (c.fired || 0), 0);

/** formatRows(runs) -> the printed table lines, one per run. Exported so the test can assert on it
 * without going through console.log. */
export function formatRows(runs) {
  return runs.map((r) => {
    const time = (r.at || '').replace('T', ' ').slice(0, 19);
    const sha = r.git || '-';
    const checks = `${firedCount(r)} fired / ${blockedCount(r)} blocked`;
    const waivers = waivedOf(r).length ? waivedOf(r).join(',') : '-';
    const renderMs = r.render ? `${r.render.ms}ms` : '-';
    const content = r.content ? JSON.stringify(r.content) : '-';
    const judge = r.judge ? r.judge.verdict : '-';
    return `${time}  ${r.cmd.padEnd(12)} ${sha.padEnd(8)} ${checks.padEnd(20)} waived:${waivers.padEnd(16)} render:${renderMs.padEnd(8)} content:${content.padEnd(6)} judge:${judge}`;
  });
}

/** diffLines(a, b) -> what b has that a didn't ("newly fired") and what a had that b doesn't
 * ("stopped firing"), by code. a is the earlier run, b the later one. */
export function diffLines(a, b) {
  if (!a || !b) return ['(only one run logged so far, nothing to diff)'];
  const before = new Set(codesOf(a));
  const after = new Set(codesOf(b));
  const newlyFired = [...after].filter((c) => !before.has(c));
  const stoppedFiring = [...before].filter((c) => !after.has(c));
  const lines = [];
  lines.push(`newly fired:     ${newlyFired.length ? newlyFired.join(', ') : 'none'}`);
  lines.push(`stopped firing:  ${stoppedFiring.length ? stoppedFiring.join(', ') : 'none'}`);
  return lines;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const film = process.argv[2];
  const n = Number(process.argv[3]) || 5;
  if (!film) { console.error('usage: node harness/lib/why.mjs <film> [N]'); process.exit(2); }

  const allRuns = readRuns(film);
  if (!allRuns.length) {
    console.log(`no runs logged yet for ${film}. Run \`make check\`, \`make ship\` or \`make judge\` first.`);
    process.exit(0);
  }
  const runs = allRuns.slice(-n);
  console.log(`\nlast ${runs.length} run(s) for ${film}:\n`);
  for (const line of formatRows(runs)) console.log('  ' + line);
  console.log(`\ndiff, last two runs:`);
  for (const line of diffLines(runs[runs.length - 2], runs[runs.length - 1])) console.log('  ' + line);
}
