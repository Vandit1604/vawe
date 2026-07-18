// core/layers/paint.js — a GENERATIVE Canvas 2D layer, redrawn every frame as a pure function of local
// time. Mirrors core/layers/shader.js exactly, including the dataset stamp: a paint-only frame must
// change the DOM signature or the renderer's static-frame dedup can reuse a neighbouring frame and the
// motion silently drops out. See core/paint-fx.js for the determinism contract each effect keeps.
import { PAINT_FX } from '../paint-fx.js';

export function build(kit, el, L) {
  const w = Math.round(L.w ?? kit.W), h = Math.round(L.h ?? kit.H);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.style.cssText = `display:block;width:${w}px;height:${h}px;border-radius:${L.radius ?? 0}px`;
  if (L.radius) el.style.overflow = 'hidden';
  el.appendChild(cv);
  el.__paint = cv.getContext('2d');
  el.__paintWH = [w, h];
}

export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  const ctx = el.__paint; if (!ctx) return;
  // OFF-WINDOW MUST CLEAR. Returning early leaves the last frame's pixels sitting in the canvas, so
  // the element's contents depend on which frames were rendered before it — and frames render across
  // 8 workers in arbitrary order. driveClips hides the layer at opacity 0 so it is invisible today,
  // which is exactly why it would never have been noticed: it is impurity waiting for the day someone
  // gives a paint layer a non-zero resting opacity. Same class as MISTAKES #41.
  if (!(t >= start && t < end)) { const [w0, h0] = el.__paintWH; ctx.clearRect(0, 0, w0, h0); return; }
  const fx = PAINT_FX[L.paint];
  if (!fx) throw new Error(`unknown paint "${L.paint}" — one of: ${Object.keys(PAINT_FX).join(', ')}`);
  const [w, h] = el.__paintWH;
  const lt = (t - start) * (L.speed ?? 1);
  ctx.clearRect(0, 0, w, h);          // drawn from scratch every frame: no feedback, no accumulation
  if (L.bg) { ctx.fillStyle = L.bg; ctx.fillRect(0, 0, w, h); }
  fx(ctx, w, h, lt, L.seed ?? 0, L);
  el.dataset.st = lt.toFixed(3);
}
