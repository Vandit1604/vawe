// core/resample/index.js (was core/resample.js, W9): the wiring that lets a LAYER opt into being
// re-sampled through core/resample/effects.js.
//
// One helper pair, shared by every layer type that owns a raster (image · paint · shader), so the
// contract lives in exactly one place rather than being re-implemented three times and drifting.
// Layers call attach() at the end of build() and tick() at the end of frame().
//
//   { type:'image', src:'x.png', w:900, h:600, resample:{ fx:'zoomBlur', amount:[0, 0.8] } }
//   { type:'paint', paint:'waves', resample:'refract' }
//   { type:'image', src:'x.png', w:900, h:600, resample:{ fx:'directionalBlur', amount:0.6, angle:15 } }
//   { type:'image', src:'x.png', w:900, h:600, resample:[{ fx:'zoomBlur', amount:0.5 }, { fx:'chromaShift', amount:0.4 }] }
//
// STACKING (an array instead of one fx/object): each op runs in order, reading the PREVIOUS op's
// OUTPUT, not the original source a second time, so `[zoomBlur, chromaShift]` is "shift the channels
// of the ALREADY-blurred frame", not two independent passes over the same photo. `amount`/`angle`/
// `cx`/`cy`/`count` are each op's own; `speed`/`seed` stay one clock for the whole stack. See
// core/resample/effects.js `drawStack` for the ping-pong mechanism and its purity argument, and
// `MAX_STACK` below for the depth ceiling and why it is a cost formula, not a taste rule.
// `amount` may be a number (constant) or [from, to] (eased across the layer's own window), because
// half of these effects are only interesting while they MOVE, a dissolve frozen at 0.5 is just a
// hole. Interpolation is on the layer's local progress, so it stays a pure function of t.
//
// `angle` (degrees, 0 = rightward) is read only by `directionalBlur`: a smear axis an author SETS,
// independent of the layer's own travel speed (that one is automatic motion blur, `core/tracks/motion.js`).
//
// `cx`/`cy` (0..1, default 0.5/0.5) and `count` (2..32, default 16) are read by the whole blur family,
// `zoomBlur`/`spinBlur`/`directionalBlur`: the point the smear radiates from or pivots on (`cx`/`cy`,
// ignored by `directionalBlur`, whose axis is `angle` not a point) and how many samples it takes.
// Off-centre `cx`/`cy` on `zoomBlur` is what turns the pass into light rays streaming from a source
// shape; on `spinBlur` it is what pivots the arc off the frame's middle. `count` trades sample quality
// against the render-time cost of the pass (each sample is one texture read).
//
// WHAT "ZOOM" MEANS HERE, decided before any zoom code (stackable-sampling-ops.plan.md Task 2). This
// engine already has a zoom: `ken` on an image layer and every `camera-moves/*` push/dive/punch, both
// a CSS `transform: scale()` on a DOM element. That one SCALES GEOMETRY, works on any layer type, costs
// nothing extra (no GL context, no draw call), and composes with cut/motion/camera. It does NOT compose
// with resample: `frame()` above says so outright, `ken` on a layer with a `resample` is refused at
// validate, because a CSS transform never touches the pixels a shader pass reads. That refusal is
// deliberate, not a gap, so a SAMPLING zoom (read the texture at a scaled uv, inside the shader) is a
// different mechanism from the transform, not the same one with extra steps: it is the one way to zoom
// a layer that a resample chain (Task 3's stack) could read the RESULT of.
//
// Built anyway? No, not in this pass. Argued cost, not measured need: a crisp sampling zoom is a real,
// cheap primitive (uv' = center + (uv-center)/z, a handful of GLSL lines) and worth adding the day an
// author actually reaches for "zoom, then something" and finds `zoomBlur` too blurry for it. Today
// `zoomBlur` already covers most of that intent (a push toward `cx`/`cy` with the far samples smeared,
// which reads as a zoom-in for the exact impact beats this family exists for), and Task 3 below proves
// the ping-pong stack by composing EXISTING resample ops, so a new fx is not load-bearing for that
// proof. Adding one now would be a second way to say "push in" before the first way was ever asked to
// carry the load and found wanting: exactly the fork AGENTS.md's "every effect composes" rule warns
// against. The gap stays named here so it is not re-discovered from zero next time.
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
import { buildInlinedCss, domToCanvas, rasterStats } from '../raster/raster.js';

const SPECS = new WeakMap();   // el → { r, src, ops, speed, seed, isStatic }
// Layers whose raster has to be BAKED out of the DOM. Filled at build (nothing is measurable then,
// buildLayer appends the element AFTER the primitive builds it), drained once by bakeResamples().
const PENDING = [];

// STACKING: `resample` may be a single fx (string or object, unchanged) or an ARRAY of them, applied
// in order, each pass reading the previous pass's OUTPUT (core/resample/effects.js `drawStack`, the
// purity argument lives there). MAX_STACK is a formula constant, not a quality bar: every extra op is
// one more ping-pong pass at the ~70-80ms/frame a single resample pass already costs (measured on a
// real film, engine-doctrine/EVALS or the commit that added this), so the ceiling is "how many passes
// before one resampled layer dominates the whole frame's render time", not a taste judgement about how
// many looks should compose. 4 is that ceiling at today's per-op cost; raise it if a cheaper pass (a
// lower `count`) makes more of them affordable, not because a film wants a fifth look.
const MAX_STACK = 4;

// Turn `L.resample` (string | object | array of either) into the ops array `drawStack` wants, plus the
// two fields that stay SHARED across the whole stack rather than per-op: `speed`/`seed` are the pass's
// clock, not a look, so a stack has one clock, not one per op. Read off the FIRST entry for back-compat
// with the single-object shape that already spelled them there.
function normalizeResample(L) {
  const raw = L.resample;
  const rawOps = Array.isArray(raw) ? raw : [raw];
  if (rawOps.length > MAX_STACK) {
    throw new Error(`resample: ${rawOps.length} ops stacked, MAX_STACK is ${MAX_STACK}. Each extra op is `
      + `another ping-pong pass on top of the ~70-80ms one resample layer already costs; stack fewer, or `
      + `drop \`count\` on the cheaper ops in the chain.`);
  }
  const ops = rawOps.map((entry) => {
    const spec = typeof entry === 'string' ? { fx: entry } : entry;
    RESAMPLE_REGISTRY.pick(spec.fx);   // the one refusal, owned beside the vocabulary
    return {
      fx: spec.fx, amount: spec.amount ?? 0.5,
      angle: (spec.angle ?? L.angle ?? 0) * Math.PI / 180,
      cx: spec.cx ?? 0.5, cy: spec.cy ?? 0.5, count: spec.count ?? 16,
    };
  });
  const first = (!Array.isArray(raw) && typeof raw === 'object' && raw) || {};
  return { ops, speed: first.speed ?? 1, seed: first.seed ?? L.seed ?? 0 };
}

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
// `angle` only means anything to `directionalBlur`, degrees, 0 = rightward, but it costs nothing to
// declare for every fx: an author writing it on a different fx is a no-op, not a refusal.
export const PROPS = { resample: {}, seed: { when: 'resample' }, angle: { when: 'resample' } };

export function attachResample(kit, el, L) {
  if (!L.resample) return;
  // IDEMPOTENT ON PURPOSE. core/layers/image.js and core/layers/canvas.js attach their own raster
  // inside build(), and core/layers/index.js then calls this for EVERY type so a built subtree gets
  // its bake. The second call has to be a no-op rather than a second resampler (and a second GL
  // context) on the same element.
  if (SPECS.has(el) || PENDING.some((p) => p.el === el)) return;
  const { ops, speed, seed } = normalizeResample(L);
  const src = sourceOf(el);
  if (!src) { PENDING.push({ el, L, ops, speed, seed }); return; }   // no raster of its own → bake the subtree

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

  SPECS.set(el, { r, src: src.node, ops, speed, seed, isStatic: src.isStatic });
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
  for (const { el, L, ops, speed, seed } of queue) await bakeOne(el, L, ops, speed, seed);
}

async function bakeOne(el, L, ops, speed, seed) {
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
    r, src: raster, ops, speed, seed,
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
  const ease = (a) => Array.isArray(a) ? a[0] + (a[1] - a[0]) * (p * p * (3 - 2 * p)) : a; // smoothstep, no linear ramps
  const lt = (t - start) * s.speed;
  const resolved = s.ops.map((op) => ({ ...op, amount: ease(op.amount) }));

  // `once` for a static <img>: the texels never change, so upload on the first draw only. drawStack
  // takes the single-op fast path itself when there is nothing to stack (core/resample/effects.js).
  s.r.drawStack(s.src, resolved, lt, s.seed, s.isStatic);
  // Stamp the DOM so the renderer's static-frame dedup sees a resample-only frame as a change.
  // Without this a slow dissolve over a still image dedups to one frame and the effect vanishes.
  el.dataset.rs = resolved.map((op) => op.amount.toFixed(4)).join(',') + ':' + lt.toFixed(3);
}
