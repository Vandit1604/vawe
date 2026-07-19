// scripts/site/blocks-json.mjs — derive site/lib/blocks.json from the registry manifest.
// Run via `make blocks-json` (or `make blocks-sync`). Deterministic; no network.
//
// WHY THIS EXISTS: site/lib/blocks.json used to be a hand-kept copy of blocks/catalog.mjs, and the
// things that read the grid read it from two different sources:
//   • scripts/site/blocks-catalog.mjs lays the pages out from CATALOG.filter(!overlay)
//   • site/app/blocks/*               lists and filters from blocks.json
// If those disagree by even one row the site shows the wrong picture for the right name, silently,
// because both files are still valid. They happened to agree at 96 rows; adding a family broke it.
// Deriving removes the class. (Per-block media is keyed BY NAME now, not by position in this list —
// see scripts/site/blocks-scenes.mjs — so an ordering drift can no longer misattribute a thumbnail.)
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
if (added.length || gone.length) console.log('  grid changed → run `make blocks-scenes` so the site has a scene + poster for it');
