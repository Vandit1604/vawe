// core/fx/upright.js: AUTO-ORIENT. Keep this layer UPRIGHT while the layer carrying it rotates.
//
// Technique 12 in docs/CRAFT/AE-TECHNIQUES.md, and the study called it the only serious default
// candidate of the twelve. Photographs arranged around a centre and parented to one rotating null are
// the standard rig; left alone each photograph turns WITH the null, so the arrangement reads as a
// spinning wheel and every caption is upside down at the bottom of the circle. The layout stops being
// readable exactly when the motion peaks. In After Effects the fix is Auto-Orient toward the camera.
// Here it is one modifier on the carried layer.
//
//   "modifiers": [{ "upright": "wheel" }]      // "wheel" is the rotating group this layer sits in
//
// WHAT IS CANCELLED: ROTATION, AND ONLY ROTATION. Not scale, not skew, and that is a decision rather
// than a first instalment. A carrier that scales is a rig moving toward or away from the eye and its
// contents are meant to come with it; `plane` already owns "stand at a distance and hold your apparent
// size", so a second size-holding mechanism here would be the fork this repo logs more than any other
// defect. Nothing in the engine writes skew on a carrier at all. One feature, because nobody needs the
// other two.
//
// THE CARRIER IS NAMED, not inferred, and a switch on the group would have been the wrong shape. A rig
// usually wants MOST children upright and one deliberately tumbling (the element whose spin is the
// point), and a group-level prop cannot express that: it is all children or none. Naming the carrier
// also makes the modifier read at any depth and against any rotating layer, not only a direct parent.
//
// WHY THE `rotate` LONGHAND: the same argument core/fx/tilt.js and core/fx/plane.js make. The
// composition-order contract in core/fx/index.js forbids a modifier from touching `transform`, which
// the tracks rewrite from scratch every frame; `rotate` is a separate CSS property and the used
// transform is `translate · rotate · scale · transform`, so the correction lands OUTSIDE everything the
// tracks compose and is never read back. `tilt` writes the same longhand, so the two are refused
// together by name rather than resolved by whichever ran last.
//
// WHERE IN THE FRAME ORDER, and why it has to be there. The modifier pass is the LAST slot of the
// per-frame pipeline (core/tracks/index.js), so this runs after the carrier's motion track has written
// its rotation and after this layer's own entrance. That ordering is what makes the write safe, but it
// is NOT where the number comes from: reading the carrier's rendered transform would make renderFrame(n)
// depend on which layer the loop reached first, which is the bug class #41 and #507 are both filed
// under. The angle is recomputed here from the carrier's OWN keyframes through the one motion sampler
// (core/sequence.js motionAt), exactly as core/fx/lag.js reads its leader, so it is a pure function of
// the frame index and would be identical if this pass ran first.
//
// POSITION IS UNTOUCHED, which is the whole technique: the carrier still swings this layer around its
// centre, and only the layer's ORIENTATION is held. The arrangement rotates, its contents stay readable.

import { motionAt } from '../timeline/sequence.js';

export const UPRIGHT_KEYS = ['of'];

const name = (L) => `"${L.id || L.type || 'layer'}"`;

export function resolve(spec, L) {
  const s = typeof spec === 'string' ? { of: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`upright on ${name(L)}: expected the id of the ROTATING LAYER that carries this `
      + `one, as "wheel" or { "of": "wheel" }, got ${JSON.stringify(spec)}. Keys: ${UPRIGHT_KEYS.join(', ')}. `
      + `There is no \`true\`: a layer cannot guess which of its ancestors is the one turning.`);
  for (const k of Object.keys(s))
    if (!UPRIGHT_KEYS.includes(k))
      throw new Error(`upright on ${name(L)}: unknown key "${k}", known: ${UPRIGHT_KEYS.join(', ')}.`);
  if (typeof s.of !== 'string' || !s.of)
    throw new Error(`upright on ${name(L)}: \`of\` names the rotating layer this one is carried by, `
      + `by id. Got ${JSON.stringify(s.of)}.`);
  return { of: s.of };
}

export function build(kit, el, L, spec) {
  const { of } = resolve(spec, L);
  if (L.id && of === L.id)
    throw new Error(`upright on ${name(L)}: a layer cannot hold itself upright against its own `
      + `rotation. Name the layer that CARRIES this one.`);
  if ((L.modifiers || []).some((m) => m && typeof m === 'object' && 'tilt' in m))
    throw new Error(`upright on ${name(L)}: this layer also carries \`tilt\`, and both write the CSS `
      + `\`rotate\` longhand, so one of them would silently do nothing. Tilt the CARRIER instead and `
      + `this layer rides it, or drop one of the two.`);
}

export function frame(kit, el, L, t, scene, spec) {
  const { of } = resolve(spec, L);
  const carrier = scene.specOf(of);
  if (!carrier)
    throw new Error(`upright on ${name(L)}: no layer with id "${of}", known ids: ${scene.ids.join(', ')}.`);
  // A carrier with no keyed rotation turns nothing, so the correction would render exactly like its own
  // absence. Named rather than skipped: input accepted and then ignored is the defect this registry's
  // hard-error dispatch exists to kill (docs/MISTAKES.md #210 #213 #215 #217).
  if (!Array.isArray(carrier.motion) || !carrier.motion.some((k) => k && k.rot != null))
    throw new Error(`upright on ${name(L)}: "${of}" has no \`rot\` key in a \`motion\` track, so it `
      + `never turns and there is nothing to cancel. This reads keyframes, not rendered poses: an `
      + `entrance or a cut is composed by the clip pipeline and is not rotation this can see. Key `
      + `\`rot\` on "${of}", or drop the modifier.`);
  const rot = motionAt(carrier.motion, t - (carrier.start ?? 0)).rot;
  // Authoritative every frame, including the frames where the carrier is square: a `rotate` left from
  // another frame is the render-order dependence renderFrame(n) promises it is not (#41).
  el.style.rotate = Math.abs(rot) < 0.005 ? 'none' : `${(-rot).toFixed(3)}deg`;
}
