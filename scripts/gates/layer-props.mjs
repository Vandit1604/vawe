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
import { SCENE_DIR } from './paths.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

// Props read by the SHARED path for every layer, wherever they live: the scene format's layer loop,
// the clip driver, and the shared kit helpers. A prop honoured here is honoured for every type.
//
// The format's driver is taken as "every .js in the format directory", not a named file. It used to be
// named — `formats/scene/scene.html` — and when that file was split into scene.html + scene.css +
// scene.js (fd397e1) the gate kept scanning the 20-line HTML shell, found nothing, and reported ~1900
// live props as dropped. Naming the directory instead of the file means the next split cannot blind it.
const SHARED_FILES = [
  ...fs.readdirSync(path.join(repoRoot, SCENE_DIR)).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(SCENE_DIR, f)),
  'core/clips.js', 'core/layers/util.js', 'core/boot.js',
];
const SHARED_SRC = SHARED_FILES.map((f) => {
  const src = read(path.join(repoRoot, f));
  // A shared source that has moved or emptied out makes the gate blind, and a blind silent-ignore gate
  // reports every shared prop in the repo as dead. Say so instead of shouting false positives.
  if (!src.trim()) { console.error(`✗ layer-props is blind: shared source \`${f}\` is missing or empty. Fix the file list in this gate.`); process.exit(2); }
  return src;
}).join('\n');
// `L.foo` / `C.foo` / `L['foo']` reads, plus destructured `const { a, b } = L`. `LL` is the same
// object under an inner name where `L` is already taken (core/three-fx.js does this).
const LAYER_VAR = String.raw`(?:LL?|C)`;
const readsIn = (src) => {
  const out = new Set();
  for (const m of src.matchAll(new RegExp(String.raw`\b${LAYER_VAR}\.([A-Za-z_$][\w$]*)`, 'g'))) out.add(m[1]);
  for (const m of src.matchAll(new RegExp(String.raw`\b${LAYER_VAR}\[['"]([^'"]+)['"]\]`, 'g'))) out.add(m[1]);
  for (const m of src.matchAll(new RegExp(String.raw`\{([^}]{0,400}?)\}\s*=\s*${LAYER_VAR}\b`, 'g'))) m[1].split(',').forEach((t) => { const k = t.split(/[:=]/)[0].trim(); if (k) out.add(k); });
  return out;
};
const SHARED = readsIn(SHARED_SRC);
// Self-check, not an allowlist: these are the props the shared path is DEFINED by (timing + the motion
// track every layer can ride). They are not granted — they must be found in the scanned source. If the
// scan stops finding them the scan is broken, and the gate must say that rather than blame the scenes.
for (const k of ['start', 'duration', 'motion', 'anim', 'out']) {
  if (!SHARED.has(k)) { console.error(`✗ layer-props is blind: the shared scan no longer finds \`${k}\`. Its file list or read patterns have drifted from the engine.`); process.exit(2); }
}
// Some builders hand the whole layer to a registry one file over — `paint` passes L into a PAINT_FX
// function as its options bag, `shader` into the ambient shader. Scanning only core/layers/<type>.js
// reported those props as dropped when they are read, just elsewhere: a gate for silent-ignore that
// itself ignores where the reading happens is no better than the bug.
// A hand-kept list of those hand-offs drifts (it missed `three` → core/three-fx.js, which reported
// `pointSize`/`bodyColor`/`dolly` as dead while the render honoured them). So follow the builder's own
// relative imports, one hop: whatever core module a layer builder pulls in is where its props may land.
const ALSO = { count: ['core/layers/text.js'] };   // delegation that is not an import
// Both relative forms, resolved against the importing file's OWN directory: `../x.js` is the core
// module a builder hands the layer to, `./x.js` a sibling in the same registry directory. Matching
// only `../` was enough while every builder lived in core/layers; the moment a builder had a sibling
// (core/surfaces/palette.js, which reads L.colors) that read became invisible and `colors` on a
// raymarch layer was reported dead while the render honoured it. The same shape as the `three` miss
// this delegation-following was written for.
const delegatesOf = (src, dir) => [...src.matchAll(/from\s+'(\.\.?)\/([\w-]+\.js)'/g)]
  .map((m) => path.join(dir, m[1], m[2]));
// A type's own source is core/layers/<type>.js, EXCEPT for the four canvas types, which share one
// primitive (core/layers/canvas.js) and keep only their pixels in core/surfaces/<type>.js. Both
// halves read layer props, so both are the type's own source. `read` returns '' for a file that is
// not there, and an empty per-type set makes this gate call every prop on that type dead — so a type
// resolving to nothing is reported as the gate being blind, exactly as the shared scan already is.
const ownSourcesOf = (t) => [
  ['core/layers', read(path.join(repoRoot, 'core/layers', `${t}.js`)) || read(path.join(repoRoot, 'core/layers/canvas.js'))],
  ['core/surfaces', read(path.join(repoRoot, 'core/surfaces', `${t}.js`))],
].filter(([, s]) => s.trim());
const perType = {};
for (const t of LAYER_TYPES) {
  const halves = ownSourcesOf(t);
  if (!halves.length) { console.error(`✗ layer-props is blind: layer type \`${t}\` has no source at core/layers/${t}.js or core/surfaces/${t}.js. Fix the resolver in this gate.`); process.exit(2); }
  const own = halves.map(([, s]) => s).join('\n');
  const delegates = halves.flatMap(([dir, s]) => delegatesOf(s, dir));
  const src = [own, ...[...delegates, ...(ALSO[t] || [])].map((f) => read(path.join(repoRoot, f)))].join('\n');
  perType[t] = readsIn(src);
  // an fx registry reads its options as `o.foo`, not `L.foo`
  for (const m of src.matchAll(/\bo\.([A-Za-z_$][\w$]*)/g)) perType[t].add(m[1]);
}

// Authoring-only keys the engine never reads by design: build-time sugar and documentation.
const AUTHORING = new Set(['type', 'block', 'ref', 'comps', 'id', 'note', 'comment', 'children', 'dur']);

const targets = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(path.join(repoRoot, SCENE_DIR)).filter((f) => f.endsWith('.json') && f !== 'schema.json')
      .map((f) => path.join(SCENE_DIR, f));

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
