// core/layers/lottie.js: an After Effects (Bodymovin) animation rendered DETERMINISTICALLY.
// No autoplay, no internal ticker: renderFrame(n) drives it by ABSOLUTE seek (goToAndStop with a
// frame index), so a frame is a pure function of n and order-independent (verified by `make probe`).
// The animationData is preloaded in boot() into kit.lottie[src]; lottie-web is the global window.lottie
// (vendored, SVG-light build). A missing lib or src degrades to an empty box, never a throw.
import { mergeProps, propsOf } from '../props.js';

// The props are read off these signatures (propsOf, core/props.js). No second list to drift from them.
export function build(kit, el, L, { src, w, h, fit } = L) {
  if (w != null) el.style.width = w + 'px';
  if (h != null) el.style.height = h + 'px';
  el.style.overflow = 'hidden';
  const data = kit.lottie && kit.lottie[src];
  if (!window.lottie || !data) return; // graceful: no runtime / unresolved src → empty layer
  const inst = window.lottie.loadAnimation({
    container: el, renderer: 'svg', loop: false, autoplay: false, animationData: data,
    rendererSettings: { preserveAspectRatio: fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice' },
  });
  el.__lottie = inst;
  el.__lottieFrames = inst.totalFrames || (data.op - data.ip) || 1;
  el.__lottieFr = data.fr || 30; // author-time frame rate of the animation
}
// The pattern sits AFTER every argument the dispatcher passes, and that position is load-bearing.
// core/layers/index.js calls frame(kit, el, L, t, scene) with five arguments, so a pattern in the
// fifth slot destructures `scene` and every prop reads undefined. lib-test asserts the arity.
export function frame(kit, el, L, t, scene, { speed, loop } = L) {
  const inst = el.__lottie;
  if (!inst) return;
  const start = L.start ?? 0;
  const N = el.__lottieFrames;
  // map scene time → the animation's OWN frame index. speed retimes; loop wraps, else clamp-and-hold.
  let fi = (t - start) * el.__lottieFr * (speed ?? 1);
  fi = loop ? ((fi % N) + N) % N : Math.max(0, Math.min(N - 1, fi));
  inst.goToAndStop(fi, true); // true = fi is a FRAME index (absolute) → seek-safe, no delta state
}

// Both signatures declare, because a prop read only on the frame path is just as real as one read at
// build time. mergeProps unions them (core/props.js).
export const PROPS = mergeProps(propsOf(build), propsOf(frame));

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "an After Effects (Bodymovin) export driven by ABSOLUTE seek, goToAndStop at a frame index, never autoplay";
