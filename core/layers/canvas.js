// core/layers/canvas.js — the ONE primitive behind every layer type whose output is a canvas:
// `paint` (Canvas 2D), `shader` (ambient WebGL), `raymarch` (distance fields) and `three` (three.js).
// Each was its own file repeating this procedure, and each said so in its header. The pixels are the
// only part that differed, and they now live in core/surfaces/, one file per backend.
//
// `canvasLayer(name)` binds a surface at MODULE LOAD and returns the { build, frame } pair a layer
// type is. core/layers/index.js registers four of them under their four author-facing names, so the
// scene vocabulary is unchanged: there is no `canvas` type and no `surface` prop in scene JSON.
import { pick } from '../surfaces/index.js';
import { attachResample, tickResample, PROPS as RESAMPLE_PROPS } from '../resample.js';
import { mergeProps } from '../props.js';

// The props the SHARED canvas procedure reads, whichever surface is behind it: the box, the corner, the
// local clock's rate, and the resampler it may attach. The surface's own pixels vocabulary is merged in
// below, so a `paint` layer and a `three` layer declare different sets under one primitive.
const CANVAS_PROPS = { w: {}, h: {}, radius: {}, speed: {} };

export function canvasLayer(name) {
  const S = pick(name);

  return {
    PROPS: mergeProps(CANVAS_PROPS, S.PROPS, RESAMPLE_PROPS),
    build(kit, el, L) {
      S.validate(L);
      // The layer box, or the surface's own default when the author gave none: an ambient field
      // defaults to the whole frame, a subject to a square you place.
      const [dw, dh] = S.size(kit);
      const w = Math.round(L.w ?? dw), h = Math.round(L.h ?? dh);
      const s = S.create(kit, L, w, h);
      s.canvas.style.cssText = `display:block;width:${w}px;height:${h}px;border-radius:${L.radius ?? 0}px`;
      if (L.radius) el.style.overflow = 'hidden';
      el.appendChild(s.canvas);
      el.__surface = s;
      // `resample` on a surface that cannot be sampled was accepted and then ignored — the bug class
      // logged most in this repo — because raymarch and three simply never called attachResample and
      // nothing noticed. It is a refusal now, and core/resample.js refuses the non-raster types the
      // same way.
      if (L.resample && !S.resamplable) {
        throw new Error(`resample cannot sample a "${name}" layer — it owns its own WebGL context. `
          + `Sampleable canvas layers: paint, shader (and any image layer).`);
      }
      if (S.resamplable) attachResample(kit, el, L);
    },

    // Draw from LOCAL time, so the surface loops on its own clock and stays pure in t.
    frame(kit, el, L, t) {
      const s = el.__surface; if (!s) return;
      const start = L.start ?? 0, end = start + (L.duration ?? 2);
      // OFF-WINDOW MUST CLEAR. Returning early leaves the last frame's pixels in the canvas, so the
      // element's contents depend on which frames were rendered before it — and frames render across
      // 8 workers in arbitrary order. driveClips hides the layer at opacity 0, which is exactly why
      // it would never be noticed: it is impurity waiting for the day a canvas layer is given a
      // non-zero resting opacity, or for sceneUnits to extend its visible window. MISTAKES #41, #64.
      if (!(t >= start && t < end)) { s.clear(); if (S.resamplable) tickResample(el, L, t, false); return; }
      const lt = (t - start) * (L.speed ?? 1);
      s.draw(lt, L);
      // LOAD-BEARING. A canvas-only frame changes no attribute and no computed style, so without a
      // stamp the renderer's static-frame dedup reuses a neighbouring frame and the motion silently
      // drops out of a shader-only or paint-only stretch. The precision is the surface's, because
      // the stamp only has to CHANGE, and `shader` has always written two decimals where the others
      // write three.
      el.dataset.st = lt.toFixed(S.stamp);
      if (S.resamplable) tickResample(el, L, t, true);   // AFTER the draw: sample this frame's pixels, never last frame's
    },
  };
}
