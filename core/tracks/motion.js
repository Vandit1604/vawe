// core/tracks/motion.js. The motion track: compose element choreography ON TOP of the enter/exit/cut
// transform (which driveClips and the `enter` track already wrote to el.style), and multiply into the
// composed opacity. Last before the modifiers, because every track above it writes a transform this
// one is meant to carry rather than replace.
import { motionAt, velocityAt } from '../timeline/sequence.js';
import { baseOpacity } from './util.js';

// PX PER SECOND, not per frame. It was 16 px/frame, which sounds fps-neutral and is not: at 30fps that
// is 480 px/s, and at 60fps the same physical motion covers 8px per frame, drops under the floor, and
// auto motion blur SILENTLY STOPS ENGAGING. Rendering the same film at 60 for smoothness therefore
// threw away the blur that makes its fastest moves read, which is the opposite of what the author
// asked for and nothing would have said a word (docs/MISTAKES.md #204).
const AUTO_BLUR_FLOOR_PER_SEC = 480;
// The DEFAULT shutter, and only the default. higgsfield-recreation's own hand-picked value for its
// fastest layer, which is 0.16 of the frame, about a 58 degree shutter angle in a camera's units.
// A scene sets its own with a top-level `shutter` in DEGREES (180 is the film standard, 360 is double
// the smear, 0 turns the automatic half off), and that is the whole of item 6 in
// docs/CRAFT/AFTER-EFFECTS-RECIPES.md: the sampler was already automatic and had no dial.
const AUTO_SHUTTER = 0.16;

export const slot = 'transform';

// `motionBlur` is derived from the DISTANCE between two samples of the motion track, so without a track
// there is nothing to differentiate and the prop decides nothing, including `motionBlur: false`, which
// opts out of an automatic blur that a still layer would never have had.
export const PROPS = {
  // Read here and by core/tracks/box.js and the scene's own pose pass, all three through motionAt.
  motionDelay: { when: 'motion' }, motion: {}, motionBlur: { when: 'motion' } };

// The scene's shutter, in the units a camera states it in, converted once. Exported so the one place
// that builds the track kit reads the conversion rather than restating it (formats/scene/scene.js).
export const DEFAULT_SHUTTER = AUTO_SHUTTER;
export function resolveShutter(deg) {
  if (deg == null) return AUTO_SHUTTER;
  if (typeof deg !== 'number' || !Number.isFinite(deg) || deg < 0 || deg > 360)
    throw new Error(`\`shutter\` is a SHUTTER ANGLE in degrees, 0 to 360: 180 is the film standard, `
      + `360 is twice the smear, 0 turns the automatic motion blur off for the whole film. Got `
      + `${JSON.stringify(deg)}. It is the default only; a layer still overrides it with \`motionBlur\`.`);
  return deg / 360;
}

// ---- CAMERA MOTION BLUR: the frame moves, so everything standing still on the stage smears ----
//
// A layer blurred when its own track moved it and stayed razor sharp under a whip pan, which is the
// opposite of what a shutter does: a camera exposes the SENSOR, so what smears is a layer's velocity
// RELATIVE TO THE CAMERA, never the camera's own.
//
// THE SUM IS THE WHOLE MECHANISM, and it is a sum because of where the camera's translate is written.
// The flat rig is `scale(s) translate(x, y)` on #cam and the 3D rig is `translate3d(x, y, dollyZ(s))`
// (formats/scene/scene.js drawCameraAndCut). In both, the translation is applied in the same
// pre-projection space a layer's own `motion` dx/dy live in, so a layer's velocity on the sensor is
// (its own) + (the camera's), and a layer whose track exactly counter-pans lands on zero and stays
// sharp. Nothing has to be converted, compared or corrected: the cancellation falls out of the
// addition, which is why it is written as one.
//
// DEPTH IS ALREADY ACCOUNTED FOR, and by construction rather than by a correction term. A layer at a
// `plane` depth z is projected by P/(P-z), so a camera pan moves it across the sensor by that factor
// more or less than a layer on the picture plane: that is parallax. But `filter` is applied to the
// element in its OWN local space and the projection then scales the result, so the same P/(P-z)
// magnifies the smear it magnifies the travel by. The ratio is depth-invariant, so a blur written in
// local pixels off a local velocity is correct at every depth, and a depth term here would double-count
// it. Verified against the two-plane probe in formats/scene/_camera-blur-probe.json, whose far plane
// smears visibly less than its near one with no depth code on this path.
//
// WHAT IS NOT MODELLED, said plainly rather than approximated: a camera ZOOM (`s`) and a ROLL/tilt
// (`roll`/`rx`/`ry`). Their screen velocity is radial, proportional to a layer's distance from the
// frame centre, and a track has no access to a layer's stage position, so they contribute nothing. A
// pure push renders as sharp as it always did. See core/sequence.js cameraVelocityAt.
//
// DEFAULT OFF. `"cameraBlur": true` at the top level of a scene turns it on for the whole cast, and
// the film's `shutter` sets how much, exactly as it does for a layer's own blur. Off by default for
// two reasons and both are measured: it puts a `filter` on layers that have never carried one, and a
// `filter` flattens a `preserve-3d` subtree, so a rig film could lose its depth to a dial it never set.

// smear(kit, L, vx, vy): the motion-blur pixels a velocity in LAYER-LOCAL px/s earns, or 0 below the
// floor. One owner for the shutter, the floor and the cap, because there are now two velocities
// feeding it and the per-layer path is the precedent the camera path must not fork from.
function smear(kit, L, vx, vy) {
  const speed = Math.hypot(vx, vy);
  // ~a quarter of the frame per second: below it nothing smears in life either, and a floor is
  // what keeps this from softening every gentle drift in the library.
  if (!(L.motionBlur || speed >= AUTO_BLUR_FLOOR_PER_SEC)) return 0;
  // A GENTLER shutter when nobody asked. 0.5 is the right default for a layer whose author
  // reached for blur deliberately; applied automatically it peaked at the 24px cap on five
  // creed-launch rects and put 18px on a moving headline, which is dissolved, not smeared.
  // AUTO_SHUTTER is the value the exemplar's own author chose by eye for its fastest layer.
  const shutter = L.motionBlur == null ? kit.shutter : L.motionBlur === true ? 0.5 : +L.motionBlur;
  return Math.min(24, shutter * (speed / kit.fps) * 0.5); // half-shutter, capped so text never dissolves
}

// resolveCameraBlur(v): the film's camera-blur dial, refused rather than coerced. A BOOLEAN and not a
// second shutter: `shutter` already says how much smear this film wants and two numbers for one idea
// is the drift this codebase logs more than any other defect. Absent or false = off, which is what
// every scene in the library says today.
export function resolveCameraBlur(v) {
  if (v == null || v === false) return false;
  if (v !== true) throw new Error(`\`cameraBlur\` is a BOOLEAN: true smears every layer by its velocity `
    + `RELATIVE TO THE CAMERA, so a whip pan streaks the frame and a layer travelling with the camera `
    + `stays sharp. Got ${JSON.stringify(v)}. HOW MUCH it smears is the film's \`shutter\` (in degrees), `
    + `and a single layer opts out with \`motionBlur: false\`.`);
  return true;
}

// planeZ(L): where this layer stands, in the camera's z. A layer with no depth is on the picture plane.
// Read off the modifier the depth sugar bakes into (core/produce.js bakeDepth), because that is the one
// place the distance is recorded once the film is produced.
function planeZ(L) {
  for (const mod of L.modifiers || []) if (mod && mod.plane && typeof mod.plane.z === 'number') return mod.plane.z;
  return 0;
}

// focusBlur(L, cam): how soft the camera's depth of field leaves this layer, in pixels.
//
// A NAMED FAILURE INSTEAD OF A WRONG NUMBER. Once `--plane-z` keys a layer's distance, that distance
// lives in CSS and nothing here can read it, so the blur would be computed from the layer's AUTHORED z
// while the layer sat somewhere else entirely: a slam would fly at the camera and stay sharp because
// the focus thought it had never moved. Refused by name rather than rendered, because a plausible
// wrong softness is exactly the silent substitution this engine logs more than any other defect.
function focusBlur(L, cam) {
  if (L.vars && Object.prototype.hasOwnProperty.call(L.vars, '--plane-z'))
    throw new Error(`this film's camera declares a focus (\`f\`) and layer "${L.id || L.type || 'a layer'}" `
      + `keys \`--plane-z\`, so its distance changes in CSS where the focus cannot read it. The blur `
      + `would be computed from the depth you authored while the layer stood somewhere else. Key the `
      + `layer's own \`motion.blur\` instead, which overrides the camera focus, or drop one of the two.`);
  return Math.min(40, Math.abs(planeZ(L) - cam.focus) / 100 * cam.aperture);
}

export function frame(kit, el, L, units, t, f, start, end, scene) {
  const cam = scene && scene.camera;
  const live = t >= start && t < end;
  // The camera's depth of field, and it applies to EVERY layer, not only the ones carrying a motion
  // track: that is the whole difference between a lens and a per-layer blur. Computed before the early
  // return so a still layer at the wrong distance still goes soft.
  //
  // Gated on the film DECLARING a focus, which keeps every existing scene byte-identical: with no `f`
  // on any camera keyframe this function returns exactly where it always did, and never touches
  // `filter` on a layer that has no motion track.
  const dof = live && cam && cam.focus != null && cam.aperture > 0 ? focusBlur(L, cam) : 0;
  // The camera's own travel, in the units this layer's track speaks. Null unless the film asked for
  // camera blur AND this layer kept the automatic blur, so with the dial off every scene in the
  // library renders the exact bytes it rendered before: `cv` is null, both branches below add 0.
  const cv = live && kit.cameraBlur && cam && cam.vel && L.motionBlur !== false ? cam.vel : null;
  if (!(L.motion && L.motion.length && live)) {
    // THE WRITE IS AUTHORITATIVE ON THIS PATH TOO, and it was not. `if (dof > 0.4)` skipped the write
    // whenever the layer went off screen or the lens came back into focus, so a blur written on an
    // EARLIER frame stayed on the element: frame 83 carried `blur(1.49px)` from frame 77 on a tab that
    // had drawn 77, and `none` on a tab that had not. That is #41 again on the branch #41 did not
    // cover, and it is a purity bug before it is a visual one: a sharded render deals frames
    // round-robin, so which frames a tab drew before this one is decided by the worker count
    // (docs/MISTAKES.md #507).
    //
    // `el.__hsBlur` is the stash writeBlur leaves behind, so it is exactly the set of elements this
    // writer has ever touched. Clearing only those keeps a layer that never had a filter free of a
    // `filter: none` nobody asked for, which would move every snapshot signature in the library.
    //
    // A LAYER WITH NO TRACK STILL SMEARS UNDER A PAN, and that is the point: it is standing still on
    // the stage while the sensor moves past it, so its velocity relative to the camera is the whole of
    // the camera's. This is the branch most of a film's cast takes, which is why camera blur had to
    // land before the early return rather than inside the motion-track path below.
    const still = dof + (cv ? smear(kit, L, cv.vx, cv.vy) : 0);
    if (still > 0.4 || el.__hsBlur) writeBlur(el, still);
    return;
  }
  const fps = kit.fps;
  const m = motionAt(L.motion, t - start, L.motionDelay);
  const base = el.style.transform && el.style.transform !== 'none' ? ' ' + el.style.transform : '';
  el.style.transform = `translate(${m.dx.toFixed(2)}px, ${m.dy.toFixed(2)}px) scale(${m.scale.toFixed(4)}) rotate(${m.rot.toFixed(2)}deg)${base}`;
  // A KEYED ANCHOR POINT. Written only when the track mentions it, so a layer's static `origin` is
  // untouched by every film that does not: `ox`/`oy` come back null from the pose otherwise. It is set
  // BEFORE the browser applies the transform above in the same frame, and both are plain style writes,
  // so there is no ordering subtlety to get wrong.
  if (m.ox != null || m.oy != null) el.style.transformOrigin = `${(m.ox ?? 50).toFixed(2)}% ${(m.oy ?? 50).toFixed(2)}%`;
  el.style.opacity = (baseOpacity(el) * m.opacity).toFixed(3);
  // TWO blur materials, summed into one blur():
  //  (a) focus-pull: the authored m.blur track (depth / rack-focus).
  //  (b) motion blur, velocity-derived streak on fast moves. SEEK-SAFE: the track is sampled
  //      at t AND t-1frame, both PURE functions of the frame, so blur(n) is order-independent.
  //      Opt-in per layer: motionBlur:true (shutter 0.5) or a 0..1 strength. Needs a motion track.
  //      Opt-in was the whole policy, and across this entire library exactly ONE layer ever set it,
  //      so every fast move in every other film is a hard-edged slide. Blur is physics: a thing
  //      crossing the frame in a few frames smears whether or not the author remembered. So it is
  //      now AUTOMATIC above a speed the eye already reads as fast, and still fully controllable,
  //      `motionBlur: false` opts out, a number overrides the shutter (KEYED-MOTION.md).
  //  (c) the CAMERA's travel, added to (b) as a vector before either is measured (see `smear`).
  // THE AUTHOR'S OWN FOCUS WINS. A keyed `motion.blur` is a rack focus somebody wrote on purpose, and
  // adding the camera's depth of field on top would mean an author who asked for a sharp layer got a
  // soft one because of a lens setting somewhere else in the file. Stated here rather than resolved by
  // whichever ran last, which is how two owners of one property usually get settled and why it usually
  // goes wrong.
  let blurPx = m.blur > 0.01 ? m.blur : dof;
  if (L.motionBlur !== false) {
    // ONE OWNER for the velocity read (core/sequence.js), shared with the ghost trail and squash.
    // Read as a VECTOR, not a magnitude, so the camera's travel can be added to it before anything is
    // measured: two speeds cannot be summed, two velocities can, and a layer keeping pace with the
    // camera has to come out at zero rather than at twice the number.
    const v = velocityAt(L.motion, t - start, 1 / fps);
    blurPx += smear(kit, L, v.vx + (cv ? cv.vx : 0), v.vy + (cv ? cv.vy : 0));
  }
  // authoritative: recompute the blur() from THIS frame every time (strip any prior, set new
  // or drop it) so a cold render == a warm render → order-independent even on a persistent DOM.
  //
  // The WRITE stays unconditional. That is what "authoritative" means, and skipping it is how a blur
  // from another frame survives a seek backwards (MISTAKES #41). Only the STRIP is conditional: every
  // layer with a motion track pays this on every frame it is on screen, and the great majority of them
  // never carry a blur at all. An authored `filter`, or nothing. `replace` on a string with no match
  // returns the string, so the guarded form is the same value by construction, without the scan.
  // `none` is the KEYWORD for "no filter", not a filter function, so it may never be concatenated with
  // one: this line used to write the literal `none` on an unblurred frame, and the next frame that DID
  // blur produced `none blur(2.97px)`. An invalid declaration the browser drops WHOLE, so the layer
  // rendered with no filter at all. Silent, and invisible until the snap signature learned to record
  // `filter` (docs/MISTAKES.md #351): motion blur simply failed on any frame following an unblurred one,
  // and which frames those were depended on RENDER ORDER, so it was a purity bug as well as a dropped
  // effect. Treat the keyword as the empty base it means.
  // STASH THE BASE, DO NOT PATTERN-MATCH IT. This used to strip every `blur(...)` out of the current
  // filter before adding its own, on the assumption that any blur it found was its own from a previous
  // frame. It cannot tell the two apart: an AUTHORED `filter: "blur(38px)"` is the same six characters,
  // so a layer that declared a blur and also carried a motion track lost the blur completely, on every
  // frame, silently. Building a title card was how it surfaced: the word rendered razor sharp with
  // `filter: none` on the element and no error anywhere, and the same fragment written as an `html`
  // layer looked correct, which pointed at the layer path rather than at CSS.
  //
  // Same shape as the idle track's base stash (core/tracks/idle.js) and for the same reason: the base
  // is remembered beside the output it produced, so if the element still holds that exact output the
  // stash is still the truth, and anything else on it is a fresh write from build or an earlier track.
  // Reading it back rather than storing what was written, because CSSOM re-serialises on the way in.
  writeBlur(el, blurPx);
}

// ONE WRITER FOR `filter`, because there are now two callers (a layer with a motion track, and one that
// only carries the camera's depth of field) and two places composing the same property is the bug this
// stash exists to have fixed.
function writeBlur(el, blurPx) {
  const raw = el.style.filter || '';
  const cur = raw === 'none' ? '' : raw;
  const prior = el.__hsBlur;
  const fBase = (prior && cur === prior.out ? prior.base : cur).trim();
  el.style.filter = blurPx > 0.4 ? (fBase ? fBase + ' ' : '') + `blur(${blurPx.toFixed(2)}px)` : (fBase || 'none');
  el.__hsBlur = { out: el.style.filter, base: fBase };
}
