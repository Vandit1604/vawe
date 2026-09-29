import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;

// The asset bakers that used to each carry their own Makefile target. Folded here for the same reason check-gate.mjs folded the CHECK phase: an agent
// reading the target list pays for every one of these whether or not it ever bakes a font. Same
// contract as GATE=: X= with no match lists the known names and exits 2.
export const TOOLS = {
  'audio': () => ['generators/media/audio-bake.mjs'],
  'fonts': () => ['generators/media/fonts.mjs'],
  'glyphs': () => ['generators/fonts/glyphs.mjs', env.FONT, ...(env.WEIGHT ? ['--weight', env.WEIGHT] : []), ...(env.CHARSET ? ['--charset', env.CHARSET] : [])],
  'glyphs-verify': () => ['generators/fonts/verify-render.mjs', env.FONT, env.TEXT],
  'music': () => ['harness/media/music.mjs', ...(env.ID ? ['--id', env.ID] : []), env.GENRE, env.N, env.NAME],
  'music-pack': () => ['harness/media/music.mjs', '--pack'],
  'sfx-local': () => ['harness/media/sfx-local.mjs', '--dir', env.DIR],
  'sfx-pack': () => ['harness/media/sfx-pack.mjs'],
};

function spawnJs(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args.filter((a) => a !== undefined)], { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
}

export function run(name) {
  const build = TOOLS[name];
  if (!build) {
    console.error(`✗ make gen X=${name}: no such generator. Known:\n  ${Object.keys(TOOLS).sort().join(' ')}`);
    return 2;
  }
  return spawnJs(build()[0], build().slice(1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/gen-tool.mjs <name>   ·   make gen X=<name>'); process.exit(2); }
  process.exit(run(name));
}
