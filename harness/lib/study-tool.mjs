import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;
const json = () => (env.JSON ? ['--json'] : []);

// Reference-material tools that are read far less often than `make study`/`make sections`/`make ref`
// (kept real: they are typed constantly, mid-workflow). Same fold-shape as gen-tool.mjs/site-tool.mjs.
export const TOOLS = {
  'brandspec': () => ['scripts/brand/brandspec.mjs', env.URL],
  'census': () => ['harness/lib/census.mjs'],
  'claims': () => ['harness/author/claims.mjs'],
  'grammar': () => ['harness/author/grammar.mjs', ...(env.DOC ? ['--doc'] : (env.N ? [env.N] : []))],
  'lookbook': () => ['scripts/brand/lookbook.mjs', env.URL, env.NAME],
  'measure': () => ['harness/author/measure-motion.mjs', env.VIDEO, env.FROM, env.TO, env.EXPECT],
  'mine': () => ['harness/author/mine.mjs', ...json()],
  'palette': () => ['scripts/brand/palette.mjs', env.IMG],
  'transitions': () => ['quality/gates/transitions-catalog.mjs', env.D, ...json()],
};

export function run(name) {
  const build = TOOLS[name];
  if (!build) {
    console.error(`✗ make study-tool X=${name}: no such tool. Known:\n  ${Object.keys(TOOLS).sort().join(' ')}`);
    return 2;
  }
  const [script, ...args] = build();
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args.filter((a) => a !== undefined)], { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/study-tool.mjs <name>   ·   make study-tool X=<name>'); process.exit(2); }
  process.exit(run(name));
}
