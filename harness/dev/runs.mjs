// vawe runs <film> | --all [--json] [--dir out]: reads <dir>/<film>.runs.jsonl (harness/lib/runlog.mjs) into tables (harness/lib/runs-report.mjs).
import { readAllRuns, filmKeyOf } from '../lib/runlog.mjs';
import { filmLines, allRows, modelRows, allLines } from '../lib/runs-report.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const dirAt = args.indexOf('--dir');
const dir = dirAt >= 0 ? args[dirAt + 1] : 'out';
const film = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--dir');

if (args.includes('--all')) {
  const rows = allRows(readAllRuns(dir), Date.now());
  console.log(json ? JSON.stringify({ films: rows, models: modelRows(rows) }, null, 1) : allLines(rows, modelRows(rows)).join('\n'));
} else if (film) {
  const key = filmKeyOf(film);
  const runs = readAllRuns(dir).find((f) => f.film === key)?.runs ?? [];
  console.log(json ? JSON.stringify(runs, null, 1) : filmLines(key, runs).join('\n'));
} else {
  console.error('vawe runs: give a film name or --all');
  process.exit(2);
}
