// scripts/site/registry.mjs: GENERATED, never hand-edited. `make registry` writes blocks/catalog/
// (one file per block, beside the factories they describe) and registry/ (the index plus every
// non-block item). `make registry CHECK=1` fails if what is on disk differs from what the sources
// say. Edit a row in blocks/catalog.mjs and re-run; editing either output by hand is undone by the
// next run.
//
// WHAT THIS IS FOR. An outside agent, in someone else's project, wants to start from one of our
// blocks. Today the only way to find one is to read blocks/catalog.mjs, which is our source, not a
// contract. This emits the shadcn/another engine registry shape over the data we already keep, so an
// agent can fetch an index, pick an item by name and tags, and know exactly what to write where.
//
// SOURCES (one each. Nothing here is re-derived and nothing is hand-typed):
//   blocks/catalog.mjs          name · family · blurb · props · overlay      (the block manifest)
//   core/generators/generators.js          GENERATORS                                     (the playground registry)
//   site/lib/block-frames.json  the measured ink rect of each block           (make blocks-scenes)
//   site/public/assets/blocks/  a standalone scene + poster per block         (make blocks-scenes)
//
// ── DECISION 1: what `type` and `target` mean here, and why they are NOT another engine' answer ──
// A another engine block IS a file: one .html composition, and `target` says where to copy it. A vawe
// block is not a file. It is a named factory in blocks/index.mjs, reached from scene JSON as
//   { "type": "block", "block": "card", "x": …, "y": …, "start": …, "dur": …, …props }
// and expanded at build time by harness/author/expand-blocks.mjs. There is no per-block file to copy,
// and inventing one (a .mjs extracted per block) would fork the library into copies that drift.
//
// So "install" here has two honest meanings, and the item carries both:
//
//   install.layer   THE PRIMARY PAYLOAD. A ready-to-paste scene-layer object, complete with example
//                   props and placeholder x/y/start/dur. `install.target` is "layers[]", an ARRAY
//                   POSITION in the consumer's scene JSON, not a path on their disk. That is the real
//                   unit of installation for this engine, and it is why `files` alone could not
//                   express it. Requires the consumer to have the vawe engine (the factory runs at
//                   expand time).
//
//   files[]         THE FALLBACK, for a consumer who does NOT have our block library. The scene at
//                   site/public/assets/blocks/<name>.json is ALREADY EXPANDED, it holds concrete
//                   layer primitives, no factory reference, so it renders in any vawe checkout as-is.
//                   `target` is a real path there: films/scene/<name>.json.
//
// We INDEX that artifact, we do not copy it: `source` is its repo path and `url` is where the site
// already serves it. Copying every scene into registry/ would put the same bytes in two places and
// give them two chances to go stale, and blocks-scenes.mjs already owns them.
//
// ── DECISION 2: effects are not items ──
// An effect is a prop value on a layer (anim, ease, a bg preset), not a thing you place, so it has no
// install site and nothing to target. They stay in engine-doctrine/EFFECTS.md, not here. (Beats installed through
// this registry too, once; blueprints are retired, recipes/README.md.)
//
// -- DECISION 3: a generator is a THIRD kind of item, and its install differs by `produces` --
// A generator is not a block and not a beat. Nothing in a scene ever NAMES one: the engine has no
// {"type":"generator"} layer, so there is no factory reference to paste and no `make expand` step.
// What a generator gives you is its OUTPUT, and the output has two shapes, which the entry declares:
//
//   produces:'layers'  render(options) returns concrete scene layers (a shader layer, an html card).
//                      They are engine-native primitives, so the item carries them under
//                      install.layers, target "layers[]", and a consumer with no block library at all
//                      can paste them and render. This is the closest thing to a block's install.layer
//                      and it is the reason it is spelled differently: layers, plural, already expanded.
//
//   produces:'html'    render(options) returns a markup STRING, up to 31KB of it for colonnade. That
//                      is a rendered artifact, not an install spec, and putting it in a JSON item would
//                      commit a generated picture into the index while claiming to be a contract. So
//                      the item carries the OPTIONS and the two ways to turn them into markup: the
//                      playground URL a person uses, and the byName(...).render(...) call an agent
//                      uses. Target is `bg[].html` or an html layer, which is where markup goes.
//
// install.options is the generator's FIRST PRESET over its schema defaults, not the raw defaults. The
// registry's own argument, at the top of core/generators/generators.js: a default is the neutral value a field
// takes when nobody said otherwise, which is not the same as a good-looking result.
// install.props is DERIVED, by walking the schema with the generator's own controlsOf(), so it is the
// same dial list the playground builds its panel from and cannot drift from it.
//
// HELD BACK LOOKS GET NO ITEM, and nothing here filters for that: core/generators/generators.js exports
// GENERATORS already filtered to `ready`, with ALL_GENERATORS beside it for the tools that must score
// what is held back. Importing the shipping list is the whole mechanism.
//
// Deterministic: entries sorted by (type, name), object keys written in a fixed order, no timestamps,
// no counts recorded anywhere. Two runs over unchanged sources produce byte-identical output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKS } from '../../blocks/index.mjs';
import { CATALOG } from '../../blocks/catalog.mjs';
import { GENERATORS, controlsOf, defaultsOf } from '../../core/generators/generators.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Block items live beside the factories that back them (blocks/catalog/); the index and every
// non-block item (beats, generators) stay in registry/, the agent-facing entry point that spans all
// item types and is not owned by one code directory.
const BLOCKS_OUT = path.join(root, 'blocks/catalog');
const REGISTRY_OUT = path.join(root, 'registry');
// `--check` (what the Makefile passes) or CHECK=1 in the environment. Both, because the target read
// the environment while every sibling target passed a flag, and a check reachable only one way is a
// check somebody runs the other way and believes.
const CHECK = process.argv.includes('--check') || process.env.CHECK === '1';
const SITE = 'https://vawe.dev';
const SCHEMA = `${SITE}/schema`;

const frames = JSON.parse(fs.readFileSync(path.join(root, 'site/lib/block-frames.json'), 'utf8'));

// Same escaping blocks-scenes.mjs uses for the on-disk name of a namespaced entry ("card.pricing").
const safeName = (name) => name.replace(/[^a-z0-9.]/gi, '_');

// The destructured parameter names of a factory, brace-matched because a default can itself be an
// array or object. Same job as a block's own prop-spec walk elsewhere in this repo, which cannot be
// imported: it runs its catalog on import and would print it into our output.
// Also splits them by whether they carry a DEFAULT. A prop with no default may be required, and some
// some factories throw without theirs, so a fragment that
// listed every prop as optional would hand a consumer a layer that cannot expand.
function propSpec(fn) {
  const src = fn.toString();
  const open = src.indexOf('{', src.indexOf('('));
  const out = { required: [], optional: [] };
  if (open < 0) return out;
  const parts = [];
  let depth = 0, buf = '';
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if ('([{'.includes(ch)) { depth++; if (depth === 1) continue; }
    else if (')]}'.includes(ch)) { depth--; if (depth === 0) break; }
    if (ch === ',' && depth === 1) { parts.push(buf); buf = ''; continue; }
    buf += ch;
  }
  parts.push(buf);
  for (const part of parts) {
    const name = part.split(/[:=]/)[0].trim();
    if (!name) continue;
    (part.includes('=') ? out.optional : out.required).push(name);
  }
  return out;
}


// Placeholder placement. A block is absolute on the 1920x1080 stage, so a fragment with no x/y is not
// runnable; these are the values a consumer is expected to change first. Filtered to the keys the
// factory ACCEPTS: four blocks take no `dur` (loadingBar times itself), and the expander warns about
// every prop a block ignores, so an unfiltered placement would ship a fragment that warns on arrival.
const PLACE = { x: 160, y: 160, start: 0, dur: 4 };
const timing = (p) => p !== 'start' && p !== 'dur';
const placement = (accepted) => Object.fromEntries(
  Object.entries(PLACE).filter(([k]) => accepted.includes(k)));

function blockItem(entry) {
  const safe = safeName(entry.name);
  // The FAMILY factory, not BLOCKS[entry.name]: a namespaced entry resolves to a wrapper whose own
  // signature is (opts), so introspecting it would report the block as taking no props at all. Same
  // resolution harness/author/expand-blocks.mjs uses to decide what props a block ignores.
  const spec = BLOCKS[entry.family] ? propSpec(BLOCKS[entry.family]) : { required: [], optional: [] };
  const layer = { type: 'block', block: entry.name,
    ...placement([...spec.required, ...spec.optional]), ...(entry.props || {}) };
  const dims = frames[entry.name];
  const scene = `site/public/assets/blocks/${safe}.json`;
  const hasScene = fs.existsSync(path.join(root, scene));
  return {
    $schema: `${SCHEMA}/registry-item.json`,
    name: entry.name,
    type: 'vawe:block',
    title: entry.name,
    description: entry.blurb,
    tags: [entry.family, ...(entry.overlay ? ['overlay'] : [])],
    ...(dims ? { dimensions: { width: dims.w, height: dims.h } } : {}),
    install: {
      kind: 'scene-layer',
      target: 'layers[]',
      requires: 'vawe engine (blocks/index.mjs); expands automatically at load, no separate step',
      layer,
      // No requiredProps for a block: the example layer is COMPLETE. Every one of these is rendered
      // and screenshotted by make blocks-scenes, so the fragment is proven, not merely plausible.
      // `props` is everything the family factory accepts, in signature order, for customising it.
      props: [...spec.required, ...spec.optional],
    },
    ...(hasScene ? {
      files: [{
        source: scene,
        url: `${SITE}/assets/blocks/${encodeURIComponent(safe)}.json`,
        target: `films/scene/${safe}.json`,
        type: 'vawe:scene',
        note: 'pre-expanded: concrete layers only, renders without the block library',
      }],
      preview: { poster: `${SITE}/assets/blocks/${encodeURIComponent(safe)}.png` },
    } : {}),
  };
}

function generatorItem(g) {
  const preset = Object.keys(g.presets || {})[0] || null;
  const base = { ...defaultsOf(g.schema), ...(preset ? g.presets[preset] : {}) };
  const options = g.normalise ? g.normalise(base) : base;
  const layers = g.produces === 'layers';
  return {
    $schema: `${SCHEMA}/registry-item.json`,
    name: g.name,
    type: 'vawe:generator',
    title: g.name,
    description: g.blurb,
    tags: ['generator', g.group, g.produces],
    install: {
      kind: layers ? 'scene-layers' : 'generated-markup',
      target: layers ? 'layers[]' : 'bg[].html (or an html layer)',
      requires: layers
        ? 'nothing beyond the vawe engine: these are concrete layer primitives, no expand step'
        : 'markup only. Paste it as-is; the engine drives it with --t, and it needs no block library',
      // The dials, as the playground's own walk of the schema reports them. Every one is legal in
      // `options`; a nested one is dotted, matching what a permalink writes.
      props: controlsOf(g.schema).map((c) => c.path),
      preset,
      options,
      ...(layers
        ? { layers: g.render(options) }
        // NOT the markup itself. See DECISION 3: it is a rendered picture, sometimes 31KB of it.
        : { render: `import { byName } from 'core/generators/generators.js'; byName('${g.name}').render(options)` }),
    },
    docs: g.docs,
    ...(g.reference ? { reference: g.reference } : {}),
    preview: { url: `${SITE}/playground?gen=${g.name}` },
  };
}

const items = [
  ...CATALOG.map(blockItem),
  // GENERATORS, never ALL_GENERATORS: a look held back is not advertised. See DECISION 3.
  ...GENERATORS.map(generatorItem),
].sort((a, b) => (a.type === b.type
  ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  : (a.type < b.type ? -1 : 1)));

const index = {
  $schema: `${SCHEMA}/registry.json`,
  name: 'vawe',
  homepage: SITE,
  usage: 'Blocks and beats install as a LAYER OBJECT, not a file: append item.install.layer to the '
    + '"layers" array of a scene JSON ({"module":"scene",…}), set x/y/start/dur; it expands automatically '
    + 'at load. Items with a files[] entry also ship a pre-expanded standalone scene that renders without the '
    + 'block library. A generator installs its OUTPUT instead: item.install.layers is already-expanded '
    + 'layers to append, and where install.kind is "generated-markup" you turn item.install.options into '
    + 'markup (item.preview.url, or item.install.render) and paste that into a bg window.',
  items: items.map((it) => ({ name: it.name, type: it.type, description: it.description, tags: it.tags })),
};

// Every item file, plus the index, keyed by its ABSOLUTE path. A block's file sits in blocks/catalog/
// (paired with the factory it describes); the index and every non-block item stay under registry/.
const want = new Map([[path.join(REGISTRY_OUT, 'registry.json'), JSON.stringify(index, null, 2) + '\n']]);
for (const it of items) {
  const base = it.type === 'vawe:block' ? BLOCKS_OUT
    : path.join(REGISTRY_OUT, { 'vawe:beat': 'beats', 'vawe:generator': 'generators' }[it.type] || 'blocks');
  want.set(path.join(base, `${safeName(it.name)}.json`), JSON.stringify(it, null, 2) + '\n');
}

// Every JSON file under either output root, labelled by its own root so a stray file is swept from
// wherever it actually sits.
const scan = (dir) => (fs.existsSync(dir)
  ? fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f))
  : []);
const have = [...scan(BLOCKS_OUT), ...scan(REGISTRY_OUT)];
const label = (p) => path.relative(root, p);

if (CHECK) {
  const bad = [];
  for (const [p, body] of want) {
    if (!fs.existsSync(p)) bad.push(`missing ${label(p)}`);
    else if (fs.readFileSync(p, 'utf8') !== body) bad.push(`stale   ${label(p)}`);
  }
  for (const p of have) if (!want.has(p)) bad.push(`orphan  ${label(p)}`);
  if (bad.length) {
    console.error(`registry is STALE (${bad.length} file(s)), run \`make registry\`:`);
    for (const b of bad.slice(0, 20)) console.error('  ' + b);
    process.exit(1);
  }
  console.log(`registry: up to date (${want.size} files)`);
  process.exit(0);
}

let wrote = 0;
for (const [p, body] of want) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // Write-on-change: registry/ and blocks/catalog/ are committed, so an unchanged item must not churn
  // git on every run.
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== body) { fs.writeFileSync(p, body); wrote++; }
}
// Sweep items whose entry left the manifest: nothing points at them and a consumer would still fetch them.
const stale = have.filter((p) => !want.has(p));
for (const p of stale) fs.rmSync(p);

const n = (t) => items.filter((i) => i.type === `vawe:${t}`).length;
console.log(`registry: ${items.length} items (${n('block')} blocks · ${n('beat')} beats · ${n('generator')} generators) · ${wrote} file(s) written → blocks/catalog/ + registry/`
  + (stale.length ? `\n  removed ${stale.length} stale file(s)` : ''));
