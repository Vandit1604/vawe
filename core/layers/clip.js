// core/layers/clip.js — a generated/any VIDEO played DETERMINISTICALLY as a preloaded PNG frame
// sequence (scripts/gen-clip.mjs → manifest). No <video>: renderFrame(n) swaps the <img> src.
export const PROPS = { src: {}, w: {}, radius: {}, fit: {}, speed: {}, loop: {} };

export function build(kit, el, L) {
  const man = (kit.clips && kit.clips[L.src]) || { frames: [], w: 640, h: 360, fps: 30 };
  if (L.w != null) el.style.width = L.w + 'px';
  el.style.borderRadius = (L.radius ?? 0) + 'px'; el.style.overflow = 'hidden';
  el.innerHTML = `<img class="hs-clip-img" style="width:100%;display:block;object-fit:${L.fit || 'cover'}" src="${man.frames[0] || ''}">`;
}
export function frame(kit, el, L, t) {
  const start = L.start ?? 0;
  const man = (kit.clips && kit.clips[L.src]) || { frames: [] };
  const N = man.frames.length;
  if (!N) return;
  const img = el.querySelector('img');
  let fi = Math.floor((t - start) * (man.fps || 30) * (L.speed ?? 1));
  fi = L.loop ? ((fi % N) + N) % N : Math.max(0, Math.min(N - 1, fi));
  if (img && img.getAttribute('src') !== man.frames[fi]) img.setAttribute('src', man.frames[fi]);
}
