// quality/gates/theme-look-spread.mjs: DOES THE COMPUTED LOOK ACTUALLY VARY?
//
// `computedLook(theme)` (core/registry/theme-contract.js) exists so the 37 of 44 themes with no
// authored `look` still get a whole-film default, one derived from what THAT theme's own `motion`
// declares. A default that DERIVES from a per-theme signal multiplies variety, because the input
// differs theme to theme; a default that SUPPLIES A CONSTANT divides it to one, however many themes
// there are. That happened once already: the first cut of `computedLook` filled every theme with the
// exact same `scale` and the exact same `cuts`, so a calm brand and a loud one rendered identical type
// and identical transitions. Nothing caught it because nothing counted.
//
// This gate counts. It resolves the look for every theme in the library (the authored 7 included,
// since an author can still write a constant look by hand and this gate would not be wrong to notice
// that too) and, for the keys `computedLook` actually derives, counts DISTINCT values. A key whose
// count sits at or below its floor has gone constant, or close enough to it that a calm and a loud
// brand cannot be told apart, and the gate names the key and prints the collapsed value(s).
//
// Floors are not round numbers picked in advance: each one is the actual spread this derivation
// achieves today (measured on 2026-09-07, node quality/gates/theme-look-spread.mjs), so the gate
// catches a REGRESSION (someone flattens the formula back to a constant) rather than policing a target
// nobody has hit yet. `layout` is excluded on purpose: it is a documented constant (see the comment
// beside `DEFAULT_LAYOUT` in theme-contract.js, "no field any theme carries correlates with anchor or
// margin"), so counting it here would fail a decision that was made, not missed. `backdrop` and `marks`
// are never computed at all (see the same file) and are not in `LOOK_KEYS`'s derived set either.
//
//   node quality/gates/theme-look-spread.mjs [--json]     ·   make theme-look-spread
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLook, lookErrors } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/motion/motion.js';
import { TRANSITIONS } from '../../core/transitions/catalog.js';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const f = gateFindings();

function themeFiles() {
  const out = [];
  for (const n of fs.readdirSync(path.join(ROOT, 'themes'))) if (n.endsWith('.json')) out.push(path.join(ROOT, 'themes', n));
  const presets = path.join(ROOT, 'themes', 'presets');
  if (fs.existsSync(presets)) for (const n of fs.readdirSync(presets)) if (n.endsWith('.json')) out.push(path.join(presets, n));
  return out;
}

// key -> [reader off a resolved look, the floor it must clear, why that floor]
const CHECKS = [
  { key: 'scale.hook', read: (l) => l.scale.hook, floor: 8, why: 'the type scale\'s anchor size; derived from motion.enter' },
  { key: 'scale.headline', read: (l) => l.scale.headline, floor: 8, why: 'proportional to scale.hook (fixed ratio, see theme-contract.js)' },
  { key: 'scale.body', read: (l) => l.scale.body, floor: 7, why: 'proportional to scale.hook' },
  { key: 'scale.caption', read: (l) => l.scale.caption, floor: 6, why: 'proportional to scale.hook' },
  { key: 'cuts.default', read: (l) => l.cuts.default, floor: 3, why: 'derived from motion.durationScale (the brand\'s ordinary pace)' },
  { key: 'cuts.accent', read: (l) => l.cuts.accent, floor: 4, why: 'derived from motion.bounce (the brand\'s peak energy)' },
  { key: 'field.grain', read: (l) => l.field.grain, floor: 2, why: 'derived from light-vs-dark dominance' },
];

const transitionNames = TRANSITIONS.map((t) => t.name);
const values = new Map(CHECKS.map((c) => [c.key, new Map()])); // key -> value -> [theme names]
let validationErrors = 0;
for (const file of themeFiles()) {
  const name = path.relative(ROOT, file);
  let theme;
  try { theme = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { f.fail('theme-look-spread-parse', `${name} did not parse: ${e.message}`); continue; }
  const resolved = resolveLook(theme, { isLightBg });
  const errs = lookErrors(resolved, { bgNames: undefined, transitionNames });
  if (errs.length) { validationErrors++; f.fail('theme-look-invalid', `${name}: resolved look fails lookErrors: ${errs.join('; ')}`); }
  for (const c of CHECKS) {
    const v = c.read(resolved);
    const m = values.get(c.key);
    if (!m.has(v)) m.set(v, []);
    m.get(v).push(name);
  }
}

const total = themeFiles().length;
let collapsed = 0;
for (const c of CHECKS) {
  const m = values.get(c.key);
  const distinct = m.size;
  if (distinct <= c.floor) {
    collapsed++;
    const [topValue, topThemes] = [...m.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    f.fail('theme-look-collapsed',
      `look.${c.key} has only ${distinct} distinct value(s) across ${total} themes (floor is >${c.floor}). `
      + `${topThemes.length} themes share ${JSON.stringify(topValue)}. This key is supposed to be DERIVED (${c.why}); `
      + `a count at or under the floor means the derivation has gone constant again and every theme it touches `
      + `renders the same look regardless of the brand's own motion signal.`);
  }
}

if (!validationErrors && !collapsed) {
  console.log(`theme-look-spread: ${total} themes, all ${CHECKS.length} derived keys clear their floor:`);
  for (const c of CHECKS) console.log(`  look.${c.key}: ${values.get(c.key).size} distinct (floor >${c.floor})`);
}

f.emit();
process.exit(validationErrors || collapsed ? 1 : 0);
