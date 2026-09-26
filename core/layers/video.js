// core/layers/video.js. A <video> layer: real footage with in/out points, SEEKED per frame, never played.
//
// THE WHOLE DESIGN IS THE SEEK. A played video advances on wall-clock time, so frame 400 would hold
// whatever the decoder reached, which differs between the six capture workers and between two renders of
// the same file. `renderFrame(n)` must be a function of `n` alone (engine-doctrine/MISTAKES.md #370), so this layer
// never calls play(): it computes a source time from the scene clock and seeks there. The picture is then
// as deterministic as a still image, and `make check GATE=probe` can hold it to the same standard as everything else.
//
// The seek is asynchronous, which the engine had no way to express until now. core/frame-settle.js is the
// barrier the capture drains before it shoots; this layer is its first caller.
import { mergeProps, propsOf } from '../registry/props.js';
import { settleOn } from './frame-settle.js';
import { srcUrl } from '../engine/src-url.js';

// `in`/`out` are points in the SOURCE, `rate` is how fast the source runs against the scene clock, and
// they only mean anything together: out<=in is an empty cut and is refused rather than rendered as a
// still. `fit` and `radius` follow the image layer's vocabulary so a footage layer and a still layer are
// placed the same way. The props are read off build()'s and sourceTime()'s own signatures (propsOf,
// core/props.js), not typed a second time here.

// The source time this layer shows at scene time `t`. Pure, exported, and unit-tested without a DOM for
// the same reason core/layers/glow.js exports presetSpec: the arithmetic is the contract.
// Clamped at both ends ON PURPOSE. Running past `out` holds the last frame rather than showing whatever
// follows it in the file, because a layer whose window outlives its footage is an authoring mistake and
// freezing is the readable failure. Silence would be showing unrelated footage.
// `start` is shared vocabulary (declared centrally, core/layers/vocabulary.js) so it stays `L.start`
// rather than joining this pattern; `in`/`rate`/`out` are this layer's own and read here.
export function sourceTime(L, t, { in: from, rate, out } = L) {
  // `contentStart` (a group child only, core/layers/util.js) is the CONTENT clock: when the source
  // clip's own zero should read against the scene clock. Falls back to `L.start`, the visibility
  // start, so a layer with no `contentStart` seeks exactly as it always has.
  const start = L.contentStart ?? L.start ?? 0;
  const f = from ?? 0;
  const to = out != null ? out : Infinity;
  const raw = f + Math.max(0, t - start) * (rate ?? 1);
  return Math.min(Math.max(raw, f), to);
}

// `audio: true | { gain, duck }` (default absent = silent, byte-identical to every film authored
// before this prop existed) tells the harness/media/clip-audio.mjs pre-pass to pull this clip's OWN
// sound into the mix: it never reaches the browser, because this element stays muted below and the
// mixer (renderer/internal/audio) is the only thing that writes the encoded audio track.
function validateVideoProps(src, inPoint, out, audio) {
  if (!src) throw new Error('video layer: `src` is required (a path under assets/, e.g. assets/video/clip.mp4)');
  if (out != null && out <= (inPoint ?? 0))
    throw new Error(`video layer: out (${out}) must be greater than in (${inPoint ?? 0}), an empty cut cannot be rendered`);
  if (audio != null && audio !== true && (typeof audio !== 'object' || Array.isArray(audio)))
    throw new Error(`video layer: \`audio\` must be true or {gain, duck}, got ${JSON.stringify(audio)}`);
}

// ROOT-RELATIVE, ALWAYS. The page is served from /films/scene/, so a bare `assets/clip.mp4` resolves
// to /films/scene/assets/clip.mp4 and 404s, and a <video> that cannot load its source fires no error
// the frame pass can see (engine-doctrine/MISTAKES.md #383).
function createVideoElement(src, poster) {
  const v = document.createElement('video');
  v.className = 'hs-video';
  v.src = srcUrl(src);
  if (poster) v.poster = poster;
  // muted + playsInline + no autoplay + no controls: this element is a decoder we scrub, not a player.
  // The AUDIO of a clip is not taken from here; the mixer owns sound (core/audio*.js).
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.controls = false; v.preload = 'auto';
  return v;
}

function applyVideoBox(el, v, { w, h, radius, fit }) {
  if (w) { el.style.width = w + 'px'; v.style.width = '100%'; }
  if (h) { el.style.height = h + 'px'; v.style.height = '100%'; }
  if (radius != null || w || h) {
    el.style.overflow = 'hidden';
    if (radius != null) el.style.borderRadius = radius + 'px';
  }
  // cover only when there is a box to cover, the same guard image.js needs.
  if (w && h) v.style.objectFit = fit || 'cover';
}

export function build(kit, el, L, { src, w, h, radius, fit, poster, in: inPoint, out, audio } = L) {
  validateVideoProps(src, inPoint, out, audio);
  const v = createVideoElement(src, poster);
  el.appendChild(v);
  applyVideoBox(el, v, { w, h, radius, fit });
  // `border`/`shadow`/`elevation`/`glow` are the ONE shared box treatment every other layer already
  // has: a no-op guard-return when none of those props is set.
  kit.chipBox(el, L);
  el.__video = v;
}

export const PROPS = mergeProps(propsOf(build), propsOf(sourceTime));

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

// The catalogue row for this type (engine-doctrine/EFFECTS.md, `make regen`). core/layers/index.js refuses one without it.
export const blurb = "real footage, SEEKED to a computed source time every frame and never played, so the picture is as deterministic as a still";
