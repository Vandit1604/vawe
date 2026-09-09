// generators/media/gradients.mjs: DEPRECATED. bake a gradient-background pack into a render-ready library.
//   make gradients [SRC=~/Downloads/…zip] [W=1920] [N=0]
//
// DEPRECATED (Approach B, kept as a local-only fallback). The shippable path is the `gradient`
// background preset (core/backgrounds.js, gradientFill + core/gradient-recipes.js): agent-controlled,
// zero bytes shipped, no licence to track. Reach for THIS baker only if a still, ultra-soft
// photographic gradient proves unreachable at frame time; the pack it writes is local-only and was
// never meant to be committed (see LICENCE below), and nothing in this engine reads it any more.
//
// The packs ship 4K JPGs (3840x2160, ~290KB each). A 1080p render decodes every one of those pixels
// and throws three quarters away, so this downscales once, offline, into assets/gradients/ and writes
// an index.json the author can browse. Nothing here runs at frame time.
//
// LICENCE: these packs are royalty-free to USE but explicitly forbid redistributing the files on their
// own. assets/gradients is gitignored for that reason, bake locally, never commit the images.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(repoRoot, 'assets/gradients');
const WIDTH = Number(process.env.W || 1920);
const LIMIT = Number(process.env.N || 0); // 0 = all
const SRC = (process.env.SRC || '').replace(/^~/, os.homedir());

if (!SRC || !fs.existsSync(SRC)) {
  console.error('gradients: point SRC at a pack (a .zip or an already-extracted folder)');
  console.error('  make gradients SRC=~/Downloads/Resource-Boy-Gradient-Backgrounds-Vol-02.zip');
  process.exit(1);
}

// A zip is expanded to a temp dir; a folder is read in place. Either way we only ever read images.
let dir = SRC, tmp = null;
if (/\.zip$/i.test(SRC)) {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'grad-'));
  console.log('gradients: extracting…');
  execFileSync('unzip', ['-o', '-q', SRC, '-d', tmp], { stdio: 'inherit' });
  dir = tmp;
}

const IMG = /\.(jpe?g|png|webp)$/i;
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (IMG.test(e.name)) files.push(p);
  }
})(dir);
if (!files.length) { console.error(`gradients: no images under ${SRC}`); process.exit(1); }

const pick = LIMIT > 0 ? files.slice(0, LIMIT) : files;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ffmpeg is already a hard dependency of the render pipeline, so it costs no new tooling, and it is
// far quicker over a thousand 4K frames than decoding each one in a browser canvas.
const index = [];
let n = 0;
for (const f of pick) {
  const name = String(++n).padStart(4, '0') + '.jpg';
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f,
      '-vf', `scale=${WIDTH}:-2:flags=lanczos`, '-q:v', '4', path.join(OUT, name)]);
    index.push(name);
  } catch (e) { console.warn(`  skipped ${path.basename(f)} (${e.message.split('\n')[0]})`); }
  if (n % 100 === 0) process.stdout.write(`  ${n}/${pick.length}\r`);
}
if (tmp) fs.rmSync(tmp, { recursive: true, force: true });

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ width: WIDTH, count: index.length, files: index }, null, 2) + '\n');
const bytes = index.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`\ngradients: ${index.length} backgrounds at ${WIDTH}px → assets/gradients/ (${(bytes / 1e6).toFixed(1)}MB)`);
console.log('  use one full-bleed under a scene:');
console.log('    { "type":"image", "src":"/assets/gradients/0001.jpg", "x":0, "y":0, "w":1920, "h":1080,');
console.log('      "ken":{"from":1.0,"to":1.08}, "start":0, "duration":6 }');
console.log('  NOTE: royalty-free to use, but redistributing the files themselves is not permitted:');
console.log('  assets/gradients is gitignored. Bake locally; never commit the images.');
