// core/resample/index.js (was core/resample.js, W9): the wiring that lets a LAYER opt into being
// re-sampled through core/resample/effects.js.
//
// One helper pair, shared by every layer type that owns a raster (image · paint · shader), so the
// contract lives in exactly one place rather than being re-implemented three times and drifting.
// Layers call attach() at the end of build() and tick() at the end of frame().
//
//   { type:'image', src:'x.png', w:900, h:600, resample:{ fx:'zoomBlur', amount:[0, 0.8] } }
//   { type:'paint', paint:'waves', resample:'refract' }
//
// `amount` may be a number (constant) or [from, to] (eased across the layer's own window), because
// half of these effects are only interesting while they MOVE, a dissolve frozen at 0.5 is just a
// hole. Interpolation is on the layer's local progress, so it stays a pure function of t.
//
// A LAYER THAT OWNS NO RASTER IS BAKED INTO ONE. Until now this file refused every type that is not an
// image or a canvas, so eight passes could be aimed at a photograph and at nothing we compose
// ourselves. The whole "take arbitrary content and transform it" family was out of reach. A built
// subtree now becomes a texture the same way a seam does: SVG <foreignObject> serialisation ONCE at
// boot (core/raster.js), before the render loop, awaited by core/boot.js. What the pass reads per
// frame is then a constant canvas, indistinguishable from a still <img>, so renderFrame(n) stays a
// pure function of n and the backward seek is byte-identical.
//
// THE COST, said plainly because it decides whether you should use this: the bake is ONE INSTANT of
// the layer, taken from the built DOM before any frame has been drawn. A `count` that ticks or a
// `type` that types is frozen at the state build left it in. The MOTION comes from the pass, the
// amount ramp, the noise clock, not from the source. That is a hero device on a settled beat, not a
// wrapper you put around a moving one.
import { createResampler, RESAMPLE_REGISTRY } from './effects.js';
import { buildInlinedCss, domToCanvas, rasterStats } from './raster.js';

const SPECS = new WeakMap();   // el → { r, src, fx, amount, speed, seed, isStatic }
// Layers whose raster has to be BAKED out of the DOM. Filled at build (nothing is measurable then,
// buildLayer appends the element AFTER the primitive builds it), drained once by bakeResamples().
const PENDING = [];

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

// `seed` falls back to the layer's own when the spec states none, so both spellings are read here.
export const PROPS = { resample: {}, seed: { when: 'resample' } };

export function attachResample(kit, el, L) {
  if (!L.resample) return;
  // IDEMPOTENT ON PURPOSE. core/layers/image.js and core/layers/canvas.js attach their own raster
  // inside build(), and core/layers/index.js then calls this for EVERY type so a built subtree gets
  // its bake. The second call has to be a no-op rather than a second resampler (and a second GL
  // context) on the same element.
  if (SPECS.has(el) || PENDING.some((p) => p.el === el)) return;
  const spec = typeof L.resample === 'string' ? { fx: L.resample } : L.resample;
  RESAMPLE_REGISTRY.pick(spec.fx);   // the one refusal, owned beside the vocabulary
  const src = sourceOf(el);
  if (!src) { PENDING.push({ el, L, spec }); return; }   // no raster of its own → bake the subtree

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

// What the <foreignObject> serialiser cannot see, refused BY NAME rather than baked as a hole. A
// <canvas> bitmap is not part of the DOM and a <video> frame is not either, so both serialise as an
// empty box: a `raymarch` inside a group, or a `video` layer, would resample to nothing and look like
// the effect simply did not fire. That is the accepted-then-ignored class this repo logs most.
const UNSERIALISABLE = 'canvas, video';

// The inheritable properties worth carrying across the detachment. Not every inherited property,
// `visibility` is one and copying it would undo the very thing the bake sets, just the ones that
// decide how type is set and coloured.
const INHERITED = ['font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch',
  'font-variation-settings', 'font-feature-settings', 'line-height', 'letter-spacing', 'word-spacing',
  'color', 'text-align', 'text-transform', 'text-indent', 'white-space', 'direction', 'writing-mode'];

// bakeResamples(): drain the queue. Async, one-shot, awaited by core/boot.js BEFORE the render loop
// and before bakeSeams (which drives renderFrame itself and would leave the DOM on some other frame).
// After it returns, every resampled layer reads a constant canvas and the per-frame path is pure.
export async function bakeResamples() {
  if (!PENDING.length) return;
  const queue = PENDING.splice(0, PENDING.length);
  for (const { el, L, spec } of queue) await bakeOne(el, L, spec);
}

async function bakeOne(el, L, spec) {
  const name = L.id || L.type || 'layer';
  const bad = el.querySelector(UNSERIALISABLE);
  if (bad) {
    throw new Error(`resample on layer "${name}": a <${bad.tagName.toLowerCase()}> inside it cannot be `
      + `serialised into the offscreen raster: its bitmap is not part of the DOM, so the bake would `
      + `produce a hole and the pass would look like it never ran. Put the resample on the raster `
      + `layer itself (image · paint · shader), or take that element out of this subtree.`);
  }
  const box = el.getBoundingClientRect();
  const w = Math.round(L.w ?? box.width), h = Math.round(L.h ?? box.height);
  if (!(w > 0 && h > 0)) {
    throw new Error(`resample on layer "${name}": the built content measures ${Math.round(box.width)}×`
      + `${Math.round(box.height)}, so there is nothing to sample. Give the layer an explicit w and h.`);
  }

  // Rasterise a CLONE, stripped of the things that place the live element in the frame. Inside the
  // offscreen SVG the subtree IS the whole picture and starts at 0,0; `left`/`top` would push it out
  // of the buffer. `filter` comes off for a different reason: it still applies to the live element,
  // so leaving it on the clone would apply it twice, once baked and once on top.
  const clone = el.cloneNode(true);
  // A DETACHED CLONE INHERITS NOTHING. The live element sits under #cam and under :root, so its font,
  // colour and size mostly arrive by inheritance and are on none of its own attributes; serialised on
  // its own, the whole subtree fell back to the browser default and a headline came out in Times. So
  // the resolved value of every inheritable property that decides how type is SET is stamped onto the
  // clone's root, and the descendants inherit from there exactly as they did from the stage.
  const live = getComputedStyle(el);
  for (const prop of INHERITED) clone.style.setProperty(prop, live.getPropertyValue(prop));
  clone.style.left = '0px'; clone.style.top = '0px';
  clone.style.right = ''; clone.style.bottom = '';
  clone.style.transform = 'none';
  clone.style.opacity = '1';
  clone.style.visibility = 'visible';
  clone.style.filter = 'none';

  const css = await buildInlinedCss(el);
  const raster = await domToCanvas(clone, w, h, css);
  // Opacity only, never uniformity: a `rect` layer is legitimately one flat colour, and the seam's
  // blank test grades that as a failed bake (core/raster.js rasterStats says why they are two tests).
  const stats = rasterStats(raster);
  if (stats && stats.opaque < 0.005) {
    throw new Error(`resample on layer "${name}": the offscreen raster came back empty. A cross-origin `
      + `image or a captured component that will not serialise is the usual cause, the pass would `
      + `render a blank rectangle, which is not an acceptable frame.`);
  }

  const r = createResampler(w, h);
  // visibility is INHERITED and overridable per element, which is what lets the layer's own paint (a
  // rect's background, the glyphs of a text layer) go quiet while this child keeps painting. The
  // element itself stays in place, so every track (cut, motion, modifiers) still drives it.
  r.canvas.style.cssText = `position:absolute;left:0;top:0;display:block;width:${w}px;height:${h}px;visibility:visible`;
  el.style.visibility = 'hidden';
  el.appendChild(r.canvas);

  SPECS.set(el, {
    r, src: raster, fx: spec.fx,
    amount: spec.amount ?? 0.5,
    speed: spec.speed ?? 1,
    seed: spec.seed ?? L.seed ?? 0,
    isStatic: true,   // a baked subtree is the same texels on every frame, upload once, like an <img>
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
