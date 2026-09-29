import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;
const json = () => (env.JSON ? ['--json'] : []);
const stamp = () => (env.STAMP ? ['--stamp'] : []);

// One-off dev/maintenance tools nobody calls through `make <name>` directly. Keep alphabetical.
export const TOOLS = {
  'bench': () => ['harness/dev/bench.mjs', 'all', ...stamp(), ...json()],
  'bench-session': () => ['harness/dev/bench.mjs', 'session', env.T, ...json()],
  'blocking-findings-check': () => ['harness/dev/blocking-findings-check.mjs', ...json(), ...stamp()],
  'compare': () => ['quality/gates/compare.mjs', ...(env.ARGS ? env.ARGS.trim().split(/\s+/) : [])],
  'core-node-boundary': () => ['harness/dev/core-node-boundary.mjs'],
  'new': () => ['harness/dev/recreation-new.mjs'],
  'style-drop-check': () => ['harness/dev/style-drop-check.mjs'],
  'token-cost': () => ['harness/dev/token-cost.mjs', ...(env.SINCE ? ['--since', env.SINCE] : []), ...(env.SESSION ? ['--session', env.SESSION] : []), ...(env.LIMIT ? ['--limit', env.LIMIT] : []), ...json(), ...(env.SELFTEST ? ['--self-test'] : [])],
  'verify-batch': () => ['harness/dev/verify-batch.sh'],
  'worktree-status': () => ['harness/dev/worktree-status.mjs'],
  'worktrees': () => ['harness/dev/worktree-prune.mjs', ...(env.PRUNE ? ['--prune'] : [])],
};

export function run(name) {
  const build = TOOLS[name];
  if (!build) {
    console.error(`✗ make dev-tool X=${name}: no such tool. Known tools:\n  ${Object.keys(TOOLS).sort().join(' ')}`);
    return 2;
  }
  const [script, ...args] = build();
  const exe = script.endsWith('.sh') ? 'sh' : process.execPath;
  return spawnSync(exe, [path.join(ROOT, script), ...args.filter((a) => a !== undefined)], { stdio: 'inherit', cwd: ROOT }).status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/dev-tool.mjs <name>   ·   make dev-tool X=<name>'); process.exit(2); }
  process.exit(run(name));
}
