// core/layers/three.js — a three.js scene as a placeable layer. Mirrors core/layers/shader.js and
// core/layers/raymarch.js exactly: build once, draw from LOCAL time every frame, clear when
// off-window, stamp the dataset so the renderer's static-frame dedup sees a canvas-only change.
//
// The determinism contract lives in core/three-fx.js — read its header before adding a scene. The
// short version: pose everything absolutely from t, never accumulate, never touch a clock.
import { createThreeLayer, THREE_FX } from '../three-fx.js';

export function build(kit, el, L) {
  if (!THREE_FX.includes(L.three)) {
    throw new Error(`unknown three scene "${L.three}" — one of: ${THREE_FX.join(', ')}`);
  }
  const w = Math.round(L.w ?? 720), h = Math.round(L.h ?? 720);
  const inst = createThreeLayer(w, h, L, L.colors);
  inst.canvas.style.cssText = `display:block;width:${w}px;height:${h}px;border-radius:${L.radius ?? 0}px`;
  if (L.radius) el.style.overflow = 'hidden';
  el.appendChild(inst.canvas);
  el.__three = inst;
}

export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  const inst = el.__three; if (!inst) return;
  if (!(t >= start && t < end)) { inst.clear(); return; }
  const lt = (t - start) * (L.speed ?? 1);
  inst.draw(lt, L);
  el.dataset.st = lt.toFixed(3);
}
