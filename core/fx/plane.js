// core/fx/plane.js: stand the layer on a plane at a DEPTH, so the frame holds objects instead of a
// sheet. `tilt` turns a layer out of the picture plane and the camera rig can travel past it, but every
// layer in the frame still sits at z = 0, so the whole composition turns as one rigid pane: two cards
// six hundred pixels apart on screen are zero pixels apart in space, and a camera trucking past them
// moves both by exactly the same amount. That is the tell that says "a picture of a scene" rather than
// "a scene". Parallax is the cue, and parallax is a DIFFERENCE of depth: it cannot exist while there is
// only one depth to have.
//
//   "modifiers": [{ "plane": -600 }]              // 600px BEHIND the picture plane
//   "modifiers": [{ "plane": { "z": 240 } }]      // 240px in FRONT of it, nearer the eye
//
// The sign is the CSS one, and the camera's own dolly already uses it: POSITIVE z is toward the eye,
// negative is away into the frame. A layer at z = 0 is on the picture plane and is what every layer
// without this modifier is.
//
// WHY THE `translate` LONGHAND, which is the same move core/fx/tilt.js makes one property over. The
// composition-order contract in core/fx/index.js forbids a modifier from writing `transform`: the
// cross-cutting tracks own it and rewrite it from scratch, and a modifier that read it and appended
// would be appending to its own value from whichever frame ran last. `translate` is a SEPARATE CSS
// property (Transforms Level 2), the engine writes it nowhere else, `rotate` is tilt's, `scale` is
// kick's, and this is the third and last of the three longhands, and the used transform is
// `translate · rotate · scale · transform`. So the depth is applied OUTSIDE everything the tracks
// compose: the layer is built and animated exactly as before, and then the finished thing is placed at
// a distance. It is never read back, and renderFrame(n) stays pure in n without an element of its own.
//
// IT NEEDS THE RIG, and that is not a limitation to work around. It is what makes this depth and not a
// scale. Under the rig (formats/scene/scene.js) the eye is fixed to the FRAME and `#cam` stands inside
// its space carrying the camera's own transform, so a layer at z is projected by lens/(lens - z - dolly)
// about a vanishing point that does not travel with it. Move the camera and a near layer crosses the
// frame faster than a far one, which is the whole point and is measurable
// (scripts/dev/spike-depth.mjs reports the per-layer displacement). Written on a layer with no rig, the
// same property would land in a flat parent, produce no projection at all, and move nothing, so a
// scene containing one turns the rig ON, exactly as a tilt does, and the two cases that cannot are
// refused by name rather than rendered as a no-op.
//
// THE LAYER CHANGES APPARENT SIZE, and it must. Depth without magnification is a translation, not a
// distance: a layer pushed back 600px under a 1600px lens is drawn at 1600/2200 = 0.727 of its size,
// and holding that at 1.0 would be exactly the "scale that is not a depth" this modifier exists to stop
// being. Author the layer at the size the DEPTH asks for, divide by (lens - z) / lens to get back the
// screen size you had, rather than reaching for a compensating scale, which `kick` owns anyway.
//
// ON A GROUP CHILD it is refused. A group is its own diorama with its own camera at its own centre
// (core/fx/tilt.js), the group element is a flat parent, and a child pushed back inside it would be
// projected by nothing. Put the plane on the GROUP: the whole composed card then stands at that depth
// and its children ride it, which is what a card at a distance is.

import { defineRegistry } from '../registry.js';

export const PLANE_KEYS = ['z'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

// Resolved at BUILD as well as per frame, so a malformed spec throws before a single frame is drawn.
function resolve(spec) {
  const s = num(spec) ? { z: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`plane: expected a number of px or an object like { "z": -600 }, got ${JSON.stringify(spec)}. `
      + `Keys: ${PLANE_KEYS.join(', ')}. Negative is away from the eye, positive is toward it.`);
  for (const k of Object.keys(s))
    if (!PLANE_KEYS.includes(k))
      throw new Error(`plane: unknown key "${k}", known: ${PLANE_KEYS.join(', ')}. `
        + `z is a DISTANCE in px from the picture plane, not an angle and not a z-index, layer order is `
        + `\`track\`.`);
  if (!num(s.z))
    throw new Error(`plane: z must be a number of px, got ${JSON.stringify(s.z)}. It is how far the layer `
      + `stands from the picture plane: negative into the frame, positive toward the eye.`);
  // A plane at 0 IS the picture plane, so it would install a rig, pay the 3D rasterisation the flat path
  // exists to avoid, and move nothing. That reads as a working depth of zero rather than as the no-op it
  // is, which is the silent-substitution shape this repo logs most.
  if (s.z === 0)
    throw new Error(`plane: z is 0, which is the picture plane every layer is already on. A depth of zero `
      + `turns the whole frame into a 3D rendering context and changes nothing you can see; drop the `
      + `modifier, or give it the distance you meant.`);
  return { z: s.z };
}

// A group child's parent is the group element, which is flat, so the depth would be silently
// orthographic. The layer would sit at z and be drawn at exactly the size and place it had. Checked
// here rather than per frame because the class is set before either build path reaches the modifiers
// (formats/scene/scene.js, core/layers/util.js), so this can throw before a frame is drawn.
export function build(kit, el, L, spec) {
  resolve(spec);
  if (el && el.classList && !el.classList.contains('hs-layer'))
    throw new Error(`plane: this layer is a GROUP CHILD, and a group is a flat parent with its own camera `
      + `at its own centre, so a depth inside it would project through nothing and move the layer by zero `
      + `pixels. Put \`plane\` on the GROUP instead; its children ride it as one card at that distance.`);
}

export function frame(kit, el, L, t, scene, spec) {
  const { z } = resolve(spec);
  const cam = scene.camera;
  if (!(cam && cam.rig))
    throw new Error(`plane: this frame has no camera rig, so there is no space to stand ${z}px into. A `
      + `top-level \`plane\` turns the rig on by itself (formats/scene/scene.js), so reaching this means `
      + `the modifier is somewhere the scene could not see it.`);
  // The eye is AT the lens distance, so a layer at or past it is at or behind the camera. CSS projects
  // that anyway, through a division by zero and out the far side, mirrored and inverted, and says
  // nothing. The lens is keyable (`p`), so this is the one check that cannot be made at build.
  if (z >= cam.lens)
    throw new Error(`plane: z is ${z}px and the lens is ${cam.lens}px away, so this layer stands at or `
      + `THROUGH the camera. Move it back (z < ${cam.lens}), or open the lens with the camera's \`p\`.`);
  // Written in full on every frame and never appended to: the value is a function of the spec alone, so
  // a cold render and a warm one agree and any render order gives the same string.
  //
  // KEYABLE, THROUGH THE VARS TRACK AND NOT THROUGH A SECOND MECHANISM. A depth was a static plane: the
  // sugar baked at boot and this wrote one number for the layer's whole life. So the standard slam,
  // which every motion-graphics guide teaches as "animate Z, never scale, because scale flattens and
  // distance does not", could not be authored at all. `--plane-z` MULTIPLIES the authored z, so
  // `depth:"near"` with `--plane-z` running 0 to 1 travels from the picture plane to that plane and the
  // perspective divide does the work.
  //
  //   { "depth":"near", "vars":{ "--plane-z":[0,1] }, "varsDur":0.4, "varsEase":"easeOutQuint" }
  //
  // `vars` because it is already the answer to "animate a number this layer's own CSS reads", and a
  // second keying path for one modifier is the fork this codebase logs as the source of most drift.
  //
  // THE THROUGH-THE-CAMERA GUARD SURVIVES, as CSS rather than as a check. A var cannot be read here, so
  // the throw above could no longer see the live value; `min()` clamps the product below the lens
  // instead, which is stronger than the check it replaces because it holds on every frame rather than
  // on the one the author declared. A layer keyed past the lens stops at the lens and stays a picture,
  // rather than being projected through zero and out the far side, mirrored, silently.
  el.style.translate = drivesZ(L)
    ? `0 0 min(calc(var(${PLANE_Z}, 1) * ${z.toFixed(2)}px), ${(cam.lens - 1).toFixed(2)}px)`
    : `0 0 ${z.toFixed(2)}px`;
}

// The multiplier, and the same emit-only-where-driven gate every other keyable value in this engine
// uses: a `calc()` that computes to the identical number moves no pixels but changes the serialised
// string, and a snapshot that moves for a cosmetic reason is a baseline nobody reads next time.
const PLANE_Z = '--plane-z';
const drivesZ = (L) => !!(L && L.vars && Object.prototype.hasOwnProperty.call(L.vars, PLANE_Z));

// ---------- the named depths, so a plane is reachable without arithmetic ----------
//
// THE MODIFIER WORKS AND NOBODY USES IT: 3 films of 134, while 44 of the 47 films that move the camera
// have every layer at z = 0. That is not indifference to depth, it is four separate barriers between an
// author and one of these, and the header above happily describes three of them as correct:
//
//   1. it lives in `core/fx/` and is spelled `modifiers: [{ plane: … }]`, which is a nested form nobody
//      reaches for by accident;
//   2. `z` is a RAW DISTANCE IN PIXELS, and picking one means knowing the lens;
//   3. the magnification is `lens / (lens - z)`, so a number that looks reasonable can halve a layer;
//   4. and the size change is real, so the author is told to compensate by hand.
//
// A capability behind four barriers is a capability the library does not have. `depth` removes the first
// three: a NAME, resolved against the lens actually in force, so the same word means the same distance
// under any camera. The fourth stays the author's, because the header is right that depth without
// magnification is a translation rather than a distance, and `kick` already owns scale. The multiplier
// is printed in the refusal below rather than left to be derived.
//
//   { "type": "rect", "depth": "back" }        // 0.375 lens behind, drawn at 0.73x
//   { "type": "text", "depth": "near" }        // 0.28 lens in front, drawn at 1.39x
//   { "type": "rect", "depth": -900 }          // still a raw distance, when a name is not the point
//
// Named as FRACTIONS OF THE LENS, never as pixels. A film that keys `p` from 1600 to 900 changes what
// 600px behind the picture plane means; it does not change what "the back plane" means. The one fact
// with one owner, again: the lens is the camera's, so the depth is read through it.
export const DEPTH_PLANES = Object.freeze({
  far:   -0.75,
  back:  -0.375,
  front:  0.15,
  near:   0.28,
});

export const DEPTH_BLURBS = Object.freeze({
  far:   'the far plane: a backdrop, a wall, a field the subject stands in front of. Drawn at 0.57x',
  back:  'behind the picture plane: the layer the camera passes, the one that gives the move its parallax. 0.73x',
  front: 'just in front of the picture plane: a caption or a chip that rides ahead of the subject. 1.18x',
  near:  'nearest the eye: the thing that crosses the frame fastest and leaves it first. 1.39x',
});

// A REGISTRY, not a bare object, because that is what makes it FINDABLE. `make arsenal` searches every
// `*_REGISTRY` the engine exports, which is the one place an author goes when they do not yet know the
// name of the thing they want. A vocabulary that is not one is a vocabulary nobody can search for, and
// being unfindable is the entire defect this file is fixing.
export const DEPTH_REGISTRY = defineRegistry('depth', DEPTH_PLANES, { blurbs: DEPTH_BLURBS, slot: 'depth' });
// NOT EXPORTED. The registry IS the vocabulary's public face, and a second exported spelling of the
// same list is a second thing for a caller to reach for and for the catalogue to have to mention.
// `arsenal-check` said so out loud, which is the gate doing its job.
const DEPTH_NAMES = DEPTH_REGISTRY.names;

/** depthZ(spec, lens) -> z in px. A name is a fraction of THIS lens; a number is already a distance. */
export function depthZ(spec, lens = 1600) {
  if (num(spec)) return spec;
  if (typeof spec === 'string' && Object.prototype.hasOwnProperty.call(DEPTH_PLANES, spec))
    return Math.round(DEPTH_PLANES[spec] * lens);
  // The magnification is quoted for every name, because the one thing an author has to decide here is
  // whether they want the layer at that size, and making them compute `lens / (lens - z)` to find out is
  // barrier 3 wearing a friendlier name.
  const menu = DEPTH_NAMES.map((n) => {
    const z = Math.round(DEPTH_PLANES[n] * lens);
    return `${n} (z ${z > 0 ? '+' : ''}${z}, drawn at ${(lens / (lens - z)).toFixed(2)}x)`;
  }).join(' · ');
  throw new Error(`depth: expected one of ${DEPTH_NAMES.join(' · ')}, or a distance in px, got `
    + `${JSON.stringify(spec)}. Under this film's ${lens}px lens: ${menu}. `
    + `Negative is away from the eye, positive is toward it, and there is no "mid": the picture plane is `
    + `where every layer already stands, so drop the prop instead.`);
}
