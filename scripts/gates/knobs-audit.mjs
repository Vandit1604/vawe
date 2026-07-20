// scripts/gates/knobs-audit.mjs — two jobs, one file.
//   make knobs-audit            → DRIFT GUARD: every knob core/knobs.js advertises must actually
//                                 change the render, or the manifest is lying to authors.
//   node …/knobs-audit.mjs f.json → DEAD-KNOB CHECK: a knob set on a preset that ignores it (e.g.
//                                 pointSize on extrudeText) is reported, turning a silent no-op into
//                                 a message. Same principle as `make conformance`.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { KNOBS, knobsFor } from '../../core/knobs.js';
import { PRESETS } from '../../core/type.js';

// ---- drift guard: kinetic knobs are pure functions, so we can prove each one moves the output ----
function driftGuard() {
  const us = [0.15, 0.35, 0.55, 0.75, 0.95];
  const sig = (fn, opts) => us.map((u) => JSON.stringify(fn(u, opts))).join('|');
  const dead = [];
  for (const [preset, knobs] of Object.entries(KNOBS.kinetic)) {
    if (preset === '_shared') continue;
    const fn = PRESETS[preset];
    if (!fn) { dead.push(`${preset}: no such preset in core/type.js`); continue; }
    const base = sig(fn, {});
    for (const k of knobs) {
      // A probe value clearly different from the default, typed per knob.
      // A named-value knob (an easing, a font) needs a KNOWN-valid alternative to probe with; a random
      // string just falls back to the default and looks dead. Skip those without an explicit `probe`.
      if (k.type === 'string' && k.probe == null) continue;
      const probe = k.probe != null ? k.probe
        : k.type === 'enum' ? k.values[k.values.length - 1]
          : k.type === 'bool' ? true
            : k.type === 'color' ? '#123456'
              : (Number(k.default) || 1) * 2 + 3;
      if (sig(fn, { [k.name]: probe }) === base) dead.push(`${preset}.${k.name} does not change the output`);
    }
  }
  return dead;
}

// ---- dead-knob check on a scene ----
// A layer selects a preset in one of a few ways; each maps to a family. We only flag a key that is a
// REAL knob for some preset in that family but not for THIS preset — so generic layer props (x, y, w,
// start…) are never touched.
// `strict` = the opts object holds ONLY knobs (kinetic's presetOpts), so any key that is not a legal
// knob for this preset is dead — this catches typos too. When the opts object IS the whole layer
// (three/raymarch/ambient), generic props live alongside the dials, so we can only be sure a key is
// misused when it is a REAL knob for a sibling preset. Both are precise; neither cries wolf.
const SELECTORS = [
  { family: 'kinetic', preset: (L) => L.preset, opts: (L) => L.presetOpts || {}, strict: true },
  { family: 'three', preset: (L) => L.three, opts: (L) => L, strict: false },
  { family: 'raymarch', preset: (L) => L.raymarch, opts: (L) => L, strict: false },
  { family: 'ambient', preset: (L) => L.shader, opts: (L) => L, strict: false },
];

export function deadKnobs(scene) {
  const warnings = [];
  const familyKnobNames = (family) => {
    const names = new Set();
    for (const [p, list] of Object.entries(KNOBS[family])) {
      if (p === '_shared') continue;
      for (const k of list) names.add(k.name);
    }
    return names;
  };
  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (!node || typeof node !== 'object') return;
    for (const sel of SELECTORS) {
      const preset = sel.preset(node);
      if (!preset || !KNOBS[sel.family]) continue;
      const legal = new Set(knobsFor(sel.family, preset).map((k) => k.name));
      const suspect = sel.strict ? null : familyKnobNames(sel.family);
      for (const key of Object.keys(sel.opts(node))) {
        if (legal.has(key)) continue;
        if (sel.strict || suspect.has(key)) {
          warnings.push(`${path}: "${key}" does nothing on ${sel.family} preset "${preset}"`);
        }
      }
    }
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  };
  walk(scene.layers || [], 'layers');
  return warnings;
}

// ---- CLI ----
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const drift = driftGuard();
  if (drift.length) {
    console.error('✗ manifest drift — core/knobs.js advertises dials the code ignores:');
    for (const d of drift) console.error(`    ${d}`);
    process.exit(1);
  }
  console.log('✓ every advertised kinetic knob changes the output');

  const file = process.argv[2];
  if (file) {
    const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
    const dead = deadKnobs(scene);
    if (dead.length) {
      console.log(`\n~ ${dead.length} dead knob(s) in ${file}:`);
      for (const w of dead) console.log(`    ${w}`);
    } else {
      console.log(`✓ ${file}: no misused knobs`);
    }
  }
}
