// core/tracks/motion.js. The motion track: compose element choreography ON TOP of the enter/exit/cut
// transform (which driveClips and the `enter` track already wrote to el.style), and multiply into the
// composed opacity. Last before the modifiers, because every track above it writes a transform this
// one is meant to carry rather than replace.
import { motionAt, velocityAt, dollyZ } from '../timeline/sequence.js';
import { baseOpacity } from './util.js';
import { coverScale, isFullBleedPlane } from './overscan.js';

// PX PER SECOND, not per frame. It was 16 px/frame, which sounds fps-neutral and is not: at 30fps that
// is 480 px/s, and at 60fps the same physical motion covers 8px per frame, drops under the floor, and
// auto motion blur SILENTLY STOPS ENGAGING. Rendering the same film at 60 for smoothness therefore
// threw away the blur that makes its fastest moves read, which is the opposite of what the author
// asked for and nothing would have said a word (engine-doctrine/MISTAKES.md #204).
const AUTO_BLUR_FLOOR_PER_SEC = 480;
// The DEFAULT shutter, and only the default. higgsfield-recreation's own hand-picked value for its
// fastest layer, which is 0.16 of the frame, about a 58 degree shutter angle in a camera's units.
// A scene sets its own with a top-level `shutter` in DEGREES (180 is the film standard, 360 is double
// the smear, 0 turns the automatic half off), and that is the whole of item 6 in
// engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md: the sampler was already automatic and had no dial.
const AUTO_SHUTTER = 0.16;

export const slot = 'transform';

// `motionBlur` is derived from the DISTANCE between two samples of the motion track, so without a track
// there is nothing to differentiate and the prop decides nothing, including `motionBlur: false`, which
// opts out of an automatic blur that a still layer would never have had.
export const PROPS = {
  // Read here and by core/tracks/box.js and the scene's own pose pass, all three through motionAt.
  motionDelay: { when: 'motion' }, motion: {}, motionBlur: { when: 'motion' },
  // Opt-out for the full-bleed-plane overscan guard below (`overscan: false`). Never a positive knob:
  // there is nothing to dial, a plane either needs the minimum cover scale or it does not.
  overscan: { when: 'motion' } };

// The scene's shutter, in the units a camera states it in, converted once. Exported so the one place
// that builds the track kit reads the conversion rather than restating it (films/scene/scene.js).
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
// (films/scene/scene.js drawCameraAndCut). In both, the translation is applied in the same
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
// it. Verified against the two-plane probe in films/scene/_camera-blur-probe.json, whose far plane
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

// The still-layer path: no motion track, or outside its window. Depth of field still applies (a lens
// property, not a per-layer one), and so does camera blur (the layer stands still while the sensor
// pans, so its velocity relative to the camera is the camera's own). The write stays unconditional
// (`el.__hsBlur` marks an element this track has ever touched) so a stale blur from an earlier frame
// never survives a seek backwards (engine-doctrine/MISTAKES.md #41, #507).
function writeStillBlur(ctx, dof, cv) {
  const { kit, el, L } = ctx;
  const still = dof + (cv ? smear(kit, L, cv.vx, cv.vy) : 0);
  if (still > 0.4 || el.__hsBlur) writeBlur(el, still);
}

// A layer that never keys depth must get the exact transform string it always got: testing the
// resolved pose at rest cannot tell "never keyed" from "keyed and at rest", and a 3D transform
// function written even at its identity value promotes the element into its own rendering context
// (scene.js "THE CAMERA RIG"). So the branch is decided from the AUTHORED keyframes.
function hasKeyedDepth(L) {
  return L.motion.some((k) => k && (k.z != null || k.rotX != null || k.rotY != null));
}

// OVERSCAN: a full-bleed plane tilted or moved off the picture plane foreshortens under perspective,
// so its projected corners can land inside the viewport and show the stage behind its edge. Grown to
// cover, gated on the box already covering the stage at rest (core/tracks/overscan.js).
function overscanFor(ctx, m) {
  const { el, L, scene, t } = ctx;
  const cam = scene && scene.camera;
  if (!(cam && cam.rig && (m.rotX !== 0 || m.rotY !== 0 || m.z !== 0))) return 1;
  const box = scene && scene.boxOf ? scene.boxOf(L.id) : null;
  if (!isFullBleedPlane(box, scene && scene.canvas)) return 1;
  const k = coverScale({
    box, originPct: { ox: m.ox ?? 50, oy: m.oy ?? 50 }, scale: m.scale,
    rotZ: m.rot, rotX: m.rotX, rotY: m.rotY, z: m.z, canvas: scene.canvas, persp: cam.lens,
    cam: { x: cam.x, y: cam.y, z: dollyZ(cam.s, cam.lens), rx: cam.rx, ry: cam.ry, roll: cam.roll },
  });
  // Adaptation, not a silent change: one line per NEW peak (engine-doctrine/SAFEGUARDS.md).
  if (k > 1 && k > (el.__hsOverscanMax || 0) + 1e-6) {
    console.log(`adapted overscan: ${L.id || L.type || 'layer'} scaled up to ${k.toFixed(3)}x `
      + `at ${t.toFixed(2)}s (full-bleed plane under perspective)`);
    el.__hsOverscanMax = k;
  }
  return k;
}

function writeMotionTransform(ctx, m, has3D) {
  const { el, L } = ctx;
  const base = el.style.transform && el.style.transform !== 'none' ? ' ' + el.style.transform : '';
  const overscanK = has3D && L.overscan !== false ? overscanFor(ctx, m) : 1;
  const scaleOut = m.scale * overscanK;
  // Composition order matches the camera rig's own (films/scene/scene.js drawCameraAndCut): Y-X-Z
  // rotation order, `scale` between the 2D rotate and the position.
  el.style.transform = has3D
    ? `translate3d(${m.dx.toFixed(2)}px, ${m.dy.toFixed(2)}px, ${m.z.toFixed(2)}px) scale(${scaleOut.toFixed(4)}) `
      + `rotate(${m.rot.toFixed(2)}deg) rotateX(${m.rotX.toFixed(2)}deg) rotateY(${m.rotY.toFixed(2)}deg)${base}`
    : `translate(${m.dx.toFixed(2)}px, ${m.dy.toFixed(2)}px) scale(${m.scale.toFixed(4)}) rotate(${m.rot.toFixed(2)}deg)${base}`;
  if (m.ox != null || m.oy != null) el.style.transformOrigin = `${(m.ox ?? 50).toFixed(2)}% ${(m.oy ?? 50).toFixed(2)}%`;
}

// Two blur materials summed into one blur(): the authored focus-pull/rack-focus track (or the
// camera's depth of field, whichever the author's own keyed blur does not already win over) and the
// velocity-derived streak, camera travel added to it as a vector before either is measured (see
// `smear`). The write stays unconditional and recomputes from this frame every time, order-independent
// even on a persistent DOM (engine-doctrine/MISTAKES.md #351).
function applyMotionBlur(ctx, dof, cv) {
  const { kit, el, L, t, start } = ctx;
  const m = motionAt(L.motion, t - start, L.motionDelay);
  let blurPx = m.blur > 0.01 ? m.blur : dof;
  if (L.motionBlur !== false) {
    const v = velocityAt(L.motion, t - start, 1 / kit.fps);
    blurPx += smear(kit, L, v.vx + (cv ? cv.vx : 0), v.vy + (cv ? cv.vy : 0));
  }
  writeBlur(el, blurPx);
  return m;
}

export function frame(ctx) {
  const { kit, el, L, t, start, end, scene } = ctx;
  const cam = scene && scene.camera;
  const live = t >= start && t < end;
  // Depth of field applies to every layer, computed before the early return so a still layer at the
  // wrong distance still goes soft. Gated on the film declaring a focus, so a scene with none renders
  // byte-identical.
  const dof = live && cam && cam.focus != null && cam.aperture > 0 ? focusBlur(L, cam) : 0;
  // Null unless the film asked for camera blur and this layer kept the automatic blur.
  const cv = live && kit.cameraBlur && cam && cam.vel && L.motionBlur !== false ? cam.vel : null;
  if (!(L.motion && L.motion.length && live)) return writeStillBlur(ctx, dof, cv);

  const has3D = hasKeyedDepth(L);
  const m0 = motionAt(L.motion, t - start, L.motionDelay);
  writeMotionTransform(ctx, m0, has3D);
  el.style.opacity = (baseOpacity(el) * m0.opacity).toFixed(3);
  applyMotionBlur(ctx, dof, cv);
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
