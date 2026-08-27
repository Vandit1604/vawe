// core/surfaces/paint.js: GENERATIVE Canvas 2D. The `paint` layer type's pixels.
// See core/paint-fx.js for the determinism contract each effect keeps.
import { PAINT_FX, PROPS as FX_PROPS, PAINT_REGISTRY } from '../paint-fx.js';
import { mergeProps } from '../props.js';

export const size = (kit) => [kit.W, kit.H];   // an ambient field: fills the frame unless boxed
export const stamp = 3;
export const resamplable = true;

// At BUILD, so a typo fails before a single frame is drawn rather than 30 times a second into a
// render nobody is watching. This used to throw from frame() instead, one frame too late.
// The whole layer is the effect's options bag (core/paint-fx.js reads it as `LL`), so an effect's own
// knobs are its own vocabulary rather than props declared here, `count`, `amp` and the rest belong to
// the named effect. Declared here: what this file itself reads.
export const PROPS = mergeProps({ paint: {}, bg: {}, seed: {} }, FX_PROPS);

export function validate(L) {
  PAINT_REGISTRY.pick(L.paint);   // throws, and diagnoses a name that belongs to a different vocabulary
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
