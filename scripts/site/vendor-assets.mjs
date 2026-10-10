// Copy the free font faces, which cannot be committed (fetched by generators/media/fonts.mjs), into the
// site's public/ folder. Everything else the browser engine loads is a frozen, committed copy under site/public.
//
//   node scripts/site/vendor-assets.mjs            copy assets/fonts -> site/public/assets
//   node scripts/site/vendor-assets.mjs --check    report drift, write nothing
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(root, 'site', 'public');
const DRY = process.argv.includes('--check');
const TREES = ['assets/fonts'];
const SKIP = (rel) => rel.startsWith(`assets${path.sep}fonts${path.sep}local${path.sep}`);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

let copied = 0;
let drift = 0;
for (const tree of TREES) {
  const from = path.join(root, tree);
  if (!fs.existsSync(from)) { console.error(`✗ missing ${tree}. Run: node generators/media/fonts.mjs.`); process.exit(1); }
  for (const f of walk(from)) {
    const rel = path.relative(root, f);
    if (SKIP(rel)) continue;
    const to = path.join(PUB, rel);
    if (fs.existsSync(to) && fs.readFileSync(f).equals(fs.readFileSync(to))) continue;
    if (DRY) { drift++; console.log(`~ drift  ${path.relative(PUB, to)}`); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(f, to);
    copied++;
  }
}
if (DRY) console.log(drift ? `\n~ ${drift} file(s) drifted, run without --check` : '\n✓ vendored assets in sync');
else console.log(`✓ fonts -> site/public/assets  (${copied} file(s))`);
