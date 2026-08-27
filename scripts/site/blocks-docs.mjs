// scripts/site/blocks-docs.mjs: regenerate the block table in docs/BLOCKS.md from the manifest, so the docs
// never drift from the registry. Replaces everything between <!-- BLOCKS:START --> and <!-- BLOCKS:END -->.
// Run via `make blocks-docs` (or directly). Deterministic; no network.
import fs from 'node:fs';
import { CATALOG } from '../../blocks/catalog.mjs';

const DOC = 'docs/BLOCKS.md';
const S = '<!-- BLOCKS:START -->', E = '<!-- BLOCKS:END -->';

// group by family (bare entry first, then its variants) preserving manifest order.
const byFamily = new Map();
for (const e of CATALOG) {
  if (!byFamily.has(e.family)) byFamily.set(e.family, []);
  byFamily.get(e.family).push(e);
}
const rows = [`_${CATALOG.length} entries across ${byFamily.size} families._`, '', '| Block | For |', '|---|---|'];
for (const [, entries] of byFamily) {
  for (const e of entries) rows.push(`| \`${e.name}\` | ${e.blurb} |`);
}
const table = rows.join('\n');

const src = fs.readFileSync(DOC, 'utf8');
const i = src.indexOf(S), j = src.indexOf(E);
if (i < 0 || j < 0) { console.error(`markers ${S} / ${E} not found in ${DOC}`); process.exit(1); }
const out = src.slice(0, i + S.length) + '\n' + table + '\n' + src.slice(j);
fs.writeFileSync(DOC, out);
console.log(`regenerated ${DOC}: ${CATALOG.length} entries, ${byFamily.size} families`);
