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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CATALOG } from '../../blocks/catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'site/lib/blocks.json');

// CATEGORY, resolved rather than tabulated. 90 families is far too many for a browsing rail and most
// hold one block, so the site needs a coarser grouping — and a 176-row name-to-category table in a React
// component would be stale the day someone adds a block. The grouping already EXISTS in the code: the
// module a factory lives in. So each blocks/*.mjs exports its own `CATEGORY`, and this walks the modules
// to learn which one owns each family. Nothing is kept in sync by hand, and a module that ships blocks
// without declaring a label is refused HERE, at generation time, rather than showing up as an
// "Uncategorised" pile on the site that nobody notices.
const MODULES = fs.readdirSync(path.join(root, 'blocks'))
  .filter((f) => f.endsWith('.mjs') && !['catalog.mjs', 'kit.mjs', 'schema.mjs'].includes(f))
  // index.mjs re-exports EVERY sibling, so walked in directory order it claims whatever comes after it
  // alphabetically — measured: it swallowed interact, sleek, social and ui into "Core", 98 of 176. It is
  // the fallback owner, so it goes last and only labels what genuinely lives in it.
  .sort((a, b) => (a === 'index.mjs') - (b === 'index.mjs'));
const categoryOf = {};
for (const f of MODULES) {
  const mod = await import(pathToFileURL(path.join(root, 'blocks', f)).href);
  const factories = Object.keys(mod).filter((k) => typeof mod[k] === 'function');
  if (!factories.length) continue;                       // a helper module ships no blocks; nothing to label
  if (!mod.CATEGORY) {
    throw new Error(`blocks/${f} exports ${factories.length} factor(y/ies) but declares no CATEGORY. `
      + `Add \`export const CATEGORY = '<label>'\` beside its imports — the module that owns the blocks owns `
      + `their label, so nothing keeps a name-to-category table in sync by hand.`);
  }
  // `index.mjs` re-exports every sibling, so it is walked LAST and never overwrites a real owner.
  for (const name of factories) categoryOf[name] ??= mod.CATEGORY;
}

const grid = CATALOG.filter((e) => !e.overlay)
  .map(({ name, family, blurb, props }) => ({ name, family, blurb, props, category: categoryOf[family] || 'Core' }));

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
fs.writeFileSync(OUT, JSON.stringify(grid, null, 2) + '\n');

const added = grid.filter((b) => !prev.some((p) => p.name === b.name)).map((b) => b.name);
const gone = prev.filter((p) => !grid.some((b) => b.name === p.name)).map((p) => p.name);
console.log(`blocks-json: ${grid.length} entries → site/lib/blocks.json`
  + (added.length ? `\n  + ${added.join(', ')}` : '')
  + (gone.length ? `\n  - ${gone.join(', ')}` : ''));
if (added.length || gone.length) console.log('  grid changed → run `make blocks-scenes` so the site has a scene + poster for it');
