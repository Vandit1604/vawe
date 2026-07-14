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
  const p = a === b ? 1 : easeInOutCubic(clamp01((t - a.t) / (b.t - a.t)));
  return { s: lerp(a.s ?? 1, b.s ?? 1, p), x: lerp(a.x ?? 0, b.x ?? 0, p), y: lerp(a.y ?? 0, b.y ?? 0, p) };
}

// motionAt(kfs, lt): per-layer keyframe track → {dx,dy,scale,rot,opacity}. Keyframe times are
// SECONDS from the layer's start; x/y are OFFSETS added onto the layer's base position, and
// scale/rot/opacity are composed onto the enter/cut transform. Per-keyframe `ease` (any named
// easing incl. spring) drives the segment into that keyframe. Holds the endpoints outside range.
export function motionAt(kfs, lt) {
  const norm = (k) => ({ dx: k.x ?? 0, dy: k.y ?? 0, scale: k.scale ?? 1, rot: k.rot ?? 0, opacity: k.opacity ?? 1, blur: k.blur ?? 0 });
  if (lt <= kfs[0].t) return norm(kfs[0]);
  const last = kfs[kfs.length - 1];
  if (lt >= last.t) return norm(last);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (lt >= a.t && lt <= b.t) {
      const p = a.t === b.t ? 1 : resolveEasing(b.ease || 'easeInOutCubic')(clamp01((lt - a.t) / (b.t - a.t)));
      return { dx: lerp(a.x ?? 0, b.x ?? 0, p), dy: lerp(a.y ?? 0, b.y ?? 0, p),
        scale: lerp(a.scale ?? 1, b.scale ?? 1, p), rot: lerp(a.rot ?? 0, b.rot ?? 0, p),
        opacity: lerp(a.opacity ?? 1, b.opacity ?? 1, p), blur: lerp(a.blur ?? 0, b.blur ?? 0, p) };
    }
  }
  return norm(last);
}
