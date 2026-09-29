// core/surfaces/raymarch.js: a raymarched 3D subject. The `raymarch` layer type's pixels.
//
// Unlike `shader`, this is a LIT SUBJECT with a silhouette, not an ambient field: give it a box
// roughly the size you want the object to occupy and let its transparent surround do the compositing.
// That is why its default box is a square rather than the frame.
import { createRaymarchLayer, RAYMARCH_REGISTRY } from './raymarch-fx.js';
import { palette } from './palette.js';
import { keyAt, validateKeys, atOf } from './surface-keys.js';

export const size = () => [720, 720];   // a subject, not a field: a square you place, not a backdrop
export const stamp = 3;
export const resamplable = false;       // one WebGL context already; the resampler would want a second

export const PROPS = { raymarch: {}, raymarchKeys: {}, seed: {}, intensity: {}, spin: {}, colors: {} };

// ---- raymarchKeys: ONE window, several surfaces, cut on a chosen instant ----
// The same mechanism `shaderKeys` uses, and for the same reason: core/surfaces/surface-keys.js. It
// matters MORE here, because this is the most expensive primitive in the engine and the header above
// says not to put two on screen at once. Three panels cycling six lit surfaces is three contexts with
// this and six without. `colors`, `intensity`, `seed` and `spin` are the LAYER's and apply to every
// surface in the list. Nothing is reset at a swap: the camera orbit runs on through, so the incoming
// surface is seen from where the camera had got to, which is what makes a hard swap read as one panel
// changing its contents rather than as a second panel arriving.

/** Which surface is showing, at `at` seconds after the layer's start. A pure function of `at`. */
export function raymarchAt(L, at) {
  return keyAt(L.raymarch, L.raymarchKeys)(at);
}

export function validate(L) {
  RAYMARCH_REGISTRY.pick(L.raymarch);   // throws, and diagnoses a wrong-slot name
  validateKeys(L.raymarchKeys, 'raymarchKeys', (n) => RAYMARCH_REGISTRY.pick(n),
    '[{ "t": 2, "shader": "caustics" }, { "t": 4, "shader": "chromeGlass" }]');
}

export function create(kit, L, w, h) {
  const inst = createRaymarchLayer(w, h);
  const pal = palette(L);
  return {
    canvas: inst.canvas,
    // `spin` is a separate dial from `speed` on purpose: speed scales the SUBJECT's animation, spin
    // scales the CAMERA's orbit. A metaball blob that churns while the camera holds still is a
    // different shot from one where the camera circles a frozen object, and an author wants both.
    draw(lt, LL) { inst.draw(raymarchAt(LL, atOf(lt, LL.speed)), lt, LL.seed ?? 0, pal, LL.intensity ?? 1, LL.spin ?? 1); },
    clear() { inst.clear(); },
  };
}
