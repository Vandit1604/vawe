// core/surfaces/raymarch.js — a raymarched 3D subject. The `raymarch` layer type's pixels.
//
// Unlike `shader`, this is a LIT SUBJECT with a silhouette, not an ambient field: give it a box
// roughly the size you want the object to occupy and let its transparent surround do the compositing.
// That is why its default box is a square rather than the frame.
import { createRaymarchLayer, RAYMARCH_FX } from '../raymarch-fx.js';
import { palette } from './palette.js';

export const size = () => [720, 720];   // a subject, not a field: a square you place, not a backdrop
export const stamp = 3;
export const resamplable = false;       // one WebGL context already; the resampler would want a second

export function validate(L) {
  if (!RAYMARCH_FX.includes(L.raymarch)) throw new Error(`unknown raymarch "${L.raymarch}" — one of: ${RAYMARCH_FX.join(', ')}`);
}

export function create(kit, L, w, h) {
  const inst = createRaymarchLayer(w, h);
  const pal = palette(L);
  return {
    canvas: inst.canvas,
    // `spin` is a separate dial from `speed` on purpose: speed scales the SUBJECT's animation, spin
    // scales the CAMERA's orbit. A metaball blob that churns while the camera holds still is a
    // different shot from one where the camera circles a frozen object, and an author wants both.
    draw(lt, LL) { inst.draw(LL.raymarch, lt, LL.seed ?? 0, pal, LL.intensity ?? 1, LL.spin ?? 1); },
    clear() { inst.clear(); },
  };
}
