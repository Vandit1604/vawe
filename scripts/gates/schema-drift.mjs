// schema-drift.mjs — keep the DATA CONTRACT honest. The engine (scene.html) reads layer props as
// `L.<prop>` / `C.<prop>`; the schema (schema.json) is what validate knows about. When a new
// primitive ships a prop that never gets registered (e.g. `motion` did), validation silently passes and
// it drifts. This asserts every prop the engine reads is defined somewhere in the schema.
//
//   node scripts/schema-drift.mjs      (make schema-check) — exits 1 on drift
import fs from 'node:fs';
import { ANIM_NAMES } from '../../core/clips.js';
import { AMBIENT_FX } from '../../core/shaders-ambient.js';
import { PAINT_FX_NAMES } from '../../core/paint-fx.js';
import { RESAMPLE_FX } from '../../core/resample-fx.js';
import { RAYMARCH_FX } from '../../core/raymarch-fx.js';
import { THREE_FX } from '../../core/three-scenes.js';
import { LAYER_TYPES } from '../../core/layers/index.js';
import { PRESETS } from '../../core/type.js';
import { CANVAS_FX_NAMES } from '../../core/canvas-fx.js';
import { PRESENTATIONS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
// the engine = scene.html (orchestrator) + core/layers/*.js (the primitives, where most L.<prop> reads
// now live after the layer-registry refactor). Scan BOTH, or moved props silently escape the check.
const layersDir = path.join(ROOT, 'core/layers');
const engineFiles = [path.join(ROOT, 'formats/scene/scene.html'),
  ...fs.readdirSync(layersDir).filter((f) => f.endsWith('.js')).map((f) => path.join(layersDir, f))];
const engineSrc = engineFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'formats/scene/schema.json'), 'utf8'));

// props the engine reads off a layer/child object (L.<prop> or C.<prop>)
const engineProps = new Set();
for (const m of engineSrc.matchAll(/\b[LC]\.([a-zA-Z][a-zA-Z0-9]*)/g)) engineProps.add(m[1]);

// every field name DEFINED anywhere in the schema (skip the JSON-schema structural keywords)
const RESERVED = new Set(['type', 'label', 'item', 'enum', 'min', 'max', 'default', 'required',
  'minLength', 'pattern', 'minItems', 'maxItems', 'fields', 'properties', 'note', 'name']);
const defined = new Set();
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!RESERVED.has(k)) defined.add(k); walk(v); }
})(schema);

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
  const schema = JSON.parse(fs.readFileSync(new URL('../../formats/scene/schema.json', import.meta.url), 'utf8'));
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
  { path: 'layers.item.three',    want: THREE_FX,                               src: 'core/three-scenes.js THREE_FX' },
  { path: 'layers.item.raymarch', want: RAYMARCH_FX,                            src: 'core/raymarch-fx.js RAYMARCH_FX' },
  { path: 'layers.item.resample', want: RESAMPLE_FX,                            src: 'core/resample-fx.js RESAMPLE_FX' },
  { path: 'layers.item.paint',  want: PAINT_FX_NAMES,                          src: 'core/paint-fx.js PAINT_FX' },
    { path: 'layers.item.children.item.type', want: LAYER_TYPES,                  src: 'core/layers/index.js REGISTRY (via kit.buildLeaf)' },
  { path: 'layers.item.type',   want: LAYER_TYPES,                             src: 'core/layers/index.js REGISTRY' },
    { path: 'cuts.item.style',    want: [...Object.keys(PRESENTATIONS), 'none'], src: 'core/cuts.js PRESENTATIONS' },
    { path: 'stings.item.fx',     want: SHADER_FX,                               src: 'core/stings.js SHADER_FX' },
  ];
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
  if (bad) process.exit(1);
  console.log(`\u2713 ${checked} schema enum(s) in sync with the registries they copy`);
}
