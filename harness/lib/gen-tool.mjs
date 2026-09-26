import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;

// The engine's asset/doc bakers that used to each carry their own Makefile target (`make fonts`,
// `make sim`, …). Folded here for the same reason check-gate.mjs folded the CHECK phase: an agent
// reading the target list pays for every one of these whether or not it ever bakes a font. Same
// contract as GATE=: X= with no match lists the known names and exits 2.
export const TOOLS = {
  'audio': () => ['generators/media/audio-bake.mjs'],
  'evals': () => ['harness/dev/evals.mjs'],
  'evals-compare': () => ['harness/dev/evals.mjs', '--compare', '--before', env.BEFORE, ...(env.AFTER ? ['--after', env.AFTER] : [])],
  'fonts': () => ['generators/media/fonts.mjs'],
  'fonts-discover': () => ['harness/author/fonts-discover.mjs', '--seed', env.SEED, ...(env.COUNT ? ['--count', env.COUNT] : []), ...(env.CATEGORY ? ['--category', env.CATEGORY] : []), ...(env.JSON === '1' ? ['--json'] : [])],
  'globe-dots': () => ['generators/media/globe-dots.mjs', ...(env.SPACING ? ['--spacing', env.SPACING] : [])],
  'glyphs': () => ['generators/fonts/glyphs.mjs', env.FONT, ...(env.WEIGHT ? ['--weight', env.WEIGHT] : []), ...(env.CHARSET ? ['--charset', env.CHARSET] : [])],
  'glyphs-verify': () => ['generators/fonts/verify-render.mjs', env.FONT, env.TEXT],
  'gradients': () => ['generators/media/gradients.mjs'],
  'music': () => ['harness/media/music.mjs', ...(env.ID ? ['--id', env.ID] : []), env.GENRE, env.N, env.NAME],
  'music-pack': () => ['harness/media/music.mjs', '--pack'],
  'ransom-sprites': () => ['generators/ransom/sprites.mjs'],
  'review': () => ['quality/gates/review.mjs'],
  'sfx-local': () => ['harness/media/sfx-local.mjs', '--dir', env.DIR],
  'sfx-pack': () => ['harness/media/sfx-pack.mjs'],
  'sim': () => ['generators/sim/run.mjs', env.D, ...(env.WRITE ? ['--write'] : [])],
  'theme-remix': () => ['scripts/brand/theme-remix.mjs', '--preset', env.PRESET, '--brand', env.BRAND, ...(env.BG ? ['--bg', env.BG] : []), ...(env.ACCENT ? ['--accent', env.ACCENT] : []), ...(env.TEXT ? ['--text', env.TEXT] : [])],
};

function spawnJs(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args.filter((a) => a !== undefined)], { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
}

// lightfield kept its three-way branch (PRESET= one shot, ARGS= raw passthrough, bare = every
// preset in one sweep) rather than flattening it, because the sweep is a real loop over
// core/lightfield/presets.js, not a single [script, args] call.
function lightfield() {
  if (env.PRESET) return spawnJs('harness/author/lightfield.mjs', ['--preset', env.PRESET, '--out', `films/scene/_lightfield-${env.PRESET}.html`, '--shot', env.ARGS]);
  if (env.ARGS) return spawnJs('harness/author/lightfield.mjs', [env.ARGS]);
  const presets = spawnSync(process.execPath, ['-e', "import('./core/lightfield/presets.js').then(m=>console.log(Object.keys(m.PRESETS).join(' ')))"], { cwd: ROOT, encoding: 'utf8' }).stdout.trim().split(/\s+/).filter(Boolean);
  for (const p of presets) {
    const r = spawnJs('harness/author/lightfield.mjs', ['--preset', p, '--out', `films/scene/_lightfield-${p}.html`, '--shot']);
    if (r) return r;
  }
  return 0;
}

const CUSTOM = { lightfield };

export function run(name) {
  if (CUSTOM[name]) return CUSTOM[name]();
  const build = TOOLS[name];
  if (!build) {
    console.error(`✗ make gen X=${name}: no such generator. Known:\n  ${[...Object.keys(TOOLS), ...Object.keys(CUSTOM)].sort().join(' ')}`);
    return 2;
  }
  return spawnJs(build()[0], build().slice(1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/gen-tool.mjs <name>   ·   make gen X=<name>'); process.exit(2); }
  process.exit(run(name));
}
