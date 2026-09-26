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

/** knowledgeLines(runs) -> what each stage-say receipt (harness/live/stage-say.mjs) told the author,
 * and what it had but did not: "from all things available, why it reached for something". One block per
 * logged (film, stage) transition, oldest first; a run with no `knowledge` (every non-stage-say cmd)
 * contributes nothing. */
export function knowledgeLines(runs) {
  const withKnowledge = runs.filter((r) => r.knowledge);
  if (!withKnowledge.length) return ['(no knowledge receipts logged yet; `make dev`/`make next` runs stage-say)'];
  const lines = [];
  for (const r of withKnowledge) {
    const { stage, shown, dropped } = r.knowledge;
    lines.push(`stage ${stage}: shown ${shown.length ? shown.join(', ') : '(none)'}`);
    const byReason = new Map();
    for (const d of dropped) {
      if (!byReason.has(d.reason)) byReason.set(d.reason, []);
      byReason.get(d.reason).push(d.id);
    }
    if (!byReason.size) { lines.push('  dropped: none'); continue; }
    for (const [reason, ids] of byReason) lines.push(`  dropped (${reason}): ${ids.join(', ')}`);
  }
  return lines;
}

/** refusalLines(runs) -> every PreToolUse deny stage-gate.mjs logged for this film: which rule, which
 * file, and the reason shown to the model. Oldest first; a run with no `refusal` contributes nothing. */
export function refusalLines(runs) {
  const refusals = runs.filter((r) => r.refusal);
  if (!refusals.length) return ['(no refusals logged; stage-gate.mjs has not denied a write for this film)'];
  return refusals.map((r) => {
    const time = (r.at || '').replace('T', ' ').slice(0, 19);
    return `${time}  [${r.refusal.rule}] ${r.refusal.file}: ${r.refusal.reason.split('\n')[0]}`;
  });
}

/** craftLiveLines(runs) -> what harness/live/craft-live.mjs printed on each save it spoke about, and
 * which sibling checks in the same family ran clean instead. Oldest first; a run with no `craftLive`
 * contributes nothing. */
export function craftLiveLines(runs) {
  const withFindings = runs.filter((r) => r.craftLive);
  if (!withFindings.length) return ['(no craft-live findings logged; the hook is silent on a fine save)'];
  return withFindings.flatMap((r) => {
    const { file, shown, withheld } = r.craftLive;
    return [`${file}: shown ${shown.join(', ')}`,
      `  withheld (ran clean): ${withheld.length ? withheld.join(', ') : 'none'}`];
  });
}

/** sceneLiveLines(runs) -> the same shown/withheld split as craftLiveLines, for scene-live.mjs's own
 * four checks. Oldest first; a run with no `sceneLive` contributes nothing. */
export function sceneLiveLines(runs) {
  const withFindings = runs.filter((r) => r.sceneLive);
  if (!withFindings.length) return ['(no scene-live findings logged; the hook is silent on a fine save)'];
  return withFindings.flatMap((r) => {
    const { file, shown, withheld } = r.sceneLive;
    return [`${file}: shown ${shown.join(', ')}`,
      `  withheld (ran clean): ${withheld.length ? withheld.join(', ') : 'none'}`];
  });
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
  console.log(`\nknowledge shown to the author (${runs.length} run(s) considered):`);
  for (const line of knowledgeLines(runs)) console.log('  ' + line);
  console.log(`\nrefusals (stage-gate.mjs, ${runs.length} run(s) considered):`);
  for (const line of refusalLines(runs)) console.log('  ' + line);
  console.log(`\ncraft-live findings (${runs.length} run(s) considered):`);
  for (const line of craftLiveLines(runs)) console.log('  ' + line);
  console.log(`\nscene-live findings (${runs.length} run(s) considered):`);
  for (const line of sceneLiveLines(runs)) console.log('  ' + line);
}
