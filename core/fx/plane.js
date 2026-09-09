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
// (harness/dev/spike-depth.mjs reports the per-layer displacement). Written on a layer with no rig, the
// same property would land in a flat parent, produce no projection at all, and move nothing, so a
// scene containing one turns the rig ON, exactly as a tilt does, and the two cases that cannot are
// refused by name rather than rendered as a no-op.
//
// THE LAYER CHANGES APPARENT SIZE, and `hold` is how you stop it. A layer pushed back 600px under a
// 1600px lens is drawn at 1600/2200 = 0.727 of its size. This file used to refuse to correct that, on
// the argument that "depth without magnification is a translation, not a distance", and told the author
// to divide by (lens - z) / lens by hand.
//
// THAT ARGUMENT IS WRONG, and every After Effects multiplane rig has said so for twenty years. The
// correction does not remove the depth, because a depth is not a size: it is a DIFFERENT RATE OF TRAVEL
// under a moving camera. Correct the size and the layer still crosses the frame faster or slower than
// its neighbours, still converges on the vanishing point, still occludes by distance. All the
// correction removes is the layout tax, and the tax was the whole reason nobody used this: `depth`
// appeared in 1 scene of 170. The argument only holds for a camera that never moves, and a `plane`
// without a rig is refused two functions down.
//
//   "modifiers": [{ "plane": { "z": -600, "hold": true } }]   // 600px back, drawn at the size you laid out
//
// `hold` writes the `scale` longhand with (lens - z) / lens, exactly the number `depthZ` prints in its
// own refusal. WHAT IT DOES NOT CORRECT is POSITION: a layer off the frame's centre still converges on
// the vanishing point, because that convergence IS the parallax and correcting it would leave a layer
// that changed nothing at all. AE's tools correct the same one thing for the same reason.
//
// THE DEFAULTS DIFFER BETWEEN THE PRIMITIVE AND THE VOCABULARY, on purpose, and it is one mechanism
// either way: `hold` lives here and `depth` only picks a default for it. Raw `plane` keeps hold OFF,
// because a primitive that quietly rescales the thing it was handed is a primitive that lies, and two
// shipped films (onefilm, playhead) place 28 layers by the projected size they get today. `depth`, the
// NAMED vocabulary whose entire job is parallax, holds by default. Want a named distance with its raw
// magnification? Write the `plane` and the number.
//
// `kick` and `squash` also write `scale`, and last-writer-wins would silently eat the correction, so a
// layer carrying `hold` alongside either is refused at build rather than rendered at the wrong size.
//
// ON A GROUP CHILD it is refused. A group is its own diorama with its own camera at its own centre
// (core/fx/tilt.js), the group element is a flat parent, and a child pushed back inside it would be
// projected by nothing. Put the plane on the GROUP: the whole composed card then stands at that depth
// and its children ride it, which is what a card at a distance is.

import { defineRegistry } from '../registry/registry.js';

export const PLANE_KEYS = ['z', 'hold'];

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
  if (s.hold != null && typeof s.hold !== 'boolean')
    throw new Error(`plane: hold must be true or false, got ${JSON.stringify(s.hold)}. It is the scale `
      + `correction every multiplane rig applies: true draws the layer at the size you laid it out and `
      + `leaves only the parallax, false gives you the raw projection.`);
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
  return { z: s.z, hold: s.hold === true };
}

// A group child's parent is the group element, which is flat, so the depth would be silently
// orthographic. The layer would sit at z and be drawn at exactly the size and place it had. Checked
// here rather than per frame because the class is set before either build path reaches the modifiers
// (formats/scene/scene.js, core/layers/util.js), so this can throw before a frame is drawn.
export function build(kit, el, L, spec) {
  const { hold } = resolve(spec);
  // `kick` and `squash` write the same `scale` longhand, and modifiers resolve last-writer-wins
  // (core/fx/index.js), so the correction would be dropped or would drop them, silently, depending on
  // array order. Refused by name instead: that is the input-accepted-then-ignored shape this repo ranks
  // above every other failure.
  if (hold) {
    const clash = (L && Array.isArray(L.modifiers) ? L.modifiers : [])
      .flatMap((m) => (m && typeof m === 'object' ? Object.keys(m) : []))
      .find((n) => n === 'kick' || n === 'squash');
    if (clash)
      throw new Error(`plane: \`hold\` writes the \`scale\` longhand and so does \`${clash}\`, so one of `
        + `them would silently win by array order. Drop \`hold\` and size the layer for its depth by `
        + `hand, or drop \`${clash}\`.`);
  }
  if (el && el.classList && !el.classList.contains('hs-layer'))
    throw new Error(`plane: this layer is a GROUP CHILD, and a group is a flat parent with its own camera `
      + `at its own centre, so a depth inside it would project through nothing and move the layer by zero `
      + `pixels. Put \`plane\` on the GROUP instead; its children ride it as one card at that distance.`);
}

export function frame(kit, el, L, t, scene, spec) {
  const { z, hold } = resolve(spec);
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
  // THE CORRECTION TRACKS THE LIVE Z, and that is the reason it is CSS rather than a build-time number.
  // A depth keyed through `--plane-z` travels; a static correction would hold the size the layer has at
  // the END of that travel and make the start wrong, which is the "start where you laid it out" the
  // keyed slam exists for. Same clamp as the translate, so the two can never disagree about where the
  // layer is. Written only when held: an unheld plane must not touch a longhand it does not own.
  if (hold) {
    el.style.scale = drivesZ(L)
      ? `calc((${cam.lens} - min(calc(var(${PLANE_Z}, 1) * ${z}), ${cam.lens - 1})) / ${cam.lens})`
      : ((cam.lens - z) / cam.lens).toFixed(5);
  }
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
//   4. and the size change is real, so the author was told to compensate by hand.
//
// A capability behind four barriers is a capability the library does not have. `depth` removes ALL FOUR.
// The first three go by being a NAME, resolved against the lens actually in force, so the same word
// means the same distance under any camera. The fourth goes by `hold`, which `depth` turns ON: the layer
// is drawn at the size you laid it out and the depth shows up where it belongs, in how far the camera
// moves it. That ratio is the same number the magnification was, so it is still quoted everywhere.
//
//   { "type": "rect", "depth": "back" }        // 0.375 lens behind, held, moves at 0.73x the rate
//   { "type": "text", "depth": "near" }        // 0.28 lens in front, held, moves at 1.39x the rate
//   { "type": "rect", "depth": -900 }          // still a raw distance, when a name is not the point
//
// Want the raw projection under a name's distance? `modifiers: [{ plane: { z: -600 } }]`. The primitive
// never holds unless asked, so the escape is the primitive, not a second spelling of the vocabulary.
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
  far:   'the far plane: a backdrop, a wall, a field the subject stands in front of. Held at its laid-out size, moved by the camera at 0.57x the picture plane\'s rate',
  back:  'behind the picture plane: the layer the camera passes, the one that gives the move its parallax. Held, 0.73x the rate',
  front: 'just in front of the picture plane: a caption or a chip that rides ahead of the subject. Held, 1.18x the rate',
  near:  'nearest the eye: the thing that crosses the frame fastest and leaves it first. Held, 1.39x the rate',
});

// A REGISTRY, not a bare object, because that is what makes it FINDABLE. `make arsenal` searches every
// `*_REGISTRY` the engine exports, which is the one place an author goes when they do not yet know the
// name of the thing they want. A vocabulary that is not one is a vocabulary nobody can search for, and
// being unfindable is the entire defect this file is fixing.
export const DEPTH_REGISTRY = defineRegistry('depth', DEPTH_PLANES, { blurbs: DEPTH_BLURBS, slot: 'depth',
  catalog: {
    title: 'Depths (parallax planes)',
    tag: 'per-layer',
    intro: '`{ "depth": "back" }` on any layer. Stands it at a DISTANCE from the picture plane, so a camera move gives it parallax instead of turning the whole frame as one rigid pane. Each name is a fraction of the film\'s own lens, so it means the same distance under any camera, and it lowers to the `plane` modifier at boot. A raw number of px still works. Refused on a group CHILD, which sits in a flat parent: put it on the group.',
    // A depth is a NAMED PLANE, so it is one word on the layer and the camera does the rest.
    usage: (n, { text }) => text({ depth: n }),
    noPreview: 'a plane only reads when the camera moves past it. One frame of a parallax is a frame with nothing parallaxing in it.',
  },
});
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
    return `${n} (z ${z > 0 ? '+' : ''}${z}, held, moved at ${(lens / (lens - z)).toFixed(2)}x)`;
  }).join(' · ');
  throw new Error(`depth: expected one of ${DEPTH_NAMES.join(' · ')}, or a distance in px, got `
    + `${JSON.stringify(spec)}. Under this film's ${lens}px lens: ${menu}. `
    + `Negative is away from the eye, positive is toward it, and there is no "mid": the picture plane is `
    + `where every layer already stands, so drop the prop instead.`);
}
