// core/fx/occlude.js: hide this layer where another layer covers it. The move a compositor makes to
// put something BEHIND something else without stacking order being able to say it: a caption that
// disappears under a card as the card slides over, a rule that runs behind a portrait, a label that
// dives under the panel it belongs to. z-index can only ever answer "in front or behind, always"; this
// answers "behind THAT, right now, and the hole moves as it moves".
//
//   "modifiers": [{ "occlude": "card" }]
//   "modifiers": [{ "occlude": { "by": ["card", "chip"], "pad": 12, "invert": true } }]
//   "modifiers": [{ "occlude": "above" }]     // by everything painted in front of me, whatever it is
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
// IT WORKS ON A GROUP CHILD. It used to refuse on the argument that a child's x/y are relative to a
// flex box whose position only layout knows, true of the AUTHORED x/y and not of the child, which is
// laid out and therefore measurable. scene.js measures that offset once at build and composes it with
// the group's per-frame box, so a group child has a real canvas box like anything else. The refusal
// survives for ONE case, where the measurement really is stale: a group whose own motion track keys
// `w`/`h` has reflowed its children, and boxOf returns null for those.

export const OCCLUDE_KEYS = ['by', 'pad', 'invert'];
// `by` may name the STACK instead of a set of ids. The effect's real subject is almost always "hide me
// under whatever is in front of me", and spelling that as a hand-written list is a list that rots: it
// is silently wrong the moment a layer is added, reordered, or given a `track`. These read the paint
// order out of the scene view (scene.ids is sorted by z, scene.specOf(id).z is that z), so the answer
// is re-derived every frame from the same ordering driveClips paints with.
const STACK = ['above', 'below'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

function resolve(spec) {
  const s = typeof spec === 'string' ? { by: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`occlude: expected a layer id or an object like { "by": "card", "pad": 8 }, `
      + `got ${JSON.stringify(spec)}. Keys: ${OCCLUDE_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!OCCLUDE_KEYS.includes(k))
      throw new Error(`occlude: unknown key "${k}", known: ${OCCLUDE_KEYS.join(', ')}.`);
  const by = typeof s.by === 'string' ? [s.by] : s.by;
  if (!Array.isArray(by) || !by.length || !by.every((v) => typeof v === 'string' && v))
    throw new Error(`occlude: \`by\` must be "above", "below", a layer id, or a list of ids, got `
      + `${JSON.stringify(s.by)}. It names the layer(s) whose box punches the hole.`);
  if (by.length > 1 && by.some((v) => STACK.includes(v)))
    throw new Error(`occlude: "${by.find((v) => STACK.includes(v))}" already means every layer on that `
      + `side of this one, so mixing it with named ids is either redundant or a contradiction. Use it `
      + `alone, or list the ids.`);
  const pad = s.pad == null ? 0 : s.pad;
  if (!num(pad)) throw new Error(`occlude: pad must be a number of px grown around the occluder, got ${JSON.stringify(s.pad)}.`);
  if (s.invert != null && typeof s.invert !== 'boolean')
    throw new Error(`occlude: invert must be true or false (show ONLY where covered), got ${JSON.stringify(s.invert)}.`);
  return { by, pad, invert: s.invert === true };
}

export function build(kit, el, L, spec) {
  resolve(spec);
  // Checked here rather than at frame time because it is a property of the JSON, not of t, and this is
  // the pass that runs before any frame is drawn.
  if (!L.id)
    throw new Error(`occlude: this layer needs an \`id\`. Its own box is looked up through scene.boxOf, `
      + `which only knows layers an author named. Add "id" to the layer carrying the modifier.`);
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
  const me = scene.boxOf(L.id);
  // The ONE case a box is still unresolvable, named precisely rather than blanket-refusing every group
  // child: a group whose motion track keys w/h reflows what is inside it, so the offsets measured at
  // build no longer describe its children.
  if (!me)
    throw new Error(`occlude: no box for this layer's own id "${L.id}". Either nothing declares that id, `
      + `or this is a child of a group whose motion track keys \`w\`/\`h\`, resizing a flex or grid box `
      + `reflows its children, so their measured offsets are stale and a hole placed from them would be `
      + `silently wrong. Put the modifier on the group, or resize with \`scale\` instead of w/h.`);
  const prior = el.style.clipPath;
  if (prior && prior !== 'none' && !prior.startsWith('path('))
    throw new Error(`occlude: layer "${L.id}" already has a clip-path from something else (${prior}), `
      + `almost certainly a \`cut\` that wipes or irises. Modifiers run last, so this one would win and `
      + `that cut would silently stop happening. Use a cut that moves or fades instead.`);

  // Canvas space -> this layer's own untransformed box, which is the coordinate system clip-path uses.
  // Undo the layer's own rotation and scale about its centre, then shift to its top-left.
  const r = ((me.rot || 0) * Math.PI) / 180, c = Math.cos(-r), s = Math.sin(-r);
  const toLocal = ([X, Y]) => {
    const dx = (X - me.cx) / me.scale, dy = (Y - me.cy) / me.scale;
    return [(dx * c - dy * s + me.w / 2).toFixed(2), (dx * s + dy * c + me.h / 2).toFixed(2)];
  };
  // "above"/"below" expand against the paint order, minus this layer itself. A layer sharing my z is
  // NEITHER: CSS breaks that tie by document order and the answer would flip on a reorder that changes
  // nothing visible, so it is left out rather than guessed at.
  // An id with no box (a child of a group its motion track resizes) is DROPPED from a stack expansion
  // and still an error when named explicitly: "everything above me" is a set, and a set that cannot
  // include one member is not a mistake, whereas naming that member is.
  const mine = scene.specOf(L.id).z;
  const occluders = STACK.includes(by[0])
    ? scene.ids.filter((id) => id !== L.id && scene.boxOf(id)
        && (by[0] === 'above' ? scene.specOf(id).z > mine : scene.specOf(id).z < mine))
    : by;
  const holes = [];
  for (const id of occluders) {
    const o = scene.boxOf(id);
    if (!o)
      throw new Error(`occlude: no layer with id "${id}", boxOf resolves TOP-LEVEL layers that declare `
        + `an id and group children whose group is not resized by its motion track. Known here: `
        + `${scene.ids.join(', ') || '(no layer declares an id)'}.`);
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
