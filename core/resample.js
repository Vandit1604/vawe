// core/resample.js — the wiring that lets a LAYER opt into being re-sampled through core/resample-fx.js.
//
// One helper pair, shared by every layer type that owns a raster (image · paint · shader), so the
// contract lives in exactly one place rather than being re-implemented three times and drifting.
// Layers call attach() at the end of build() and tick() at the end of frame().
//
//   { type:'image', src:'x.png', w:900, h:600, resample:{ fx:'zoomBlur', amount:[0, 0.8] } }
//   { type:'paint', paint:'waves', resample:'refract' }
//
// `amount` may be a number (constant) or [from, to] (eased across the layer's own window), because
// half of these effects are only interesting while they MOVE — a dissolve frozen at 0.5 is just a
// hole. Interpolation is on the layer's local progress, so it stays a pure function of t.
import { createResampler, RESAMPLE_FX } from './resample-fx.js';

const SPECS = new WeakMap();   // el → { r, src, fx, amount, speed, seed, static }

// Resolve a layer's raster source. The ORDER matters: a canvas layer (core/layers/canvas.js) stashes
// its surface on the element at build time, and only an image layer falls through to the <img>.
// Asking the surface rather than naming `paint` and `shader` one at a time is what stopped this from
// silently answering "no raster" for raymarch and three; canvas.js now refuses those by name instead.
function sourceOf(el) {
  if (el.__surface) return { node: el.__surface.canvas, isStatic: false };
  const im = el.querySelector('img');
  if (im) return { node: im, isStatic: true };
  return null;
}

export function attachResample(kit, el, L) {
  if (!L.resample) return;
  const spec = typeof L.resample === 'string' ? { fx: L.resample } : L.resample;
  if (!RESAMPLE_FX.includes(spec.fx)) {
    throw new Error(`unknown resample "${spec.fx}" — one of: ${RESAMPLE_FX.join(', ')}`);
  }
  const src = sourceOf(el);
  // FAIL LOUD. A layer type with no raster (text, rect, component, group) cannot be sampled; silently
  // ignoring `resample` there is exactly the class of silent-substitution bug that shipped the wrong
  // font and square avatars (docs/MISTAKES.md). Say so, name the types that work.
  if (!src) throw new Error(`resample needs a raster layer (image · paint · shader), got "${L.type}"`);

  const w = Math.round(L.w ?? kit.W), h = Math.round(L.h ?? kit.H);
  // An image layer with no explicit box has no size until it loads, and the resampler needs its
  // buffer dimensions at build time. Demanding both is better than guessing one.
  if (src.isStatic && (!L.w || !L.h)) {
    throw new Error('resample on an image needs explicit w and h (the GL buffer is sized at build)');
  }

  const r = createResampler(w, h);
  r.canvas.style.cssText = `display:block;width:${w}px;height:${h}px`;
  // The source stays in the DOM (its own frame() still draws into it, and that is what we sample)
  // but stops painting to the screen. visibility:hidden rather than display:none: a display:none
  // canvas has no layout, and a display:none <img> in some paths never decodes.
  src.node.style.visibility = 'hidden';
  src.node.style.position = 'absolute';
  el.appendChild(r.canvas);

  SPECS.set(el, {
    r, src: src.node, fx: spec.fx,
    amount: spec.amount ?? 0.5,
    speed: spec.speed ?? 1,
    seed: spec.seed ?? L.seed ?? 0,
    isStatic: src.isStatic,
  });
}

// `active` is the owning layer's own window test, passed in rather than recomputed, so the resampler
// can never disagree with the layer about whether it is on screen.
export function tickResample(el, L, t, active) {
  const s = SPECS.get(el);
  if (!s) return;
  if (!active) { s.r.clear(); return; }

  const start = L.start ?? 0, dur = L.duration ?? 2;
  const p = dur > 0 ? Math.min(1, Math.max(0, (t - start) / dur)) : 0;
  const amt = Array.isArray(s.amount)
    ? s.amount[0] + (s.amount[1] - s.amount[0]) * (p * p * (3 - 2 * p))   // smoothstep: no linear ramps
    : s.amount;
  const lt = (t - start) * s.speed;

  // `once` for a static <img>: the texels never change, so upload on the first draw only.
  s.r.draw(s.src, s.fx, amt, lt, s.seed, s.isStatic);
  // Stamp the DOM so the renderer's static-frame dedup sees a resample-only frame as a change.
  // Without this a slow dissolve over a still image dedups to one frame and the effect vanishes.
  el.dataset.rs = amt.toFixed(4) + ':' + lt.toFixed(3);
}
