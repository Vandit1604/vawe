// scripts/site/engine-sync.mjs — ONE engine, published to the site.
//
//   node scripts/site/engine-sync.mjs           copy core/ + formats/scene/ into site/public/
//   node scripts/site/engine-sync.mjs --check   exit 1 if the published copy has drifted
//
// WHY THIS EXISTS. The site boots the real engine in an iframe: `/formats/scene/scene.html` loading
// `/core/*.js`, both served out of `site/public/`. Those were hand-copied once and nothing kept them
// current, so the published engine froze. Measured when this script was written: `core/` had 52
// entries and `site/public/core/` had 31, missing `fx/`, `tracks/`, `surfaces/`, `props.js`,
// `lightfield/`, `sanitize-html.js`, `seams.js` and twelve more. The site's own copy of
// `layers/index.js` was an older file that did not import any of them, so nothing threw: the page was
// internally consistent and weeks behind, while telling the reader "this is the real engine, running
// in your browser". That sentence was false and no gate could see it (docs/MISTAKES.md #271).
//
// WHAT IS PUBLISHED. Everything under `core/` and `formats/scene/` that a browser can import, minus
// the node-only files listed below. Copying WHOLE DIRECTORIES is deliberate: an allow-list of engine
// files is a map of what the engine imported the day it was written, and that is exactly the failure
// being fixed. An unimported file costs a few KB of static assets and nothing else.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(ROOT, 'site', 'public');
const TREES = ['core', 'formats/scene'];

// Node-only modules. They import `node:*`, so a browser cannot load them and shipping them would put
// a file on the site that only ever 500s. Everything else goes, whether or not anything imports it yet.
const NODE_ONLY = new Set(['core/audio-kit.mjs', 'core/audio-select.js', 'core/validate.mjs']);
// Scene JSON is content, not engine. The site publishes its own curated set under public/scenes/.
const SKIP_EXT = new Set(['.json', '.mp4', '.mp3', '.wav', '.md']);

const walk = (rel, out = []) => {
  const abs = path.join(ROOT, rel);
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const r = path.posix.join(rel, e.name);
    if (e.isDirectory()) walk(r, out);
    else if (!NODE_ONLY.has(r) && !SKIP_EXT.has(path.extname(e.name))) out.push(r);
  }
  return out;
};

const files = TREES.flatMap((t) => walk(t)).sort();
const check = process.argv.includes('--check');
const drift = [];
let written = 0;

for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel));
  const dst = path.join(PUB, rel);
  const cur = fs.existsSync(dst) ? fs.readFileSync(dst) : null;
  if (cur && cur.equals(src)) continue;
  drift.push(cur === null ? `missing   ${rel}` : `differs   ${rel}`);
  if (!check) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, src);
    written++;
  }
}

// A file the site publishes and the repo no longer has is drift in the other direction, and it is the
// more dangerous one: it is code deleted here and still running there.
const stale = [];
const publishedFiles = TREES.flatMap((t) => {
  const abs = path.join(PUB, t);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const rec = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) rec(p);
      else out.push(path.relative(PUB, p).split(path.sep).join('/'));
    }
  };
  rec(abs);
  return out;
});
for (const rel of publishedFiles) {
  if (SKIP_EXT.has(path.extname(rel))) continue;
  if (!files.includes(rel)) {
    stale.push(`orphaned  ${rel}`);
    if (!check) { fs.rmSync(path.join(PUB, rel)); written++; }
  }
}

const all = [...drift, ...stale];
if (check) {
  if (!all.length) { console.log(`✓ site engine in sync — ${files.length} file(s)`); process.exit(0); }
  console.error(`✗ the site publishes a different engine than this repo (${all.length} file(s)).\n`);
  for (const l of all.slice(0, 25)) console.error('   ' + l);
  if (all.length > 25) console.error(`   … and ${all.length - 25} more`);
  console.error('\n  The site boots /formats/scene/scene.html + /core/*.js out of site/public/ and tells the\n'
    + '  reader it is the real engine. Run `make engine-sync` so that sentence is true.');
  process.exit(1);
}
console.log(all.length
  ? `✓ published ${written} file(s) → site/public/  (${files.length} total)`
  : `✓ site engine already in sync — ${files.length} file(s)`);
