// core/layers/clip.js: a generated/any VIDEO played DETERMINISTICALLY as a preloaded PNG frame
// sequence (scripts/gen-clip.mjs → manifest). No <video>: renderFrame(n) swaps the <img> src.
import { mergeProps, propsOf } from '../registry/props.js';

// The props are read off these signatures (propsOf, core/props.js). No second list to drift from them.
export function build(kit, el, L, { src, w, radius, fit } = L) {
  const man = (kit.clips && kit.clips[src]) || { frames: [], w: 640, h: 360, fps: 30 };
  if (w != null) el.style.width = w + 'px';
  el.style.borderRadius = (radius ?? 0) + 'px'; el.style.overflow = 'hidden';
  el.innerHTML = `<img class="hs-clip-img" style="width:100%;display:block;object-fit:${fit || 'cover'}" src="${man.frames[0] || ''}">`;
}
// The pattern sits AFTER every argument the dispatcher passes, and that position is load-bearing.
// core/layers/index.js calls frame(kit, el, L, t, scene) with five arguments, so a pattern in the
// fifth slot destructures `scene` and every prop reads undefined. lib-test asserts the arity.
export function frame(kit, el, L, t, scene, { src, speed, loop } = L) {
  const start = L.start ?? 0;
  const man = (kit.clips && kit.clips[src]) || { frames: [] };
  const N = man.frames.length;
  if (!N) return;
  // The <img> is written once by build() above and only its `src` ever changes, so finding it again on
  // every one of the 780 frames of a render is a tree walk for an answer that cannot have moved.
  // Memoised on the element rather than taken in build(), because a primitive's frame() can run for an
  // element its own build() never touched: core/layers/util.js `addGroupChild` delegates to buildLeaf
  // when the kit has one and falls back to its own two-line builder when it does not. A memo written
  // only in build() would be permanently absent on that path and the layer would quietly stop
  // advancing, silent substitution, which is the failure this codebase pays for most (MISTAKES #21).
  // `undefined` = not looked yet, `null` = looked and there is none.
  if (el.__clipImg === undefined) el.__clipImg = el.querySelector('img');
  const img = el.__clipImg;
  let fi = Math.floor((t - start) * (man.fps || 30) * (speed ?? 1));
  fi = loop ? ((fi % N) + N) % N : Math.max(0, Math.min(N - 1, fi));
  if (img && img.getAttribute('src') !== man.frames[fi]) img.setAttribute('src', man.frames[fi]);
}

// Both signatures declare, because a prop read only on the frame path is just as real as one read at
// build time. mergeProps unions them (core/props.js).
export const PROPS = mergeProps(propsOf(build), propsOf(frame));

// The catalogue row for this type (engine-doctrine/EFFECTS.md, `make regen`). core/layers/index.js refuses one without it.
export const blurb = "a video played as a preloaded PNG frame sequence: the frame swaps the <img> src, so no decoder state can drift between renders";
