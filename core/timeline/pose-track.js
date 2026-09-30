// core/timeline/pose-track.js: the per-layer keyframe track evaluator (motionAt) and the segment
// interpolator it and the camera share (segmentAt). Pure math over core/motion/motion.js, no DOM, no
// registry, so a bare HTML page (core/engine/page-api.js, core/surfaces/three-fx.js) can sample a
// keyframe track without loading the JSON engine. core/timeline/sequence.js re-exports every name here.
import { clamp01, lerp, resolveEasing, handleCurve, isEaseMap } from '../motion/motion.js';

// motionAt(kfs, lt): per-layer keyframe track → {dx,dy,scale,rot,opacity}. Keyframe times are
// SECONDS from the layer's start; x/y are OFFSETS added onto the layer's base position, and
// scale/rot/opacity are composed onto the enter/cut transform. Per-keyframe `ease` (any named
// easing incl. spring) drives the segment into that keyframe. Holds the endpoints outside range.
// ~4 frames at 30fps. Below this a segment is not a span with a shape, it is one step of a traced path.
export const DENSE_KEY_SEC = 0.14;

// What a keyframe carries, and the table the pose is built from, so the two cannot disagree: `POSE`
// maps the authored name to its pose key and identity, `norm` is generated from it, `SIDES` is spread
// in rather than retyped.
//
//   authored          pose key    identity when the key omits it
export const POSE = { x: ['dx', 0], y: ['dy', 0], scale: ['scale', 1], rot: ['rot', 0],
  opacity: ['opacity', 1], blur: ['blur', 0], w: ['w', null], h: ['h', null], track: ['track', null],
  // `radius` is a style write like `w`/`h`, not a transform, so identity is null. Not in LAYER_OWNED:
  // a track that keys it states both endpoints explicitly, so an omitted `radius` leaves the layer's
  // authored corner untouched.
  radius: ['radius', null],
  // The anchor point, keyed: `origin` is a static CSS transform-origin written once at build
  // (core/layers/util.js applyOrigin), so a travelling pivot (AE's keyed anchor point) needs its own
  // channel. `ox`/`oy` are percentages of the layer's own box (not the CSS string, to avoid parsing a
  // keyword-or-length-or-percentage grammar per frame); identity null leaves `origin` as authored.
  ox: ['ox', null], oy: ['oy', null],
  // Depth and out-of-plane rotation, keyed: `z`/`rotX`/`rotY` give a layer what the camera already has.
  // Identity 0, not null, like `x`/`y`/`rot`: these describe a place in space, and a layer with no
  // declared depth still has one (zero). Not a second `plane`/`tilt`: those are static per-layer
  // modifiers resolved once at build into a different CSS longhand (core/fx/plane.js, core/fx/tilt.js),
  // so keying depth and giving a static one cannot collide.
  z: ['z', 0], rotX: ['rotX', 0], rotY: ['rotY', 0],
  // AE Trim Paths, keyed: fractions of an SVG path (core/tracks/trim.js). Identity null, like
  // `radius`/`ox`/`oy`: a segment omitted from one endpoint of a motion key means "not keyed here",
  // and the track falls back to the layer's own static `trim.start`/`.end`/`.offset` (or 0/1/0)
  // rather than reading a number this keyframe never wrote.
  trimStart: ['trimStart', null], trimEnd: ['trimEnd', null], trimOffset: ['trimOffset', null] };

// Velocity that survives a keyframe: every per-segment easing zeroes velocity at both ends of its own
// segment, so an interior keyframe is a full stop by construction (measured, px/s either side of an
// interior key: default easeInOutCubic 1418/168/8/2/16/336/2836, linear jumps instead of stopping,
// easeOutQuint stops then jerks).
//
// `ease: "through"` computes the tangent at each key from its neighbours instead of fitting a curve
// inside one gap (AE's speed graph), so the velocity entering a key equals the velocity leaving it.
// Named `through`, not `smooth`: `smooth` is already a live feel word in core/motion.js and would
// silently shadow it.
//
// A cubic Hermite with finite-difference tangents, non-uniform in t (a uniform Catmull-Rom would
// overshoot wherever keys are not evenly spaced). Tangent at key i is (P[i+1]-P[i-1])/(t[i+1]-t[i-1]).
// First and last tangents are zero, so a move still eases in and out of rest.
const hermite = (p0, p1, m0, m1, h, u) => {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * m0
       + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * h * m1;
};

/**
 * The finite-difference tangent of `prop` at key `i`, in units per second. Zero at either end.
 * Fritsch-Carlson clamped: without it a camera `travel` with an s:1.08 -> s:1 -> s:1 tail dipped below
 * every authored station's scale between two equal keys, because the raw chordal
 * tangent carried velocity in from the unequal segment behind it. Zeroed at a local extremum, else
 * scaled so the Hermite curve on neither neighbouring segment can leave that segment's own [min, max].
 */
function tangentAt(kfs, i, prop, dflt) {
  if (i <= 0 || i >= kfs.length - 1) return 0;
  const p0 = kfs[i - 1][prop] ?? dflt, p1 = kfs[i][prop] ?? dflt, p2 = kfs[i + 1][prop] ?? dflt;
  const h0 = kfs[i].t - kfs[i - 1].t, h1 = kfs[i + 1].t - kfs[i].t;
  if (!(h0 > 0) || !(h1 > 0)) return 0;
  const d0 = (p1 - p0) / h0, d1 = (p2 - p1) / h1;
  if (d0 === 0 || d1 === 0 || (d0 < 0) !== (d1 < 0)) return 0; // local extremum: no overshoot allowed
  const m = (p2 - p0) / (h0 + h1); // the chordal estimate this function always used, now only clamped
  const alpha = m / d0, beta = m / d1;
  const s = alpha * alpha + beta * beta;
  return s > 9 ? (3 / Math.sqrt(s)) * m : m;
}

// segmentAt(kfs, i, t, dfltEase): the interpolator for the segment kfs[i] -> kfs[i+1] at time t,
// returned as `(prop, dflt) => value` so a caller reads only the properties it owns. Past the last key
// there is no segment and the last key holds.
//
// One function, shared by cameraAt and motionAt: they had drifted before (`ease: "through"` worked on
// a layer but threw on a camera key), so only the DEFAULT differs now, deliberately (motionAt has
// DENSE_KEY_SEC, the camera does not).
export function segmentAt(kfs, i, t, dfltEase) {
  const a = kfs[i], b = kfs[i + 1] || a;
  const seg = b.t - a.t;
  // `through` reads the keys either side, so it is dispatched before resolveEasing ever sees it
  // (which still refuses every other unknown name).
  if (b.ease === 'through' && seg > 0) {
    const u = clamp01((t - a.t) / seg);
    return (prop, dflt) => hermite(a[prop] ?? dflt, b[prop] ?? dflt,
      tangentAt(kfs, i, prop, dflt), tangentAt(kfs, i + 1, prop, dflt), seg, u);
  }
  // Per-key, per-side handles beat the named default when either side authors one (core/motion.js
  // handleCurve). A handle beside a named `ease` on the same segment is refused at boot by
  // keyHandleErrors below, so this never has to decide which of two authored curves wins.
  const drawn = handleCurve(a.easeOut, b.easeIn);
  // `ease` as a MAP (Separate Dimensions, core/motion.js isEaseMap) is not a name, so it never goes
  // through resolveEasing for the WHOLE segment; it only overrides individual properties below, and
  // every property neither map names falls through to `p`, exactly as before the map existed.
  const p = !(seg > 0) ? 1
    : (drawn || resolveEasing(isEaseMap(b.ease) ? null : (b.ease || dfltEase)))(clamp01((t - a.t) / seg));
  if (!isEaseMap(a.ease) && !isEaseMap(b.ease)) return (prop, dflt) => lerp(a[prop] ?? dflt, b[prop] ?? dflt, p);
  const u = clamp01((t - a.t) / seg);
  return (prop, dflt) => {
    const curve = propEaseCurve(a.ease, b.ease, prop);
    return lerp(a[prop] ?? dflt, b[prop] ?? dflt, curve ? curve(u) : p);
  };
}

// propEaseCurve(aEase, bEase, prop): the curve ONE property uses across a segment when either
// endpoint's `ease` is a per-property map, or null when neither map names this property (the segment
// falls back to its ordinary shape). `bEase[prop]` is a NAME (a whole curve for this property alone,
// exactly like a whole-segment `ease`) or a handle pair `{easeIn, easeOut}`; `aEase[prop].easeOut` is
// that property's own leaving handle, symmetric with the whole-segment `easeOut` on the leaving key
// (and, symmetrically, `bEase[prop].easeOut` becomes the leaving handle of the NEXT segment).
function propEaseCurve(aEase, bEase, prop) {
  const av = isEaseMap(aEase) ? aEase[prop] : undefined;
  const bv = isEaseMap(bEase) ? bEase[prop] : undefined;
  if (av == null && bv == null) return null;
  if (typeof bv === 'string' || typeof bv === 'function') return resolveEasing(bv);
  const outH = av && typeof av === 'object' ? av.easeOut : undefined;
  const inH = bv && typeof bv === 'object' ? bv.easeIn : undefined;
  return handleCurve(outH, inH) || null;
}

// `motionDelay` shifts the time at which one property is sampled off the same track (follow-through:
// scale finishes after position, rotation settles a beat later). Measured before it was built: 138 of
// 283 motion tracks in the library key position and scale/rot/opacity together, so the case is common.
//
// Adds no second interpretation rule: the track is read exactly as before, only the
// clock differs per property, and a shifted pure function is still pure.
//
// Spelled like `varsDelay` deliberately: core/tracks/vars.js already solved per-channel timing for CSS
// variables (#357), a scalar or a map with `'*'` as default. Not `lag`: core/fx/lag.js makes one layer
// trail another with an overrun, a different scope of the same principle.
const DELAYABLE = Object.entries(POSE).filter(([p]) => p !== 'track').map(([p, [out]]) => [out, p]);
const delayOf = (d, prop) => (d && typeof d === 'object' && !Array.isArray(d) ? (d[prop] ?? d['*'] ?? 0) : (d ?? 0));

export function motionAt(kfs, lt, motionDelay) {
  const pose = poseAt(kfs, lt);
  if (!motionDelay) return pose;
  for (const [out, prop] of DELAYABLE) {
    const d = delayOf(motionDelay, prop);
    // A layer-owned prop the track never keys comes back null and must STAY null: sampling it earlier
    // would hand the caller a number for a property the author never animated.
    if (d && pose[out] !== null) pose[out] = poseAt(kfs, lt - d)[out];
  }
  return pose;
}

function poseAt(kfs, lt) {
  const norm = (k) => Object.fromEntries(Object.entries(POSE).map(([p, [out, id]]) => [out, k[p] ?? id]));
  if (lt <= kfs[0].t) return norm(kfs[0]);
  const last = kfs[kfs.length - 1];
  if (lt >= last.t) return norm(last);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (lt >= a.t && lt <= b.t) {
      // Dense keys mean mechanical: interpolate linearly unless told otherwise, since easeInOutCubic
      // zeroes velocity at both ends of every segment and a chain of closely-spaced keys pulses
      // (same defect fixed for the camera in #125). A hand-keyed cursor lands keys every 2-4 frames
      // and its shape comes from WHERE the keys are, not a curve fitted over each gap.
      const at = segmentAt(kfs, i, lt, (b.t - a.t) < DENSE_KEY_SEC ? 'linear' : 'easeInOutCubic');
      // Layer-owned props: one rule, no fallback. Both endpoints carry a number or the track does not
      // animate that property.
      const own = (prop) => (a[prop] == null || b[prop] == null ? null : at(prop, 0));
      // Generated from `POSE`, like `norm` above: a null identity means the property is layer-owned
      // and needs both endpoints.
      return Object.fromEntries(Object.entries(POSE).map(([p, [out, id]]) =>
        [out, id === null ? own(p) : at(p, id)]));
    }
  }
  return norm(last);
}
