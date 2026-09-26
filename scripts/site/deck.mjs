// scripts/site/deck.mjs: publish engine-doctrine/animation.html to the marketing site as /deck.
//
// One source, two homes. engine-doctrine/animation.html is the canonical file and opens straight from disk;
// the site copy differs only in where it reaches for the fonts and the engine's easing module, so
// this rewrites those two prefixes rather than keeping a second hand-edited copy that drifts.
//
//   node scripts/site/deck.mjs           # write site/public/deck.html
//   node scripts/site/deck.mjs --check   # report drift, write nothing (exit 1 if stale)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'engine-doctrine', 'animation.html');
const OUT = path.join(ROOT, 'site', 'public', 'deck.html');
const check = process.argv.includes('--check');

// `../assets` and `../core` are correct from engine-doctrine/; from site/public they are served at the root.
const built = fs.readFileSync(SRC, 'utf8')
  .replace(/\.\.\/assets\//g, '/assets/')
  .replace(/\.\.\/core\//g, '/core/')
  // docs-relative sibling links have no meaning on the site
  .replace(/href="architecture\.html"/g, 'href="/docs"')
  .replace(/href="(PRIMITIVES|MOTION-CRAFT)\.md"/g, 'href="/docs"');

const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
if (check) {
  if (current === built) { console.log('✓ site/public/deck.html is current'); process.exit(0); }
  console.error('✗ site/public/deck.html is stale, run `make site X=deck`'); process.exit(1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, built);
console.log(`✓ ${path.relative(ROOT, OUT)}  ←  engine-doctrine/animation.html   (served at /deck)`);
