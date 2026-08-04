// core/sequence.js — the pure timeline evaluators, lifted out of scene.html so they can be
// unit-tested without a browser. Every export is a pure function of time (→ pure in frame n),
// with zero DOM access. Mirrors another engine' packages/engine split (pure (config,t)→value math
// beside the DOM/capture layer, not entangled with it). scene.html imports these and does the
// DOM writes; the math lives here and is asserted by scripts/lib-test.mjs.
import { clamp01, lerp, easeInOutCubic, resolveEasing } from './motion.js';

// cameraAt(camKf, t): global camera keyframes → {s,x,y} (scale + pan), or null when there are none.
// Keyframe times are SECONDS on the absolute timeline. Holds the last frame past the end.
export function cameraAt(camKf, t) {
  if (!camKf || !camKf.length) return null;
  let a = camKf[0], b = camKf[camKf.length - 1];
  for (let i = 0; i < camKf.length - 1; i++) {
    if (t >= camKf[i].t && t <= camKf[i + 1].t) { a = camKf[i]; b = camKf[i + 1]; break; }
    if (t > camKf[i + 1].t) a = b = camKf[i + 1];
  }
  // per-keyframe `ease` drives the segment INTO b (mirrors motionAt). Default easeInOutCubic keeps every
  // existing camera byte-identical; set `ease:"linear"` on interior keyframes for a velocity-CONTINUOUS
  // multi-keyframe push. The old hardcoded ease-in-out zeroed velocity at every keyframe, so a chained
  // push pulsed (accelerate→stop→accelerate) — the "not smooth / shaking zoom" (docs/MISTAKES.md #125).
  const p = a === b ? 1 : resolveEasing(b.ease || 'easeInOutCubic')(clamp01((t - a.t) / (b.t - a.t)));
  // rx/ry are a 3D TILT of the whole stage, and they belong to the camera rather than to a layer for a
  // geometric reason: CSS `perspective()` takes its vanishing point from the element it is applied to,
  // so tilting sibling layers individually rotates each about its OWN centre and the composition comes
  // apart. Applied once on the camera root, every layer shares one vanishing point and the frame reads
  // as a single plane in space — which is what "perspective on the frame" means (docs/MISTAKES.md #59).
  return { s: lerp(a.s ?? 1, b.s ?? 1, p), x: lerp(a.x ?? 0, b.x ?? 0, p), y: lerp(a.y ?? 0, b.y ?? 0, p),
    rx: lerp(a.rx ?? 0, b.rx ?? 0, p), ry: lerp(a.ry ?? 0, b.ry ?? 0, p),
    persp: lerp(a.p ?? 1600, b.p ?? 1600, p) };
}

// motionAt(kfs, lt): per-layer keyframe track → {dx,dy,scale,rot,opacity}. Keyframe times are
// SECONDS from the layer's start; x/y are OFFSETS added onto the layer's base position, and
// scale/rot/opacity are composed onto the enter/cut transform. Per-keyframe `ease` (any named
// easing incl. spring) drives the segment into that keyframe. Holds the endpoints outside range.
// ~4 frames at 30fps. Below this a segment is not a span with a shape, it is one step of a traced path.
export const DENSE_KEY_SEC = 0.14;

// resolveBoxes — give every key on a box-animating track an explicit w/h before anything reads it.
//
// This exists because `w` breaks the contract every other keyed property obeys. For x, an omitted
// property means 0, and 0 is identity: the layer sits where it was authored. There is no such constant
// for a WIDTH. Identity for w is the layer's own authored w, which the pure evaluator has no way to
// know, so an omitted w inside motionAt could only ever mean "hold the neighbour" — a second, different
// rule for one property, in the one file where a second rule has already cost this repo a day
// (docs/MISTAKES.md #195, the per-property motionAt that would have made a button invisible).
//
// So the fill happens HERE, once, with the layer in hand, and motionAt keeps exactly one rule: both
// endpoints state the value, or neither does. A track that mentions no w is untouched and returns null
// for it, which is how a layer opts out of paying for any of this.
export function resolveBoxes(layers) {
  for (const L of layers || []) {
    if (!Array.isArray(L.motion) || !L.motion.length) continue;
    for (const prop of ['w', 'h']) {
      if (!L.motion.some((k) => k[prop] != null)) continue;
      const base = L[prop];
      // A key that animates a box the layer never declared has no size to animate FROM. Filling it with
      // a guess is the silent substitution this repo treats as the worst failure, so it throws.
      if (base == null) throw new Error(`layer "${L.id || L.type || '?'}" keys ${prop} but declares no ${prop}, so there is no box to animate from`);
      for (const k of L.motion) if (k[prop] == null) k[prop] = base;
    }
  }
  return layers;
}

export function motionAt(kfs, lt) {
  const norm = (k) => ({ dx: k.x ?? 0, dy: k.y ?? 0, scale: k.scale ?? 1, rot: k.rot ?? 0, opacity: k.opacity ?? 1, blur: k.blur ?? 0, w: k.w ?? null, h: k.h ?? null });
  if (lt <= kfs[0].t) return norm(kfs[0]);
  const last = kfs[kfs.length - 1];
  if (lt >= last.t) return norm(last);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (lt >= a.t && lt <= b.t) {
      // DENSE KEYS MEAN MECHANICAL, so interpolate them linearly unless told otherwise. easeInOutCubic
      // zeroes velocity at BOTH ends of every segment, so a chain of closely-spaced keys accelerates and
      // stops once per key and the move pulses — the same defect fixed for the camera in #125, left
      // standing as the per-layer default. A hand-keyed cursor or drag lands keys every 2-4 frames and
      // its shape comes from WHERE the keys are, not from a curve fitted over each gap. Above the
      // threshold the old default stands, because a sparse key really is a span with a shape.
      const seg = b.t - a.t;
      const p = a.t === b.t ? 1
        : resolveEasing(b.ease || (seg < DENSE_KEY_SEC ? 'linear' : 'easeInOutCubic'))(clamp01((lt - a.t) / seg));
      // w/h: one rule, no fallback. Both endpoints carry a number (resolveBoxes saw to that) or the
      // track does not animate the box at all and the caller must leave the element's size alone.
      const box = (prop) => (a[prop] == null || b[prop] == null ? null : lerp(a[prop], b[prop], p));
      return { dx: lerp(a.x ?? 0, b.x ?? 0, p), dy: lerp(a.y ?? 0, b.y ?? 0, p),
        scale: lerp(a.scale ?? 1, b.scale ?? 1, p), rot: lerp(a.rot ?? 0, b.rot ?? 0, p),
        opacity: lerp(a.opacity ?? 1, b.opacity ?? 1, p), blur: lerp(a.blur ?? 0, b.blur ?? 0, p),
        w: box('w'), h: box('h') };
    }
  }
  return norm(last);
}
