// scripts/site/blocks-json.mjs: derive site/lib/blocks.json from the registry manifest.
// Run via `make blocks-json` (or `make blocks-sync`). Deterministic; no network.
//
// WHY THIS EXISTS: site/lib/blocks.json used to be a hand-kept copy of blocks/catalog.mjs, and the
// things that read the grid read it from two different sources:
//   • scripts/site/blocks-catalog.mjs lays the pages out from CATALOG.filter(!overlay)
//   • site/app/blocks/*               lists and filters from blocks.json
// If those disagree by even one row the site shows the wrong picture for the right name, silently,
// because both files are still valid. They happened to agree at 96 rows; adding a family broke it.
// Deriving removes the class. (Per-block media is keyed BY NAME now, not by position in this list.
// See scripts/site/blocks-scenes.mjs, so an ordering drift can no longer misattribute a thumbnail.)
//
// The site file is CATALOG minus `overlay` rows, which is exactly the grid the catalog renders
// (captions is a full-frame overlay and has no cell).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../../blocks/catalog.mjs';
import { CATEGORY_OF, CATEGORY_INTRO } from '../../blocks/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'site/lib/blocks.json');

// CATEGORY, resolved rather than tabulated. 90-odd families is far too many for a browsing rail and
// most hold one block, so the site needs a coarser grouping, and a 176-row name-to-category table in
// a React component would be stale the day someone adds a block. The grouping already EXISTS in the
// code: the module a factory lives in. Each blocks/*.mjs exports its own `CATEGORY` and
// blocks/index.mjs discovers it while assembling the registry, so this file just reads the answer.
//
// This used to walk the modules itself, with a sort rule pinning index.mjs last because index.mjs
// re-exported every sibling and would otherwise claim whatever came after it alphabetically (measured:
// it swallowed interact, sleek, social and ui into "Core", 98 of 176). index.mjs exports no factories
// any more, so the hazard and the workaround are both gone.

const grid = CATALOG.filter((e) => !e.overlay)
  .map(({ name, family, blurb, props }) => {
    const category = CATEGORY_OF[family] || 'Core';
    return { name, family, blurb, props, category, categoryIntro: CATEGORY_INTRO[category] };
  });

const body = JSON.stringify(grid, null, 2) + '\n';
// `--check` (make blocks-json CHECK=1) reports the drift this file was written to remove, rather than
// silently repairing it on a run somebody happened to make. site/lib/blocks.json is committed and only
// `make blocks-sync` rewrites it, so a new catalog row left the site's grid a row short until then.
if (process.argv.includes('--check')) {
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (have !== body) { console.error(`site/lib/blocks.json is STALE (it disagrees with blocks/catalog.mjs), run \`make blocks-json\``); process.exit(1); }
  console.log(`site/lib/blocks.json: up to date (${grid.length} entries)`);
  process.exit(0);
}

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
fs.writeFileSync(OUT, body);

const added = grid.filter((b) => !prev.some((p) => p.name === b.name)).map((b) => b.name);
const gone = prev.filter((p) => !grid.some((b) => b.name === p.name)).map((p) => p.name);
console.log(`blocks-json: ${grid.length} entries → site/lib/blocks.json`
  + (added.length ? `\n  + ${added.join(', ')}` : '')
  + (gone.length ? `\n  - ${gone.join(', ')}` : ''));
if (added.length || gone.length) console.log('  grid changed → run `make blocks-scenes` so the site has a scene + poster for it');
