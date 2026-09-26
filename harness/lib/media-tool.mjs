import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;
const write = () => (env.WRITE ? ['--write'] : []);
const write1 = () => (env.WRITE === '1' ? ['--write'] : []);

// Capture, generation and audio/video processing tools that used to each carry their own Makefile
// target. Folded here for the same reason gen-tool.mjs folded the engine's bakers. Same contract:
// X= with no match lists the known names and exits 2.
export const TOOLS = {
  'assets': () => ['harness/media/assets.mjs', env.D, ...write()],
  'audio-bed': () => ['core/audio/select.js', env.D, ...write1()],
  'beatmap': () => ['harness/media/beatmap.mjs', env.MUSIC],
  'beatsync': () => ['harness/media/beatsync.mjs', env.D, '--music', env.MUSIC, ...(env.GRID ? ['--grid', env.GRID] : []), ...(env.SNAP ? ['--snap', env.SNAP] : []), ...(env.LAYERS === '1' ? ['--layers'] : []), ...write1()],
  'captions': () => ['harness/author/captions.mjs', env.D, env.TEXT || ''],
  'capture': () => ['harness/author/capture-component.mjs', env.URL, env.SEL || '', env.NAME, env.LABEL, ...(env.LS ? ['--localstorage', env.LS] : []), ...(env.SETTLE ? ['--settle', env.SETTLE] : [])],
  'capture-scene': () => ['harness/author/capture-scene.mjs', env.URL, env.SEL || '', env.NAME, env.LABEL, '--parts', env.PARTS || ''],
  'cutout': () => ['harness/media/cutout.mjs', env.SRC, env.NAME],
  'filmstrip': () => ['harness/author/filmstrip.mjs', env.VIDEO],
  'gen-clip': () => ['harness/media/gen-clip.mjs', env.IN, env.NAME, ...(env.FPS ? ['--fps', env.FPS] : []), ...(env.W ? ['--w', env.W] : [])],
  'gen-image': () => ['harness/media/kie.mjs', 'image', env.Q || '', '--out', `assets/gen/${env.NAME}.png`, ...(env.ASPECT ? ['--aspect', env.ASPECT] : [])],
  'photos': () => ['scripts/brand/photos.mjs', env.Q || '', env.NAME, ...(env.N ? ['--n', env.N] : [])],
  'scrub': () => ['harness/author/scrub.mjs', env.F],
  'spectrum': () => ['harness/media/spectrum.mjs', env.MUSIC, ...(env.FPS ? ['--fps', env.FPS] : [])],
  'transition-preview': () => ['harness/author/transition-preview.mjs'],
  'tts': () => ['harness/media/tts.mjs', ...(env.SCRIPT ? ['--script', env.SCRIPT] : []), ...(env.TEXT ? ['--text', env.TEXT] : []), '--out', env.OUT, ...(env.VOICE ? ['--voice', env.VOICE] : [])],
  'vo-captions': () => ['harness/media/vo-captions.mjs', env.D, ...(env.STYLE ? ['--style', env.STYLE] : []), ...write1()],
  'watermark': () => ['generators/media/watermark.mjs'],
};

function spawnJs(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args.filter((a) => a !== undefined)], { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
}

// gen-video generates the clip then extracts it: the one entry here that is two scripts, not one.
const CUSTOM = {
  'gen-video': () => {
    const out = `assets/gen/${env.NAME}.mp4`;
    const gen = spawnJs('harness/media/kie.mjs', ['video', env.Q || '', '--out', out, ...(env.ASPECT ? ['--aspect', env.ASPECT] : [])]);
    if (gen) return gen;
    return spawnJs('harness/media/gen-clip.mjs', [out, env.NAME]);
  },
};

export function run(name) {
  if (CUSTOM[name]) return CUSTOM[name]();
  const build = TOOLS[name];
  if (!build) {
    console.error(`✗ make media X=${name}: no such media tool. Known:\n  ${[...Object.keys(TOOLS), ...Object.keys(CUSTOM)].sort().join(' ')}`);
    return 2;
  }
  return spawnJs(build()[0], build().slice(1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/media-tool.mjs <name>   ·   make media X=<name>'); process.exit(2); }
  process.exit(run(name));
}
