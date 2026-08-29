// core/sequence.js: the pure timeline evaluators, lifted out of scene.html so they can be
// unit-tested without a browser. Every export is a pure function of time (→ pure in frame n),
// with zero DOM access. Mirrors another engine' packages/engine split (pure (config,t)→value math
// beside the DOM/capture layer, not entangled with it). scene.html imports these and does the
// DOM writes; the math lives here and is asserted by scripts/lib-test.mjs.
import { clamp01, lerp, easeInOutCubic, resolveEasing } from './motion.js';

// THE CAMERA IS A POSITION IN SPACE, and `s` is where it stands.
//
// Under a lens of focal length L, a camera at distance d from the canvas plane magnifies that plane by
// L/d. So a magnification and a distance are the same number in two units, and `s`, which this engine
// has always called a scale, was never a second idea beside depth. It was depth, written in the unit an
// author frames in, and implemented as a 2D scale of an already-projected picture. That implementation
// is what could not dolly: scaling a finished projection leaves every vanishing point exactly where it
// was, so a tilted card grew without ever turning.
//
// dollyZ is the whole conversion: the CSS translateZ that puts the camera at the distance `s` asks for.
// There is deliberately NO `z` keyframe key. A `z` beside `s` would be two knobs for one idea that
// disagree with each other under perspective. The failure core/fx/index.js describes for layer types
// wearing five costumes, reproduced in the camera.
export function dollyZ(s, lens) {
  // s → 0 puts the camera infinitely far away and s ≥ ... well past the plane inverts the projection.
  // CSS accepts the resulting translateZ without a word and renders something no author asked for.
  if (!(s > 0)) throw new Error(`camera: s must be a POSITIVE magnification, got ${JSON.stringify(s)}. `
    + `s is where the camera STANDS (distance = lens / s), so 0 is a camera at infinite distance.`);
  return lens * (1 - 1 / s);
}

// cameraAt(camKf, t): global camera keyframes → the camera's state at t, or null when there are none.
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
  // push pulsed (accelerate→stop→accelerate). The "not smooth / shaking zoom" (docs/MISTAKES.md #125).
  const p = a === b ? 1 : resolveEasing(b.ease || 'easeInOutCubic')(clamp01((t - a.t) / (b.t - a.t)));
  // rx/ry/roll are the camera's ORIENTATION and they belong to the camera rather than to a layer for a
  // geometric reason: CSS `perspective()` takes its vanishing point from the element it is applied to,
  // so tilting sibling layers individually rotates each about its OWN centre and the composition comes
  // apart. Applied once on the camera root, every layer shares one vanishing point and the frame reads
  // as a single plane in space, which is what "perspective on the frame" means (docs/MISTAKES.md #59).
  // `persp` is the LENS: the focal distance the projection is taken through, not the camera's position.
  // Position is `s` (see dollyZ); confusing the two is the dolly-zoom, and it is authored by keying both.
  return { s: lerp(a.s ?? 1, b.s ?? 1, p), x: lerp(a.x ?? 0, b.x ?? 0, p), y: lerp(a.y ?? 0, b.y ?? 0, p),
    rx: lerp(a.rx ?? 0, b.rx ?? 0, p), ry: lerp(a.ry ?? 0, b.ry ?? 0, p),
    roll: lerp(a.roll ?? 0, b.roll ?? 0, p),
    persp: lerp(a.p ?? 1600, b.p ?? 1600, p) };
}

// cameraView(camKf, t, CW, CH): the stage-space rectangle the camera is LOOKING AT, or null when there
// is no axis-aligned answer. Every static gate measures a layer against the canvas box at the origin,
// which is where the camera stands on frame 0 and nowhere else. A film that uses the camera as its edit
// lays its content out across a canvas far larger than the frame and travels between stations:
// formats/scene/linear-journey.json puts five stations across 5760x2160 and declares ZERO cuts, and every
// gate read it against 1920x1080 at the origin. canvasShare scored a station at x:2180 that FILLS the
// screen as share 0, and critique's scattered-beat added four stations the eye never sees at once into one
// count and called two beats crammed. Both findings were false, and the cause was the same missing answer.
//
// The map is INVERTED from the flat camera transform, not guessed at: #cam is `inset: 0` with
// `transform-origin: 50% 50%` (formats/scene/scene.css:15) and drawCameraAndCut writes
// `scale(s) translate(x, y)` (formats/scene/scene.js:888). A CSS function list applies to points right to
// left, so a stage point p lands on screen at C + s * (p + T - C), with C the canvas centre and T = (x, y).
// Solving that for p at the two screen corners gives a view starting at C - C/s - T and sized CW/s by CH/s.
//
// It answers for the CAMERA, and the camera is not the only thing that can rotate the stage: a top-level
// `tilt` or `plane` modifier builds the same 3D rig with no camera angle at all (formats/scene/scene.js:705,
// and formats/scene/playhead.json is a shipped film that does exactly that). Layers are not visible from
// here, so THE CALLER must refuse that case as well. This returns a rect for it, and the rect is a lie.
export function cameraView(camKf, t, CW, CH) {
  const c = cameraAt(camKf, t);
  if (!c) return null;
  // A ROTATED STAGE has no axis-aligned preimage: the frame maps back to a projected quad, and that quad's
  // AABB is not the shape. verify/audit.mjs refuses to measure through exactly this and says why at length:
  // a projection MANUFACTURES findings on the very frames a film is doing its most deliberate camera
  // work, and the only way to clear one is to make the film worse. A gate must not guess through it.
  if (Math.abs(c.rx) > 1e-3 || Math.abs(c.ry) > 1e-3 || Math.abs(c.roll) > 1e-3) return null;
  // s <= 0 is a camera the renderer itself refuses (dollyZ throws on it), so there is no view to report
  // and inventing one would divide by it.
  if (!(c.s > 0)) return null;
  const w = CW / c.s, h = CH / c.s;
  return { x: CW / 2 - w / 2 - c.x, y: CH / 2 - h / 2 - c.y, w, h };
}

// motionAt(kfs, lt): per-layer keyframe track → {dx,dy,scale,rot,opacity}. Keyframe times are
// SECONDS from the layer's start; x/y are OFFSETS added onto the layer's base position, and
// scale/rot/opacity are composed onto the enter/cut transform. Per-keyframe `ease` (any named
// easing incl. spring) drives the segment into that keyframe. Holds the endpoints outside range.
// ~4 frames at 30fps. Below this a segment is not a span with a shape, it is one step of a traced path.
export const DENSE_KEY_SEC = 0.14;

// LAYER-OWNED KEYED PROPERTIES: the ones whose neutral value lives on the layer, not in the evaluator.
//
// x, y, scale, rot, opacity and blur each have a constant identity: an omitted `x` means 0, and 0 means
// "where it was authored". These three do not. Identity for `w` is the layer's own authored `w`;
// identity for `track` is the layer's own z-order. A pure evaluator cannot know either, so an omitted
// value inside motionAt could only ever mean "hold the neighbour", a second, different interpretation
// rule, in the one file where a second rule already cost this repo a day (docs/MISTAKES.md #195, the
// per-property motionAt that would have made a button invisible for a whole film).
//
// So the fill happens HERE, once, with the layer in hand, and motionAt keeps exactly one rule: both
// endpoints state the value, or neither does. A track that mentions none of them is untouched and
// returns null for all three, which is how a layer opts out of paying for any of this.
export const LAYER_OWNED = ['w', 'h', 'track'];

export function resolveKeyedProps(layers) {
  (layers || []).forEach((L, idx) => {
    if (!Array.isArray(L.motion) || !L.motion.length) return;
    for (const prop of LAYER_OWNED) {
      if (!L.motion.some((k) => k && k[prop] != null)) continue;
      // `track` always has an identity: scene.js defaults a layer's z-order to its position in the
      // array, so keying depth on a layer that never declared it is ordinary, not an error. A BOX has
      // no such default: a key animating a size the layer never declared has nothing to animate from,
      // and inventing one is the silent substitution this repo treats as the worst failure.
      const base = prop === 'track' ? (L.track ?? idx) : L[prop];
      if (base == null) throw new Error(`layer "${L.id || L.type || '?'}" keys ${prop} but declares no ${prop}, so there is no box to animate from`);
      for (const k of L.motion) if (k[prop] == null) k[prop] = base;
    }
  });
  return layers;
}

// ---------- SMOOTH: velocity that survives a keyframe ----------
//
// THE GAP THIS CLOSES, measured before it was written. A layer travelling through three sparse keys
// (0 → 300 → 900 px) reads, in px/s either side of the interior key at t = 0.60:
//
//   default easeInOutCubic   1418 · 168 · 8 · 2 · 16 · 336 · 2836     a DEAD STOP in the middle
//   linear                    500 · 500 · 500 · 750 · 1000 · 1000     an instant jump: a visible kink
//   easeOutQuint              157 · 2 · 0 · 2365 · 4373 · 2417        a stop, then a jerk
//
// Every per-segment easing zeroes velocity at BOTH ends of its own segment, so an interior keyframe is
// a full stop by construction. `linear` avoids the stop and buys a discontinuity instead. Neither is
// what a motion designer means by a keyframe in the middle of a move, and this file's own comment
// already names the symptom for the dense case ("the move pulses") and fixes it there by defaulting to
// linear. Sparse keys were left with the stop.
//
// This is the SPEED GRAPH. In After Effects a keyframe carries an incoming and an outgoing velocity,
// and the reason their curves read as one gesture is that those two match. `ease: "through"` computes
// the tangent at each key from its NEIGHBOURS instead of fitting a curve inside one gap, so the
// velocity entering a key equals the velocity leaving it and the move reads as one travel.
//
// NAMED `through` AND NOT `smooth`, WHICH IS THE OBVIOUS WORD AND IS TAKEN. `smooth` is already a feel
// word in core/motion.js (it resolves to a real curve, 0 · 0.063 · 0.5 · 0.938 · 1), so the first cut
// of this shadowed a live name and `resolveEasing` accepted it happily because it knew it. That is the
// third name collision written in one session, after `origin` (a globe's lon/lat) and `html` on a bg
// window (markup, not a path). The lesson is not "check the enum"; it is that the enum is the LAST
// place to look, and the first is to try resolving the name and see if anything answers.
//
// A cubic Hermite with finite-difference tangents, non-uniform in t because our keys are not evenly
// spaced and a uniform Catmull-Rom would overshoot wherever they are not. The tangent at key i is
// (P[i+1] - P[i-1]) / (t[i+1] - t[i-1]). The FIRST and LAST tangents are zero, so a move still eases out
// of rest and back into it: the hitch removed is the one INSIDE the travel, which is the only one that
// was never wanted.
const hermite = (p0, p1, m0, m1, h, u) => {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * m0
       + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * h * m1;
};

/** The finite-difference tangent of `prop` at key `i`, in units per second. Zero at either end. */
function tangentAt(kfs, i, prop, dflt) {
  if (i <= 0 || i >= kfs.length - 1) return 0;
  const span = kfs[i + 1].t - kfs[i - 1].t;
  if (!(span > 0)) return 0;
  return ((kfs[i + 1][prop] ?? dflt) - (kfs[i - 1][prop] ?? dflt)) / span;
}

export function motionAt(kfs, lt) {
  const norm = (k) => ({ dx: k.x ?? 0, dy: k.y ?? 0, scale: k.scale ?? 1, rot: k.rot ?? 0, opacity: k.opacity ?? 1, blur: k.blur ?? 0, w: k.w ?? null, h: k.h ?? null, track: k.track ?? null });
  if (lt <= kfs[0].t) return norm(kfs[0]);
  const last = kfs[kfs.length - 1];
  if (lt >= last.t) return norm(last);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (lt >= a.t && lt <= b.t) {
      // DENSE KEYS MEAN MECHANICAL, so interpolate them linearly unless told otherwise. easeInOutCubic
      // zeroes velocity at BOTH ends of every segment, so a chain of closely-spaced keys accelerates and
      // stops once per key and the move pulses. The same defect fixed for the camera in #125, left
      // standing as the per-layer default. A hand-keyed cursor or drag lands keys every 2-4 frames and
      // its shape comes from WHERE the keys are, not from a curve fitted over each gap. Above the
      // threshold the old default stands, because a sparse key really is a span with a shape.
      const seg = b.t - a.t;
      // `smooth` is not an easing and cannot be one: an easing is a function of one segment's own
      // progress, and the whole point here is to read the keys either side. So it is dispatched before
      // resolveEasing ever sees it, and `resolveEasing` still refuses every unknown name as before.
      if (b.ease === 'through' && seg > 0) {
        const u = clamp01((lt - a.t) / seg);
        const at = (prop, dflt) => hermite(a[prop] ?? dflt, b[prop] ?? dflt,
          tangentAt(kfs, i, prop, dflt), tangentAt(kfs, i + 1, prop, dflt), seg, u);
        // A layer-owned prop still animates only when BOTH endpoints state it, exactly as below: the
        // rule is about whether the track owns the property, not about how it interpolates.
        const ownS = (prop) => (a[prop] == null || b[prop] == null ? null : at(prop, 0));
        return { dx: at('x', 0), dy: at('y', 0), scale: at('scale', 1), rot: at('rot', 0),
          opacity: at('opacity', 1), blur: at('blur', 0),
          w: ownS('w'), h: ownS('h'), track: ownS('track') };
      }
      const p = a.t === b.t ? 1
        : resolveEasing(b.ease || (seg < DENSE_KEY_SEC ? 'linear' : 'easeInOutCubic'))(clamp01((lt - a.t) / seg));
      // Layer-owned props: one rule, no fallback. Both endpoints carry a number (resolveKeyedProps saw
      // to that) or the track does not animate that property and the caller leaves the element alone.
      const own = (prop) => (a[prop] == null || b[prop] == null ? null : lerp(a[prop], b[prop], p));
      return { dx: lerp(a.x ?? 0, b.x ?? 0, p), dy: lerp(a.y ?? 0, b.y ?? 0, p),
        scale: lerp(a.scale ?? 1, b.scale ?? 1, p), rot: lerp(a.rot ?? 0, b.rot ?? 0, p),
        opacity: lerp(a.opacity ?? 1, b.opacity ?? 1, p), blur: lerp(a.blur ?? 0, b.blur ?? 0, p),
        w: own('w'), h: own('h'), track: own('track') };
    }
  }
  return norm(last);
}

// ---------- THE VELOCITY READ: one owner, three consumers ----------
//
// Three things in this engine ask how fast a layer is going, and each of them asks by evaluating the
// motion track twice and subtracting: the automatic motion blur (core/tracks/motion.js), the ghost
// trail and its blur (core/fx/ghost.js), and squash (core/fx/squash.js). Written out three times that
// is three chances to disagree about the window, the clamp and the units, which is the fact-with-two-
// owners shape this codebase logs most (docs/MISTAKES.md #423).
//
// PURE, and that is the whole reason a velocity is allowed here at all. Nothing is remembered between
// frames: the earlier pose is COMPUTED from the same keyframes at every visit, so a backwards seek and
// a cold DOM give the same answer as a forward render. An accumulator would not.

// poseBack(kfs, lt, dt): the pose `dt` seconds before local time `lt`, CLAMPED at the layer's own
// first pose. A film that opens on a move therefore opens with zero velocity rather than an
// extrapolated one, because a thing that has not moved yet has not been anywhere else.
export const poseBack = (kfs, lt, dt) => motionAt(kfs, Math.max(0, lt - dt));

// velocityAt(kfs, lt, dt): the layer's travel over the window ENDING at lt, in px per SECOND.
// Per second and not per frame: 16px per frame is 480px/s at 30fps and 960px/s at 60, so a threshold
// in frames means two different speeds in two renders of the same film (docs/MISTAKES.md #204).
// `now` and `prev` ride along because every caller wants at least one of them and re-sampling the
// track to get it back would be a fourth evaluation per layer per frame. Named `prev` and not `then`
// because an object with a `then` key is a THENABLE: `await` on it, or a promise resolved with it,
// would call the pose as a callback.
// DIVIDED BY THE WINDOW ASKED FOR, not by the truncated one. Before the layer's own first keyframe the
// lookback is clamped, so the two samples sit closer together than `dt` and the quotient reports a
// SMALLER velocity, tapering to zero at the layer's first frame. That is the same clamp ghost states
// for the same reason: a thing that has not moved yet has not been anywhere else, and dividing by the
// short window instead would make the opening frame of a film that starts on a move the fastest one in
// it.
export function velocityAt(kfs, lt, dt) {
  if (!(dt > 0)) throw new Error(`velocityAt: dt must be a positive lookback in seconds, got ${JSON.stringify(dt)}.`);
  const now = motionAt(kfs, lt), prev = poseBack(kfs, lt, dt);
  const vx = (now.dx - prev.dx) / dt, vy = (now.dy - prev.dy) / dt;
  return { vx, vy, speed: Math.hypot(vx, vy), now, prev };
}
