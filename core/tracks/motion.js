// core/tracks/motion.js. The motion track: compose element choreography ON TOP of the enter/exit/cut
// transform (which driveClips and the `enter` track already wrote to el.style), and multiply into the
// composed opacity. Last before the modifiers, because every track above it writes a transform this
// one is meant to carry rather than replace.
import { motionAt, velocityAt } from '../sequence.js';
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
export const PROPS = { motion: {}, motionBlur: { when: 'motion' } };

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
  if (!(L.motion && L.motion.length && live)) {
    if (dof > 0.4) writeBlur(el, dof);
    return;
  }
  const fps = kit.fps;
  const m = motionAt(L.motion, t - start);
  const base = el.style.transform && el.style.transform !== 'none' ? ' ' + el.style.transform : '';
  el.style.transform = `translate(${m.dx.toFixed(2)}px, ${m.dy.toFixed(2)}px) scale(${m.scale.toFixed(4)}) rotate(${m.rot.toFixed(2)}deg)${base}`;
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
  // THE AUTHOR'S OWN FOCUS WINS. A keyed `motion.blur` is a rack focus somebody wrote on purpose, and
  // adding the camera's depth of field on top would mean an author who asked for a sharp layer got a
  // soft one because of a lens setting somewhere else in the file. Stated here rather than resolved by
  // whichever ran last, which is how two owners of one property usually get settled and why it usually
  // goes wrong.
  let blurPx = m.blur > 0.01 ? m.blur : dof;
  if (L.motionBlur !== false) {
    // ONE OWNER for the velocity read (core/sequence.js), shared with the ghost trail and squash.
    const speed = velocityAt(L.motion, t - start, 1 / fps).speed / fps; // px travelled in one frame
    // ~a quarter of the frame per second: below it nothing smears in life either, and a floor is
    // what keeps this from softening every gentle drift in the library. Converted to this frame's
    // budget so the rule means the same thing at any frame rate.
    const auto = speed >= AUTO_BLUR_FLOOR_PER_SEC / fps;
    if (L.motionBlur || auto) {
      // A GENTLER shutter when nobody asked. 0.5 is the right default for a layer whose author
      // reached for blur deliberately; applied automatically it peaked at the 24px cap on five
      // creed-launch rects and put 18px on a moving headline, which is dissolved, not smeared.
      // AUTO_SHUTTER is the value the exemplar's own author chose by eye for its fastest layer.
      const shutter = L.motionBlur == null ? kit.shutter
        : L.motionBlur === true ? 0.5 : +L.motionBlur;
      blurPx += Math.min(24, shutter * speed * 0.5);    // half-shutter, capped so text never dissolves
    }
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
