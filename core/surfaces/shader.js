// core/surfaces/shader.js: a smooth ambient WebGL field (flow/aurora/plasma/drift/mist/…). The
// `shader` layer type's pixels. Colourful by default, palette-tintable via L.colors. Not the
// cut-cover stings, those live in core/stings.js.
import { createAmbientLayer, AMBIENT_FX, AMBIENT_REGISTRY } from '../shaders-ambient.js';
import { palette } from './palette.js';

export const size = (kit) => [kit.W, kit.H];   // an ambient field: fills the frame unless boxed
export const stamp = 2;
export const resamplable = true;

export const PROPS = { shader: {}, shaderKeys: {}, seed: {}, intensity: {}, colors: {}, params: {}, params2: {}, params3: {}, params4: {}, params5: {}, params6: {} };

// ---- shaderKeys: ONE window, several looks, cut on a chosen instant ----
//
// WHY THIS IS NOT "CONSECUTIVE WINDOWS SPELLED DIFFERENTLY", which is how everything else in this
// engine sequences and would have been the right answer if it worked here. Two reasons, and the first
// is a hard limit rather than a preference:
//
//   1. EVERY CANVAS LAYER HOLDS A WEBGL CONTEXT FOR THE WHOLE FILM. canvas.js `build` calls
//      S.create() unconditionally, so a look that shows for two seconds still costs a context for
//      the entire runtime. Browsers cap concurrent contexts at roughly 16 and some drivers drop an
//      OLDER one instead of refusing a new one, which core/boot.js refuses by name. Three panels
//      cycling five looks is fifteen contexts for what is really three fields. A text layer costs
//      nothing to duplicate; this one does.
//   2. STACKED WINDOWS CROSSFADE, AND TWO SHADERS DISSOLVED TOGETHER ARE MUD. The clip envelope
//      fades opacity, so the overlap shows both fields at partial alpha over each other. A hard
//      swap on the beat is the thing the reference work actually does, and a dissolve cannot
//      express it at all.
//
// PURE IN t BY CONSTRUCTION. This is a lookup over a sorted list, never a transition carrying state,
// so frame n does not depend on which frames a worker drew before it. There is deliberately no
// crossfade option: a blend would need the two fields drawn at once, which is the context cost above
// coming back through the other door, and it is the look this exists to avoid.
//
// The field's phase is NOT reset at a swap. The local clock runs on through, so the new look is
// sampled where its own loop happens to be, exactly as it would be had it been showing all along.
// `seed`, `intensity`, `colors` and the `params` vectors are the LAYER's and apply to every look in
// the list: this keys the field, not the whole dressing of it.

/** Which look is showing, at `at` seconds after the layer's start. A pure function of `at`. */
export function shaderAt(L, at) {
  const base = L.shader || 'flow';
  const keys = L.shaderKeys;
  if (!Array.isArray(keys) || !keys.length) return base;
  let name = base;
  for (const k of keys) { if (at < k.t) break; name = k.shader; }
  return name;
}

// The ambient draw call resolves a name to a uniform index and RETURNS on a miss, so `shader:"aurara"`
// has always produced an empty canvas that passes every gate. `validate` refuses the scene instead
// (`make validate` already rejects it, and the renderer being the lenient one is the wrong way round.
// Core/layers/index.js makes the same argument about an unknown layer type).
export function validate(L) {
  AMBIENT_REGISTRY.pick(L.shader || 'flow');   // throws, and diagnoses a wrong-slot name

  const keys = L.shaderKeys;
  if (keys == null) return;
  if (!Array.isArray(keys) || !keys.length)
    throw new Error(`shaderKeys must be a non-empty array of { t, shader }, e.g. `
      + `[{ "t": 2, "shader": "voronoi" }, { "t": 4, "shader": "nebula" }]. Got `
      + `${JSON.stringify(keys)}. Before the first key the layer shows its own \`shader\`.`);
  let prev = -Infinity;
  keys.forEach((k, i) => {
    if (!k || typeof k !== 'object' || Array.isArray(k))
      throw new Error(`shaderKeys[${i}] must be an object { t, shader }, got ${JSON.stringify(k)}.`);
    if (!Number.isFinite(k.t))
      throw new Error(`shaderKeys[${i}].t must be a number: SECONDS FROM THE LAYER'S START, the same `
        + `clock \`start\` is on and unaffected by \`speed\`. Got ${JSON.stringify(k.t)}.`);
    // Out of order is a typo, and a lookup would silently strand every key after the offender.
    if (k.t < prev)
      throw new Error(`shaderKeys must run forwards in time: key ${i} is at ${k.t}, after ${prev}. `
        + `The list is read in order and a key behind its predecessor could never be reached.`);
    prev = k.t;
    AMBIENT_REGISTRY.pick(k.shader);
  });
}

export function create(kit, L, w, h) {
  const inst = createAmbientLayer(w, h);
  const pal = palette(L);
  return {
    canvas: inst.canvas,
    // `params` is the per-effect vector, passed straight through. An effect that does not read it is
    // unaffected, so this is additive for the seventeen that predate it.
    draw(lt, LL) {
      // `lt` arrives already multiplied by `speed` (core/layers/canvas.js), because `speed` is a dial
      // on the FIELD's own loop. A key is a moment in the FILM, so it is divided back out: keying a
      // swap at 2s must mean two seconds of screen time whether the field is running fast or slow.
      // At speed 0 the clock is frozen and `lt` is always 0, so the layer holds whatever look 0 selects.
      const sp = LL.speed ?? 1;
      const at = sp ? lt / sp : 0;
      inst.draw(shaderAt(LL, at), lt, LL.seed ?? 0, pal, LL.intensity ?? 0.35, LL.params, LL.params2, LL.params3, LL.params4, LL.params5, LL.params6);
    },
    // createAmbientLayer degrades to a stub when the context is unavailable, and the stub has no clear
    clear() { if (inst.clear) inst.clear(); },
  };
}
