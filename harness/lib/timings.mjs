// harness/lib/timings.mjs: `make timings D=<film> [N=10]`. Prints the real wall-clock time each
// logged step took, read off the run log's wallMs fields (harness/lib/runlog.mjs), never `render.ms`:
// that field is the rendered VIDEO's length (internal/render/render.go's own printed seconds), not
// how long the render took. wallMs is measured around the actual command (Makefile for the render,
// harness/lib/run-author-check.mjs for the gate ladder) with a monotonic clock, so this is the answer
// to "how long did this take", which the video-length number could not give.
//
// Usage: node harness/lib/timings.mjs <film> [N]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRuns } from './runlog.mjs';

const gateMs = (run) => (run.checks || []).reduce((s, c) => s + (Number.isFinite(c.wallMs) ? c.wallMs : 0), 0);
const renderMs = (run) => (run.render && Number.isFinite(run.render.wallMs)) ? run.render.wallMs : null;
const totalMs = (run) => Number.isFinite(run.wallMs) ? run.wallMs : null;

/** formatRows(runs) -> the printed table lines, one per run. Exported so the test can assert on it
 * without going through console.log. */
export function formatRows(runs) {
  return runs.map((r) => {
    const time = (r.at || '').replace('T', ' ').slice(0, 19);
    const gate = gateMs(r);
    const render = renderMs(r);
    const frames = r.render ? r.render.frames : null;
    const fps = render && frames ? Math.round((frames / (render / 1000)) * 100) / 100 : null;
    const total = totalMs(r);
    return `${time}  ${r.cmd.padEnd(12)} gate:${(gate ? `${gate}ms` : '-').padEnd(8)} `
      + `render:${(render ? `${render}ms` : '-').padEnd(9)} frames:${String(frames ?? '-').padEnd(6)} `
      + `wallfps:${(fps ?? '-').toString().padEnd(7)} total:${total ? `${total}ms` : '-'}`;
  });
}

/** medianByCmd(runs) -> { cmd: medianTotalMs }, over runs that have a total wallMs. */
export function medianByCmd(runs) {
  const byCmd = new Map();
  for (const r of runs) {
    const t = totalMs(r);
    if (t === null) continue;
    if (!byCmd.has(r.cmd)) byCmd.set(r.cmd, []);
    byCmd.get(r.cmd).push(t);
  }
  const out = {};
  for (const [cmd, vals] of byCmd) {
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    out[cmd] = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const film = process.argv[2];
  const n = Number(process.argv[3]) || 10;
  if (!film) { console.error('usage: node harness/lib/timings.mjs <film> [N]'); process.exit(2); }

  const allRuns = readRuns(film);
  if (!allRuns.length) {
    console.log(`no runs logged yet for ${film}. Run \`make check\`, \`make dev\` or \`make ship\` first.`);
    process.exit(0);
  }
  const runs = allRuns.slice(-n);
  console.log(`\nlast ${runs.length} run(s) for ${film}, real wall-clock time (not video length):\n`);
  for (const line of formatRows(runs)) console.log('  ' + line);
  console.log(`\nmedian total, by command:`);
  const medians = medianByCmd(runs);
  if (!Object.keys(medians).length) console.log('  (no run carries a total wallMs yet)');
  for (const [cmd, ms] of Object.entries(medians)) console.log(`  ${cmd.padEnd(12)} ${ms}ms`);
}
