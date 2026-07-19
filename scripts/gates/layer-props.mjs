// layer-props.mjs — does the engine READ the props a layer sets?
//
//   node scripts/gates/layer-props.mjs [scene.json ...]   ·   make layer-props
//
// `make expand` warns when a BLOCK is handed a prop its factory does not accept (MISTAKES #60).
// Nothing did the equivalent for a raw layer, so `{"type":"glow","r":620,"opacity":0.5}` was accepted
// and silently dropped — `core/layers/glow.js` sizes from w/h and takes color+intensity, and neither
// `r` nor that `opacity` is a prop it reads. That is the single most expensive bug class in this repo
// and it was still live on the primitive path (docs/MISTAKES.md #78).
//
// The props a type honours are READ OFF ITS BUILDER, the same way the block check reads a factory
// signature — so this cannot drift from the code the way a hand-listed table would.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYER_TYPES } from '../../core/layers/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

// Props read by the SHARED path for every layer, wherever they live: scene.html's layer loop, the
// clip driver, and the shared kit helpers. A prop honoured here is honoured for every type.
const SHARED_SRC = ['formats/scene/scene.html', 'core/clips.js', 'core/layers/util.js', 'core/boot.js']
  .map((f) => read(path.join(repoRoot, f))).join('\n');
// `L.foo` / `C.foo` / `L['foo']` reads, plus destructured `const { a, b } = L`
const readsIn = (src) => {
  const out = new Set();
  for (const m of src.matchAll(/\b[LC]\.([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  for (const m of src.matchAll(/\b[LC]\[['"]([^'"]+)['"]\]/g)) out.add(m[1]);
  for (const m of src.matchAll(/\{([^}]{0,400}?)\}\s*=\s*[LC]\b/g)) m[1].split(',').forEach((t) => { const k = t.split(/[:=]/)[0].trim(); if (k) out.add(k); });
  return out;
};
const SHARED = readsIn(SHARED_SRC);
// Some builders hand the whole layer to a registry one file over — `paint` passes L into a PAINT_FX
// function as its options bag, `shader` into the ambient shader. Scanning only core/layers/<type>.js
// reported those props as dropped when they are read, just elsewhere: a gate for silent-ignore that
// itself ignores where the reading happens is no better than the bug.
const ALSO = { paint: ['core/paint-fx.js'], shader: ['core/shaders-ambient.js'], count: ['core/layers/text.js'] };
const perType = {};
for (const t of LAYER_TYPES) {
  const src = [path.join('core/layers', `${t}.js`), ...(ALSO[t] || [])].map((f) => read(path.join(repoRoot, f))).join('\n');
  perType[t] = readsIn(src);
  // an fx registry reads its options as `o.foo`, not `L.foo`
  for (const m of src.matchAll(/\bo\.([A-Za-z_$][\w$]*)/g)) perType[t].add(m[1]);
}

// Authoring-only keys the engine never reads by design: build-time sugar and documentation.
const AUTHORING = new Set(['type', 'block', 'ref', 'comps', 'id', 'note', 'comment', 'children', 'dur']);

const targets = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(path.join(repoRoot, 'formats/scene')).filter((f) => f.endsWith('.json') && f !== 'schema.json')
      .map((f) => path.join('formats/scene', f));

let issues = 0, checked = 0;
for (const rel of targets) {
  const abs = path.resolve(repoRoot, rel);
  let cfg; try { cfg = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { continue; }
  if (!cfg.module) continue;
  const walk = (layers, where) => {
    for (const [i, L] of (layers || []).entries()) {
      if (!L || typeof L !== 'object') continue;
      if (L.type === 'block' || L.type === 'comp') continue;   // `make expand` owns those
      const t = L.type || 'text';
      const known = perType[t];
      if (!known) continue;
      checked++;
      for (const k of Object.keys(L)) {
        // `_`-prefixed keys are an author's own annotations, never engine input
        if (k.startsWith('_') || AUTHORING.has(k) || SHARED.has(k) || known.has(k)) continue;
        issues++;
        console.log(`   ✗ ${path.basename(rel)} ${where}[${i}] (${t}): \`${k}\` is set and nothing reads it.`);
        console.log(`       ${t} reads: ${[...known].sort().slice(0, 14).join(', ')}${known.size > 14 ? ', …' : ''}`);
      }
      if (L.children) walk(L.children, `${where}[${i}].children`);
    }
  };
  walk(cfg.layers, 'layers');
}
console.log(`\n── layer props · ${checked} layer(s) across ${targets.length} file(s)`);
if (!issues) { console.log('✓ every prop a layer sets is read by its type or the shared path'); process.exit(0); }
console.log(`✗ ${issues} prop(s) accepted and dropped. A prop the engine ignores is the most expensive`);
console.log('  bug class in this repo: the JSON looks right and the render is wrong.');
process.exit(1);
