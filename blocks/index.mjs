// blocks/index.mjs. The TASTE LIBRARY's assembly point. It holds no factories: it DISCOVERS them.
//
// WHY THIS EXISTS: agent-authored beats regress to hollow (a word in a box, a static list, an
// unbacked claim). The fix another engine proved: compose from pre-vetted blocks instead of authoring
// structure from scratch every time. Each factory in blocks/*.mjs is a PURE function of props → an
// array of scene-layer JSON (absolute-positioned, timed, animated) that is already tasteful. You call
// them in an authoring/transform script and spread the result into `scene.layers`.
//
// CONTRACT (per factory)
//   - returns an ARRAY of layer objects (so a block can stagger its own sub-parts in time)
//   - coordinates are absolute (1920x1080 stage); {x,y} = TOP-LEFT of the block
//   - timing: {start} seconds, {dur} seconds; sub-parts stagger off `start`
//   - deterministic: no Date/random. Same props → same layers.
//
// CONTRACT (per MODULE, and this file enforces all three at load)
//   1. `export const CATEGORY = '<label>'`. The site rail's grouping, owned by the module that
//      owns the blocks, so nothing keeps a name-to-category table in sync by hand.
//   2. `export const <FAM>_SCHEMAS = { … }`. The option contract (blocks/schema.mjs).
//   3. a factory name is exported by exactly ONE module.
//
// ADDING A BLOCK IS TWO EDITS: write blocks/<family>.mjs (factory + CATEGORY + <FAM>_SCHEMAS), and
// add its row to blocks/catalog.mjs. This file needs no line, and blocks/schema.mjs needs no import.
// It used to need both, plus two Object.assign calls, and nine identical registration lines sat here
// differing only in a name, carrying no information the module did not already have.
//
// This module is NODE-ONLY (nothing in core/ or formats/ imports it), so reading the directory is
// available and top-level await is fine: an ESM importer awaits it before its own body runs.
//
// See docs/BLOCKS.md for the catalog + screenshots.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CATALOG } from './catalog.mjs';
import { TOKENS, SERIES, onColor, R, cardChrome, toneColor, avatarEl, BLOCKS } from './kit.mjs';

// The kit vocabulary, re-exported so a caller reaching for a token does not need a second import.
export { TOKENS, SERIES, onColor, R, cardChrome, toneColor, avatarEl };

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Not families: the shared vocabulary, the manifest, the option checker, and this file.
const NOT_A_FAMILY = new Set(['index.mjs', 'kit.mjs', 'catalog.mjs', 'schema.mjs']);

// Sorted, so import order is the alphabet and never the filesystem's opinion. Two runs on two
// machines assemble the registry in the same order, which is what makes a duplicate name a
// reproducible error rather than a race.
const FAMILY_FILES = fs.readdirSync(HERE)
  .filter((f) => f.endsWith('.mjs') && !NOT_A_FAMILY.has(f))
  .sort();

// Every named export of every family module, merged. Identifier-safe keys only (BLOCKS also holds
// namespaced `family.variant` names, which are not identifiers), so this is the object to spread when
// something needs a SCOPE to evaluate a factory default in, scripts/gates/block-schema.mjs does.
export const EXPORTS = {};
// family → its module's CATEGORY. What the site groups the browsing rail by.
export const CATEGORY_OF = {};
// family → option table, merged from every `<FAM>_SCHEMAS` export. blocks/schema.mjs re-exports it.
export const SCHEMAS = {};
// The REGISTRY. Bare family names plus the manifest's namespaced `family.variant` entries. The object
// itself lives in blocks/kit.mjs so a CONTAINER block can resolve another block by name without
// importing this file back and deadlocking the discovery below; this module is what FILLS it.
export { BLOCKS };

const ownerOf = {};   // factory name → the file that exported it

for (const file of FAMILY_FILES) {
  const mod = await import(pathToFileURL(path.join(HERE, file)).href);
  const factories = Object.keys(mod).filter((k) => typeof mod[k] === 'function');
  if (!factories.length) continue;                 // a helper module ships no blocks; nothing to register

  if (typeof mod.CATEGORY !== 'string' || !mod.CATEGORY) {
    throw new Error(`blocks/${file} exports ${factories.length} factor(y/ies) but declares no CATEGORY. `
      + `Add \`export const CATEGORY = '<label>'\` beside its imports, the module that owns the blocks `
      + `owns their label, so nothing keeps a name-to-category table in sync by hand.`);
  }

  const tables = Object.keys(mod).filter((k) => k.endsWith('_SCHEMAS'));
  if (!tables.length) {
    throw new Error(`blocks/${file} exports ${factories.length} factor(y/ies) but declares no option `
      + `table. Add \`export const ${path.basename(file, '.mjs').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toUpperCase()}_SCHEMAS = { <family>: { … } }\` `
      + `(shape: blocks/schema.mjs). Without it every option this module takes is undeclared and `
      + `scripts/gates/block-schema.mjs fails with no-schema, long after the render that needed it.`);
  }

  for (const name of factories) {
    if (ownerOf[name]) {
      throw new Error(`blocks/${file} and blocks/${ownerOf[name]} both export a factory named `
        + `"${name}". One name, one factory: whichever loaded last would silently replace the other, `
        + `and every scene naming it would render the wrong block. Rename one.`);
    }
    ownerOf[name] = file;
    CATEGORY_OF[name] = mod.CATEGORY;
  }

  Object.assign(EXPORTS, mod);
  for (const t of tables) Object.assign(SCHEMAS, mod[t]);
}

Object.assign(BLOCKS, EXPORTS);

// A namespaced entry resolves to its family with the manifest's preset props merged UNDER call-time
// opts, so a scene can still override anything. Adding a variant = a row in blocks/catalog.mjs (+ a
// `variant` branch in the family). See docs/BLOCKS.md (auto-generated) and docs/TASTE.md.
for (const e of CATALOG) {
  // A BARE NAME USES THE RAW FACTORY, AND THAT IS NOT "IDENTICAL BEHAVIOUR", this line said it was.
  // Measured: 82 of the 88 bare catalog rows render DIFFERENTLY without their `props`, because a row's
  // props are demo CONTENT the factory does not carry. `blocks-catalog.mjs:30` and `blocks-scenes.mjs:58`
  // both pass `e.props` explicitly, so the catalog sheets and the site show the rich version while an
  // author writing {"type":"block","block":"<bare name>"} gets the factory's own defaults. For most
  // families that is merely plainer; for a family defaulting its content to `[]` it is an empty box.
  // Left as-is on purpose: merging props here would silently give every unset field demo content, which
  // is the same substitution wearing the other coat. The families whose emptiness is meaningless refuse
  // instead, at the factory (blocks/codeanim.mjs `needContent`).
  if (!e.name.includes('.')) continue;
  const fam = EXPORTS[e.family];
  // A catalog row naming a family that does not exist USED TO REGISTER NOTHING, silently. The author
  // then got "unknown block" from expand-blocks pointing at the name rather than at the typo, which is
  // the wrong end of the problem. Registration-time silence about a manifest error is the cheapest kind
  // of silent substitution to remove: it is one throw, at module load, before anything renders.
  if (typeof fam !== 'function') throw new Error(`blocks/catalog.mjs: "${e.name}" names family "${e.family}", `
    + `which no factory exports. Known families: ${Object.keys(ownerOf).sort().join(', ')}`);
  BLOCKS[e.name] = (opts = {}) => fam({ ...(e.props || {}), ...opts });
}
