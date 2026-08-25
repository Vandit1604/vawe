// schema-drift.mjs — keep the DATA CONTRACT honest. The engine (scene.html) reads layer props as
// `L.<prop>` / `C.<prop>`; the schema (schema.json) is what validate knows about. When a new
// primitive ships a prop that never gets registered (e.g. `motion` did), validation silently passes and
// it drifts. This asserts every prop the engine reads is defined somewhere in the schema.
//
//   node scripts/gates/schema-drift.mjs            (make schema-check) — exits 1 on drift
//   node scripts/gates/schema-drift.mjs --write    (make schema-write) regenerate EVERY derived part
//                                                  — layerProps AND the registry-owned enums — then
//                                                  re-run with no flag to verify
//
// THE PER-LAYER VOCABULARY IS GENERATED, NOT MAINTAINED. `schema.layerProps` is written by this file
// from the PROPS declarations (core/props.js) and checked in; the gate fails when the committed block
// differs from what the declarations produce. It is TYPE-SCOPED, and that is the whole point: this
// gate used to answer "is this prop in the schema?" by NAME over the flat `layers.item` map, so `src`
// on an `html` layer was indistinguishable from `src` on an `image` layer and a third meaning would
// have passed in silence. A name is not a fact about a layer; a name on a type is.
import fs from 'node:fs';
import { ANIM_NAMES } from '../../core/clips.js';
import { AMBIENT_FX } from '../../core/shaders-ambient.js';
import { PAINT_FX_NAMES } from '../../core/paint-fx.js';
import { RESAMPLE_FX } from '../../core/resample-fx.js';
import { RAYMARCH_FX } from '../../core/raymarch-fx.js';
import { THREE_FX } from '../../core/three-scenes.js';
import { LAYER_TYPES, LAYER_PROPS } from '../../core/layers/index.js';
import { SHARED_PROPS } from '../../core/layers/vocabulary.js';
import { FX_TYPES } from '../../core/fx/index.js';
import { BLEND_MODES } from '../../core/fx/mix-blend.js';
import { PRESENTATIONS, TIMINGS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';
import { SEAM_FX } from '../../core/seams.js';
import { SPECTACLE_DEVICES } from '../../core/knobs.js';
import { BG_NAMES } from '../../core/backgrounds.js';
import { CAP_STYLE_NAMES } from '../../core/captions.js';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
// THE ENGINE IS EVERY FILE THAT READS A LAYER PROP, and that list is derived rather than remembered.
// It was `scene.html` + `core/layers/*.js`, written when scene.html WAS the orchestrator. scene.html
// is now a 20-line shell that imports scene.js, and it contains zero `L.` reads — so for as long as
// that split has existed, every prop read only by the orchestrator (cut · vars · react · motionBlur ·
// borderTrail · circle · becomes · panWith …) was outside the check, and the gate reported green over
// the blind spot (docs/MISTAKES.md #229).
//
// So the scan is the orchestrator plus the four REGISTRY DIRECTORIES, each walked whole: a layer prop
// is read by the thing that DRAWS a layer (core/layers, and core/surfaces for the four types whose
// output is a canvas), the thing that MODIFIES one (core/fx) or the pipeline that COMPOSES one per
// frame (core/tracks), and each of those is one file per entry in a directory, so a walk cannot go
// stale the way a hand-written file list did.
//
// Deliberately not all of core/: `L` is a local name elsewhere (core/audio-kit.mjs builds a synth voice
// from an `L` carrying attack/decay/waveform), and a gate widened until it invents findings is worse
// than the gap it closed.
const engineFiles = [path.join(ROOT, 'formats/scene/scene.html'), path.join(ROOT, 'formats/scene/scene.js')];
for (const dir of ['core/layers', 'core/surfaces', 'core/fx', 'core/tracks'])
  for (const f of fs.readdirSync(path.join(ROOT, dir)))
    if (f.endsWith('.js')) engineFiles.push(path.join(ROOT, dir, f));
const engineSrc = engineFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const SCHEMA_PATH = path.join(ROOT, 'formats/scene/schema.json');
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// ---------- THE DERIVED PER-LAYER VOCABULARY (generated -> checked in -> verified) ----------
//
// Two halves, kept apart because they are different facts. `byType` is what ONE primitive reads and
// nothing else does; `shared` is what every layer carries whatever its type. Names only: the guards
// (`preset` needs `split`) stay live in the declarations, where `make layer-props` reads them, because
// a guard is a question about one layer's other props and a static vocabulary cannot answer it.
const vocabulary = {
  _generated: 'node scripts/gates/schema-drift.mjs --write - do not hand-edit',
  _source: 'the PROPS declarations beside each read (core/props.js - core/layers/vocabulary.js)',
  shared: Object.keys(SHARED_PROPS).sort(),
  byType: Object.fromEntries(LAYER_TYPES.map((t) => [t, Object.keys(LAYER_PROPS[t]).sort()])),
};

// One line per key, so a type gaining a prop is a one-line diff rather than a re-indent.
function renderVocabulary(v) {
  const arr = (a) => `[${a.map((x) => JSON.stringify(x)).join(', ')}]`;
  const types = Object.entries(v.byType).map(([t, ps]) => `      ${JSON.stringify(t)}: ${arr(ps)}`);
  return '  "layerProps": {\n'
    + `    "_generated": ${JSON.stringify(v._generated)},\n`
    + `    "_source": ${JSON.stringify(v._source)},\n`
    + `    "shared": ${arr(v.shared)},\n`
    + '    "byType": {\n' + types.join(',\n') + '\n    }\n'
    + '  },';
}

// schema prop name -> the registry that owns it. `extra` covers documented sentinels the registry
// does not carry (a `none` no-op), which are part of the contract but not of the vocabulary.
// Addressed by EXACT PATH, not by prop name: the schema has several `type` and `preset` enums for
// different things (a layer type vs a bg fx type; a kinetic preset vs a bg preset), and matching by
// name compared a bg preset list against the kinetic registry and reported 41 phantom drifts.
const at = (p) => p.split('.').reduce((o, k) => (o || {})[k], schema.fields);
const OWNED = [
  { path: 'layers.item.anim',   want: [...ANIM_NAMES, 'none'],                 src: 'core/clips.js ANIM' },
  { path: 'layers.item.out',    want: [...ANIM_NAMES, 'none'],                 src: 'core/clips.js ANIM' },
  { path: 'layers.item.shader', want: AMBIENT_FX,                              src: 'core/shaders-ambient.js AMBIENT_FX' },
  { path: 'layers.item.three',    want: THREE_FX,                             src: 'core/three-scenes.js THREE_FX' },
  { path: 'layers.item.raymarch', want: RAYMARCH_FX,                          src: 'core/raymarch-fx.js RAYMARCH_FX' },
  { path: 'layers.item.resample', want: RESAMPLE_FX,                          src: 'core/resample-fx.js RESAMPLE_FX' },
  { path: 'layers.item.paint',    want: PAINT_FX_NAMES,                       src: 'core/paint-fx.js PAINT_FX' },
  { path: 'layers.item.children.item.type', want: LAYER_TYPES,                  src: 'core/layers/index.js REGISTRY (via kit.buildLeaf)' },
  { path: 'layers.item.type',     want: LAYER_TYPES,                          src: 'core/layers/index.js REGISTRY' },
  { path: 'cuts.item.style',    want: [...Object.keys(PRESENTATIONS), 'none'], src: 'core/cuts.js PRESENTATIONS' },
  { path: 'layers.item.cut',    want: Object.keys(PRESENTATIONS),              src: 'core/cuts.js PRESENTATIONS (a per-layer cut)' },
  { path: 'bg.item.preset',     want: BG_NAMES,                                src: 'core/backgrounds.js BG_NAMES' },
  { path: 'stings.item.fx',     want: SHADER_FX,                               src: 'core/stings.js SHADER_FX' },
  { path: 'seams.item.fx',      want: SEAM_FX,                                 src: 'core/seams.js SEAM_FX' },
  { path: 'seams.item.timing',  want: Object.keys(TIMINGS),                    src: 'core/cuts.js TIMINGS' },
  { path: 'spectacle.fields.device', want: SPECTACLE_DEVICES.names,           src: 'core/knobs.js SPECTACLE_DEVICES' },
  // unified transitions: `timing` mirrors TIMINGS; `fx` is intentionally NOT enumerated (its valid set
  // is the union of all four registries — the router in transitions-lower.js is the drift-proof guard).
  { path: 'transitions.item.timing', want: Object.keys(TIMINGS),               src: 'core/cuts.js TIMINGS' },
  { path: 'layers.item.cutTiming', want: Object.keys(TIMINGS),                 src: 'core/cuts.js TIMINGS (via TIMING_REGISTRY)' },
  { path: 'layers.item.modifiers.item.mixBlend', want: BLEND_MODES,            src: 'core/fx/mix-blend.js BLEND_MODES' },
  // MISTAKES #400 logged the schema enum as a hand-written second copy of the caption registry and
  // left lib-test comparing the two. Comparing is not owning: the gate said "they differ" and the
  // author still hand-edited schema.json. The registry owns it here, so --write derives it.
  { path: 'captionStyle',       want: CAP_STYLE_NAMES,                        src: 'core/captions.js CAP_STYLES' },
];

// THE OWNED ENUMS ARE GENERATED TOO. Until now this table only COMPARED, so every registry that grew
// needed a second, hand edit in schema.json and the gate's own advice ("--write") fixed only
// layerProps. One fact, one owner: the registry owns the vocabulary and the schema RECEIVES it.
//
// Located in the TEXT by its current VALUES, not by a path anchor: schema.json is hand-formatted
// (inline objects, per-site indentation) and a JSON.stringify round-trip would reflow the whole file,
// making every regeneration look like a rewrite. Values are a safe key because the parsed node at the
// path tells us exactly what array to look for. A site outside the table holding the same array is
// rewritten too, and that is harmless: same values in, same values out, only the registry's order.
const ENUM_RE = /"enum"\s*:\s*\[[^\]]*\]/g;

// Same layout in, same layout out — multi-line stays multi-line at its own indent, one-line stays one.
function renderEnum(found, values) {
  const json = values.map((v) => JSON.stringify(v));
  if (!found.includes('\n')) return `"enum": [${json.join(', ')}]`;
  const indent = found.match(/\n([ ]*)/)[1];
  const close = (found.match(/\n([ ]*)\]$/) || [, indent.slice(0, -2)])[1];
  return `"enum": [\n${json.map((v) => indent + v).join(',\n')}\n${close}]`;
}

// The values a path SHOULD carry: registry order (lib-test pins five enums to it exactly), deduped,
// because the sentinels appended above (`none`) are already in some registries.
const ownedEnum = (want) => [...new Set(want)];

function rewriteOwnedEnums(src) {
  const targets = [];
  for (const { path: pth, want } of OWNED) {
    const node = at(pth);
    if (!node || !Array.isArray(node.enum)) continue;   // not declared as an enum: nothing to derive
    const key = JSON.stringify(node.enum);
    const same = targets.find((t) => t.key === key);
    // Two paths whose arrays read alike cannot be told apart by value. Identical intent (seams.timing
    // and transitions.timing are both TIMINGS) is one target that fires twice; different intent is
    // ambiguous, so refuse rather than guess.
    if (same) {
      if (JSON.stringify(same.want) !== JSON.stringify(ownedEnum(want))) {
        console.error(`\u2717 ${pth} and ${same.path} hold the same enum but want different values`); process.exit(2);
      }
      continue;
    }
    targets.push({ path: pth, key, want: ownedEnum(want), hits: 0 });
  }
  const out = src.replace(ENUM_RE, (m) => {
    let cur;
    try { cur = JSON.parse(m.slice(m.indexOf('['))); } catch { return m; }
    const t = targets.find((x) => x.key === JSON.stringify(cur));
    if (!t) return m;
    t.hits++;
    return renderEnum(m, t.want);
  });
  for (const t of targets) if (!t.hits) { console.error(`\u2717 could not find ${t.path}'s enum in the schema text`); process.exit(2); }
  return { out, targets };
}

// Splice by anchor rather than re-serialising the whole schema: schema.json carries hand-formatted
// inline objects that a JSON.stringify round-trip would explode, and a generator that reformats the
// file it edits makes every regeneration look like a rewrite.
const BLOCK = /\n {2}"layerProps": \{[\s\S]*?\n {2}\},/;
if (process.argv.includes('--write')) {
  const src = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const block = '\n' + renderVocabulary(vocabulary);
  // Presence of an anchor, not "did the text change": a re-run over an already-current file changes
  // nothing, and reading that as a missing anchor made --write fail the second time it was called.
  const hasBlock = BLOCK.test(src);
  const FIELDS = /\n {2}"fields": \{/;
  if (!hasBlock && !FIELDS.test(src)) { console.error('\u2717 could not place the layerProps block - no existing block and no `"fields": {` anchor'); process.exit(2); }
  const spliced = hasBlock ? src.replace(BLOCK, block) : src.replace(FIELDS, `${block}\n  "fields": {`);
  const { out: next, targets } = rewriteOwnedEnums(spliced);
  fs.writeFileSync(SCHEMA_PATH, next);
  console.log('✓ wrote formats/scene/schema.json layerProps (generated from the declarations)');
  console.log(`✓ wrote ${targets.length} registry-owned enum(s) at ${targets.reduce((a, t) => a + t.hits, 0)} site(s)`);
  process.exit(0);
}
{
  const have = JSON.stringify(schema.layerProps ?? null);
  const want = JSON.stringify(vocabulary);
  if (have !== want) {
    console.error('✗ formats/scene/schema.json `layerProps` is stale - it is GENERATED from the PROPS');
    console.error('  declarations and a module has changed what it reads since it was last written.');
    const hv = schema.layerProps || {};
    const cmp = (label, a = [], b = []) => {
      const add = b.filter((x) => !a.includes(x)), rm = a.filter((x) => !b.includes(x));
      if (add.length) console.error(`    ${label}: now declared, not in the file - ${add.join(', ')}`);
      if (rm.length) console.error(`    ${label}: in the file, no longer declared - ${rm.join(', ')}`);
    };
    cmp('shared', hv.shared, vocabulary.shared);
    for (const t of new Set([...Object.keys(hv.byType || {}), ...LAYER_TYPES])) cmp(t, (hv.byType || {})[t], vocabulary.byType[t]);
    console.error('  fix: node scripts/gates/schema-drift.mjs --write');
    process.exit(1);
  }
  const n = Object.values(vocabulary.byType).reduce((a, ps) => a + ps.length, 0);
  console.log(`✓ layerProps in sync - ${LAYER_TYPES.length} types declaring ${n} type-scoped prop(s) + ${vocabulary.shared.length} shared`);
}

// BOTH DIRECTIONS, against the hand-written docs in `layers.item`. The declarations say what the
// engine READS; `layers.item` says what an author may WRITE, and it carries the labels and enums no
// declaration can. They must name the same set, or one of them is lying:
//   - declared and undocumented -> validate's unknown-prop pass REJECTS a prop the engine honours.
//     `hue` (paint aurora) sat here, invisible to the regex below because paint-fx reads it as `o.hue`.
//   - documented and undeclared -> the schema advertises a prop nothing implements, which is the `slideL`
//     class of bug (#21): the author writes it, validate is happy, and the render ignores it.
{
  const LI = schema.fields?.layers?.item || {};
  const CI = LI.children?.item || {};
  const documented = new Set([...Object.keys(LI), ...Object.keys(CI)]);
  const declared = new Set([...vocabulary.shared, ...Object.values(vocabulary.byType).flat()]);
  const undocumented = [...declared].filter((k) => !documented.has(k)).sort();
  const unread = [...documented].filter((k) => !declared.has(k)).sort();
  if (undocumented.length || unread.length) {
    if (undocumented.length) {
      console.error(`✗ the engine declares ${undocumented.length} layer prop(s) that layers.item does not document:`);
      for (const k of undocumented) console.error(`    • ${k}  (validate rejects it today; the engine reads it)`);
    }
    if (unread.length) {
      console.error(`✗ layers.item documents ${unread.length} prop(s) no module declares:`);
      for (const k of unread) console.error(`    • ${k}  (an author can write it and nothing will read it)`);
      console.error('    either declare it beside the code that reads it, or delete it from the schema.');
    }
    process.exit(1);
  }
  console.log(`✓ layers.item documents exactly the ${declared.size} prop(s) the engine declares`);
}

// props the engine reads off a layer/child object (L.<prop>, LL.<prop> or C.<prop>). `LL` is the same
// layer under an inner name where `L` is already taken — core/three-fx.js has always done it, and
// core/surfaces does it in the per-frame draw. scripts/gates/layer-props.mjs has matched all three
// since it shipped; this pattern matched two, so a prop read only as `LL.` counted as read nowhere.
const engineProps = new Set();
for (const m of engineSrc.matchAll(/\b(?:LL?|C)\.([a-zA-Z][a-zA-Z0-9]*)/g)) engineProps.add(m[1]);

// every field name DEFINED anywhere in the schema (skip the JSON-schema structural keywords)
const RESERVED = new Set(['type', 'label', 'item', 'enum', 'min', 'max', 'default', 'required',
  'minLength', 'pattern', 'minItems', 'maxItems', 'fields', 'properties', 'note', 'name']);
const defined = new Set();
// `schema.fields` and not `schema`: the derived `layerProps` block below is keyed by LAYER TYPE, and
// walking it would enter every type name into the set of "fields the schema defines".
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!RESERVED.has(k)) defined.add(k); walk(v); }
})(schema.fields);

// engine internals that are NOT authored data fields (computed / structural), so not in the schema
const INTERNAL = new Set(['type', 'children', 'part', 'use']);

const missing = [...engineProps].filter((p) => !defined.has(p) && !INTERNAL.has(p)).sort();
if (missing.length) {
  console.error(`✗ schema drift — engine reads ${missing.length} prop(s) not in schema.json:`);
  for (const p of missing) console.error(`    • L.${p}`);
  console.error('  add them to formats/scene/schema.json (or to INTERNAL in this script if truly computed).');
  process.exit(1);
}
console.log(`✓ schema in sync — all ${engineProps.size} engine props are defined in schema.json`);

// EVERY enum in the schema is a COPY of a registry the engine owns, and a copy drifts. The schema
// once advertised "slideL", an anim that never existed and so silently resolved to fade (#21). This
// check existed for exactly that — and covered ONE enum out of eight. Adding `nebula` to AMBIENT_FX
// made the schema reject a valid value and nothing said so until a scene failed to validate
// (docs/MISTAKES.md #82). Every vocabulary the engine owns is compared here now, both directions.
{
  let bad = 0, checked = 0;
  for (const { path: pth, want, src } of OWNED) {
    const node = at(pth);
    if (!node || !Array.isArray(node.enum)) continue;   // not declared as an enum: nothing can drift
    checked++;
    const d = node.enum;
    const wantS = [...new Set(want)].sort().join(',');
    if ([...new Set(d)].sort().join(',') === wantS) continue;
    const missing = want.filter((x) => !d.includes(x));
    const extra = d.filter((x) => !want.includes(x));
    console.error(`\u2717 ${pth} DRIFT vs ${src}`);
    if (missing.length) console.error(`    schema is MISSING: ${missing.join(', ')}  (the engine accepts these; the schema rejects them)`);
    if (extra.length) console.error(`    schema ADVERTISES: ${extra.join(', ')}  (nothing implements these)`);
    bad++;
  }
  // The modifier vocabulary is a set of KEYS, not an enum, so the loop above cannot see it: a second
  // file in core/fx/ would be dispatchable by the engine and rejected by validate's unknown-prop pass,
  // which is drift pointing the other way \u2014 the engine accepts what the schema refuses.
  {
    const node = at('layers.item.modifiers.item') || {};
    const have = Object.keys(node).sort().join(',');
    if (have !== [...FX_TYPES].sort().join(',')) {
      const missing = FX_TYPES.filter((x) => !(x in node));
      const extra = Object.keys(node).filter((x) => !FX_TYPES.includes(x));
      console.error('\u2717 layers.item.modifiers.item DRIFT vs core/fx/index.js REGISTRY');
      if (missing.length) console.error(`    schema is MISSING: ${missing.join(', ')}  (the engine accepts these; the schema rejects them)`);
      if (extra.length) console.error(`    schema ADVERTISES: ${extra.join(', ')}  (nothing implements these)`);
      bad++;
    } else checked++;
  }
  if (bad) { console.error('  fix: node scripts/gates/schema-drift.mjs --write  (these enums are GENERATED)'); process.exit(1); }
  console.log(`\u2713 ${checked} schema enum(s) derived from the registries they copy, in sync`);
}
