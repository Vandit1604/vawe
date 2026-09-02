import { defineRegistry, withBlurb, blurbsOf } from './registry.js';
import { resolveCameraMove } from './vocab.js';
import { shake } from './motion.js';
import { motionAt } from './sequence.js';   // followCursor samples the cursor's OWN path evaluator
// core/camera-moves.js, CAMERA CHOREOGRAPHY generators: pure (params) → camera-keyframe array, the same
// shape core/sequence.js `cameraAt` interpolates ([{t,s,x,y,rx,ry,ease}], t in absolute seconds). A move
// is smooth and CALCULATED instead of hand-typed, and the multi-keyframe ones emit interior `ease:"linear"`
// automatically so a chained push is velocity-CONTINUOUS (docs/MISTAKES.md #125: a chained ease-in-out
// pulses because it zeroes velocity at every keyframe. The "shaking zoom"). Only the final settle eases
// out. All pure → renderFrame(n) stays seek-safe; assert the endpoints with `make lib-test`.
//
// Pan math: the camera transform is `scale(s) translate(x,y)` about the stage centre, so translating by
// (W/2 - tx, H/2 - ty) brings a target point (tx,ty) to centre at ANY scale, diveIn uses exactly this.
//
// Author sugar: `"cameraMove": { "move":"diveIn", ... }` at the scene root expands (make expand) to
// `data.camera`. Compose legs by hand for anything these don't cover.

const CENTER = { w: 1920, h: 1080 };

// EVERY DURATION HERE ADVANCES A CLOCK, so a non-positive one walks the keyframe times BACKWARD and the
// array stops being ascending. `cameraAt` scans for the bracketing pair assuming ascending `t`
// (core/sequence.js:31), so against a jumbled array it locks onto the last keyframe and the camera
// teleports to the destination at t=0 and stays there. A whole move silently deleted. A zero duration
// is the same class one step milder: two keys at the same `t` make cameraAt divide by zero and lerp NaN.
// Neither errors. `slowPush({dur:-4})` emits [0, -4] and `panFollow({dur:0})` emits [0, 0]; both looked
// like working calls. Guarded in ONE place because all six generators advance a clock the same way, and
// the review that caught it named only the two new ones (docs/MISTAKES.md #341).
const span = (move, key, v) => {
  if (!Number.isFinite(v) || v <= 0)
    throw new Error(`${move}: "${key}" must be a positive number of seconds (it advances the camera clock); got ${JSON.stringify(v)}`);
  return v;
};
// A HOLD may be zero (that just means "do not hold") but never negative, which rewinds the clock.
const hold = (move, key, v) => {
  if (v == null) return 0;
  if (!Number.isFinite(v) || v < 0)
    throw new Error(`${move}: "${key}" must be zero or a positive number of seconds; got ${JSON.stringify(v)}`);
  return v;
};

// slowPush: a gentle, continuous zoom in (the default "the frame is alive" move). One segment, ease-out.
export function slowPush({ start = 0, dur = 6, from = 1, to = 1.12, ease = 'easeOutCubic' } = {}) {
  span('slowPush', 'dur', dur);
  return [{ t: start, s: from, x: 0, y: 0 }, { t: start + dur, s: to, x: 0, y: 0, ease }];
}

// diveIn: zoom INTO a target point (a UI element, a face), which travels to centre as the scale grows.
// power4.out feel (fast in, long settle) via easeOutQuart. tx/ty in stage coords.
export function diveIn({ start = 0, dur = 1.6, tx, ty, to = 1.6, canvasW = CENTER.w, canvasH = CENTER.h,
  targetW, targetH, headroom = 0.88, ease = 'easeOutQuart' } = {}) {
  // tx/ty have no default and cannot have one: the whole move is "go to THIS point". Omit either and the
  // keyframe carried NaN, cameraAt lerped NaN, and the camera pose was NaN for the entire segment with
  // nothing said. The silent-substitution class this repo logs most. dollyZ already refuses a bad `s`
  // for the same reason, and this is the same refusal one field over.
  for (const [k, v] of [['tx', tx], ['ty', ty]]) {
    if (!Number.isFinite(v)) throw new Error(`diveIn needs a finite "${k}" (the stage coordinate to centre on); got ${JSON.stringify(v)}`);
  }
  span('diveIn', 'dur', dur);
  // HEADROOM. `to` was accepted at any value, and past a point the thing you dove at is BIGGER than the
  // frame: the camera lands with the target's edges outside the canvas, cropped, and nothing said a word.
  // The rule is that the target ends at most `headroom` of the frame on each axis, so
  // maxScale = min(0.88*W/targetW, 0.88*H/targetH). It REFUSES rather than clamps: a clamp is silent
  // substitution. The film renders a move nobody authored and the author never learns which, and this
  // engine's cardinal sin is exactly that (the tx/ty refusal three lines up is the same call).
  // KNOW THE LIMIT: this can only fire when the CALLER says how big the target is. This module cannot
  // measure a layer, so without targetW/targetH there is no size to check against and the guard is a
  // no-op. Pass them from wherever the size is known.
  if (targetW != null || targetH != null) {
    if (!(headroom > 0 && headroom <= 1))
      throw new Error(`diveIn: "headroom" is the share of the frame the target may fill (0 < h <= 1); got ${JSON.stringify(headroom)}`);
    const lim = [];
    for (const [k, v, frame] of [['targetW', targetW, canvasW], ['targetH', targetH, canvasH]]) {
      if (v == null) continue;
      if (!Number.isFinite(v) || v <= 0)
        throw new Error(`diveIn: "${k}" must be a positive size in stage units; got ${JSON.stringify(v)}`);
      lim.push(headroom * frame / v);
    }
    const maxScale = Math.min(...lim);
    if (to > maxScale)
      throw new Error(`diveIn: "to" ${to} pushes a ${targetW ?? '?'}x${targetH ?? '?'} target past the frame.`
        + ` At most ${maxScale.toFixed(3)} keeps it inside ${Math.round(headroom * 100)}% of the`
        + ` ${canvasW}x${canvasH} canvas. Lower "to", or raise "headroom" if you mean to crop.`);
  }
  return [
    { t: start, s: 1, x: 0, y: 0 },
    { t: start + dur, s: to, x: canvasW / 2 - tx, y: canvasH / 2 - ty, ease },
  ];
}

// panFollow: the camera TRANSLATES to keep pace with content that grows downward (the "terminal types
// while the camera pans down" move). Linear so the pan tracks the typing at constant speed, no easing lurch.
export function panFollow({ start = 0, dur = 5, dx = 0, dy = -300, s = 1, ease = 'linear' } = {}) {
  span('panFollow', 'dur', dur);
  return [{ t: start, s, x: 0, y: 0 }, { t: start + dur, s, x: dx, y: dy, ease }];
}

// workspaceZoomOut: start pushed IN on a detail, then pull back to reveal the whole workspace (the
// opposite of diveIn). Ends on a slow settle.
export function workspaceZoomOut({ start = 0, dur = 3, from = 1.4, to = 1, tx, ty, canvasW = CENTER.w,
  canvasH = CENTER.h, ease = 'easeOutCubic' } = {}) {
  span('workspaceZoomOut', 'dur', dur);
  const fx = tx != null ? canvasW / 2 - tx : 0, fy = ty != null ? canvasH / 2 - ty : 0;
  return [{ t: start, s: from, x: fx, y: fy }, { t: start + dur, s: to, x: 0, y: 0, ease }];
}

// orbit: a gentle 3D swing around the frame (ry sweeps through 0), giving depth to a dimensional beat.
// 3 keyframes → interior gets ease:"linear" so the swing is one continuous arc, not two eased halves.
export function orbit({ start = 0, dur = 6, deg = 12, s = 1.05, ease = 'easeInOutSine' } = {}) {
  span('orbit', 'dur', dur);
  const mid = start + dur / 2;
  return [
    { t: start, s, x: 0, y: 0, ry: -deg },
    { t: mid, s, x: 0, y: 0, ry: 0, ease: 'linear' },   // interior: linear keeps velocity continuous (#125)
    { t: start + dur, s, x: 0, y: 0, ry: deg, ease },
  ];
}

// multiPhase: chain several legs into one journey (push → hold-with-drift → settle). Each leg is
// { dur, s?, x?, y? }; interior keyframes get ease:"linear" so the whole path is velocity-continuous and
// a "hold" leg still creeps (never a dead freeze). Only the last leg eases out.
export function multiPhase({ start = 0, legs = [], settleEase = 'easeOutCubic' } = {}) {
  const kf = [{ t: start, s: 1, x: 0, y: 0 }];
  let t = start;
  legs.forEach((leg, i) => {
    t += span('multiPhase', `legs[${i}].dur`, leg.dur ?? 1);
    const last = i === legs.length - 1;
    // Every axis a leg does not mention CARRIES FORWARD. `s` always did; x and y defaulted to 0 on the
    // same line, so the documented "hold" leg (`{dur: 2}` between a push and a settle) was not a hold at
    // all. It panned the camera the whole way back to centre, 180px over 2s in the docstring's own
    // example, a move as large as the push it was supposed to be holding after. The right idiom was
    // known and applied to one of three axes (docs/MISTAKES.md #197).
    const prev = kf[kf.length - 1];
    kf.push({ t, s: leg.s ?? prev.s, x: leg.x ?? prev.x, y: leg.y ?? prev.y, ease: last ? settleEase : 'linear' });
  });
  return kf;
}

// travel. The station-to-station journey: one continuous flight that visits several points in STAGE
// coords (in on element A, across to element B, out to the whole board). Two films in the library spell
// this out with 12 and 20 hand-typed keyframes; the arithmetic they were re-deriving is the pan math at
// the top of this file, which is why multiPhase (raw x/y deltas) is not a substitute.
// Each station is { tx, ty, s?, dwell?, dur? }: `dur` is the flight INTO the station, `dwell` a hold AT
// it once arrived. Station 0 is where the flight BEGINS, so nothing flies into it and its `dur` is unused.
// Author the wide shot as station 0 when the film should open full-frame and fly in.
// Interiors are linear on purpose: an eased curve at every station zeroes velocity on each arrival, so
// the journey lands as N separate hops instead of one move (docs/MISTAKES.md #125). Only the last
// arrival settles.
export function travel({ stations, start = 0, ease = 'easeOutCubic', canvasW = CENTER.w,
  canvasH = CENTER.h } = {}) {
  if (!Array.isArray(stations) || !stations.length)
    throw new Error(`travel needs a non-empty "stations" array; got ${JSON.stringify(stations ?? null)}`);
  const kf = [];
  let prev = { s: 1, x: 0, y: 0 }, t = start, lastArrival = 0;
  stations.forEach((st, i) => {
    // A station may legitimately OMIT tx/ty (that is the carry-forward, a zoom in place). A station that
    // SUPPLIES one non-finite is a typo, and it would poison every later keyframe through prev, one bad
    // station silently NaNs the rest of the journey, not just its own stop.
    for (const k of ['tx', 'ty', 's']) {
      if (st && st[k] != null && !Number.isFinite(st[k]))
        throw new Error(`travel station ${i}: "${k}" must be a finite number; got ${JSON.stringify(st[k])}`);
    }
    // Every axis a station does not mention CARRIES FORWARD, all three of them: a station with only `s`
    // is a zoom in place, one with only tx/ty pans at the scale it arrived with. multiPhase carried `s`
    // and reset x/y to 0 on the same line, which turned its documented hold into a pan home (#197).
    const pose = {
      s: st.s ?? prev.s,
      x: st.tx == null ? prev.x : canvasW / 2 - st.tx,
      y: st.ty == null ? prev.y : canvasH / 2 - st.ty,
    };
    if (i > 0) t += span('travel', `station ${i} "dur"`, st.dur ?? 0.8);
    const arrive = { t, ...pose };
    if (i > 0) arrive.ease = 'linear';
    lastArrival = kf.push(arrive) - 1;
    // A dwell is a second keyframe at the SAME pose, so the hold is a real hold rather than the tail of
    // the incoming tween creeping on.
    if (hold('travel', `station ${i} "dwell"`, st.dwell)) { t += st.dwell; kf.push({ t, ...pose, ease: 'linear' }); }
    prev = pose;
  });
  // The settle belongs to the ARRIVAL at the final station, never to a dwell keyframe behind it: a hold
  // has no motion left to ease, and easing into it would brake the flight twice.
  if (lastArrival > 0) kf[lastArrival].ease = ease;
  return kf;
}

// truck: the plain lateral travel (the camera runs along a wall of cards). panFollow's defaults are
// VERTICAL (dy: -300), so a sideways move had no name and got hand-typed each time. Linear because a
// constant-speed side move reads as the camera tracking; an eased one reads as a lurch.
export function truck({ start = 0, dur = 3, dx = -1920, s = 1, ease = 'linear' } = {}) {
  span('truck', 'dur', dur);
  return [{ t: start, s, x: 0, y: 0 }, { t: start + dur, s, x: dx, y: 0, ease }];
}

// cameraShake: an IMPACT, pre-sampled to keyframes. The randomness is the engine's own deterministic
// `shake()` (core/motion.js, hashSeed/noise, lib-tested): sampled HERE, at author time, so renderFrame(n)
// only ever lerps numbers. Nothing stochastic runs at render time, by then the shake is DATA.
//
// Why one key PER FRAME instead of two keys per held step: the reference is a stepped table (14 steps of
// 0.03s, about one frame each at 30fps), and a step held across a lerp needs an arrive key AND a hold key.
// At fps sampling the two collapse: a key per frame IS the frame the renderer shows, so what the lerp
// does between adjacent keys is never seen. Half the keyframes for the same picture, and `freq`/`decay`
// stay real knobs instead of a frozen table.
//
// The defaults ARE that reference, restated as an envelope: amp 28 decaying to about 2 over 0.42s gives
// decay ≈ 6.3, and the table's sign flip every 0.03s is a ~16Hz oscillation. `y` is 0.7 of `x`, as
// measured. Then 0.1s of recovery to exactly zero, eased out, so the frame LANDS instead of stopping.
//
// THE INTERIOR-EASE EXEMPTION, and why it is deliberate: every other move in this file forces
// `ease:"linear"` on interiors so a chained tween stays velocity-continuous (#125, an eased curve at
// every key zeroes velocity and the push pulses). A shake IS that pulse. The samples reverse direction
// every frame or two, so the velocity discontinuity #125 forbids is here on purpose; the linear interiors
// below are not the rule being obeyed, they are what a per-frame sample wants between neighbours. The one
// eased key is the final recovery, because the settle is the only part of an impact that is a MOVE.
export function cameraShake({ start = 0, dur = 0.42, amp = 28, freq = 16, decay = 6.3, seed = 1,
  recover = 0.1, fps = 30 } = {}) {
  span('cameraShake', 'dur', dur);
  hold('cameraShake', 'recover', recover);
  if (!Number.isFinite(fps) || fps <= 0)
    throw new Error(`cameraShake: "fps" must be a positive sample rate; got ${JSON.stringify(fps)}`);
  const step = 1 / fps;
  const kf = [{ t: start, s: 1, x: 0, y: 0 }];
  // n starts at 1: the sample AT the hit is the zero key above (shake(0) is {0,0} by contract).
  for (let n = 1; n * step <= dur + 1e-9; n++) {
    const dt = n * step;
    const o = shake(dt, { amp, freq, decay, seed });
    kf.push({ t: start + dt, s: 1, x: o.x, y: o.y * 0.7, ease: 'linear' });
  }
  if (recover > 0) kf.push({ t: start + dur + recover, s: 1, x: 0, y: 0, ease: 'easeOutQuad' });
  return kf;
}

// punchIn. The crash zoom: the frame is THROWN at you, recoils, and rings out. Three legs, and the ease
// FAMILY is the whole point. Every other move here is a `.out` (fast, then settle) because it is a move.
// This one accelerates INTO frame, so leg 1 is `easeInExpo`: nothing, nothing, then all of it at once.
// Leg 2 is the recoil past the resting scale (a squash below `to`), leg 3 rings back with
// `easeOutElastic`. Both easings already exist in EASINGS (core/motion.js), nothing was approximated.
// Interiors are NOT linear and must not be: the velocity break at each key IS the impact, the same
// deliberate exemption from #125 that cameraShake takes above.
export function punchIn({ start = 0, dur = 0.32, from = 0.72, to = 1, squash = 0.96, squashDur = 0.08,
  settleDur = 0.5 } = {}) {
  span('punchIn', 'dur', dur);
  span('punchIn', 'squashDur', squashDur);
  span('punchIn', 'settleDur', settleDur);
  for (const [k, v] of [['from', from], ['to', to], ['squash', squash]]) {
    if (!(Number.isFinite(v) && v > 0))
      throw new Error(`punchIn: "${k}" must be a positive magnification; got ${JSON.stringify(v)}`);
  }
  const t1 = start + dur, t2 = t1 + squashDur;
  return [
    { t: start, s: from, x: 0, y: 0 },
    { t: t1, s: to, x: 0, y: 0, ease: 'easeInExpo' },
    { t: t2, s: squash, x: 0, y: 0, ease: 'easeOutQuad' },
    { t: t2 + settleDur, s: to, x: 0, y: 0, ease: 'easeOutElastic' },
  ];
}

// driftHold: a held frame that is never DEAD. A sine micro-drift, pre-sampled on the same author-time
// contract as cameraShake (the render only lerps). Two things make it read as breathing rather than as
// machinery: the amplitude sits under the threshold where the eye reads travel between two frames (2-8px
// on x, 1-4px on y across seconds), and x/y run at DIFFERENT frequencies. A 1.0 ratio walks a perfect
// diagonal and looks mechanical; ~1.3 traces a Lissajous that never quite closes inside the window.
// 10 keys per cycle is plenty: a sine sampled that finely is not distinguishable from the curve.
export function driftHold({ start = 0, dur = 4, ax = 6, ay = 3, cycles = 1.5, ratio = 1.3, s = 1,
  keysPerCycle = 10 } = {}) {
  span('driftHold', 'dur', dur);
  if (!Number.isFinite(cycles) || cycles <= 0)
    throw new Error(`driftHold: "cycles" must be a positive number of cycles across the window; got ${JSON.stringify(cycles)}`);
  // A drift the eye can catch frame to frame is not a drift, it is a shake wearing the wrong name, and
  // nothing downstream would ever say so. cameraShake is one word away.
  for (const [k, v] of [['ax', ax], ['ay', ay]]) {
    if (!Number.isFinite(v) || Math.abs(v) > 12)
      throw new Error(`driftHold: "${k}" must be a micro-amplitude (|${k}| <= 12px); got ${JSON.stringify(v)}.`
        + ` Larger and it reads as a discrete shake per frame, use cameraShake if that is what you want.`);
  }
  const n = Math.max(2, Math.round(cycles * keysPerCycle));
  const kf = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ph = 2 * Math.PI * cycles * u;
    kf.push({ t: start + dur * u, s, x: ax * Math.sin(ph), y: ay * Math.sin(ph * ratio),
      ...(i ? { ease: 'linear' } : {}) });
  }
  return kf;
}

// dollyZoom. THE VERTIGO SHOT: the subject holds its exact size while the world behind it rushes in or
// falls away. Every other move in this file reframes; this one changes the RELATIONSHIP between planes,
// and it is the only move here that does not touch `s`.
//
// It is NOT an approximation, and it is not free either. The whole effect is one identity: under the
// camera rig (formats/scene/scene.js) a point at depth z is magnified by
//
//     m(z) = s * L / (L - s * z)          L = the lens (`p`), s = where the camera stands (dollyZ)
//
// At z = 0. The picture plane every layer sits on unless it says otherwise, that collapses to m = s,
// with no L in it at all. So holding `s` and ramping `p` moves the eye (the camera's own translateZ is
// L * (1 - 1/s), a function of the lens) while the subject's magnification cannot change. Behind it, a
// layer at z = -D is magnified by s*L / (L + s*D), which climbs with L. That difference IS the shot.
//
// WHAT IT CANNOT DO: nothing. There is no depth in a frame where every layer is on the picture plane,
// and this move renders as a still there, correctly, because m = s everywhere and there is no
// relationship left to change. The subject holds because it is on the plane; the field only moves if
// something STANDS somewhere, so give the backdrop layers `"modifiers": [{ "plane": -800 }]` and spread
// them. A scene that ramps the lens with nothing off the plane is refused by name at boot rather than
// rendered as a held frame.
//
// DIRECTION. `from` > `to` (the default) opens the lens as the eye comes in: the background SHRINKS AWAY
// and the space behind the subject stretches. The falling, ground-gives-way read Hitchcock shot it for.
// `from` < `to` closes the lens: the background swells up to the subject and the space compresses, which
// is the dread-arriving half of the same device.
export function dollyZoom({ start = 0, dur = 2.4, from = 2600, to = 900, s = 1, ease = 'easeInOutCubic' } = {}) {
  span('dollyZoom', 'dur', dur);
  // The lens is a DISTANCE from the eye to the picture plane, so zero or negative puts the eye on or
  // behind the plane it is looking at and CSS projects it anyway, mirrored, without a word.
  for (const [k, v] of [['from', from], ['to', to]]) {
    if (!(Number.isFinite(v) && v > 0))
      throw new Error(`dollyZoom: "${k}" is the lens distance in px and must be positive; got ${JSON.stringify(v)}`);
  }
  if (!(Number.isFinite(s) && s > 0))
    throw new Error(`dollyZoom: "s" is where the camera stands and must be a positive magnification; got ${JSON.stringify(s)}`);
  // Equal ends are the whole move deleted. It would render a held frame that looks like a deliberate
  // one, which is the silent-substitution shape this engine refuses everywhere else.
  if (from === to)
    throw new Error(`dollyZoom: "from" and "to" are both ${from}, so the lens never changes and nothing`
      + ` counter-scales. The move IS the lens ramp, give the two ends different distances.`);
  // `s` is stated on BOTH keys and never ramped: the subject holds because its magnification is exactly
  // `s`, and a second value would put it back on the scale ramp this move exists to cancel.
  return [
    { t: start, s, x: 0, y: 0, p: from },
    { t: start + dur, s, x: 0, y: 0, p: to, ease },
  ];
}

// followCursor. THE CAMERA DERIVED FROM THE POINTER: the `cursor` layer's own `path` and `clicks` are
// the single owner of where the camera goes. Nothing else in this file reads a layer, and this one does
// not either: the sugar resolver (core/produce.js bindCursorCamera) hands the path, the click list and
// the layer's base offset over, so the generator stays a pure (params) -> keyframes function like its
// eleven neighbours and lib-test can drive it with no scene at all.
//
// WHY IT EXISTS. An author who wrote `path` and `clicks` had already stated exactly where the pointer
// goes and when it presses. Reaching for `diveIn` after that means typing the same coordinates a second
// time and keeping the two copies in step by eye, which is the one-fact-two-owners defect this repo
// logs more than any other (docs/MISTAKES.md #423).
//
// THE SHOT. Push toward the point the pointer is ABOUT to press, arrive `lead` seconds BEFORE the
// press, hold across it, then release to the wide frame. Arriving after the press is worthless: the
// viewer has already been shown the result at the wrong size. `lead` is small on purpose, 0.18s, about
// five frames: enough that the frame has settled when the ripple fires, short enough that the camera
// still reads as chasing the pointer rather than as knowing the future.
//
// RESTRAINT, AND WHY IT NEEDS NO KNOB. Six clicks must not be six crash zooms. Two rules, both derived:
//   TIME   the camera releases only if it has time to release AND push again before the next press.
//          That window is exactly `dwell + release + dur + lead`, so it is computed, never authored:
//          a second knob would be a second opinion about the same arithmetic and would drift from it.
//   SPACE  two presses closer together than `regroup` px share ONE framing. The camera holds and the
//          pointer moves inside the frame, which is what a person watching a demo actually does.
// Clicks that fail both merge into one continuous flight: hold, travel, hold, one release at the end.
export function followCursor({ path, clicks, base = [0, 0], start = 0, to = 1.35, lead = 0.18,
  dur = 0.9, dwell = 0.6, release = 0.8, regroup = 160, canvasW = CENTER.w, canvasH = CENTER.h,
  ease = 'easeOutQuart', reframeEase = 'easeInOutCubic' } = {}) {
  if (!Array.isArray(path) || !path.length)
    throw new Error('followCursor needs the cursor layer\'s "path" ([{t,x,y}]); it is the only thing that'
      + ' says where the camera goes. Give the cursor a path, or hand-key `diveIn` at a fixed point.');
  path.forEach((k, i) => {
    for (const f of ['t', 'x', 'y']) {
      if (!Number.isFinite(k && k[f]))
        throw new Error(`followCursor: cursor path key ${i} has a non-numeric "${f}" (${JSON.stringify(k && k[f])}).`
          + ' A cursor path is absolute stage px on a real clock; a relative coordinate cannot be aimed at.');
    }
  });
  if (!Array.isArray(clicks) || !clicks.length)
    throw new Error('followCursor needs the cursor layer\'s "clicks" ([t...]): the move IS the arrival at a'
      + ' press, so with none there is no moment to arrive at. Add a click, or use `travel`/`panFollow`'
      + ' to follow the pointer without one.');
  for (const c of clicks) {
    if (!Number.isFinite(c) || c < 0)
      throw new Error(`followCursor: every "clicks" entry is a time in seconds from the cursor layer's own start; got ${JSON.stringify(c)}`);
  }
  span('followCursor', 'dur', dur);
  span('followCursor', 'release', release);
  hold('followCursor', 'lead', lead);
  hold('followCursor', 'dwell', dwell);
  hold('followCursor', 'regroup', regroup);
  if (!(Number.isFinite(to) && to >= 1))
    throw new Error(`followCursor: "to" is the magnification held over the press and must be >= 1; got ${JSON.stringify(to)}`);
  if (!Array.isArray(base) || base.length !== 2 || !base.every(Number.isFinite))
    throw new Error(`followCursor: "base" is the cursor layer's own [x, y] in stage px; got ${JSON.stringify(base)}`);

  // The pointer's ABSOLUTE stage position at a layer-local time. `path` x/y are offsets from the layer's
  // base (core/layers/cursor.js), and motionAt is the same evaluator the pointer itself is drawn with,
  // so the camera cannot aim anywhere the cursor is not. One fact, one owner.
  const pointAt = (lt) => { const m = motionAt(path, lt); return [base[0] + m.dx, base[1] + m.dy]; };
  const poseAt = (pt) => ({ s: to, x: canvasW / 2 - pt[0], y: canvasH / 2 - pt[1] });

  // The window inside which releasing would be undone before it finished. Derived, not authored.
  const settle = dwell + release + dur + lead;
  const shots = [];
  for (const c of [...clicks].sort((a, b) => a - b)) {
    const at = start + c, pt = pointAt(c), cur = shots[shots.length - 1];
    if (cur && at - cur.end <= settle) {
      const last = cur.stops[cur.stops.length - 1].pt;
      if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) > regroup) cur.stops.push({ arrive: at - lead, pt });
      cur.end = at;
    } else shots.push({ stops: [{ arrive: at - lead, pt }], end: at });
  }

  const kf = [];
  // KEYFRAME TIMES MUST ASCEND, or cameraAt locks onto the last key and the whole move is deleted (the
  // reason `span` exists at the top of this file). Two shapes reach the writer below and they are NOT
  // the same shape, which the first cut of this got wrong: it dropped the PREDECESSOR whenever a key
  // was not later, so with the shot spacing broken it quietly emitted a DESCENDING array instead of
  // failing. A key carrying a new pose therefore refuses; only a HOLD, which by definition has nothing
  // to hold when no time is left, is dropped.
  const holdKey = (k) => { if (!kf.length || k.t > kf[kf.length - 1].t) kf.push(k); };
  const poseKey = (k) => {
    if (kf.length && k.t <= kf[kf.length - 1].t)
      throw new Error(`followCursor: a key at ${k.t.toFixed(3)}s would land on or before the one at `
        + `${kf[kf.length - 1].t.toFixed(3)}s, and a jumbled array deletes the whole move. The spacing `
        + 'between shots is derived from dur/lead/dwell/release, so one of those has been pushed past '
        + 'what the click times leave room for.');
    kf.push(k);
  };
  for (const shot of shots) {
    const first = shot.stops[0];
    if (first.arrive <= start)
      throw new Error(`followCursor: the click at ${(first.arrive + lead - start).toFixed(2)}s lands before the`
        + ` camera can lead it (it needs ${lead}s of lead). Move the click later, lower "lead", or start the`
        + ' cursor layer earlier.');
    // Open wide, and hold there until the push begins. The push is CLIPPED, never rewound, when a click
    // sits closer to the cursor's own start than `dur`: a shorter push is still a shot, a negative one
    // is a jumbled keyframe array.
    const open = Math.max(start, first.arrive - dur, kf.length ? kf[kf.length - 1].t : start);
    holdKey({ t: open, s: 1, x: 0, y: 0, ...(kf.length ? { ease: 'linear' } : {}) });
    poseKey({ t: first.arrive, ...poseAt(first.pt), ease });
    let prevPress = first.arrive + lead;
    for (const st of shot.stops.slice(1)) {
      // A reframe inside one shot is a TRAVEL between two framings, not a second push: hold the current
      // pose until the move has to begin, then ease across. The hold key is dropped by `push` when the
      // two presses are so close that there is nothing left to hold.
      const prev = kf[kf.length - 1];
      // IT MAY NOT LEAVE THE PRESS IT IS HOLDING. `st.arrive - dur` alone put the departure 0.03s
      // BEFORE the first click of the demo probe: the camera was already sliding away as the ripple
      // fired, which is this move's own failure (arrive late) reached from the other side. So the
      // hold runs PAST the press, by `dwell` where there is room and by half the gap where there is
      // not, and the reframe takes what is left. Half, never all: a reframe with no time is a whip.
      const leave = Math.max(prev.t, st.arrive - dur,
        Math.min(prevPress + dwell, (prevPress + st.arrive) / 2));
      holdKey({ t: leave, s: prev.s, x: prev.x, y: prev.y, ease: 'linear' });
      poseKey({ t: st.arrive, ...poseAt(st.pt), ease: reframeEase });
      prevPress = st.arrive + lead;
    }
    if (dwell > 0) { const p = kf[kf.length - 1]; holdKey({ t: shot.end + dwell, s: p.s, x: p.x, y: p.y, ease: 'linear' }); }
    poseKey({ t: kf[kf.length - 1].t + release, s: 1, x: 0, y: 0, ease: reframeEase });
  }
  return kf;
}

// name → generator, each carrying its own catalogue row. The descriptions used to live in a hand-kept
// map inside scripts/site/effects-catalog.mjs, which knew eight of the eleven: cameraShake, punchIn and
// driftHold rendered as an em-dash in docs/EFFECTS.md, so three of the engine's camera moves existed and
// could not be chosen. The blurb rides the entry non-enumerably (core/registry.js), so CAMERA_MOVES is
// still exactly a name → function map for everything that walks it.
export const CAMERA_MOVES = {
  slowPush: withBlurb('gentle continuous zoom in (the frame stays alive)', slowPush),
  diveIn: withBlurb('zoom INTO a target point (it travels to centre)', diveIn),
  panFollow: withBlurb('camera pans to track downward-growing content (terminal)', panFollow),
  workspaceZoomOut: withBlurb('pull back from a detail to reveal the whole', workspaceZoomOut),
  orbit: withBlurb('a gentle 3D swing around the frame (ry through 0)', orbit),
  multiPhase: withBlurb('chain legs into one journey (push, hold-drift, settle)', multiPhase),
  travel: withBlurb('station-to-station flight between points in STAGE coords. THE CAMERA AS THE TRANSITION (no cut)', travel),
  truck: withBlurb('plain lateral travel, linear, so it reads as tracking rather than a lurch', truck),
  cameraShake: withBlurb('an IMPACT: a decaying ~16Hz shake pre-sampled at author time to one key per frame, then 0.1s of eased recovery so the frame LANDS instead of stopping', cameraShake),
  punchIn: withBlurb('a crash zoom: the frame accelerates AT you (easeInExpo), recoils past its resting scale, then rings back elastic. the only move here that is not a `.out`', punchIn),
  dollyZoom: withBlurb('THE VERTIGO SHOT: the lens ramps while the camera holds its distance, so the subject on the picture plane keeps its exact size and the world BEHIND it rushes in or falls away · the only move here that changes the relationship between planes rather than the framing, and it needs layers standing at a `plane` depth or there is nothing to counter-scale against', dollyZoom),
  followCursor: withBlurb('THE CAMERA FOLLOWS THE CURSOR: derived from the `path` and `clicks` on a `cursor` layer, so the pointer stays the single owner of where the camera goes. It pushes toward the spot the pointer is about to click, arrives just BEFORE the click, holds across it and releases. Clicks too close in time or space share one framing, so six clicks are never six crash zooms', followCursor),
  driftHold: withBlurb('a held frame that is never dead: a sub-12px Lissajous micro-drift, x and y at different frequencies so it breathes instead of walking a diagonal', driftHold),
};
export const CAMERA_MOVE_NAMES = Object.keys(CAMERA_MOVES);
export const CAMERA_MOVE_BLURBS = blurbsOf('camera move', CAMERA_MOVES);

// The params a move accepts, READ OFF ITS OWN SIGNATURE rather than declared in a table beside it. A
// table is a second source of truth that drifts the first time somebody adds a param, and this file's
// whole contract is that the vocabulary derives from the code (CAMERA_MOVES above does the same).
// Nothing minifies here: core/*.js is served raw to the browser and imported raw by the gates.
const paramsOf = (f) => {
  const src = String(f);
  const open = src.indexOf('{', src.indexOf('('));
  if (open < 0) return null;                       // not a destructuring signature: cannot say, so don't
  let depth = 0, close = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { close = i; break; }
  }
  if (close < 0) return null;
  const names = [];
  let d = 0, cur = '';
  for (const ch of src.slice(open + 1, close)) {
    if ('{[('.includes(ch)) d++;
    else if ('}])'.includes(ch)) d--;
    if (ch === ',' && d === 0) { names.push(cur); cur = ''; } else cur += ch;
  }
  names.push(cur);
  return new Set(names.map((n) => n.split('=')[0].trim()).filter(Boolean));
};

// A move that centres a POINT needs to know the frame it is centring in. Landscape is only the default
// because this module cannot see the scene; the sugar path can, so it must pass it.
const TARGETING = new Set(['diveIn', 'workspaceZoomOut', 'travel', 'followCursor']);
const targetsAPoint = (name, params) => TARGETING.has(name)
  // followCursor centres a point ALWAYS, and it is the one move here that does not name it in the spec:
  // the point comes from the cursor's path. So it can never be excused by "no tx/ty was written", which
  // is exactly how it would have mis-centred every portrait demo by 420px per axis in silence.
  && (name === 'followCursor' || params.tx != null || params.ty != null
    || (Array.isArray(params.stations) && params.stations.some((s) => s && (s.tx != null || s.ty != null))));

// buildCameraMove(spec, canvas). The sugar resolver: { move, ...params } → a camera-keyframe array.
// `canvas` is [W, H] from the scene's own aspect (scripts/author/expand-blocks.mjs passes sceneDims(d)).
export function buildCameraMove(spec, canvas = null) {
  if (!spec || !spec.move) throw new Error('cameraMove needs a "move" name');
  // A SHOT WORD resolves to a move name first ("pull back" → workspaceZoomOut), so the description a
  // director would say is accepted in the slot the code name is accepted (core/vocab.js). A real move
  // name passes through untouched, so nothing already authored changes.
  const move = resolveCameraMove(spec.move);
  const f = CAMERA_MOVES[move];
  if (!f) CAMERA_REGISTRY.pick(move);        // throws, and names the other list if the word belongs to one
  const { move: _written, ...params } = spec;
  // A KEY THIS MOVE DOES NOT READ IS A TYPO, and a silently dropped param is the worst failure class in
  // this engine: `station:` for `stations:` reached travel as an ignored extra and threw about a missing
  // array; `too:` for `to:` on slowPush would have rendered a move nobody asked for and said nothing.
  const known = paramsOf(f);
  if (known) {
    const unknown = Object.keys(params).filter((k) => !known.has(k));
    if (unknown.length) throw new Error(`cameraMove "${move}" does not read ${unknown.map((k) => `"${k}"`).join(', ')}`
      + `. It accepts: ${[...known].join(', ')}. A dropped param renders a move you did not author.`);
  }
  // The pan math is `canvasW/2 - tx`, so a landscape default under a 1080x1920 portrait scene mis-centres
  // every target by 420px on each axis, silently. No scene in the library hits this today, because every
  // one that names a target also spells out canvasW/canvasH by hand, which is the workaround that says
  // the default was wrong. Resolve it from the scene, and refuse to guess when nobody can supply it.
  if (targetsAPoint(move, params)) {
    if (canvas) { params.canvasW = params.canvasW ?? canvas[0]; params.canvasH = params.canvasH ?? canvas[1]; }
    if (params.canvasW == null || params.canvasH == null)
      throw new Error(`cameraMove "${move}" centres a point (tx/ty), so it needs the frame it centres in.`
        + ` Pass the scene canvas as buildCameraMove(spec, sceneDims(data)), or set canvasW/canvasH on the spec.`);
  }
  return f(params);
}

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a camera move" when someone writes it somewhere else. core/registry.js.
export const CAMERA_REGISTRY = defineRegistry('camera move', Object.fromEntries(CAMERA_MOVE_NAMES.map((n) => [n, n])), { slot: 'cameraMove.move', blurbs: CAMERA_MOVE_BLURBS,
  catalog: {
    title: 'Camera moves',
    tag: 'camera',
    intro: '`"cameraMove": { "move":"<name>", ... }`. A calculated camera path → `data.camera` (smooth, velocity-continuous). `{ "move":"diveIn","tx":960,"ty":300,"to":1.6 }`',
    usage: (n, { j }) => j({ cameraMove: { move: n } }),
    noPreview: 'a camera move is only legible against a scene laid out for it, which is the film, not a swatch.',
  },
});
// The slot is `cameraMove.move` and not `cameraMove`: nothing reads a bare `"cameraMove": "slowPush"`,
// bakeCameraMove (core/produce.js) reads `spec.move` off the object. The short form made `make arsenal`
// print a paste that throws.

// A CAMERA DIAL is a top-level scene key that changes what the camera DOES rather than where it goes,
// and until now there was no way to find one. `make arsenal` searches registries, so a film-level dial
// was invisible to the one tool an author is told to reach for before inventing anything: you could
// only meet `cameraBlur` by reading schema.json. Registered for exactly the reason FILTER_REGISTRY was,
// so the search can answer for the engine and not for a hand-kept index (core/registry.js).
export const CAMERA_DIAL_REGISTRY = defineRegistry('camera dial', { cameraBlur: 'cameraBlur' }, {
  slot: 'cameraBlur (a top-level boolean)',
  blurbs: {
    cameraBlur: 'CAMERA MOTION BLUR: blur the frame when the camera whips. Every layer smears by its '
      + 'velocity RELATIVE TO THE CAMERA, so a fast pan streaks the whole frame and a layer travelling '
      + 'with the camera stays sharp. Off by default; the film\'s `shutter` (degrees) says how much, and '
      + 'one layer opts out with `motionBlur: false`. A zoom and a roll are radial and are not modelled',
  },
  catalog: {
    title: 'Camera dials',
    tag: 'camera',
    intro: 'Top-level scene keys that change what the camera DOES rather than where it goes. `"cameraBlur": true` gives the film a real shutter: every layer smears by its velocity RELATIVE to the camera, so a whip pan streaks the frame and a layer travelling with the camera stays sharp. How much is the film\'s `shutter`, in degrees; one layer opts out with `motionBlur: false`.',
    usage: (_, { j }) => j({ cameraBlur: true }),
    noPreview: 'a shutter is only visible on a frame that is already moving fast, and the whole point is that it is invisible on a still. Its A/B is formats/scene/_camera-blur-probe.json, which renders the same whip pan with the dial up and down.',
  },
});

