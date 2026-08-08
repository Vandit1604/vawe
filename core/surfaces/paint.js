// core/surfaces/paint.js — GENERATIVE Canvas 2D. The `paint` layer type's pixels.
// See core/paint-fx.js for the determinism contract each effect keeps.
import { PAINT_FX } from '../paint-fx.js';

export const size = (kit) => [kit.W, kit.H];   // an ambient field: fills the frame unless boxed
export const stamp = 3;
export const resamplable = true;

// At BUILD, so a typo fails before a single frame is drawn rather than 30 times a second into a
// render nobody is watching. This used to throw from frame() instead, one frame too late.
export function validate(L) {
  if (!PAINT_FX[L.paint]) throw new Error(`unknown paint "${L.paint}" — one of: ${Object.keys(PAINT_FX).join(', ')}`);
}

export function create(kit, L, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const fx = PAINT_FX[L.paint];
  return {
    canvas: cv,
    // drawn from scratch every frame: no feedback, no accumulation
    draw(lt, LL) { ctx.clearRect(0, 0, w, h); if (LL.bg) { ctx.fillStyle = LL.bg; ctx.fillRect(0, 0, w, h); } fx(ctx, w, h, lt, LL.seed ?? 0, LL); },
    clear() { ctx.clearRect(0, 0, w, h); },
  };
}
