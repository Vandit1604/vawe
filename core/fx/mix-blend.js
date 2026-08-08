// core/fx/mix-blend.js — how this layer's pixels combine with everything already painted behind it.
// A headline could sit ON a photo but never knock out of it, a rect could cover a gradient but never
// multiply into it: `mix-blend-mode` is the one compositing control the engine exposed on its own
// inner elements (glow, beam, the looks overlays) and never on a layer.
//
// Deliberately the smallest possible modifier. The slot is the deliverable here; the effects that
// justify it (per-layer 3D, occlusion, shadows keyed to a light) are their own piece of work, and one
// of them half-built would entrench exactly the shape that work exists to replace.
//
// SCOPE, because a surprise here looks exactly like a broken modifier: CSS composites a blend against
// the nearest stacking context's backdrop, so on a GROUP CHILD it blends against the group and not
// against the layers behind the group, and the child renders as if nothing had been applied. That is
// the browser's rule, not this modifier's; put the modifier on the group, or on a top-level layer.
//
// Written at BUILD, not per frame, because a blend mode is a property of the layer and not of t.
// Nothing else in the engine writes `mixBlendMode` on a layer element, so the value set here is the
// value on every frame and renderFrame(n) stays a pure function of n.

// The CSS <blend-mode> keywords. Exported so schema-drift compares the schema's copy against this one
// instead of the two drifting apart, the same contract every other vocabulary in the engine keeps.
export const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity', 'plus-lighter'];

export function build(kit, el, L, spec) {
  const mode = typeof spec === 'string' ? spec : (spec && spec.mode);
  // A mode the browser does not know is discarded by the CSS parser without a word, which is the
  // whole failure this registry is built to refuse: `"multipy"` would render an unblended layer and
  // report nothing anywhere.
  if (!BLEND_MODES.includes(mode))
    throw new Error(`mixBlend: unknown blend mode ${JSON.stringify(mode)} — one of: ${BLEND_MODES.join(', ')}. `
      + `Write it as { "mixBlend": "difference" } or { "mixBlend": { "mode": "difference" } }.`);
  el.style.mixBlendMode = mode;
}
