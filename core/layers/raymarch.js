// core/layers/raymarch.js — a raymarched 3D subject as a placeable layer. Mirrors core/layers/shader.js
// exactly (build → instance on the element, frame → draw from LOCAL time, off-window → clear, dataset
// stamp so the renderer's static-frame dedup can see a shader-only change).
//
// Unlike `shader`, this is a LIT SUBJECT with a silhouette, not an ambient field: give it a box roughly
// the size you want the object to occupy and let its transparent surround do the compositing.
import { createRaymarchLayer, RAYMARCH_FX } from '../raymarch-fx.js';

const hex3 = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

export function build(kit, el, L) {
  if (!RAYMARCH_FX.includes(L.raymarch)) {
    throw new Error(`unknown raymarch "${L.raymarch}" — one of: ${RAYMARCH_FX.join(', ')}`);
  }
  const w = Math.round(L.w ?? 720), h = Math.round(L.h ?? 720);
  const inst = createRaymarchLayer(w, h);
  inst.canvas.style.cssText = `display:block;width:${w}px;height:${h}px;border-radius:${L.radius ?? 0}px`;
  if (L.radius) el.style.overflow = 'hidden';
  el.appendChild(inst.canvas);
  el.__raymarch = inst;
  el.__pal = Array.isArray(L.colors) && L.colors.length ? L.colors.map(hex3) : null;
}

export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  const inst = el.__raymarch; if (!inst) return;
  if (!(t >= start && t < end)) { inst.clear(); return; }
  const lt = (t - start) * (L.speed ?? 1);
  // `spin` is a separate dial from `speed` on purpose: speed scales the SUBJECT's animation, spin
  // scales the CAMERA's orbit. A metaball blob that churns while the camera holds still is a
  // different shot from one where the camera circles a frozen object, and an author wants both.
  inst.draw(L.raymarch, lt, L.seed ?? 0, el.__pal, L.intensity ?? 1, L.spin ?? 1);
  el.dataset.st = lt.toFixed(3);
}
