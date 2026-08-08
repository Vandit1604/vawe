// core/fx/occlude.js — hide this layer where another layer covers it. The move a compositor makes to
// put something BEHIND something else without stacking order being able to say it: a caption that
// disappears under a card as the card slides over, a rule that runs behind a portrait, a label that
// dives under the panel it belongs to. z-index can only ever answer "in front or behind, always"; this
// answers "behind THAT, right now, and the hole moves as it moves".
//
//   "modifiers": [{ "occlude": "card" }]
//   "modifiers": [{ "occlude": { "by": ["card", "chip"], "pad": 12, "invert": true } }]
//
// FIRST CONSUMER OF scene.boxOf. That is the whole reason it can exist: until a layer's frame() was
// handed a view of the rest of the frame it had itself and the clock, and "where is the other layer"
// had no answer that was not a live DOM measurement of an element the loop might not have reached yet.
// boxOf resolves every box BEFORE any layer's frame runs, from authored geometry and the motion track
// sampled at t, so the hole is a pure function of t and independent of which layer is updated first.
//
// WHY clip-path AND NOT mask. A rectangular hole needs either two mask layers composited with
// `subtract` or one clip path with two subpaths and the even-odd rule. Both work in this engine's
// Chrome; the path wins because it is exact under ROTATION and SCALE. An occluder with `rot` in its
// motion track is four rotated corners in a path and an axis-aligned approximation in a mask, and an
// approximation the author cannot see the edges of is the shape of bug this repo keeps logging.
//
// CONTESTED PROPERTY, made loud rather than silent: a few `cut` presets animate clip-path themselves
// (the wipes and irises write `inset(...)`). Modifiers run after the cut kit, so this one would win and
// the iris would simply stop happening with nothing said. Instead, a clip-path written by anything
// other than this modifier is a hard error naming both. Ours is always a `path(`, which nothing else in
// the engine emits, so the test needs no marker and no state.
//
// ON A GROUP CHILD IT REFUSES, and that is a limit of the geometry, not an omission. A group child's
// x/y are relative to a flex or grid box whose position only layout knows, which is exactly why
// scene.js's boxOf returns null for one rather than a plausible guess. Without a canvas-space box for
// the occluded layer there is no way to place a canvas-space occluder inside it, and a hole that is
// silently 40px off is worse than an error. Put the modifier on the GROUP: the group is a top-level
// layer with a real box, and occluding it occludes everything in it.

export const OCCLUDE_KEYS = ['by', 'pad', 'invert'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

function resolve(spec) {
  const s = typeof spec === 'string' ? { by: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`occlude: expected a layer id or an object like { "by": "card", "pad": 8 } — `
      + `got ${JSON.stringify(spec)}. Keys: ${OCCLUDE_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!OCCLUDE_KEYS.includes(k))
      throw new Error(`occlude: unknown key "${k}" — known: ${OCCLUDE_KEYS.join(', ')}.`);
  const by = typeof s.by === 'string' ? [s.by] : s.by;
  if (!Array.isArray(by) || !by.length || !by.every((v) => typeof v === 'string' && v))
    throw new Error(`occlude: \`by\` must be a layer id or a list of them — got ${JSON.stringify(s.by)}. `
      + `It names the layer(s) whose box punches the hole.`);
  const pad = s.pad == null ? 0 : s.pad;
  if (!num(pad)) throw new Error(`occlude: pad must be a number of px grown around the occluder — got ${JSON.stringify(s.pad)}.`);
  if (s.invert != null && typeof s.invert !== 'boolean')
    throw new Error(`occlude: invert must be true or false (show ONLY where covered) — got ${JSON.stringify(s.invert)}.`);
  return { by, pad, invert: s.invert === true };
}

export function build(kit, el, L, spec) {
  resolve(spec);
  // Checked here rather than at frame time because it is a property of the JSON, not of t, and this is
  // the pass that runs before any frame is drawn.
  if (!L.id)
    throw new Error(`occlude: this layer needs an \`id\` — its own box is looked up through scene.boxOf, `
      + `which only knows layers an author named. Add "id" to the layer carrying the modifier. A group `
      + `CHILD is refused whatever it is called: put the modifier on the group.`);
}

// A box as four canvas-space corners: half extents grown by pad, scaled about the centre, then rotated.
// `scale` is reported beside w/h rather than folded into them (see scene.js resolveBoxes), so it is
// applied here and not assumed away.
function cornersOf(b, pad) {
  const hw = (b.w / 2 + pad) * b.scale, hh = (b.h / 2 + pad) * b.scale;
  const r = ((b.rot || 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
    .map(([x, y]) => [b.cx + x * c - y * s, b.cy + x * s + y * c]);
}

export function frame(kit, el, L, t, scene, spec) {
  const { by, pad, invert } = resolve(spec);
  if (!el.classList.contains('hs-layer'))
    throw new Error(`occlude: layer "${L.id}" is a GROUP CHILD, whose position in the canvas only the `
      + `group's layout knows — scene.boxOf returns null for one on purpose. Put the modifier on the `
      + `group layer instead; occluding the group occludes everything in it.`);
  const me = scene.boxOf(L.id);
  if (!me)
    throw new Error(`occlude: no box for this layer's own id "${L.id}" — boxOf knows only top-level `
      + `layers that declare an id.`);
  const prior = el.style.clipPath;
  if (prior && prior !== 'none' && !prior.startsWith('path('))
    throw new Error(`occlude: layer "${L.id}" already has a clip-path from something else (${prior}) — `
      + `almost certainly a \`cut\` that wipes or irises. Modifiers run last, so this one would win and `
      + `that cut would silently stop happening. Use a cut that moves or fades instead.`);

  // Canvas space -> this layer's own untransformed box, which is the coordinate system clip-path uses.
  // Undo the layer's own rotation and scale about its centre, then shift to its top-left.
  const r = ((me.rot || 0) * Math.PI) / 180, c = Math.cos(-r), s = Math.sin(-r);
  const toLocal = ([X, Y]) => {
    const dx = (X - me.cx) / me.scale, dy = (Y - me.cy) / me.scale;
    return [(dx * c - dy * s + me.w / 2).toFixed(2), (dx * s + dy * c + me.h / 2).toFixed(2)];
  };
  const holes = [];
  for (const id of by) {
    const o = scene.boxOf(id);
    if (!o)
      throw new Error(`occlude: no layer with id "${id}" — boxOf resolves TOP-LEVEL layers that declare `
        + `an id, and returns null for a group child (its canvas position is not knowable) and for a `
        + `name nothing uses. Known here: whichever layers carry "id".`);
    if (!o.visible || o.opacity <= 0) continue;   // outside its own window: it is not covering anything
    holes.push('M' + cornersOf(o, pad).map(toLocal).map(([x, y]) => `${x} ${y}`).join('L') + 'Z');
  }
  // Written in full every frame and never read back, so a cold render and a warm one agree.
  if (invert) {
    // Keep ONLY what is covered. With nothing covering, nothing shows, which is the honest reading of
    // "show me the overlap" and not an accident.
    el.style.clipPath = holes.length ? `path("${holes.join(' ')}")` : 'path("M0 0Z")';
  } else if (!holes.length) {
    el.style.clipPath = 'none';
  } else {
    // even-odd: the outer rect is the layer's own box, each hole is a subpath inside it.
    const outer = `M0 0H${me.w.toFixed(2)}V${me.h.toFixed(2)}H0Z`;
    el.style.clipPath = `path(evenodd, "${outer} ${holes.join(' ')}")`;
  }
}
