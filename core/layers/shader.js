// core/layers/shader.js — a smooth ambient WebGL SHADER as a placeable layer (flow/aurora/plasma/drift/
// mist). Colourful by default (palette-tintable via L.colors); pure in local t so renderFrame(n) stays
// deterministic. Sits behind content by default (give it a low track + intensity). Not the cut-cover
// stings — those live in core/stings.js.
import { createAmbientLayer } from '../shaders-ambient.js';

const hex3 = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

export function build(kit, el, L) {
  const w = Math.round(L.w ?? kit.W), h = Math.round(L.h ?? kit.H);
  const inst = createAmbientLayer(w, h);
  inst.canvas.style.cssText = `display:block;width:${L.w ?? kit.W}px;height:${L.h ?? kit.H}px;border-radius:${L.radius ?? 0}px`;
  if (L.radius) el.style.overflow = 'hidden';
  el.appendChild(inst.canvas);
  el.__shader = inst;
  el.__pal = Array.isArray(L.colors) && L.colors.length ? L.colors.map(hex3) : null; // null → the shader's colourful default
}

// draw the ambient shader from LOCAL time (loops smoothly). Stamp el.dataset.st so a shader-only frame
// always changes the DOM signature — otherwise the render's static-frame dedup could wrongly reuse a frame.
export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const inst = el.__shader; if (!inst) return;
  const lt = (t - start) * (L.speed ?? 1);
  inst.draw(L.shader || 'flow', lt, L.seed ?? 0, el.__pal, L.intensity ?? 0.35);
  el.dataset.st = lt.toFixed(2);
}
