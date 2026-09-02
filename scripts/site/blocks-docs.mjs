// scripts/site/blocks-docs.mjs: regenerate the block table in docs/BLOCKS.md from the manifest, so the docs
// never drift from the registry. Replaces everything between <!-- BLOCKS:START --> and <!-- BLOCKS:END -->.
// Run via `make blocks-docs` (or directly). Deterministic; no network.
// `--check` (make blocks-docs CHECK=1) reports a stale table and exits 1 instead of writing one. The
// table is committed and only `make blocks-sync` rewrites it, so before the check existed a new block
// row reached the manifest and never reached the docs, and no run said so.
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
if (process.argv.includes('--check')) {
  if (out !== src) { console.error(`${DOC} is STALE (its block table disagrees with blocks/catalog.mjs), run \`make blocks-docs\``); process.exit(1); }
  console.log(`${DOC}: up to date (${CATALOG.length} entries)`);
  process.exit(0);
}
fs.writeFileSync(DOC, out);
console.log(`regenerated ${DOC}: ${CATALOG.length} entries, ${byFamily.size} families`);
