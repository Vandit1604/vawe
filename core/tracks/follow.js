// core/tracks/follow.js — pin a layer to another layer's LIVE box, every frame.
//
// `anchor` already places a layer against the canvas and `becomes` already hands one layer's final
// pose to another, and both are build-time geometry: they resolve once, against numbers, before any
// frame exists. Neither can express the commonest note in a review — "the label should stay under the
// card" — once the card is moving, because the card's position after its motion track is only known at
// t. Authors solved it by copying the card's motion keys into the label and re-copying them by hand
// whenever the card was retimed, which is the same duplicate-source-of-truth shape `becomes` was
// written to kill for the other half of the problem.
//
//   follow: { id: "card", edge: "below", gap: 24 }        // edge · gap · dx · dy, all optional
//
// WHY THIS IS A TRACK AND NOT A MODIFIER, since core/fx/ is where "things done to a layer" belong: it
// writes `transform` on the layer element, and core/fx/index.js forbids a modifier from doing exactly
// that. A modifier also runs last, after the motion track, so a pinned layer would be pinned and then
// have its own choreography discarded. This has to land BEFORE the motion track, so the pin decides
// where the layer sits and the motion track animates about it. That is a slot, which is a track.
//
// Pure in t: every number comes from the frozen scene view, whose boxes are resolved for the whole
// frame before any layer's tracks run. It reads no DOM and keeps nothing between frames, so the result
// cannot depend on which layer the loop reached first.
//
// The same property sets its ONE limit: a box is where the layer's own geometry puts it, so following a
// layer that is itself following a third would pin you to the middle one's UNPINNED position. That used
// to be a paragraph here and nothing else, so a chain rendered a wrong answer in silence. It is a
// REFUSAL now, below. The engine's rule is that an input it cannot honour fails loudly rather than
// being quietly half-applied, and the fix is always the same one: follow the layer that actually moves.
export const slot = 'follow';

// `id` and x/y are read only to place a follower, and both are unconditional reads elsewhere.
export const PROPS = { follow: {}, id: { when: 'follow' }, x: { when: 'follow' }, y: { when: 'follow' } };

const EDGES = ['center', 'above', 'below', 'left', 'right'];

export function frame(kit, el, L, units, t, f, start, end, scene) {
  const spec = L.follow;
  if (spec == null) return;
  if (typeof spec !== 'object' || Array.isArray(spec) || typeof spec.id !== 'string')
    throw new Error(`\`follow\` is an object like { "id": "card", "edge": "below", "gap": 24 } — `
      + `got ${JSON.stringify(spec)}.`);
  const edge = spec.edge ?? 'center';
  if (!EDGES.includes(edge))
    throw new Error(`follow edge "${edge}" — known: ${EDGES.join(', ')}.`);
  if (!L.id)
    throw new Error(`layer following "${spec.id}" has no \`id\`. A follower is placed by its own size, `
      + `and only an identified layer has a measured box.`);
  // CHAINING, refused where the arithmetic would otherwise lie. resolveBoxes composes every box for
  // the frame BEFORE any track runs, so the target's box is its own geometry and carries nothing this
  // track wrote. Following a follower therefore pins to where the middle layer would sit if it were
  // not following anything, which is a wrong answer rather than a missing one.
  const tgt = scene.specOf(spec.id);
  if (tgt && tgt.follow)
    throw new Error(`follow: "${L.id}" follows "${spec.id}", which is itself following `
      + `"${tgt.follow.id}". A box is resolved before any track runs, so "${spec.id}" reports its `
      + `UNPINNED position and this pin would land at a place nothing is. Follow "${tgt.follow.id}" `
      + `directly, or give "${spec.id}" the motion instead of a pin.`);
  const b = scene.boxOf(spec.id);
  if (!b)
    throw new Error(`follow: no box for "${spec.id}" — known ids: ${scene.ids.join(', ')}. `
      + `A child of a group whose motion track keys w/h has no box either: that group reflows, so the `
      + `child's measured offset is stale and a pin to it would be a wrong answer rather than none.`);
  const me = scene.boxOf(L.id);
  if (!me) throw new Error(`follow: layer "${L.id}" has no box of its own to place.`);
  // The target's SCALED half-extents, because an edge is where the layer visibly ends. boxOf reports
  // w/h unscaled with `scale` beside them on purpose (folding scale in would move the top-left corner
  // and nothing on screen moves with it), so the scale is applied here and only to the extents.
  const hw = (b.w * b.scale) / 2, hh = (b.h * b.scale) / 2;
  const gap = spec.gap ?? 0;
  let cx = b.cx, cy = b.cy;
  if (edge === 'below') cy = b.cy + hh + gap + me.h / 2;
  else if (edge === 'above') cy = b.cy - hh - gap - me.h / 2;
  else if (edge === 'right') cx = b.cx + hw + gap + me.w / 2;
  else if (edge === 'left') cx = b.cx - hw - gap - me.w / 2;
  // Centres, not corners: two boxes of different sizes sharing a top-left corner visibly jump, and
  // sharing a centre does not — the same reason `becomes` matches centres.
  const tx = cx - me.w / 2 - (L.x ?? 60) + (spec.dx ?? 0);
  const ty = cy - me.h / 2 - (L.y ?? 240) + (spec.dy ?? 0);
  // Composed onto whatever the enter/exit and the primitive left, never replacing it, and safe to
  // prepend because driveClips rewrites `transform` from scratch every frame — the same invariant the
  // motion track relies on to avoid appending to its own value from the previous frame.
  const base = el.style.transform && el.style.transform !== 'none' ? ' ' + el.style.transform : '';
  el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)${base}`;
}
