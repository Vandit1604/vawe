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
// This module is NODE-ONLY (nothing in core/ or films/ imports it), so reading the directory is
// available and top-level await is fine: an ESM importer awaits it before its own body runs.
//
// See engine-doctrine/BLOCKS.md for the catalog + screenshots.
// THE FAMILY LIST IS STATIC, AND THAT IS WHAT LETS A BLOCK RUN IN A BROWSER. This file used to
// `fs.readdirSync` its own directory and `await import()` each family, which is a fine plugin loader
// and is why blocks could never leave node: `scripts/site/site-engine.mjs` vendors core/ into the
// site so /editor and /playground run the SAME renderFrame the encoder does, and blocks were the one
// part of the engine it could not carry, because three `node:` imports sat at the top of this file.
// So every block family, with a full typed option table (blocks/schema.mjs, written expressly so
// "nothing could build a control panel for a block" would stop being true) could not reach the one
// page built to turn their dials.
//
// Nothing else changes. Every refusal below still fires at load: a family with no CATEGORY, a family
// with no option table, two families exporting one factory name, a factory with no catalog row. The
// only thing lost is auto-discovery of a NEW file, and `quality/gates/lib-test.mjs` asserts this map
// against the real directory listing, so a family added and not imported here fails a test rather
// than disappearing quietly.
import * as appFam from './app.mjs';
import * as boardFam from './board.mjs';
import * as cameraChromeFam from './camera-chrome.mjs';
import * as chartsFam from './charts.mjs';
import * as codeanimFam from './codeanim.mjs';
import * as coreFam from './core.mjs';
import * as devFam from './dev.mjs';
import * as diagramFam from './diagram.mjs';
import * as geoFam from './geo.mjs';
import * as glassFam from './glass.mjs';
import * as interactFam from './interact.mjs';
import * as sleekFam from './sleek.mjs';
import * as socialFam from './social.mjs';
import * as terminalHtmlFam from './terminal-html.mjs';
import * as terminalLayersFam from './terminal-layers.mjs';
import * as uiFam from './ui.mjs';
import * as vfxFam from './vfx.mjs';
import { CATALOG } from './catalog.mjs';
// The blurb rule is core/registry.js's, imported rather than restated: it refuses an empty line AND one
// that only says the name back, and it grades a blurb by the exact words `make arsenal` will index it
// under. Two copies of that rule would eventually disagree about which. The path resolves in the
// browser too: core/ is vendored at /core and blocks at /blocklib, so `../core/` is right in both.
import { checkBlurb } from '../core/registry.js';
import { TOKENS, SERIES, onColor, R, cardChrome, toneColor, avatarEl, BLOCKS } from './kit.mjs';

// The kit vocabulary, re-exported so a caller reaching for a token does not need a second import.
export { TOKENS, SERIES, onColor, R, cardChrome, toneColor, avatarEl };

// Not families: the shared vocabulary, the manifest, the option checker, and this file. Exported so
// the directory-drift test can subtract exactly what this file subtracts, rather than keeping a
// second copy of the same four names.
export const NOT_A_FAMILY = new Set(['index.mjs', 'kit.mjs', 'catalog.mjs', 'schema.mjs']);

// file name → its module. Keyed by FILE because every error below names the file, which is what an
// author needs to open. Sorted at the point of use, not here.
export const FAMILY_MODULES = {
  'app.mjs': appFam, 'board.mjs': boardFam, 'camera-chrome.mjs': cameraChromeFam,
  'charts.mjs': chartsFam, 'codeanim.mjs': codeanimFam, 'core.mjs': coreFam,
  'dev.mjs': devFam, 'diagram.mjs': diagramFam, 'geo.mjs': geoFam, 'glass.mjs': glassFam,
  'interact.mjs': interactFam, 'sleek.mjs': sleekFam, 'social.mjs': socialFam,
  'terminal-html.mjs': terminalHtmlFam, 'terminal-layers.mjs': terminalLayersFam,
  'ui.mjs': uiFam, 'vfx.mjs': vfxFam,
};

// Exported functions that are NOT block factories: they return colours and geometry, other families
// import them, and they have no catalog row because they are not blocks. A REASON each, because the
// refusal below is only worth having if this list cannot become the place an orphaned block hides.
export const NOT_A_BLOCK = {
  palette: 'blocks/codeanim.mjs: returns a CODE_THEMES colour table for a theme name, never layers',
  routeEdge: 'blocks/diagram.mjs: returns one orthogonal edge path (points + arrow head), never layers',
};

// Sorted, so import order is the alphabet and never the filesystem's opinion. Two runs on two
// machines assemble the registry in the same order, which is what makes a duplicate name a
// reproducible error rather than a race.
const FAMILY_FILES = Object.keys(FAMILY_MODULES).sort();

// Every named export of every family module, merged. Identifier-safe keys only (BLOCKS also holds
// namespaced `family.variant` names, which are not identifiers), so this is the object to spread when
// something needs a SCOPE to evaluate a factory default in, quality/gates/block-schema.mjs does.
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
  const mod = FAMILY_MODULES[file];
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
      + `table. Add \`export const ${file.slice(0, -4).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toUpperCase()}_SCHEMAS = { <family>: { … } }\` `
      + `(shape: blocks/schema.mjs). Without it every option this module takes is undeclared and `
      + `quality/gates/block-schema.mjs fails with no-schema, long after the render that needed it.`);
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

// CONTRACT 4, and it is the one that loses authored work. A factory with no CATALOG row still renders
// if you already know its name, and appears in NOTHING that lists the library: engine-doctrine/BLOCKS.md, make
// catalog, the site grid, make arsenal, registry/. It has happened: six of the twelve codeBlock themes
// were authored and WCAG-checked together and six shipped without a row, invisible, one manifest line
// away from being usable (see blocks/catalog.mjs, where they now have rows).
// The opposite direction, a row naming a family no factory exports, has thrown since the day it bit
// somebody (below). This is the same argument in the direction that costs more, and it belongs here
// rather than in a gate for the reason the other two throws give: the write site can refuse, and a
// gate that runs afterwards only promises to notice.
// CONTRACT 5: A ROW WITHOUT A REAL BLURB IS A BLOCK NOBODY CAN FIND. The row itself was already
// required (contract 4 below), which is what makes a block appear in engine-doctrine/BLOCKS.md and on the site.
// It was not enough. A row with `blurb: ''` loaded silently and entered `make arsenal`'s corpus with
// nothing to match on, so the block was reachable only by someone who already knew its exact name,
// which is the definition of undiscoverable. Measured, and it was not hypothetical: 97 of 97 families
// were missing from that corpus entirely, and separately 131 registry entries across the engine
// carried no blurb. Both were found by looking, months late, not by anything refusing them.
//
// At LOAD rather than in a gate, for this file's own stated reason: the write site can refuse, and a
// gate that runs afterwards only promises to notice.
for (const e of CATALOG) checkBlurb('block', e.name, e.blurb);

const CATALOGUED = new Set(CATALOG.map((e) => e.family));
const uncatalogued = Object.keys(ownerOf).filter((n) => !CATALOGUED.has(n) && !NOT_A_BLOCK[n]);
if (uncatalogued.length) {
  throw new Error(`blocks/catalog.mjs has no row for: ${uncatalogued.map((n) => `"${n}" (blocks/${ownerOf[n]})`).join(', ')}. `
    + `A factory with no row is invisible: it is in no catalog, no doc, no registry item and no search. `
    + `Add \`{ name: '${uncatalogued[0]}', family: '${uncatalogued[0]}', blurb: '<one line>', props: { … } }\` to blocks/catalog.mjs. `
    + `If it is a shared helper and not a block, add it to NOT_A_BLOCK in blocks/index.mjs WITH A REASON.`);
}

Object.assign(BLOCKS, EXPORTS);

// A namespaced entry resolves to its family with the manifest's preset props merged UNDER call-time
// opts, so a scene can still override anything. Adding a variant = a row in blocks/catalog.mjs (+ a
// `variant` branch in the family). See engine-doctrine/BLOCKS.md (auto-generated) and engine-doctrine/TASTE.md.
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
