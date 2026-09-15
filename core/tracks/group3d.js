// core/tracks/group3d.js: a `group` never gets its own preserve-3d, so a child's own rotY/rotX/z is
// flattened onto the group's 2D plane before it ever reaches the camera rig (formats/scene/scene.js
// "THE CAMERA RIG": #cam and every beat wrapper get preserve-3d the moment ANY layer keys a 3D motion
// prop, but a group in between stays flat, browsers default every element to transform-style: flat).
//
// This is the earlier group-plane case (engine-doctrine/CRAFT/KEYED-MOTION.md 5b) in reverse: there, a flat group
// is CORRECT because its children have no 3D of their own and are meant to ride the group's tilt flat.
// Here the children carry their OWN rotY/rotX/z, so the group has to open a 3D context for them to
// stand in, or the depth is lost. Decided once, from the resolved motion tracks, exactly like scene.js's
// own `has3DMotion`: a group needs preserve-3d iff some descendant (any depth) keys its own z/rotX/rotY,
// and so does every group ancestor between it and the camera. A group whose descendants are all flat is
// untouched, so the terminal-plane case renders exactly as before.
//
// Pure functions operating on `{ L, el }` entries, `el` needing only `.parentElement`, `.style` and
// (for logging) `.dataset`/`.id`: real DOM elements in the renderer, plain mock objects in tests.

export function hasOwn3DMotion(L) {
  return Array.isArray(L.motion) && L.motion.some((k) => k && (k.z != null || k.rotX != null || k.rotY != null));
}

// computeGroup3D(layers): from the flat `{L, el}` list scene.js builds every layer into, find every
// group that needs preserve-3d (has a 3D-keying descendant at any depth) and, for each, its direct
// children (the ones whose opacity/filter would need pushing down, see applyGroup3DOpacityAdapt).
// Returns { need3D: Set<el>, adapt: [{ el, children }] }, `adapt` filtered to groups with children (a
// group can only ever have children if it needs preserve-3d in the first place, since the 3D-keying
// descendant lives in one of them, but an empty group is defensive and free to check).
export function computeGroup3D(layers) {
  const byEl = new Map(layers.map((e) => [e.el, e]));
  const need3D = new Set();
  for (const e of layers) {
    if (!hasOwn3DMotion(e.L)) continue;
    let p = e.el.parentElement;
    while (p && byEl.has(p) && byEl.get(p).L.type === 'group') {
      if (need3D.has(p)) break; // already walked from an earlier leaf; its own ancestors are too
      need3D.add(p);
      p = p.parentElement;
    }
  }
  const adapt = [...need3D]
    .map((el) => ({ el, children: layers.filter((e) => e.el.parentElement === el).map((e) => e.el) }))
    .filter((g) => g.children.length);
  return { need3D, adapt };
}

// applyGroup3DOpacityAdapt(list, logged): the per-frame half. Opacity and filter are grouping
// properties in CSS: either one on a group holding its own preserve-3d context flattens that context
// right back, whatever wrote it (a keyed motion track, a static value, anything). So every frame, once
// every layer's own tracks have written this frame's authoritative opacity/filter, a 3D-holding group's
// current opacity/filter is read back, moved onto its direct children (multiplying into whatever they
// already carry), and the group is reset to opaque/unfiltered. Order-independent: every value read here
// was written earlier in THIS SAME call by writers documented authoritative on every frame (motion.js),
// never carried over from a stale prior one, so a cold render and a warm one agree.
//
// A CHILD'S "WHATEVER IT ALREADY CARRIES" IS NOT SAFE TO READ BLIND, and it used to be. A child that
// keys its own 3D pose but never keys its own blur/opacity (the ordinary case: a card just needs to
// SIT at its tilt) never gets a fresh, unconditional write to that property from its own track: motion.js
// only writes `filter` when the layer computes a nonzero blur or already owns a stash (`el.__hsBlur`),
// and `opacity` is read back from `el.style.opacity` itself rather than a separate stored base. So
// "whatever it already carries" was, every frame after the first, THIS FUNCTION'S OWN PUSH FROM LAST
// FRAME: read, concatenated/multiplied again, and written back, forever compounding one more blur() or
// one more opacity factor onto the pile every tick a group blur/opacity stayed nonzero. A rack-focus
// blur meant to decay to 0 over a beat instead grew withOUT bound, which is the heavy, whole-beat blur
// this was found from. THE FIX is the same idempotent stash `writeBlur` already uses for exactly this
// reason (core/tracks/motion.js): remember what WE wrote and to what base, so next frame we can tell
// our own last push apart from the child's own fresh write and start from the child's real base again,
// never from our own leftovers.
// gFilter null means the group carries no filter THIS frame: still run, because a child may hold a
// stash from an earlier frame's push (a decaying blur that just reached 0) that has to be cleared back
// to the child's own base rather than left sitting there forever (the same bug, at the other end of
// the decay: nothing to compound, but nothing to clean up either, without this branch running).
function pushFilter(c, gFilter) {
  const raw = c.style.filter;
  const cur = raw && raw !== 'none' ? raw : '';
  const prior = c.__hsGroup3D;
  const base = prior && cur === prior.out ? prior.base : cur;
  const out = gFilter ? (base ? base + ' ' : '') + gFilter : base;
  c.style.filter = out || 'none';
  c.__hsGroup3D = { out, base };
}
function pushOpacity(c, gOpV) {
  const raw = parseFloat(c.style.opacity);
  const cur = Number.isFinite(raw) ? raw : 1;
  const prior = c.__hsGroup3DOp;
  const base = prior && Math.abs(cur - prior.out) < 1e-6 ? prior.base : cur;
  const out = base * gOpV;
  c.style.opacity = out.toFixed(3);
  c.__hsGroup3DOp = { out, base };
}
export function applyGroup3DOpacityAdapt(list, logged) {
  for (const g of list) {
    const gOp = parseFloat(g.el.style.opacity);
    const gOpV = Number.isFinite(gOp) ? gOp : 1;
    const gFilter = g.el.style.filter;
    const gHasFilter = gFilter && gFilter !== 'none';
    // A group that has never carried a push and is at rest this frame (opaque, unfiltered) has nothing
    // to give and nothing of its own to clean up: skip it exactly as before. Once either property has
    // ever been nonzero, __hs* is set on the group itself below and this group keeps running every
    // frame after, so a decay back to rest still gets its last cleanup pass.
    if (gOpV === 1 && !gHasFilter && !g.el.__hsGroup3DTouched) continue;
    if (gOpV !== 1 || gHasFilter) g.el.__hsGroup3DTouched = true;
    if (logged && !logged.has(g.el)) {
      logged.add(g.el);
      console.log(`adapted group-3d-opacity: ${g.el.dataset?.id || g.el.id || 'group'} opacity moved `
        + `to children (opacity flattens 3D in CSS)`);
    }
    g.el.style.opacity = '1';
    for (const c of g.children) pushOpacity(c, gOpV);
    g.el.style.filter = 'none';
    for (const c of g.children) pushFilter(c, gHasFilter ? gFilter : null);
  }
}
