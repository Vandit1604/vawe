// core/sequence.js: the pure timeline evaluators, lifted out of scene.html so they can be
// unit-tested without a browser. Every export is a pure function of time (→ pure in frame n),
// with zero DOM access. Mirrors another engine' packages/engine split (pure (config,t)→value math
// beside the DOM/capture layer, not entangled with it). scene.html imports these and does the
// DOM writes; the math lives here and is asserted by scripts/lib-test.mjs.
import { clamp01, lerp, easeInOutCubic, resolveEasing, handleCurve,
  resolveHandle as resolveHandleSide } from '../motion/motion.js';

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
  // The index of the key the segment STARTS at, or the last key once t is past the end. `segmentAt`
  // holds the last key for that index, so the "hold the final pose" branch is not written twice.
  let i = 0;
  while (i < camKf.length - 1 && t > camKf[i + 1].t) i++;
  const a = camKf[i], b = camKf[i + 1] || a;
  // per-keyframe `ease` drives the segment INTO b (segmentAt is the single owner, shared with motionAt).
  // Default easeInOutCubic keeps every existing camera byte-identical; set `ease:"linear"` on interior
  // keyframes for a velocity-CONTINUOUS multi-keyframe push. The old hardcoded ease-in-out zeroed
  // velocity at every keyframe, so a chained push pulsed (accelerate/stop/accelerate). The "not smooth /
  // shaking zoom" (docs/MISTAKES.md #125). WHICH default is picked stays here and not in segmentAt: the
  // camera has no DENSE_KEY_SEC rule and that difference is deliberate (see motionAt).
  const at = segmentAt(camKf, i, t, 'easeInOutCubic');
  // rx/ry/roll are the camera's ORIENTATION and they belong to the camera rather than to a layer for a
  // geometric reason: CSS `perspective()` takes its vanishing point from the element it is applied to,
  // so tilting sibling layers individually rotates each about its OWN centre and the composition comes
  // apart. Applied once on the camera root, every layer shares one vanishing point and the frame reads
  // as a single plane in space, which is what "perspective on the frame" means (docs/MISTAKES.md #59).
  // `persp` is the LENS: the focal distance the projection is taken through, not the camera's position.
  // Position is `s` (see dollyZ); confusing the two is the dolly-zoom, and it is authored by keying both.
  return { s: at('s', 1), x: at('x', 0), y: at('y', 0),
    rx: at('rx', 0), ry: at('ry', 0),
    roll: at('roll', 0),
    persp: at('p', 1600),
    // FOCUS AND APERTURE, the camera's depth of field. `f` is the distance the lens is focused at, in
    // the same z as a layer's `depth`; `a` is how fast things go soft as they leave it, in blur pixels
    // per 100px of defocus. Keyed like everything else here, so a rack focus is two keyframes.
    //
    // `focus: null` when NO keyframe names one, and that is the difference between "focused at the
    // picture plane" and "this film has no depth of field". Lerping a missing `f` to 0 would silently
    // give every film a lens focused on z 0, which is a working-looking default nobody asked for and
    // would soften the whole library the moment it shipped. The default is the OTHER endpoint's `f`, so
    // one keyed focus holds flat rather than racking from zero.
    focus: (a.f == null && b.f == null) ? null : at('f', a.f ?? b.f ?? 0),
    aperture: at('a', 0) };
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
// rule, in the one file where a second rule already cost this repo a day (docs/MISTAKES.md #563: a
// panel sprang back to its declared width because a later key mentioned only `scale`).
//
// So the fill happens HERE, once, with the layer in hand, and motionAt keeps exactly one rule: both
// endpoints state the value, or neither does. A track that mentions none of them is untouched and
// returns null for all three, which is how a layer opts out of paying for any of this.
export const LAYER_OWNED = ['w', 'h', 'track'];

// WHAT A KEYFRAME CARRIES, and the table the pose is BUILT from, so the two cannot disagree.
//
// The first cut of this hand-wrote the list and got the handle names wrong, guessing `in`/`out` where
// the code says `easeIn`/`easeOut`, and three shipped films were refused for writing the correct thing.
// A second list is the failure this whole file argues against and it was written INSIDE the check for
// it. So: `POSE` maps the AUTHORED name to the pose key and its identity, `norm` is generated from it,
// `SIDES` already owned the handle names and is spread in rather than retyped.
//
//   authored          pose key    identity when the key omits it
export const POSE = { x: ['dx', 0], y: ['dy', 0], scale: ['scale', 1], rot: ['rot', 0],
  opacity: ['opacity', 1], blur: ['blur', 0], w: ['w', null], h: ['h', null], track: ['track', null],
  // `radius` is a STYLE WRITE like `w`/`h`, not a transform: a border-radius the layer never declared
  // has no shape to animate from, so identity is null rather than 0. Unlike `w`/`h` it is not in
  // LAYER_OWNED: a track that keys it states both endpoints explicitly (same contract as `ox`/`oy`
  // below), so an omitted `radius` leaves the layer's authored corner exactly as it was.
  radius: ['radius', null],
  // THE ANCHOR POINT, KEYED. `origin` is a static CSS transform-origin written once at build
  // (core/layers/util.js applyOrigin), so the pivot a scale or rotation grows out of could never move.
  // AE keys the anchor point, and a travelling pivot is how a door swings from one hinge and then the
  // other, or how a panel grows from its left edge and then from its centre. Nesting in a group buys a
  // DIFFERENT FIXED pivot, never a moving one, so the workaround was never the same thing.
  //
  // Two numbers rather than the CSS string, because interpolating "0% 50%" would mean parsing a
  // keyword-or-length-or-percentage grammar per frame to move a point. `ox`/`oy` are PERCENTAGES of the
  // layer's own box, which is the form authors already write for the static prop, and identity is null
  // so a track that never mentions them leaves `origin` exactly as the layer set it.
  ox: ['ox', null], oy: ['oy', null] };

export function resolveKeyedProps(layers) {
  (layers || []).forEach((L, idx) => {
    if (!Array.isArray(L.motion) || !L.motion.length) return;
    // Two authored curves on one segment, refused with the layer in hand. This walk already exists and
    // already names the layer, so the check goes here instead of in a second pass over the same list.
    assertKeyHandles(L.motion, `layer "${L.id || L.type || '?'}"`);
    // A KEY THAT CARRIES A PROPERTY NOTHING INTERPOLATES IS ACCEPTED-THEN-IGNORED, which is the failure
    // this repo pays for most. `origin` is the one that found this: it reads as a keyable anchor point,
    // an author writes a pivot that travels, and `origin` is a static CSS transform-origin written once
    // at build (core/layers/util.js applyOrigin), so the pivot does not move and nothing says so. Every
    // other unknown key was in the same position: `{"t":0,"rot":0,"zzNonsense":5}` validated clean.
    //
    // Refused here rather than in core/validate.mjs because this walk runs at BOOT, so a scene that
    // reaches the renderer by any route is checked, and it already has the layer in hand to name it.
    for (const k of L.motion) {
      const stray = Object.keys(k || {}).filter((p) => !KEYFRAME_PROPS.includes(p) && !p.startsWith('_'));
      if (stray.length) {
        throw new Error(`layer "${L.id || L.type || '?'}" has a motion keyframe carrying ${stray.map((p) => `\`${p}\``).join(', ')}, `
          + `which nothing interpolates, so it would be accepted and ignored. A keyframe carries: `
          + `${KEYFRAME_PROPS.join(' · ')}.`
          + (stray.includes('origin')
            ? ` \`origin\` is the STATIC transform-origin and belongs on the layer. To make the pivot `
              + `TRAVEL, key \`ox\`/\`oy\` instead: percentages of the layer's own box, on both endpoints.`
            : ''));
      }
    }
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

// ---------- ONE SEGMENT, ONE OWNER ----------
//
// segmentAt(kfs, i, t, dfltEase): the interpolator for the segment kfs[i] -> kfs[i+1] at time t,
// returned as `(prop, dflt) => value` so a caller reads only the properties it owns. Past the last key
// there is no segment and the last key holds.
//
// WHY IT IS ONE FUNCTION. cameraAt's own comment said it "mirrors motionAt", which is this codebase's
// most-logged defect shape: one fact with two owners, drifting. They HAD drifted. `ease: "through"`
// was dispatched inside motionAt, so it worked on a layer and threw `unknown easing "through"` on a
// camera key, and nothing said the two vocabularies were different. Now the segment vocabulary is
// shared and only the DEFAULT differs, which is the part that differs on purpose: motionAt has the
// DENSE_KEY_SEC rule, the camera does not.
export function segmentAt(kfs, i, t, dfltEase) {
  const a = kfs[i], b = kfs[i + 1] || a;
  const seg = b.t - a.t;
  // `through` is not an easing and cannot be one: an easing is a function of one segment's own
  // progress, and the whole point here is to read the keys either side. So it is dispatched before
  // resolveEasing ever sees it, and `resolveEasing` still refuses every unknown name as before.
  if (b.ease === 'through' && seg > 0) {
    const u = clamp01((t - a.t) / seg);
    return (prop, dflt) => hermite(a[prop] ?? dflt, b[prop] ?? dflt,
      tangentAt(kfs, i, prop, dflt), tangentAt(kfs, i + 1, prop, dflt), seg, u);
  }
  // PER-KEY, PER-SIDE HANDLES beat the named default when either side of the segment authors one.
  // `a.easeOut` shapes the value leaving a, `b.easeIn` shapes the value arriving at b, and the side
  // that says nothing contributes the straight line (core/motion.js handleCurve). A segment that
  // authors neither takes the identical code path it took before handles existed, which is why
  // nothing shipped moves. A handle beside a named `ease` on the same segment is REFUSED, at boot,
  // by keyHandleErrors below, so this never has to decide which of two authored curves wins.
  const drawn = handleCurve(a.easeOut, b.easeIn);
  const p = !(seg > 0) ? 1
    : (drawn || resolveEasing(b.ease || dfltEase))(clamp01((t - a.t) / seg));
  return (prop, dflt) => lerp(a[prop] ?? dflt, b[prop] ?? dflt, p);
}

// ---------- THE REFUSALS: two authored curves on one segment ----------
//
// keyHandleErrors(kfs, who) -> messages[]. Checked at BOOT (core/boot.js) and at author-check
// (core/validate.mjs), never per frame, and it is ONE function so the two cannot say different
// things. Nothing here is a preference: `through` COMPUTES a key's tangent from its neighbours and a
// handle AUTHORS it, so a key wearing both has two answers for one number, and a named `ease` on the
// segment is a third. Picking one silently is how this repo gets its worst bugs, so all three are
// refused by name.
const SIDES = ['easeIn', 'easeOut'];

// `t` is the time, `ease` drives the segment INTO this key, SIDES are its two bezier handles, and the
// rest are the values that travel. Every name here is read; nothing here is a second copy of anything.
export const KEYFRAME_PROPS = ['t', 'ease', ...SIDES, ...Object.keys(POSE)];
export function keyHandleErrors(kfs, who = 'a track') {
  const out = [];
  if (!Array.isArray(kfs)) return out;
  const has = (k, side) => k && k[side] != null;
  for (let i = 0; i < kfs.length; i++) {
    const k = kfs[i];
    if (!k) continue;
    for (const side of SIDES) {
      if (!has(k, side)) continue;
      try { resolveHandleSide(k[side], side, `${who} key ${i}`); }
      catch (e) { out.push(e.message); }
    }
    if (k.ease === 'through' && SIDES.some((sd) => has(k, sd)))
      out.push(`${who} key ${i} carries both \`ease: "through"\` and a handle. `
        + '`through` COMPUTES the velocity at this key from its neighbours; a handle AUTHORS it. '
        + 'They are two answers to one question, so one would silently win. Keep one: drop the handle '
        + 'to let the neighbours decide, or drop `through` to draw the curve yourself.');
  }
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    // `through` is caught by the per-key rule above, which says something sharper about it than
    // "two curves on one segment" would, so it is skipped here rather than reported twice.
    if (!a || !b || b.ease == null || b.ease === 'through') continue;
    const drawn = [has(a, 'easeOut') && `key ${i} \`easeOut\``, has(b, 'easeIn') && `key ${i + 1} \`easeIn\``].filter(Boolean);
    if (!drawn.length) continue;
    out.push(`${who}: the segment from key ${i} to key ${i + 1} is shaped twice, by `
      + `\`ease: ${JSON.stringify(b.ease)}\` on key ${i + 1} and by ${drawn.join(' and ')}. `
      + 'A named easing is one curve for the whole segment and a handle draws half of it, so they '
      + 'cannot both hold. Keep one: the name for a stock shape, the handles to draw your own.');
  }
  return out;
}

/** Throws on the first problem, naming the layer. The boot-side spelling of keyHandleErrors. */
export function assertKeyHandles(kfs, who) {
  const errs = keyHandleErrors(kfs, who);
  if (errs.length) throw new Error(errs[0]);
}

// PER-PROPERTY TIMING. `motionDelay` shifts the time at which ONE property is sampled off the same
// track, so scale can finish after position and rotation can settle a beat after the travel. That is
// follow-through, Thomas and Johnston's fifth principle and Williams' successive breaking of joints,
// and without it every property on a layer stops on the same frame, which is the difference between a
// thing that moves and a thing that is moved. Measured before it was built: 138 of the 283 motion
// tracks in the library key position AND scale/rot/opacity together, so the case is half the library
// rather than a hypothetical.
//
// IT ADDS NO SECOND INTERPRETATION RULE, which is the thing this file refuses (docs/MISTAKES.md #563).
// The track is read exactly as before; only the CLOCK differs per property, and a shifted pure function
// is still pure. Both endpoints still state a value or neither does.
//
// SPELLED LIKE `varsDelay`, ON PURPOSE. core/tracks/vars.js already solved per-channel timing for CSS
// variables after the identical argument (#357), taking a scalar or a map with `'*'` as its default. A
// third spelling of "when does this channel start" is the drift this codebase pays for most, so this is
// the second use of one shape rather than a new idea.
//
// NOT `lag`, which is taken and means something else: core/fx/lag.js makes one LAYER trail ANOTHER and
// adds an overrun. This is within one layer and adds nothing. The two are the same principle at
// different scopes and they should not be confused at the call site.
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
      // DENSE KEYS MEAN MECHANICAL, so interpolate them linearly unless told otherwise. easeInOutCubic
      // zeroes velocity at BOTH ends of every segment, so a chain of closely-spaced keys accelerates and
      // stops once per key and the move pulses. The same defect fixed for the camera in #125, left
      // standing as the per-layer default. A hand-keyed cursor or drag lands keys every 2-4 frames and
      // its shape comes from WHERE the keys are, not from a curve fitted over each gap. Above the
      // threshold the old default stands, because a sparse key really is a span with a shape.
      const at = segmentAt(kfs, i, lt, (b.t - a.t) < DENSE_KEY_SEC ? 'linear' : 'easeInOutCubic');
      // Layer-owned props: one rule, no fallback. Both endpoints carry a number (resolveKeyedProps saw
      // to that) or the track does not animate that property and the caller leaves the element alone.
      const own = (prop) => (a[prop] == null || b[prop] == null ? null : at(prop, 0));
      // GENERATED FROM `POSE`, like `norm` above, because these were two hand-written literals of one
      // fact and they had already drifted: adding a property to the table moved the endpoints and left
      // the interior returning undefined for it, which is a value that reads as "not keyed" everywhere.
      // A null identity in the table means the property is LAYER-OWNED and needs both endpoints.
      return Object.fromEntries(Object.entries(POSE).map(([p, [out, id]]) =>
        [out, id === null ? own(p) : at(p, id)]));
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
// It takes NO `motionDelay`, and that is a decision rather than an oversight. Velocity here feeds the
// motion blur and the follow track, both of which want the layer's TRAVEL, and travel is position.
// `motionDelay` on `x` or `y` shifts that travel and is therefore visible to velocity through the pose
// itself; a delay on `scale` or `rot` is not, and a blur streak keyed to a rotation that has not
// happened yet would be reading the future. If somebody later wants blur to follow a delayed rotation,
// that is a real feature and it starts here, deliberately.
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

// cameraVelocityAt(camKf, t, dt): the camera's TRANSLATION over the window ending at t, in px per
// SECOND, in the SAME SPACE a layer's own motion track speaks. Sampled the way velocityAt samples a
// layer, through the same cameraAt/segmentAt evaluator, so the camera and a layer cannot disagree
// about what "fast" means, and pure for the same reason: both poses are computed from the keyframes,
// nothing is remembered between frames.
//
// WHY x/y AND NOTHING ELSE. The flat camera is `scale(s) translate(x, y)` and the rig is
// `translate3d(x, y, dollyZ(s))`, so in both the translation is applied in the SAME pre-projection
// space the layer's own dx/dy live in: a layer travelling at -(camera velocity) sits still on the
// sensor, and the two numbers add. `s`, `roll`, `rx` and `ry` do not have that property. Their screen
// velocity is RADIAL, proportional to a layer's distance from the frame centre, so it cannot be
// answered without that layer's stage position, which is not available per layer inside a track. A
// wrong-but-plausible number is the substitution this engine logs more than any other defect, so the
// zoom and the roll contribute NOTHING here rather than something uniform and false.
//
// CLAMPED at t=0 like poseBack, and for the same reason: a film that opens on a moving camera opens
// with zero velocity, because a camera that has not moved yet has not been anywhere else.
export function cameraVelocityAt(camKf, t, dt) {
  if (!(dt > 0)) throw new Error(`cameraVelocityAt: dt must be a positive lookback in seconds, got ${JSON.stringify(dt)}.`);
  const now = cameraAt(camKf, t);
  if (!now) return { vx: 0, vy: 0, speed: 0 };
  const prev = cameraAt(camKf, Math.max(0, t - dt));
  const vx = (now.x - prev.x) / dt, vy = (now.y - prev.y) / dt;
  return { vx, vy, speed: Math.hypot(vx, vy) };
}
