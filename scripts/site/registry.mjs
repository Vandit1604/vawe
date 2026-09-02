// scripts/site/registry.mjs: GENERATED, never hand-edited. `make registry` writes registry/;
// `make registry CHECK=1` fails if what is on disk differs from what the sources say. Edit a row in
// blocks/catalog.mjs (or a beat in blueprints/index.mjs) and re-run; editing registry/ by hand is
// undone by the next run.
//
// WHAT THIS IS FOR. An outside agent, in someone else's project, wants to start from one of our
// blocks. Today the only way to find one is to read blocks/catalog.mjs, which is our source, not a
// contract. This emits the shadcn/another engine registry shape over the data we already keep, so an
// agent can fetch an index, pick an item by name and tags, and know exactly what to write where.
//
// SOURCES (one each. Nothing here is re-derived and nothing is hand-typed):
//   blocks/catalog.mjs          name · family · blurb · props · overlay      (the block manifest)
//   blueprints/index.mjs        BEATS + REQUESTS                              (the beat registry)
//   site/lib/block-frames.json  the measured ink rect of each block           (make blocks-scenes)
//   site/public/assets/blocks/  a standalone scene + poster per block         (make blocks-scenes)
//
// ── DECISION 1: what `type` and `target` mean here, and why they are NOT another engine' answer ──
// A another engine block IS a file: one .html composition, and `target` says where to copy it. A vawe
// block is not a file. It is a named factory in blocks/index.mjs, reached from scene JSON as
//   { "type": "block", "block": "card", "x": …, "y": …, "start": …, "dur": …, …props }
// and expanded at build time by scripts/author/expand-blocks.mjs. There is no per-block file to copy,
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
//                   `target` is a real path there: formats/scene/<name>.json.
//
// We INDEX that artifact, we do not copy it: `source` is its repo path and `url` is where the site
// already serves it. Copying every scene into registry/ would put the same bytes in two places and
// give them two chances to go stale, and blocks-scenes.mjs already owns them.
//
// ── DECISION 2: beats are in THIS registry; effects are not ──
// A beat ({"type":"beat","beat":"kineticHook",…}) installs through the SAME expander, into the SAME
// array position, with the same "no file to copy" shape. A separate registry would mean two indexes
// an agent has to know about to answer one question ("what can I drop into a scene?"). They share the
// index and are told apart by `type` (vawe:block vs vawe:beat) and by tags, which is what `type` is
// for. Effects are NOT items: an effect is a prop value on a layer (anim, ease, a bg preset), not a
// thing you place, so it has no install site and nothing to target. They stay in docs/EFFECTS.md.
//
// Deterministic: entries sorted by (type, name), object keys written in a fixed order, no timestamps,
// no counts recorded anywhere. Two runs over unchanged sources produce byte-identical output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKS } from '../../blocks/index.mjs';
import { CATALOG } from '../../blocks/catalog.mjs';
import { BEATS, REQUESTS } from '../../blueprints/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'registry');
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
// array or object. Same job as propsOf() in scripts/site/blueprints-catalog.mjs, which cannot be
// imported: that module runs its catalog on import and would print it into our output.
// Also splits them by whether they carry a DEFAULT. A prop with no default may be required, and some
// beats throw without theirs (focusRack refuses to run without `sharp` and `soft`), so a fragment that
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
  // resolution scripts/author/expand-blocks.mjs uses to decide what props a block ignores.
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
      requires: 'vawe engine (blocks/index.mjs); expand with `make expand D=<scene.json>`',
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
        target: `formats/scene/${safe}.json`,
        type: 'vawe:scene',
        note: 'pre-expanded: concrete layers only, renders without the block library',
      }],
      preview: { poster: `${SITE}/assets/blocks/${encodeURIComponent(safe)}.png` },
    } : {}),
  };
}

function beatItem(name) {
  const spec = propSpec(BEATS[name]);
  // Required props are emitted as explicit nulls: the beat throws without them (focusRack does) and
  // only the consumer knows what belongs there, so the fragment says so instead of looking complete.
  const layer = {
    type: 'beat', beat: name, start: PLACE.start, dur: PLACE.dur,
    ...Object.fromEntries(spec.required.map((p) => [p, null])),
  };
  return {
    $schema: `${SCHEMA}/registry-item.json`,
    name,
    type: 'vawe:beat',
    title: name,
    description: REQUESTS[name],
    tags: ['beat', 'motion'],
    dimensions: { width: 1920, height: 1080 },
    install: {
      kind: 'scene-layer',
      target: 'layers[]',
      requires: 'vawe engine (blueprints/index.mjs); expand with `make expand D=<scene.json>`',
      layer,
      requiredProps: spec.required.filter(timing),
      props: spec.optional.filter(timing),
    },
  };
}

const items = [
  ...CATALOG.map(blockItem),
  ...Object.keys(BEATS).map(beatItem),
].sort((a, b) => (a.type === b.type
  ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  : (a.type < b.type ? -1 : 1)));

const index = {
  $schema: `${SCHEMA}/registry.json`,
  name: 'vawe',
  homepage: SITE,
  usage: 'Each item installs as a LAYER OBJECT, not a file: append item.install.layer to the "layers" '
    + 'array of a scene JSON ({"module":"scene",…}), set x/y/start/dur, then `make expand`. Items with '
    + 'a files[] entry also ship a pre-expanded standalone scene that renders without the block library.',
  items: items.map((it) => ({ name: it.name, type: it.type, description: it.description, tags: it.tags })),
};

// Every item file, plus the index, keyed by its path relative to registry/.
const want = new Map([['registry.json', JSON.stringify(index, null, 2) + '\n']]);
for (const it of items) {
  const dir = it.type === 'vawe:beat' ? 'beats' : 'blocks';
  want.set(`${dir}/${safeName(it.name)}.json`, JSON.stringify(it, null, 2) + '\n');
}

const have = fs.existsSync(OUT)
  ? fs.readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith('.json')).map((f) => f.split(path.sep).join('/'))
  : [];

if (CHECK) {
  const bad = [];
  for (const [rel, body] of want) {
    const p = path.join(OUT, rel);
    if (!fs.existsSync(p)) bad.push(`missing ${rel}`);
    else if (fs.readFileSync(p, 'utf8') !== body) bad.push(`stale   ${rel}`);
  }
  for (const rel of have) if (!want.has(rel)) bad.push(`orphan  ${rel}`);
  if (bad.length) {
    console.error(`registry is STALE (${bad.length} file(s)), run \`make registry\`:`);
    for (const b of bad.slice(0, 20)) console.error('  ' + b);
    process.exit(1);
  }
  console.log(`registry: up to date (${want.size} files)`);
  process.exit(0);
}

let wrote = 0;
for (const [rel, body] of want) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // Write-on-change: registry/ is committed, so an unchanged item must not churn git on every run.
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== body) { fs.writeFileSync(p, body); wrote++; }
}
// Sweep items whose entry left the manifest: nothing points at them and a consumer would still fetch them.
const stale = have.filter((rel) => !want.has(rel));
for (const rel of stale) fs.rmSync(path.join(OUT, rel));

const nBlocks = items.filter((i) => i.type === 'vawe:block').length;
console.log(`registry: ${items.length} items (${nBlocks} blocks · ${items.length - nBlocks} beats) · ${wrote} file(s) written → registry/`
  + (stale.length ? `\n  removed ${stale.length} stale file(s)` : ''));
