// core/layers/video.js — a <video> layer: real footage with in/out points, SEEKED per frame, never played.
//
// THE WHOLE DESIGN IS THE SEEK. A played video advances on wall-clock time, so frame 400 would hold
// whatever the decoder reached, which differs between the six capture workers and between two renders of
// the same file. `renderFrame(n)` must be a function of `n` alone (docs/MISTAKES.md #370), so this layer
// never calls play(): it computes a source time from the scene clock and seeks there. The picture is then
// as deterministic as a still image, and `make probe` can hold it to the same standard as everything else.
//
// The seek is asynchronous, which the engine had no way to express until now. core/frame-settle.js is the
// barrier the capture drains before it shoots; this layer is its first caller.
import { mergeProps } from '../props.js';
import { settleOn } from '../frame-settle.js';

// `in`/`out` are points in the SOURCE, `rate` is how fast the source runs against the scene clock, and
// they only mean anything together: out<=in is an empty cut and is refused rather than rendered as a
// still. `fit` and `radius` follow the image layer's vocabulary so a footage layer and a still layer are
// placed the same way.
export const PROPS = mergeProps({
  src: {}, w: {}, h: {}, radius: {}, fit: {}, poster: {},
  in: {}, out: {}, rate: {},
}, {});

// The source time this layer shows at scene time `t`. Pure, exported, and unit-tested without a DOM for
// the same reason core/layers/glow.js exports presetSpec: the arithmetic is the contract.
// Clamped at both ends ON PURPOSE. Running past `out` holds the last frame rather than showing whatever
// follows it in the file, because a layer whose window outlives its footage is an authoring mistake and
// freezing is the readable failure. Silence would be showing unrelated footage.
export function sourceTime(L, t) {
  const start = L.start ?? 0;
  const from = L.in ?? 0;
  const rate = L.rate ?? 1;
  const to = L.out != null ? L.out : Infinity;
  const raw = from + Math.max(0, t - start) * rate;
  return Math.min(Math.max(raw, from), to);
}

export function build(kit, el, L) {
  if (!L.src) throw new Error('video layer: `src` is required (a path under assets/, e.g. assets/video/clip.mp4)');
  if (L.out != null && L.out <= (L.in ?? 0))
    throw new Error(`video layer: out (${L.out}) must be greater than in (${L.in ?? 0}) — an empty cut cannot be rendered`);
  const v = document.createElement('video');
  v.className = 'hs-video';
  // ROOT-RELATIVE, ALWAYS. The page is served from /formats/scene/, so a bare `assets/clip.mp4`
  // resolves to /formats/scene/assets/clip.mp4 and 404s — and a <video> that cannot load its source
  // fires no error the frame pass can see, so the layer renders as an empty box and the film looks
  // like the layer was never written. Both spellings mean the same file and the assets preflight
  // already checks the repo-relative one, so the resolver belongs here rather than in the author's
  // JSON. Silence is the worst failure (docs/MISTAKES.md #383).
  v.src = /^(https?:)?\/\//.test(L.src) || L.src.startsWith('/') ? L.src : '/' + L.src.replace(/^\.\//, '');
  if (L.poster) v.poster = L.poster;
  // muted + playsInline + no autoplay + no controls: this element is a decoder we scrub, not a player.
  // The AUDIO of a clip is not taken from here; the mixer owns sound (core/audio*.js), because the film's
  // track has to survive an encode that this element is not part of.
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.controls = false; v.preload = 'auto';
  el.appendChild(v);
  if (L.w) { el.style.width = L.w + 'px'; v.style.width = '100%'; }
  if (L.h) { el.style.height = L.h + 'px'; v.style.height = '100%'; }
  if (L.radius != null || L.w || L.h) {
    el.style.overflow = 'hidden';
    if (L.radius != null) el.style.borderRadius = L.radius + 'px';
  }
  // cover only when there is a box to cover, the same guard image.js needs: with one axis declared,
  // `height:100%` has nothing to resolve against and the element collapses to zero.
  if (L.w && L.h) v.style.objectFit = L.fit || 'cover';
  el.__video = v;
}

export function frame(kit, el, L, t) {
  const v = el.__video || (el.__video = el.querySelector('video'));
  if (!v) return;
  const want = sourceTime(L, t);
  // Only seek when the target actually moved. A redundant seek still costs a decode, and at 30fps over a
  // held beat that is hundreds of them for one unchanging picture.
  // Half a frame at 60fps is the tolerance: tighter than any source this engine can show, loose enough
  // that floating-point drift on `t` does not trigger a seek per frame.
  if (Math.abs(v.currentTime - want) < 1 / 120) return;
  v.currentTime = want;
  settleOn(new Promise((res, rej) => {
    let done = false;
    const ok = () => { if (!done) { done = true; cleanup(); res(); } };
    const bad = () => { if (!done) { done = true; cleanup(); rej(new Error(`video: seek to ${want.toFixed(3)}s failed for ${L.src}`)); } };
    const cleanup = () => { v.removeEventListener('seeked', ok); v.removeEventListener('error', bad); clearTimeout(timer); };
    // A TIMEOUT, not a hang. A seek past the end of a truncated file never fires `seeked`, and a render
    // that stops forever on one bad asset is worse than one that reports a bad frame: the capture would
    // sit on frame 400 of 450 with no output and no reason. 2s is far past any real seek.
    const timer = setTimeout(ok, 2000);
    v.addEventListener('seeked', ok, { once: true });
    v.addEventListener('error', bad, { once: true });
  }));
}
