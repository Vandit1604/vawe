import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;
const check = () => (env.CHECK ? ['--check'] : []);
const json = () => (env.JSON ? ['--json'] : []);

// What vawe.dev publishes: the site-side generators and checks that used to each carry their own
// Makefile target. Folded here for the same reason gen-tool.mjs folded the engine's bakers. Same
// contract: X= with no match lists the known names and exits 2.
export const TOOLS = {
  'blocks-docs': () => ['scripts/site/blocks-docs.mjs', ...check()],
  'blocks-json': () => ['scripts/site/blocks-json.mjs', ...check()],
  'blocks-scenes': () => ['scripts/site/blocks-scenes.mjs'],
  'deck': () => ['scripts/site/deck.mjs'],
  'deploy-check': () => ['quality/gates/site-build-check.mjs', env.RANGE],
  'doc-index': () => ['quality/gates/doc-map.mjs', '--write', ...json()],
  'effects-json': () => ['scripts/site/effects-json.mjs', ...check()],
  'films-json': () => ['scripts/site/films-json.mjs', ...(env.WRITE ? ['--write'] : [])],
  'gallery': () => ['scripts/site/examples-gallery.mjs'],
  'registry': () => ['scripts/site/registry.mjs', ...check()],
  'site-assets': () => ['scripts/site/site-assets.mjs', ...(env.RENDER ? ['--render'] : []), ...(env.ONLY ? ['--only', env.ONLY] : []), ...check(), ...(env.FORCE ? ['--force'] : [])],
};

function spawnJs(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args.filter((a) => a !== undefined)], { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
}
function runMake(args) {
  const r = spawnSync('make', args, { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
}

// The two that needed the compiled binary (`build` was a Makefile prerequisite, not a plain script
// call) and the one real dependency chain (blocks-sync ran three other targets in a row).
export const CUSTOM = {
  'catalog': () => runMake(['build']) || spawnJs('scripts/site/blocks-catalog.mjs', []),
  'examples': () => runMake(['build']) || spawnJs('scripts/site/examples-build.mjs', []),
  'docs': () => (env.Q
    ? spawnJs('harness/author/docs.mjs', [env.Q, ...(env.N ? ['--n', env.N] : []), ...json()])
    : (spawnSync('cat', [path.join(ROOT, 'engine-doctrine/INDEX.md')], { stdio: 'inherit' }).status ?? 1)),
  'blocks-sync': () => run('blocks-docs') || run('blocks-json') || run('blocks-scenes'),
};

export function run(name) {
  if (CUSTOM[name]) return CUSTOM[name]();
  const build = TOOLS[name];
  if (!build) {
    console.error(`✗ make site X=${name}: no such site command. Known:\n  ${[...Object.keys(TOOLS), ...Object.keys(CUSTOM)].sort().join(' ')}`);
    return 2;
  }
  return spawnJs(build()[0], build().slice(1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/site-tool.mjs <name>   ·   make site X=<name>'); process.exit(2); }
  process.exit(run(name));
}
