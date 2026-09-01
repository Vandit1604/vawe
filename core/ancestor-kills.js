// core/ancestor-kills.js: THE ONE OWNER of "which ancestor style silently disables which descendant
// capability".
//
// THE CLASS. Some CSS capabilities do not act on the element that declares them, they act on something
// the element has to REACH: `backdrop-filter` reads the pixels painted behind it, `mix-blend-mode`
// composites against its stacking context's backdrop, a `translateZ` depth is projected by a
// perspective that lives further up. Any ancestor property that turns itself into a boundary (a
// backdrop root, a stacking context, a flattening group) cuts that reach. CSS reports nothing: the
// declaration stays on the element, the browser keeps painting, and the capability simply stops.
//
// THE BUG THAT PAID FOR THIS FILE. `formats/scene/vawe-glass-hero.json` puts a refracting lens over a
// hard black horizon, and the whole film is that one bend. Its `blur` cut writes `filter: blur(...)`
// onto the scene root (core/cuts.js), which makes the root a BACKDROP ROOT, so for a third of a second
// the lens sampled an empty backdrop and the horizon ran dead straight through the glass. No error, no
// warning, and a still of the frame looks like a rendering choice. docs/MISTAKES.md #542.
//
// WHY A TABLE AND NOT A CHECK PER SITE. The engine writes ancestor styles in four places (the cut on
// the scene root, the cut on a beat wrapper, a group layer, a motion track's velocity blur), and each
// one that grew its own guard would be a second copy of the same fact, drifting. core/fx/mix-blend.js
// already carried one such guard, correctly, for exactly one pair. This file is that fact, once.
//
// EVERY ROW IS MEASURED, NOT READ OFF A SPEC. `node scripts/dev/probe-ancestor-kills.mjs` renders the
// pair, once with the capability declared and once without, and reports how much the declaration
// actually changed. Re-run it before trusting a row; a browser update is allowed to move one.

import { PRESENTATIONS, SOLO_BLIND, cutWrites } from './cuts.js';

// ---- what a descendant can be reaching for ----
// `killedBy` lists the ANCESTOR properties measured to take the capability away. A property absent from
// a row was measured and found HARMLESS for that capability, which is as much a part of the table as
// the kills: `clip-path` and `overflow: hidden` do not clip a backdrop-filter, and that asymmetry is
// the thing people guess wrong.
export const CAPABILITIES = {
  backdrop: {
    what: 'reads the pixels painted behind it',
    // an ancestor that becomes a BACKDROP ROOT: the descendant then samples an empty backdrop
    killedBy: ['filter', 'opacity', 'maskImage', 'backdropFilter', 'mixBlendMode'],
    survives: ['transform', 'perspective', 'willChange', 'contain', 'isolation', 'overflow', 'clipPath'],
  },
  blend: {
    what: 'composites against everything painted behind it',
    // an ancestor that becomes a STACKING CONTEXT: the blend can then only reach that ancestor's pixels
    killedBy: ['filter', 'opacity', 'transform', 'perspective', 'willChange', 'contain', 'isolation',
      'clipPath', 'maskImage', 'backdropFilter', 'mixBlendMode'],
    survives: ['overflow'],
  },
  depth: {
    what: 'stands off the picture plane and is projected by the camera lens',
    // an ancestor that FLATTENS its 3D rendering context, whatever `transform-style` says
    killedBy: ['filter', 'opacity', 'isolation', 'overflow', 'clipPath', 'maskImage', 'backdropFilter',
      'mixBlendMode'],
    survives: ['transform', 'perspective', 'willChange', 'contain'],
  },
};

// ---- which capability a LAYER is asking for ----
// Read off the authored JSON, so this runs before anything is built and needs no DOM.
const MODS = (L) => (Array.isArray(L.modifiers) ? L.modifiers : []).flatMap((m) => (m && typeof m === 'object' ? Object.keys(m) : []));
export function capabilitiesOf(L) {
  const out = [];
  if (L.glass != null && L.glass !== false) out.push({ cap: 'backdrop', via: `"glass": ${JSON.stringify(L.glass)}` });
  if (L.progressiveBlur != null && L.progressiveBlur !== false) out.push({ cap: 'backdrop', via: '"progressiveBlur"' });
  // The adjustment layer is the same mechanism and the easiest one to miss, because it declares no
  // prop at all: being an `adjust` IS the request. `core/layers/adjust.js:116` writes backdropFilter,
  // so a grade over everything beneath it dies inside a filtered ancestor exactly as glass does, and
  // silently. It matters more than the other two: an adjustment layer is the central compositing
  // device borrowed from After Effects, so it is the one an author reaches for when chasing parity.
  if (L.type === 'adjust') out.push({ cap: 'backdrop', via: '"type": "adjust"' });
  const mods = MODS(L);
  if (mods.includes('mixBlend')) out.push({ cap: 'blend', via: '"mixBlend"' });
  for (const m of ['plane', 'tilt']) if (mods.includes(m)) out.push({ cap: 'depth', via: `"${m}"` });
  return out;
}

// ---- the lookup every write site makes ----
// `props` is whatever set of CSS property names an ancestor is about to carry. Returns the capabilities
// that set takes away, each with the property that does it, so a message can name BOTH sides.
export function killedBy(props, cap) {
  const K = CAPABILITIES[cap];
  if (!K) throw new Error(`ancestor-kills: unknown capability "${cap}", one of: ${Object.keys(CAPABILITIES).join(', ')}`);
  return [...props].filter((p) => K.killedBy.includes(p));
}

export const nameOf = (p) => ({ maskImage: 'a mask', clipPath: 'a clip', backdropFilter: 'a backdrop-filter',
  mixBlendMode: 'a blend mode', willChange: 'will-change', overflow: 'overflow: hidden' }[p] || `a \`${p}\``);

// ---- write site 1: a SCENE CUT, which styles an ancestor of every layer in the film ----
// A cut is the one ancestor style in this engine that is TIMED, so it is also the one that can take a
// capability away for a third of a second and hand it back, which is what makes it invisible in a still
// and the reason the glass bug shipped. Everything else here is static and an author sees it on frame 0.
//
// KNOWN CEILING, stated rather than hidden: with `sceneUnits` the cut styles a per-beat wrapper, and
// this only knows which beat a layer starts in, so it treats every non-`acrossBeats` layer whose window
// touches the cut window as wrapped. That over-reaches by at most one beat and never under-reaches.
const win = (L) => [L.start ?? 0, (L.start ?? 0) + (L.duration ?? Infinity)];
const flat = (ls) => (ls || []).flatMap((L) => (L && typeof L === 'object' ? [L, ...flat(L.children)] : []));

export function checkCuts({ cuts, layers, sceneUnits }) {
  for (const cu of cuts) {
    const props = cutWrites(cu.style, { solo: !sceneUnits });
    const t = +cu.t, dur = cu.dur ?? (sceneUnits ? 0.4 : 0.36);
    // solo centres the window on t, sceneUnits runs it forward from t (core/cuts.js consumers)
    const [c0, c1] = sceneUnits ? [t, t + dur] : [t - dur / 2, t + dur / 2];
    for (const L of flat(layers)) {
      const [l0, l1] = win(L);
      if (l1 <= c0 || l0 >= c1) continue;                       // the layer is not on screen for this cut
      for (const { cap, via } of capabilitiesOf(L)) {
        const hit = killedBy(props, cap);
        if (!hit.length) continue;
        const id = L.id || L.text || L.type || 'a layer';
        const solo = !sceneUnits;
        const alts = Object.keys(PRESENTATIONS).filter((k) => k !== cu.style
          && (solo ? !SOLO_BLIND.has(k) : true) && !killedBy(cutWrites(k, { solo }), cap).length);
        throw new Error(`layer "${id}" declares ${via}, which ${CAPABILITIES[cap].what}, and the `
          + `"${cu.style}" cut at t=${cu.t}s puts ${hit.map(nameOf).join(' and ')} on the element every `
          + `layer sits inside. CSS makes that element a boundary, so for the ${dur}s of the cut the `
          + `layer keeps the declaration and silently stops doing anything, which no still frame shows. `
          + `Either use a cut that does not write ${hit.map(nameOf).join('/')} `
          + `(${alts.join(', ')}), move the cut off this layer's window (${l0}s to ${l1 === Infinity ? 'the end' : l1 + 's'}), `
          + `or drop ${via} for this beat. Measured: node scripts/dev/probe-ancestor-kills.mjs`);
      }
    }
  }
}
