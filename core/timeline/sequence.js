// Pure timeline evaluators, lifted out of scene.html so they can be unit-tested without a browser.
// Every export is a pure function of time (pure in frame n), zero DOM access; scene.html does the DOM
// writes, the math lives here (asserted by harness/lib-test.mjs).
import { clamp01, lerp, resolveEasing, handleCurve,
  resolveHandle as resolveHandleSide } from '../motion/motion.js';

// `s` is where the camera stands, not a second idea beside depth: under a lens of focal length L, a
// camera at distance d magnifies by L/d, so magnification and distance are the same number in two
// units. `dollyZ` is the CSS translateZ that puts the camera at the distance `s` asks for. No `z`
// keyframe key: a `z` beside `s` would be two knobs for one idea, disagreeing under perspective.
export function dollyZ(s, lens) {
  // s -> 0 is a camera infinitely far away; s past the plane inverts the projection. CSS accepts the
  // resulting translateZ silently, so this refuses it instead.
  if (!(s > 0)) throw new Error(`camera: s must be a POSITIVE magnification, got ${JSON.stringify(s)}. `
    + `s is where the camera STANDS (distance = lens / s), so 0 is a camera at infinite distance.`);
  return lens * (1 - 1 / s);
}

// cameraAt(camKf, t): global camera keyframes -> the camera's state at t, or null when there are none.
// Keyframe times are seconds on the absolute timeline. Holds the last frame past the end.
export function cameraAt(camKf, t) {
  if (!camKf || !camKf.length) return null;
  let i = 0;
  while (i < camKf.length - 1 && t > camKf[i + 1].t) i++;
  const a = camKf[i], b = camKf[i + 1] || a;
  // Default easeInOutCubic keeps every existing camera byte-identical; `ease:"linear"` on interior
  // keyframes gives a velocity-continuous multi-keyframe push (the old hardcoded ease-in-out zeroed
  // velocity at every keyframe, pulsing a chained push: MISTAKES #125). The camera has no
  // DENSE_KEY_SEC rule, unlike motionAt, deliberately.
  const at = segmentAt(camKf, i, t, 'easeInOutCubic');
  // rx/ry/roll belong to the camera, not a layer: CSS `perspective()` takes its vanishing point from
  // the element it's applied to, so tilting layers individually breaks the composition apart; applied
  // once on the camera root, every layer shares one vanishing point (MISTAKES #59).
  // `persp` is the lens (focal distance); `s` is position (dollyZ). Confusing the two is the dolly-zoom.
  return { s: at('s', 1), x: at('x', 0), y: at('y', 0),
    rx: at('rx', 0), ry: at('ry', 0),
    roll: at('roll', 0),
    persp: at('p', 1600),
    // Focus/aperture: `f` is the distance the lens is focused at (same z as a layer's `depth`); `a` is
    // blur pixels per 100px of defocus. `focus: null` when no keyframe names one, distinct from a
    // lerped 0: an unset focus means no depth of field, not a lens focused at z 0.
    focus: (a.f == null && b.f == null) ? null : at('f', a.f ?? b.f ?? 0),
    aperture: at('a', 0) };
}

// cameraView(camKf, t, CW, CH): the stage-space rectangle the camera is looking at, or null when there
// is no axis-aligned answer. Every static gate measures a layer against the canvas box at the origin
// (frame 0's camera position), which is wrong for a film that lays content across a canvas far larger
// than the frame and travels between stations (films/scene/linear-journey.json, 5760x2160, zero cuts).
//
// The map is inverted from the flat camera transform: #cam is `inset:0` with `transform-origin:50% 50%`
// (scene.css:15), drawCameraAndCut writes `scale(s) translate(x, y)` (scene.js:888). A stage point p
// lands on screen at C + s*(p + T - C), so solving for p at the two screen corners gives a view
// starting at C - C/s - T, sized CW/s by CH/s.
//
// A top-level `tilt`/`plane` modifier can also rotate the stage with no camera angle at all
// (scene.js:705; films/scene/playhead.json does this). Layers aren't visible here, so the CALLER must
// refuse that case; this returns a rect for it, and the rect is a lie.
export function cameraView(camKf, t, CW, CH) {
  const c = cameraAt(camKf, t);
  if (!c) return null;
  // A rotated stage has no axis-aligned preimage (its AABB is not the projected quad's shape), so a
  // gate must not guess through it (quality/audit.mjs refuses to measure it for the same reason).
  if (Math.abs(c.rx) > 1e-3 || Math.abs(c.ry) > 1e-3 || Math.abs(c.roll) > 1e-3) return null;
  if (!(c.s > 0)) return null;   // dollyZ itself refuses s <= 0; no view to report, and dividing by it would break
  const w = CW / c.s, h = CH / c.s;
  return { x: CW / 2 - w / 2 - c.x, y: CH / 2 - h / 2 - c.y, w, h };
}

// motionAt(kfs, lt): per-layer keyframe track → {dx,dy,scale,rot,opacity}. Keyframe times are
// SECONDS from the layer's start; x/y are OFFSETS added onto the layer's base position, and
// scale/rot/opacity are composed onto the enter/cut transform. Per-keyframe `ease` (any named
// easing incl. spring) drives the segment into that keyframe. Holds the endpoints outside range.
// ~4 frames at 30fps. Below this a segment is not a span with a shape, it is one step of a traced path.
export const DENSE_KEY_SEC = 0.14;

// Layer-owned keyed properties: those whose neutral value lives on the layer, not the evaluator.
// x/y/scale/rot/opacity/blur have a constant identity (omitted `x` means 0); `w`/`track` don't (their
// identity is the layer's own authored width / z-order), so an omitted value can only mean "hold the
// neighbour", the second interpretation rule this file refuses (MISTAKES #563). The fill happens once,
// with the layer in hand (resolveKeyedProps); motionAt keeps one rule: both endpoints state it or
// neither does.
export const LAYER_OWNED = ['w', 'h', 'track'];

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
  z: ['z', 0], rotX: ['rotX', 0], rotY: ['rotY', 0] };

// ARRIVAL_EASE_PROPS/IDENTITY: the visual props whose motion this checks for an unfinished stop
// (engine-doctrine/CRAFT/MOTION-CRAFT.md owns the speed/motion vocabulary this feeds). Not `opacity`: a move
// TO opacity 0 is an exit, and exits accelerate by the owner's rule (exits-faster-than-entrances).
const ARRIVAL_EASE_PROPS = ['x', 'y', 'scale', 'rot', 'w', 'h'];
const ARRIVAL_EASE_IDENTITY = { x: 0, y: 0, scale: 1, rot: 0, w: null, h: null };

// adaptArrivalEase(motion, who): a key whose move ends at full speed (`easeIn*`, `linear`, `rush`) but
// lands in a hold (next key repeats the same values) never decelerates, slamming into the stop.
// Adapted to the decelerating twin so the arrival still lands, softly, and logged like
// core/camera-moves/dive-in.js's own adaptation (engine-doctrine/SAFEGUARDS.md). An authored handle or
// an exit is left alone.
function adaptArrivalEase(motion, who) {
  for (let i = 1; i < motion.length; i++) {
    const prev = motion[i - 1], k = motion[i], next = motion[i + 1];
    if (k.ease == null || k.easeIn != null) continue;
    if (k.opacity === 0) continue; // exit: fading out keeps its accelerating ease on purpose
    const moved = ARRIVAL_EASE_PROPS.filter((p) => k[p] != null
      && k[p] !== (prev[p] ?? ARRIVAL_EASE_IDENTITY[p]));
    if (!moved.length) continue;
    if (!moved.every((p) => !next || next[p] === k[p])) continue; // not a hold: leave it alone
    let to = null;
    if (k.ease === 'linear') to = 'easeOutCubic';
    else if (k.ease === 'rush') to = 'brake';
    else if (/^easeIn(?!Out)[A-Z]/.test(k.ease)) to = `easeInOut${k.ease.slice(6)}`;
    if (!to) continue;
    console.log(`adapted arrival-ease: ${who} key ${k.t} ${k.ease} -> ${to} (the move lands in a hold)`);
    k.ease = to;
  }
}

// adaptDurationForMotion(L, who): the clip window (`t < start + duration`, core/timeline/clips.js) is
// what makes a layer "live"; core/tracks/motion.js stops writing transform and opacity the instant a
// layer goes not-live, so a motion key authored past the layer's own `duration` never plays, and the
// generic exit fade just fades the frozen pose out in place (reads as "disappears", not a jump).
// Stretched to the track's own last key rather than thrown: a layer with no `duration` already lives
// forever, so this only fires when a duration and a motion track both exist and disagree.
function adaptDurationForMotion(L, who) {
  if (L.duration == null) return;
  const last = L.motion[L.motion.length - 1].t;
  if (!(last > L.duration)) return;
  console.log(`adapted motion-duration: ${who} duration ${L.duration} -> ${last} `
    + `(a motion key ran past the layer's own duration, which would have hidden it before the key played)`);
  L.duration = last;
}

export function resolveKeyedProps(layers) {
  (layers || []).forEach((L, idx) => {
    if (!Array.isArray(L.motion) || !L.motion.length) return;
    const who = L.id || L.type || '?';
    // Two authored curves on one segment, refused with the layer in hand rather than a second pass.
    assertKeyHandles(L.motion, `layer "${who}"`);
    adaptArrivalEase(L.motion, who);
    adaptDurationForMotion(L, who);
    // A key carrying a property nothing interpolates is accepted then ignored: `origin` reads as a
    // keyable anchor point but is a static CSS transform-origin (core/layers/util.js applyOrigin), so
    // an authored travelling pivot silently never moves. Refused here (at boot) rather than in
    // core/validate.mjs, so a scene reaching the renderer by any route is checked with the layer in hand.
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
      // `track` always has an identity (scene.js defaults z-order to array position); a box does not,
      // so a key animating a size the layer never declared is refused rather than invented.
      const base = prop === 'track' ? (L.track ?? idx) : L[prop];
      if (base == null) throw new Error(`layer "${L.id || L.type || '?'}" keys ${prop} but declares no ${prop}, so there is no box to animate from`);
      for (const k of L.motion) if (k[prop] == null) k[prop] = base;
    }
  });
  return layers;
}

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
 * every authored station's scale between two equal keys (MISTAKES #626), because the raw chordal
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
  const p = !(seg > 0) ? 1
    : (drawn || resolveEasing(b.ease || dfltEase))(clamp01((t - a.t) / seg));
  return (prop, dflt) => lerp(a[prop] ?? dflt, b[prop] ?? dflt, p);
}

// keyHandleErrors(kfs, who) -> messages[]. Checked at boot (core/boot.js) and at author-check
// (core/validate.mjs), never per frame, as one function so the two cannot disagree. `through`
// computes a key's tangent from its neighbours and a handle authors it, so both on one key is two
// answers for one number; a named `ease` on the segment is a third. All three refused by name.
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

// `motionDelay` shifts the time at which one property is sampled off the same track (follow-through:
// scale finishes after position, rotation settles a beat later). Measured before it was built: 138 of
// 283 motion tracks in the library key position and scale/rot/opacity together, so the case is common.
//
// Adds no second interpretation rule (MISTAKES #563): the track is read exactly as before, only the
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

// Three things ask how fast a layer is going by evaluating the motion track twice and subtracting:
// motion blur (core/tracks/motion.js), ghost trail (core/fx/ghost.js), squash (core/fx/squash.js).
// One owner here rather than three disagreeing about window/clamp/units (MISTAKES #423). Pure: nothing
// is remembered between frames, so a backwards seek and a cold DOM give the same answer.

// poseBack(kfs, lt, dt): the pose `dt` seconds before local time `lt`, clamped at the layer's first
// pose (a film opening on a move opens with zero velocity, not an extrapolated one). Takes no
// `motionDelay` deliberately: velocity feeds motion blur and the follow track, which want the layer's
// travel (position), and a delay on `scale`/`rot` reading ahead would be reading the future.
export const poseBack = (kfs, lt, dt) => motionAt(kfs, Math.max(0, lt - dt));

// velocityAt(kfs, lt, dt): the layer's travel over the window ending at lt, in px per second (per
// second and not per frame: a frame-based threshold means two different speeds at 30fps and 60fps,
// MISTAKES #204). `now`/`prev` ride along so a caller does not re-sample the track. Named `prev`, not
// `then`: an object with a `then` key is a thenable and gets called as a promise callback.
// Divided by the window asked for, not the clamped one, so velocity tapers to zero at the layer's
// first frame instead of reading fastest there.
export function velocityAt(kfs, lt, dt) {
  if (!(dt > 0)) throw new Error(`velocityAt: dt must be a positive lookback in seconds, got ${JSON.stringify(dt)}.`);
  const now = motionAt(kfs, lt), prev = poseBack(kfs, lt, dt);
  const vx = (now.dx - prev.dx) / dt, vy = (now.dy - prev.dy) / dt;
  // `omega`, beside vx/vy rather than folded into `speed`: a layer that only turns (a pendulum, `ox`/`oy`
  // keyed) has zero translation, so vx/vy/speed read exactly zero however fast it spins. Translation
  // and rotation have no shared unit to add here (px/s vs deg/s); core/fx/squash.js converts this into
  // a tangential px/s at the layer's own extremity, where it becomes comparable.
  const omega = (now.rot - prev.rot) / dt;
  return { vx, vy, speed: Math.hypot(vx, vy), omega, now, prev };
}

// cameraVelocityAt(camKf, t, dt): the camera's translation over the window ending at t, in px/s, in
// the same space a layer's motion track speaks (through the same cameraAt/segmentAt evaluator, pure).
//
// x/y only: the flat camera is `scale(s) translate(x, y)`, the rig `translate3d(x, y, dollyZ(s))`, so
// translation lives in the same pre-projection space as a layer's dx/dy, and a layer travelling at
// -(camera velocity) sits still on the sensor. `s`/`roll`/`rx`/`ry` have RADIAL screen velocity,
// proportional to a layer's distance from frame centre, unanswerable without that layer's stage
// position, so they contribute nothing here rather than a wrong-but-plausible number.
//
// Clamped at t=0 like poseBack: a camera that has not moved yet has not been anywhere else.
export function cameraVelocityAt(camKf, t, dt) {
  if (!(dt > 0)) throw new Error(`cameraVelocityAt: dt must be a positive lookback in seconds, got ${JSON.stringify(dt)}.`);
  const now = cameraAt(camKf, t);
  if (!now) return { vx: 0, vy: 0, speed: 0 };
  const prev = cameraAt(camKf, Math.max(0, t - dt));
  const vx = (now.x - prev.x) / dt, vy = (now.y - prev.y) / dt;
  return { vx, vy, speed: Math.hypot(vx, vy) };
}
