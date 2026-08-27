// core/layers/lottie.js: an After Effects (Bodymovin) animation rendered DETERMINISTICALLY.
// No autoplay, no internal ticker: renderFrame(n) drives it by ABSOLUTE seek (goToAndStop with a
// frame index), so a frame is a pure function of n and order-independent (verified by `make probe`).
// The animationData is preloaded in boot() into kit.lottie[src]; lottie-web is the global window.lottie
// (vendored, SVG-light build). A missing lib or src degrades to an empty box, never a throw.
export const PROPS = { src: {}, w: {}, h: {}, fit: {}, speed: {}, loop: {} };

export function build(kit, el, L) {
  if (L.w != null) el.style.width = L.w + 'px';
  if (L.h != null) el.style.height = L.h + 'px';
  el.style.overflow = 'hidden';
  const data = kit.lottie && kit.lottie[L.src];
  if (!window.lottie || !data) return; // graceful: no runtime / unresolved src → empty layer
  const inst = window.lottie.loadAnimation({
    container: el, renderer: 'svg', loop: false, autoplay: false, animationData: data,
    rendererSettings: { preserveAspectRatio: L.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice' },
  });
  el.__lottie = inst;
  el.__lottieFrames = inst.totalFrames || (data.op - data.ip) || 1;
  el.__lottieFr = data.fr || 30; // author-time frame rate of the animation
}
export function frame(kit, el, L, t) {
  const inst = el.__lottie;
  if (!inst) return;
  const start = L.start ?? 0;
  const N = el.__lottieFrames;
  // map scene time → the animation's OWN frame index. speed retimes; loop wraps, else clamp-and-hold.
  let fi = (t - start) * el.__lottieFr * (L.speed ?? 1);
  fi = L.loop ? ((fi % N) + N) % N : Math.max(0, Math.min(N - 1, fi));
  inst.goToAndStop(fi, true); // true = fi is a FRAME index (absolute) → seek-safe, no delta state
}

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "an After Effects (Bodymovin) export driven by ABSOLUTE seek, goToAndStop at a frame index, never autoplay";
