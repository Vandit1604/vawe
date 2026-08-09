// core/fx/plane.js — stand the layer on a plane at a DEPTH, so the frame holds objects instead of a
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
// property (Transforms Level 2), the engine writes it nowhere else — `rotate` is tilt's, `scale` is
// kick's, and this is the third and last of the three longhands — and the used transform is
// `translate · rotate · scale · transform`. So the depth is applied OUTSIDE everything the tracks
// compose: the layer is built and animated exactly as before, and then the finished thing is placed at
// a distance. It is never read back, and renderFrame(n) stays pure in n without an element of its own.
//
// IT NEEDS THE RIG, and that is not a limitation to work around — it is what makes this depth and not a
// scale. Under the rig (formats/scene/scene.js) the eye is fixed to the FRAME and `#cam` stands inside
// its space carrying the camera's own transform, so a layer at z is projected by lens/(lens - z - dolly)
// about a vanishing point that does not travel with it. Move the camera and a near layer crosses the
// frame faster than a far one, which is the whole point and is measurable
// (scripts/dev/spike-depth.mjs reports the per-layer displacement). Written on a layer with no rig, the
// same property would land in a flat parent, produce no projection at all, and move nothing — so a
// scene containing one turns the rig ON, exactly as a tilt does, and the two cases that cannot are
// refused by name rather than rendered as a no-op.
//
// THE LAYER CHANGES APPARENT SIZE, and it must. Depth without magnification is a translation, not a
// distance: a layer pushed back 600px under a 1600px lens is drawn at 1600/2200 = 0.727 of its size,
// and holding that at 1.0 would be exactly the "scale that is not a depth" this modifier exists to stop
// being. Author the layer at the size the DEPTH asks for — divide by (lens - z) / lens to get back the
// screen size you had — rather than reaching for a compensating scale, which `kick` owns anyway.
//
// ON A GROUP CHILD it is refused. A group is its own diorama with its own camera at its own centre
// (core/fx/tilt.js), the group element is a flat parent, and a child pushed back inside it would be
// projected by nothing. Put the plane on the GROUP: the whole composed card then stands at that depth
// and its children ride it, which is what a card at a distance is.

export const PLANE_KEYS = ['z'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

// Resolved at BUILD as well as per frame, so a malformed spec throws before a single frame is drawn.
function resolve(spec) {
  const s = num(spec) ? { z: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`plane: expected a number of px or an object like { "z": -600 } — got ${JSON.stringify(spec)}. `
      + `Keys: ${PLANE_KEYS.join(', ')}. Negative is away from the eye, positive is toward it.`);
  for (const k of Object.keys(s))
    if (!PLANE_KEYS.includes(k))
      throw new Error(`plane: unknown key "${k}" — known: ${PLANE_KEYS.join(', ')}. `
        + `z is a DISTANCE in px from the picture plane, not an angle and not a z-index — layer order is `
        + `\`track\`.`);
  if (!num(s.z))
    throw new Error(`plane: z must be a number of px — got ${JSON.stringify(s.z)}. It is how far the layer `
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
// orthographic — the layer would sit at z and be drawn at exactly the size and place it had. Checked
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
  // that anyway — through a division by zero and out the far side, mirrored and inverted — and says
  // nothing. The lens is keyable (`p`), so this is the one check that cannot be made at build.
  if (z >= cam.lens)
    throw new Error(`plane: z is ${z}px and the lens is ${cam.lens}px away, so this layer stands at or `
      + `THROUGH the camera. Move it back (z < ${cam.lens}), or open the lens with the camera's \`p\`.`);
  // Written in full on every frame and never appended to: the value is a function of the spec alone, so
  // a cold render and a warm one agree and any render order gives the same string.
  el.style.translate = `0 0 ${z.toFixed(2)}px`;
}
