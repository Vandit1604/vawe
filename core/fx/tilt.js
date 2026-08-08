// core/fx/tilt.js — turn a layer out of the picture plane. A card that leans away, a phone held at an
// angle, a wall of panels receding: the difference between a graphic laid on glass and an object with a
// side to it. docs/MISTAKES.md #59 rejected this and concluded "there is no per-layer angle that
// composes correctly". Its DIAGNOSIS was exactly right and its CONCLUSION was wrong, and the gap
// between the two is one CSS distinction:
//
//   * `perspective()` as a TRANSFORM FUNCTION takes its vanishing point from the element it is written
//     on. Every layer that used it got its OWN camera at its OWN centre, so two tilted siblings leaned
//     toward two different points and the composition came apart. That is #59's failure, reproduced
//     deliberately as the `naive` case in scripts/dev/spike-3d.mjs.
//   * `perspective` as a PROPERTY applies to an element's CHILDREN. Written ONCE on the shared parent,
//     every layer inside is projected through ONE camera while still rotating about its own centre,
//     which is what a prop in a scene actually does.
//
// So the camera goes on the parent and each layer carries a plain rotation. Two consequences follow,
// and both are measured, not assumed (spike-3d.mjs, cases C through I):
//
//   1. ANY intervening element flattens the 3D context, including a bare <div> with no clip, no filter
//      and no opacity. `transform-style: flat` is the default on every element, and that, not overflow
//      and not filter, is the rule. The camera must therefore sit on the layer's DIRECT parent — which
//      is `#cam` for a plain layer, the `.hs-beat` wrapper under `sceneUnits`, and the group element for
//      a group child. This modifier writes it to `el.parentNode` and to nothing else.
//   2. overflow, filter and opacity ON the tilted layer itself are all harmless. The engine puts at
//      least one of them on nearly every layer, so this was the load-bearing question.
//
// WHY THE `rotate` LONGHAND AND NOT `transform`
// The composition-order contract in core/fx/index.js forbids a modifier from touching `transform`: the
// cross-cutting tracks own it, and a modifier that read it and appended would be appending to its own
// value from whichever frame ran last. `rotate` is a SEPARATE CSS property (Transforms Level 2), the
// engine writes it nowhere, and the used transform is `translate · rotate · scale · transform` — so the
// tilt lands OUTSIDE everything the tracks compose, is never read back, and renderFrame(n) stays pure
// in n without this modifier needing an element of its own.
//
// The longhand carries a single axis-angle, not a list, so an x+y+z tilt is composed into one rotation
// by quaternion. That is exact, not an approximation: Euler's rotation theorem says every composition of
// rotations IS one rotation about one axis, and the projected corners of `rotate: <axis> <angle>` land
// on those of `rotateX(a) rotateY(b) rotateZ(c)` to 0.0px.
//
// ON A GROUP CHILD it works, with the camera one level in: the parent is the group element, so tilted
// siblings inside one group share a vanishing point that belongs to the GROUP, not to the canvas. That
// is the right answer for a fan of cards inside a group and the wrong one for a child meant to line up
// with a tilted top-level layer. `origin` therefore defaults to the group's own centre there (50% 50%)
// rather than to the canvas centre. Note this is NOT because the child's canvas position is unknown —
// scene.boxOf answers for a group child now — but because perspective-origin resolves against the
// PARENT's padding box, and the parent here is the group, so canvas px would land somewhere else
// entirely. To tilt a whole group as ONE plane, put the modifier on
// the group layer instead; its children then ride the group's single rotation, which is usually what a
// composed card wants anyway.
//
// KNOWN INTERACTION, because it is invisible until it bites: a few `cut` presets (flip, cube) animate a
// `perspective(...)` transform FUNCTION of their own. Under a parent camera those layers are projected
// twice and lean harder than they did. It only ever happens inside a scene that opted into tilt — a
// scene with no tilt gets no camera written anywhere and renders byte-identical — but within such a
// scene it reaches layers that never asked for it. Pair tilt with a cut that translates, not one that
// flips.

export const TILT_KEYS = ['x', 'y', 'z', 'dist', 'origin'];
const AXES = ['x', 'y', 'z'];
const DEFAULT_DIST = 1600;   // ~1.5x the short edge: a lean that reads as depth, not as a fisheye

const num = (v) => typeof v === 'number' && Number.isFinite(v);

// CSS applies `rotateX(a) rotateY(b) rotateZ(c)` as Rx·Ry·Rz, so the quaternions multiply in that order.
// Returns null for a zero rotation, where an axis is undefined and the answer is "no tilt".
function axisAngle(ax, ay, az) {
  const mul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const h = (d) => (d * Math.PI) / 360;
  const q = mul(mul(
    [Math.sin(h(ax)), 0, 0, Math.cos(h(ax))],
    [0, Math.sin(h(ay)), 0, Math.cos(h(ay))]),
    [0, 0, Math.sin(h(az)), Math.cos(h(az))]);
  const s = Math.hypot(q[0], q[1], q[2]);
  if (s < 1e-9) return null;
  return { x: q[0] / s, y: q[1] / s, z: q[2] / s, deg: (2 * Math.atan2(s, q[3]) * 180) / Math.PI };
}

// Resolved at BUILD as well as per frame, so a malformed spec throws before a single frame is drawn.
function resolve(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec))
    throw new Error(`tilt: expected an object like { "tilt": { "y": 18 } } — got ${JSON.stringify(spec)}. `
      + `Keys: ${TILT_KEYS.join(', ')}.`);
  for (const k of Object.keys(spec))
    if (!TILT_KEYS.includes(k))
      throw new Error(`tilt: unknown key "${k}" — known: ${TILT_KEYS.join(', ')}. `
        + `x/y/z are degrees about the layer's own centre; dist is the shared camera distance in px.`);
  if (!AXES.some((k) => k in spec))
    throw new Error(`tilt: needs at least one of x, y, z (degrees) — got ${JSON.stringify(spec)}. `
      + `A tilt with no angle would install a camera and rotate nothing.`);
  const a = {};
  for (const k of AXES) {
    if (spec[k] == null) { a[k] = 0; continue; }
    if (!num(spec[k])) throw new Error(`tilt: ${k} must be a number of DEGREES — got ${JSON.stringify(spec[k])}.`);
    a[k] = spec[k];
  }
  const dist = spec.dist == null ? DEFAULT_DIST : spec.dist;
  // A camera at or behind the layer plane inverts the projection into something no author asked for,
  // and CSS accepts it without a word.
  if (!num(dist) || dist <= 0)
    throw new Error(`tilt: dist must be a POSITIVE number of px (the camera distance) — got ${JSON.stringify(spec.dist)}. `
      + `Smaller is a wider lens; ${DEFAULT_DIST} is the default.`);
  let origin = spec.origin == null ? 'center' : spec.origin;
  if (origin !== 'center') {
    if (!Array.isArray(origin) || origin.length !== 2 || !origin.every(num))
      throw new Error(`tilt: origin must be "center" or [x, y] in px — got ${JSON.stringify(spec.origin)}. `
        + `It is the point every tilted layer under the same camera leans toward.`);
  }
  return { ...a, dist, origin, rot: axisAngle(a.x, a.y, a.z) };
}

export function build(kit, el, L, spec) { resolve(spec); }

export function frame(kit, el, L, t, scene, spec) {
  const { dist, origin, rot } = resolve(spec);
  const parent = el.parentNode;
  // The camera is a property of the FRAME, so every tilted layer under one parent describes the same
  // camera and they must agree. Two siblings asking for different distances is two cameras in one
  // stacking context, which CSS resolves by last-writer-wins and shows as one of the two silently
  // losing its lens. Refused instead, with both values named.
  const persp = `${dist}px`;
  // perspective-origin resolves against the PARENT's box (see the header), so for a group child the
  // camera centres on the group. A top-level layer's parent is #cam or a .hs-beat wrapper, both inset:0
  // over the canvas, so px there ARE canvas coordinates.
  const inGroup = !el.classList.contains('hs-layer');
  const org = origin === 'center'
    ? (inGroup ? '50% 50%' : `${scene.canvas.w / 2}px ${scene.canvas.h / 2}px`)
    : `${origin[0]}px ${origin[1]}px`;
  if (parent.style.perspective && parent.style.perspective !== persp)
    throw new Error(`tilt: two layers under the same parent asked for different camera distances `
      + `(${parent.style.perspective} and ${persp}). One parent is one camera; give every tilted layer `
      + `in this group the same \`dist\`, or move one of them into a group of its own.`);
  if (parent.style.perspectiveOrigin && parent.style.perspectiveOrigin !== org)
    throw new Error(`tilt: two layers under the same parent asked for different camera origins `
      + `(${parent.style.perspectiveOrigin} and ${org}). One parent is one vanishing point.`);
  parent.style.perspective = persp;
  parent.style.perspectiveOrigin = org;
  // Written on every frame and always in full, never appended to: the value is a function of the spec
  // alone, so a cold render and a warm one agree and any render order gives the same string.
  el.style.rotate = rot ? `${rot.x.toFixed(6)} ${rot.y.toFixed(6)} ${rot.z.toFixed(6)} ${rot.deg.toFixed(4)}deg` : 'none';
}
