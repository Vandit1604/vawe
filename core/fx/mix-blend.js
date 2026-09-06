// core/fx/mix-blend.js: how this layer's pixels combine with everything already painted behind it.
// A headline could sit ON a photo but never knock out of it, a rect could cover a gradient but never
// multiply into it: `mix-blend-mode` is the one compositing control the engine exposed on its own
// inner elements (glow, beam, the looks overlays) and never on a layer.
//
// Deliberately the smallest possible modifier. The slot is the deliverable here; the effects that
// justify it (per-layer 3D, occlusion, shadows keyed to a light) are their own piece of work, and one
// of them half-built would entrench exactly the shape that work exists to replace.
//
// ON A GROUP CHILD IT THROWS, and that is the fix rather than the limitation. CSS composites a blend
// against the nearest stacking context's backdrop; every timed element in this engine carries a
// per-frame transform, which makes every group a stacking context, so a child's blend can only ever
// reach the group's own pixels. It rendered as if nothing had been applied, the modifier was written,
// accepted, and silently scoped to nothing. Nothing in this modifier can widen that (removing the
// group's stacking context would mean removing the transform driveClips writes), so the honest move is
// to say so at build. Put it on the group, whose backdrop IS the frame.
//
// Written at BUILD, not per frame, because a blend mode is a property of the layer and not of t.
// Nothing else in the engine writes `mixBlendMode` on a layer element, so the value set here is the
// value on every frame and renderFrame(n) stays a pure function of n.

// The CSS <blend-mode> keywords. Exported so schema-drift compares the schema's copy against this one
// instead of the two drifting apart, the same contract every other vocabulary in the engine keeps.
import { killedBy } from './ancestor-kills.js';
import { defineRegistry } from '../registry/registry.js';

// A REGISTRY, WHICH THE THROW BELOW ALREADY CALLED IT. This was a bare array for as long as it existed,
// and the guard in build() says "the whole failure this registry is built to refuse" about a thing that
// was not one. The cost was exact and measured: `make arsenal` reads registries, so all seventeen modes
// reached the search with NO blurb, findable only by someone who already typed the name. "burn one
// layer into another" found `color-burn`; "make the dark parts darker and the light parts lighter"
// found nothing. Every other named vocabulary in core/ carries its line; these did not because nobody
// noticed they were outside the mechanism.
//
// The blurbs say what each mode DOES to the picture, in the words a person reaches for, because the
// name is already indexed and repeating it buys nothing (core/registry.js refuses a blurb that only
// says its own name back).
export const BLEND_REGISTRY = defineRegistry('blend mode', Object.fromEntries(
  ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn',
    'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color',
    'luminosity', 'plus-lighter'].map((n) => [n, n])), {
  slot: 'mixBlend',
  blurbs: {
    normal: 'no blending at all: the layer simply covers what is behind it. The default, and the way to turn a blend off',
    multiply: 'darkens everything: white drops out and the rest deepens, the way ink sits on paper or two slides stack',
    screen: 'lightens everything: black drops out and the rest brightens, the opposite of multiply, like two projectors on one wall',
    overlay: 'deepens the dark areas and brightens the light ones at once, so contrast rises against the backdrop',
    darken: 'keeps whichever is darker at every pixel, the layer or what is behind it',
    lighten: 'keeps whichever is lighter at every pixel, the layer or what is behind it',
    'color-dodge': 'brightens the backdrop hard wherever the layer is pale, blowing the highlights out',
    'color-burn': 'darkens the backdrop hard wherever the layer is deep, crushing the shadows',
    'hard-light': 'as if a harsh lamp shone through the layer: strong, unsubtle contrast',
    'soft-light': 'as if a diffuse lamp shone through the layer: a gentle wash rather than a hit',
    difference: 'subtracts one picture from the other, so matching areas go black and opposites invert. The classic glitch look',
    exclusion: 'the same subtraction with the contrast taken out, greying the midtones instead of driving them to black',
    hue: 'takes only the colour angle from the layer and keeps the backdrop\'s brightness and richness',
    saturation: 'takes only the richness from the layer and keeps the backdrop\'s tint and brightness',
    color: 'takes tint and richness from the layer and brightness from the backdrop. The way to recolour a photo',
    luminosity: 'takes only brightness from the layer and keeps the backdrop\'s tint. The inverse of `color`',
    'plus-lighter': 'adds the two pictures together, so light over light runs to white. For glows and additive light',
  },
  // The section publishes itself, so scripts/site/effects-catalog.mjs no longer hand-writes it. That
  // hand-written row is what `lib-test` caught the moment this became a registry: a vocabulary with a
  // definition site has somewhere to put its catalogue block, and a hand-written section for it is a
  // second copy waiting to drift.
  catalog: {
    title: 'Blend modes',
    tag: 'per-layer',
    intro: '`mixBlend`: how a layer composites with what is already painted beneath it. On a GROUP child it throws, because CSS blends against the nearest stacking context and every timed element carries a transform: put it on the group, whose backdrop is the frame.',
    skip: 'the CSS compositing spec defines the maths; MDN `mix-blend-mode` is the reference',
    usage: (n, { j }) => j({ mixBlend: n }),
    noPreview: 'a blend is a relationship between two layers, so a still of the layer alone shows nothing about it.',
  },
});

export const BLEND_MODES = BLEND_REGISTRY.names;

export function build(kit, el, L, spec) {
  const mode = typeof spec === 'string' ? spec : (spec && spec.mode);
  // A mode the browser does not know is discarded by the CSS parser without a word, which is the
  // whole failure this registry is built to refuse: `"multipy"` would render an unblended layer and
  // report nothing anywhere.
  if (!BLEND_MODES.includes(mode))
    throw new Error(`mixBlend: unknown blend mode ${JSON.stringify(mode)}, one of: ${BLEND_MODES.join(', ')}. `
      + `Write it as { "mixBlend": "difference" } or { "mixBlend": { "mode": "difference" } }.`);
  // The reason is one row of core/ancestor-kills.js (`transform` takes the `blend` capability away),
  // read from there rather than restated, so the day that row is re-measured this guard moves with it.
  if (!el.classList.contains('hs-layer') && killedBy(['transform'], 'blend').length)
    throw new Error(`mixBlend: layer "${L.id || L.type || 'child'}" is a GROUP CHILD, and CSS blends `
      + `against the nearest stacking context, which is the group, because every timed element carries `
      + `a per-frame transform. The blend would reach the group's own pixels and nothing behind it, so `
      + `the child would render as though this modifier had not run. Put "mixBlend" on the GROUP layer.`);
  el.style.mixBlendMode = mode;
}
