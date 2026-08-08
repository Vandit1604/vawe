// core/surfaces/three.js — a three.js scene. The `three` layer type's pixels.
//
// The determinism contract lives in core/three-fx.js — read its header before adding a scene. The
// short version: pose everything absolutely from t, never accumulate, never touch a clock.
import { createThreeLayer, THREE_FX } from '../three-fx.js';

export const size = () => [720, 720];   // a subject, not a field, like raymarch
export const stamp = 3;
export const resamplable = false;

export function validate(L) {
  if (!THREE_FX.includes(L.three)) throw new Error(`unknown three scene "${L.three}" — one of: ${THREE_FX.join(', ')}`);
}

// The whole layer goes to createThreeLayer: a three scene reads its own dials (dolly, pointSize,
// bodyColor…) off it, which is why core/three-fx.js names the layer `LL` where `L` is taken.
export function create(kit, L, w, h) {
  const inst = createThreeLayer(w, h, L, L.colors);
  return {
    canvas: inst.canvas,
    draw(lt, LL) { inst.draw(lt, LL); },
    clear() { inst.clear(); },
  };
}
