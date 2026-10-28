import fs from 'node:fs';
import path from 'node:path';

const RUN_DIR = /^\d{4}-\d{2}-\d{2}T[\d-]+Z$/;

/** The run directory names to delete: every timestamped name but the newest `keep`. Any other name (latest.json) is never returned. Pure. */
export function oldRuns(names, keep) {
  const runs = names.filter((n) => RUN_DIR.test(n)).sort();
  return runs.slice(0, Math.max(0, runs.length - keep));
}

/** Deletes the old run directories directly under `runsDir`. Returns the names deleted. */
export function pruneRuns(runsDir, keep) {
  const dirs = fs.readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const old = oldRuns(dirs, keep);
  for (const name of old) fs.rmSync(path.join(runsDir, name), { recursive: true, force: true });
  return old;
}
