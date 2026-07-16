// site-engine.mjs — vendor the RENDER ENGINE into the marketing site so scenes play in the browser.
//
// The engine is already a web page: the Go renderer just serves the repo over HTTP and navigates to
// `formats/scene/scene.html?data=<url>&fps=30` (internal/scene/scene.go). Nothing in core/ imports
// node. So the site can serve the exact same files and run the exact same renderFrame(n) live.
//
//   node scripts/site-engine.mjs            # copy engine → site/public
//   node scripts/site-engine.mjs --check    # report drift, write nothing
//
// Paths are preserved EXACTLY (scene.html imports root-absolute '/core/boot.js', themes resolve at
// '/themes/<name>.json'), so the copy must land at the site root. Rewriting them would fork the
// engine; copying keeps one source of truth.
//
// Render-only assets are NOT shipped: music/ (58M), brands/ (55M), sfx/ (10M) are mixed in by the Go
// audio stage and never touched by the browser. The web bundle is ~1.3MB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(root, 'site', 'public');

// [from, to] — relative to repo root / site/public
const COPY = [
  ['core', 'core'],                                   // the engine itself (216K, zero node imports)
  ['themes', 'themes'],                               // boot.js fetches /themes/<name>.json
  ['engine/assets/fonts', 'engine/assets/fonts'],     // boot() blocks on document.fonts for every face
  ['engine/assets/icons', 'engine/assets/icons'],     // svgIcon() + lucide UI marks
  ['engine/assets/vendor', 'engine/assets/vendor'],   // lottie runtime (lazy-loaded by boot)
];
const FILES = [
  ['formats/scene/scene.html', 'formats/scene/scene.html'],
  ['formats/scene/schema.json', 'formats/scene/schema.json'],   // boot validates against this
  // core/boot.js imports this RELATIVELY ('../scripts/validate.mjs') so one validator serves both
  // node and the browser. Its node:fs use is a lazy dynamic import in the CLI branch — never
  // reached in a browser. Ship it, or boot 404s and the scene silently never appears.
  ['scripts/validate.mjs', 'scripts/validate.mjs'],
];

const DRY = process.argv.includes('--check');
let copied = 0, drift = 0, bytes = 0;

const same = (a, b) => fs.existsSync(b) && fs.statSync(a).size === fs.statSync(b).size
  && fs.statSync(a).mtimeMs <= fs.statSync(b).mtimeMs;

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

const put = (from, to) => {
  if (!fs.existsSync(from)) { console.error(`✗ missing ${path.relative(root, from)}`); process.exit(1); }
  if (same(from, to)) return;
  if (DRY) { drift++; console.log(`~ drift  ${path.relative(PUB, to)}`); return; }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  copied++; bytes += fs.statSync(to).size;
};

for (const [src, dst] of COPY) {
  const from = path.join(root, src);
  if (!fs.existsSync(from)) { console.error(`✗ missing ${src}`); process.exit(1); }
  for (const f of walk(from)) put(f, path.join(PUB, dst, path.relative(from, f)));
}
for (const [src, dst] of FILES) put(path.join(root, src), path.join(PUB, dst));

if (DRY) console.log(drift ? `\n~ ${drift} file(s) drifted — run without --check` : '\n✓ site engine in sync');
else console.log(`✓ engine → site/public  (${copied} file(s), ${(bytes / 1024) | 0}KB)`);
