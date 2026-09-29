// core/surfaces/shader.js: a smooth ambient WebGL field (flow/aurora/plasma/drift/mist/…). The
// `shader` layer type's pixels. Colourful by default, palette-tintable via L.colors. Not the
// cut-cover stings, those live in core/stings.js.
import { createAmbientLayer, AMBIENT_REGISTRY } from './shaders-ambient.js';
import { palette } from './palette.js';
import { keyAt, validateKeys, atOf } from './surface-keys.js';

export const size = (kit) => [kit.W, kit.H];   // an ambient field: fills the frame unless boxed
export const stamp = 2;
export const resamplable = true;

export const PROPS = { shader: {}, shaderKeys: {}, seed: {}, intensity: {}, colors: {}, params: {}, params2: {}, params3: {}, params4: {}, params5: {}, params6: {} };

// ---- shaderKeys: ONE window, several looks, cut on a chosen instant ----
// The mechanism, and WHY it is not consecutive windows spelled differently, is core/surfaces/surface-keys.js.
// `seed`, `intensity`, `colors` and the `params` vectors are the LAYER's and apply to every look in
// the list: this keys the field, not the whole dressing of it. The field's phase is NOT reset at a
// swap, so the new look is sampled where its own loop happens to be.

/** Which look is showing, at `at` seconds after the layer's start. A pure function of `at`. */
export function shaderAt(L, at) {
  return keyAt(L.shader || 'flow', L.shaderKeys)(at);
}

// The ambient draw call resolves a name to a uniform index and RETURNS on a miss, so `shader:"aurara"`
// has always produced an empty canvas that passes every gate. `validate` refuses the scene instead
// (`make check GATE=validate` already rejects it, and the renderer being the lenient one is the wrong way round.
// Core/layers/index.js makes the same argument about an unknown layer type).
export function validate(L) {
  AMBIENT_REGISTRY.pick(L.shader || 'flow');   // throws, and diagnoses a wrong-slot name
  validateKeys(L.shaderKeys, 'shaderKeys', (n) => AMBIENT_REGISTRY.pick(n),
    '[{ "t": 2, "shader": "voronoi" }, { "t": 4, "shader": "nebula" }]');
}

export function create(kit, L, w, h) {
  const inst = createAmbientLayer(w, h);
  const pal = palette(L);
  return {
    canvas: inst.canvas,
    // `params` is the per-effect vector, passed straight through. An effect that does not read it is
    // unaffected, so this is additive for the seventeen that predate it.
    draw(lt, LL) {
      const at = atOf(lt, LL.speed);
      inst.draw(shaderAt(LL, at), lt, LL.seed ?? 0, pal, LL.intensity ?? 0.35, LL.params, LL.params2, LL.params3, LL.params4, LL.params5, LL.params6);
    },
    // createAmbientLayer degrades to a stub when the context is unavailable, and the stub has no clear
    clear() { if (inst.clear) inst.clear(); },
  };
}
