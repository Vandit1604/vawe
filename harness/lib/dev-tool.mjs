import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;
const json = () => (env.JSON ? ['--json'] : []);
const stamp = () => (env.STAMP ? ['--stamp'] : []);

// One-off dev/maintenance tools nobody calls through `make <name>` directly (each had its own
// Makefile target with no caller anywhere in the repo). Folded here so the capability stays
// reachable without adding to the target list every agent reads. Keep alphabetical.
export const TOOLS = {
  'batch': () => ['harness/author/batch.mjs', env.TPL, env.DATA],
  'blocking-findings-check': () => ['harness/dev/blocking-findings-check.mjs', ...json(), ...stamp()],
  'blurbs': () => ['harness/dev/blurb-retrieval.mjs', ...(env.ALL ? ['--all'] : [])],
  'capture-motion': () => ['harness/author/capture-motion.mjs', env.URL, env.SEL, ...(env.ONLOAD ? ['--onload'] : []), ...(env.DUR ? ['--dur', env.DUR] : [])],
  'core-node-boundary': () => ['harness/dev/core-node-boundary.mjs'],
  'effect-posters': () => ['scripts/site/effect-posters.mjs', ...(env.ONLY ? ['--only', env.ONLY] : [])],
  'engine-sync': () => ['scripts/site/site-engine.mjs', ...(env.CHECK ? ['--check'] : [])],
  'export-edl': () => ['harness/media/export-edl.mjs', env.D, ...(env.OUT ? ['--out', env.OUT] : [])],
  'gate-classification': () => ['quality/gates/gate-classification.mjs'],
  'ingest': () => ['harness/media/ingest.mjs', env.SRC, env.NAME, ...(env.THRESHOLD ? ['--threshold', env.THRESHOLD] : [])],
  'knowledge-audit': () => ['harness/lib/knowledge-audit.mjs'],
  'mcp-smoke': () => ['mcp/smoke.mjs', '--no-render'],
  'motion-lab': () => ['harness/dev/motion-lab.mjs', ...(env.SELFTEST === '1' ? ['--self-test'] : [env.D, '--variants', env.VARIANTS]), ...(env.KEEP ? ['--keep'] : [])],
  'og': () => ['scripts/site/og-image.mjs'],
  'quiz-round2': () => ['harness/author/quiz.mjs', '--round', '2', '--placement', env.PLACEMENT, '--job', env.JOB],
  'recreate': () => ['harness/author/recreate.mjs', env.NAME, ...(env.THEME ? ['--theme', env.THEME] : []), ...(env.OUT ? ['--out', env.OUT] : [])],
  'route': () => ['harness/author/route.mjs', env.Q],
  'sfx-catalog': () => ['harness/author/sfx-catalog.mjs'],
  'sheets': () => ['harness/author/sheets.mjs', env.D, ...(env.VS ? ['--vs', env.VS] : [])],
  'style-drop-check': () => ['harness/dev/style-drop-check.mjs'],
  'timings': () => ['harness/lib/timings.mjs', env.D, env.N],
  'token-cost': () => ['harness/dev/token-cost.mjs', ...(env.SINCE ? ['--since', env.SINCE] : []), ...(env.SESSION ? ['--session', env.SESSION] : []), ...(env.LIMIT ? ['--limit', env.LIMIT] : []), ...json(), ...(env.SELFTEST ? ['--self-test'] : [])],
  'waiver-ratchet': () => ['quality/gates/waiver-drift.mjs', '--ratchet', ...stamp()],
};

// Entries that shell out to another make target/binary instead of one script.
const CUSTOM = {
  'bench': () => runMake(['build']) || spawnJs('harness/dev/bench.mjs', ['all', ...(env.STAMP ? ['--stamp'] : []), ...json()]),
  'bench-session': () => spawnJs('harness/dev/bench.mjs', ['session', env.T, ...json()]),
  'coverage-reel': () => spawnJs('harness/author/coverage-reel.mjs', []) || runMake(['video', 'D=films/scene/_coverage-reel.json']),
  'edge-check': () => spawnJs('quality/gates/edge-check.mjs', [env.D, ...json()]),
  'formats': () => runMake(['build']) || (spawnSync(path.join(ROOT, 'bin/vawe'), ['--list'], { stdio: 'inherit', cwd: ROOT }).status || 0),
};

function spawnJs(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args.filter((a) => a !== undefined)], { stdio: 'inherit', cwd: ROOT });
  return r.status || 0;
}

function runMake(args) {
  const r = spawnSync('make', args, { stdio: 'inherit', cwd: ROOT });
  return r.status || 0;
}

export function run(name) {
  if (CUSTOM[name]) return CUSTOM[name]();
  const build = TOOLS[name];
  if (!build) {
    console.error(`✗ make dev-tool X=${name}: no such tool. Known tools:\n  ${[...Object.keys(TOOLS), ...Object.keys(CUSTOM)].sort().join(' ')}`);
    return 2;
  }
  return spawnJs(build()[0], build().slice(1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/dev-tool.mjs <name>   ·   make dev-tool X=<name>'); process.exit(2); }
  process.exit(run(name));
}
