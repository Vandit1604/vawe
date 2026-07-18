// schema-drift.mjs — keep the DATA CONTRACT honest. The engine (scene.html) reads layer props as
// `L.<prop>` / `C.<prop>`; the schema (schema.json) is what validate knows about. When a new
// primitive ships a prop that never gets registered (e.g. `motion` did), validation silently passes and
// it drifts. This asserts every prop the engine reads is defined somewhere in the schema.
//
//   node scripts/schema-drift.mjs      (make schema-check) — exits 1 on drift
import fs from 'node:fs';
import { ANIM_NAMES } from '../../core/clips.js';
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

// The anim enum is a COPY of core/clips.js's registry, and a copy drifts: the schema once advertised
// "slideL", an anim that never existed and so silently resolved to fade (MISTAKES #21), and adding
// `lift` to the registry instantly made the schema reject a valid value. Assert they are the same set
// so the copy can never be wrong in either direction.
{
  const schema = JSON.parse(fs.readFileSync(new URL('../../formats/scene/schema.json', import.meta.url), 'utf8'));
  let declared = null;
  const walk = (o) => { if (!o || typeof o !== 'object' || declared) return;
    if (o.label && String(o.label).startsWith('Enter anim') && Array.isArray(o.enum)) { declared = o.enum; return; }
    for (const k in o) walk(o[k]); };
  walk(schema);
  const want = [...ANIM_NAMES, 'none'].sort().join(',');
  const got = (declared || []).slice().sort().join(',');
  if (got !== want) {
    console.error(`\u2717 anim enum DRIFT\n    schema: ${got}\n    engine: ${want}`);
    process.exit(1);
  }
  console.log(`\u2713 anim enum in sync with core/clips.js (${ANIM_NAMES.length} names)`);
}

