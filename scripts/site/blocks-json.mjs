// scripts/site/blocks-json.mjs — derive site/lib/blocks.json from the registry manifest.
// Run via `make blocks-json` (or `make blocks-sync`). Deterministic; no network.
//
// WHY THIS EXISTS: site/lib/blocks.json used to be a hand-kept copy of blocks/catalog.mjs, and three
// things read the same grid from two different sources:
//   • scripts/site/blocks-catalog.mjs lays the pages out from CATALOG.filter(!overlay)
//   • scripts/site/blocks-stills.mjs  crops those rendered pages using blocks.json's ORDER
//   • site/app/blocks/*               lists and filters from blocks.json
// So blocks.json is not just a list, it is the index into a rendered grid. If it disagrees with
// CATALOG by even one row, every still after the drift point is cropped from the wrong cell and the
// site shows the wrong picture for the right name — silently, because both files are still valid.
// The two happened to agree at 96 rows; adding a family broke it. Deriving removes the class.
//
// The site file is CATALOG minus `overlay` rows, which is exactly the grid the catalog renders
// (captions is a full-frame overlay and has no cell).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../../blocks/catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'site/lib/blocks.json');

const grid = CATALOG.filter((e) => !e.overlay)
  .map(({ name, family, blurb, props }) => ({ name, family, blurb, props }));

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
fs.writeFileSync(OUT, JSON.stringify(grid, null, 2) + '\n');

const added = grid.filter((b) => !prev.some((p) => p.name === b.name)).map((b) => b.name);
const gone = prev.filter((p) => !grid.some((b) => b.name === p.name)).map((p) => p.name);
console.log(`blocks-json: ${grid.length} entries → site/lib/blocks.json`
  + (added.length ? `\n  + ${added.join(', ')}` : '')
  + (gone.length ? `\n  - ${gone.join(', ')}` : ''));
if (added.length || gone.length) console.log('  grid changed → re-run `make catalog && node scripts/site/blocks-stills.mjs` so the stills match');
