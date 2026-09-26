// NAMED GSAP EFFECTS: `fx` (entrance/loop/text) references a stored effect by name. scene.html only
// console.warns on a typo (a warn the render swallows), so an unknown name shipped an unanimated layer
// silently. Catch it here, loudly, with a "did you mean" pointer.
import { isObj, nearest } from './util.mjs';
import { STAGGER_FROM, isStaggerFrom } from '../type/type.js';
import { GSAP_FX, GSAP_REGISTRY } from '../engine/gsap-effects.js';
import { KNOBS, knobsFor } from '../registry/knobs.js';

export function fxErrors(cfg) {
  const out = [];
  const layers = Array.isArray(cfg.layers) ? cfg.layers : [];
  const nameOf = (item) => (typeof item === 'string' ? item : (isObj(item) ? item.name : undefined));
  layers.forEach((L, i) => {
    if (!isObj(L)) return;
    // ASK THE REGISTRY, do not keep a second copy of what it knows. This used to import GSAP_FX and
    // re-implement the membership test, so the vocabulary lived in two places, the shape that made the
    // snap signature go blind (#159) and the silent-fallback gate miss its own blind spot (#363).
    // GSAP_REGISTRY.has() is the same knowledge, asked rather than duplicated. engine-doctrine/MISTAKES.md #364.
    if (L.fx != null) {
      for (const item of (Array.isArray(L.fx) ? L.fx : [L.fx])) {
        const nm = nameOf(item);
        if (nm == null) { out.push(`layers[${i}].fx entry needs a name (string or {name})`); continue; }
        if (!GSAP_REGISTRY.has(nm)) out.push(`layers[${i}].fx "${nm}" is not a known effect.${nearest(nm, GSAP_FX)}`);
      }
    }
    // splitText (GSAP line reveal) re-wraps the layer AFTER the engine's own `split` already did, the two
    // splitters fight. splitText is line-level only; char/word stay with `split`.
    if (L.splitText != null && L.split != null) out.push(`layers[${i}] declares both "split" and "splitText". They both re-wrap the text. Use "split" for char/word, "splitText" for masked lines.`);
  });
  return out;
}

// A KNOB SET ON A PRESET THAT IGNORES IT. Same bug class as an unknown layer PROP, which
// core/layers/vocabulary.js has thrown on for a long time: a value written, accepted, and then read by
// nobody. The two were graded differently for no reason anybody could defend, the prop was refused at
// boot, the knob was a warning from `quality/gates/knobs-audit.mjs` that only appeared if you ran it.
// So it moved here, beside every other refusal, and the gate kept only its manifest half.
//
// `knobsFor(family, preset)` (core/registry/knobs.js) already answers which dials a preset reads; this is the
// wiring, not a second copy of that knowledge.
//
// WHERE IT REFUSES, AND WHERE IT DELIBERATELY STAYS QUIET. Only a preset core/registry/knobs.js LISTS is
// graded. A preset with no manifest entry (`colorWave`, `shimmerWave`, `globe` today) is one the
// manifest has nothing to say about, and refusing a dial on the strength of a list that does not
// cover it is guessing, not checking. All three read real per-preset opts in core/type/type.js and
// core/surfaces/three-fx.js, and grading them against `_shared` alone would refuse four shipped films for a
// hole in the manifest. Fill the manifest and they start being checked, with no change here.
const KNOB_SLOTS = [
  // `presetOpts` holds ONLY dials, so any key that is not one is dead, typos included.
  { family: 'kinetic', preset: (L) => L.preset, opts: (L) => (isObj(L.presetOpts) ? L.presetOpts : null), where: 'presetOpts' },
  // A three scene's dials sit on the LAYER, beside generic props (x, y, start…), so only a key that is
  // a real knob for a SIBLING scene can be called misused. Anything else is somebody's layout.
  { family: 'three', preset: (L) => L.three, opts: (L) => L, where: '', siblingsOnly: true },
];

export function knobErrors(cfg) {
  const out = [];
  const familyNames = (family) => {
    const names = new Set();
    for (const [p, list] of Object.entries(KNOBS[family] || {})) if (p !== '_shared') for (const k of list) names.add(k.name);
    return names;
  };
  const visit = (L, at) => {
    if (!isObj(L)) return;
    for (const slot of KNOB_SLOTS) {
      const preset = slot.preset(L);
      // The manifest must KNOW this preset; `_shared` alone is not knowledge of it (see above).
      if (typeof preset !== 'string' || !isObj(KNOBS[slot.family]) || !KNOBS[slot.family][preset]) continue;
      const opts = slot.opts(L);
      if (!isObj(opts)) continue;
      const legal = knobsFor(slot.family, preset);
      const names = new Set(legal.map((k) => k.name));
      const siblings = slot.siblingsOnly ? familyNames(slot.family) : null;
      for (const key of Object.keys(opts)) {
        if (names.has(key)) continue;
        if (siblings && !siblings.has(key)) continue;
        const site = slot.where ? `${at}.${slot.where}` : at;
        out.push(`${site} sets \`${key}\`, which the ${slot.family} preset "${preset}" does not read, it reads `
          + `${legal.map((k) => `\`${k.name}\``).join(', ')}. Written where you have it the render is unchanged and `
          + `nothing says so.${nearest(key, [...names])}`);
      }
    }
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    (Array.isArray(L.parts) ? L.parts : L.parts ? [L.parts] : []).forEach((P, j) => visit(P, `${at}.parts[${j}]`));
    (Array.isArray(L.planes) ? L.planes : []).forEach((P, j) => visit(P, `${at}.planes[${j}]`));
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layers[${i}]`));
  return out;
}

// A STAGGER OBJECT IS THE ENGINE'S VOCABULARY, NOT A PASS-THROUGH. `parts[].stagger` used to be
// handed to GSAP exactly as written: an object with any keys at all was accepted, forwarded, and
// whatever GSAP made of it was the answer. Nothing documented it and nothing checked it, which is the
// undocumented-capability shape this repo logs (engine-doctrine/CRAFT/PARITY-AUDIT.md). Both slots that take a
// stagger now take the same three dials and refuse a fourth.
const STAGGER_KEYS = ['each', 'amount', 'from', 'cps']; // cps: the typing rate, only read when from:'typewriter'
function staggerSpecErrors(spec, at, out) {
  if (spec == null || typeof spec === 'number') return;
  if (!isObj(spec)) { out.push(`${at} must be a number (the per-unit delay) or { each, amount, from }`); return; }
  for (const k of Object.keys(spec)) {
    if (!STAGGER_KEYS.includes(k)) out.push(`${at} sets \`${k}\`, which a stagger does not read. It takes \`each\` (the per-unit delay, seconds), \`amount\` (the TOTAL seconds the whole train may take, from which the delay is derived) and \`from\` (the order).${nearest(k, STAGGER_KEYS)}`);
  }
  for (const k of ['each', 'amount']) {
    if (spec[k] != null && !(typeof spec[k] === 'number' && spec[k] >= 0)) out.push(`${at}.${k} must be a number of seconds ≥ 0 (got ${JSON.stringify(spec[k])})`);
  }
  const f = spec.from;
  if (f != null && !(typeof f === 'number') && !isStaggerFrom(f))
    out.push(`${at}.from "${f}" is not a stagger order. One of: ${STAGGER_FROM.join(', ')} (or GSAP's start/end), or a unit index.${nearest(String(f), STAGGER_FROM)}`);
}

export function staggerErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    staggerSpecErrors(L.stagger, `${at}.stagger`, out);
    (Array.isArray(L.parts) ? L.parts : L.parts ? [L.parts] : []).forEach((P, j) => {
      if (isObj(P)) staggerSpecErrors(P.stagger, `${at}.parts[${j}].stagger`, out);
    });
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layers[${i}]`));
  return out;
}
