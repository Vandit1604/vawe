// core/layers/rect.js — a panel / card / pill: pure box, no text (put text on a higher track).
// `fill` is accepted as an alias for `bg`. It is the obvious name for "the colour inside the shape" and
// it is the real name on `svg`, so authors reach for it here constantly. It used to be swallowed: the
// validator's unknown-prop check is type-agnostic, so `fill` counted as known because svg uses it, and a
// rect written `{fill:'#d33'}` silently rendered the default white. Documented-looking input accepted and
// discarded is the failure mode this codebase hates most (docs/MISTAKES.md #213), and here the input is
// unambiguous, so the right answer is to honour it rather than to add an error.
// `fill` is an alias for `bg`, accepted because it was set on real scenes and silently thrown away
// (docs/MISTAKES.md #213). `h` is read here rather than by the shared box helper. Everything else this
// layer paints comes through kit.chipBox, which declares its own.
// `color` is the THIRD name for this, and it was still swallowed after `fill` was fixed. A rect carries
// no text (see the line at the top of this file), so on this layer `color` can only mean the colour of
// the shape — and it passed the unknown-prop check for exactly the reason `fill` did, because TEXT
// layers declare it and that check is type-agnostic. A bar written `{type:"rect", color:"var(--accent)"}`
// rendered WHITE, which is the default, which is the one outcome indistinguishable from "I meant white".
// Found by authoring a bar chart, not by a gate. Same reasoning and same resolution as #213: the input
// is unambiguous, so honour it. docs/MISTAKES.md #369.
export const PROPS = { fill: {}, color: {}, h: {} };

export function build(kit, el, L) {
  if (L.h != null) el.style.height = L.h + 'px';
  const paint = L.bg ?? L.fill ?? L.color;
  // `{ __proto__: L }`, not `{ ...L }`. A spread reads EVERY key off the layer, and a layer is watched
  // by core/prop-audit.js — one spread would mark the whole vocabulary consumed and hand every rect in
  // the library a free pass on the audit. Delegation reads only the keys chipBox actually asks for.
  const spec = paint != null && L.bg == null ? { __proto__: L, bg: paint } : L;
  if (spec.bg == null && !spec.elevation) el.style.background = '#fff';
  kit.chipBox(el, spec);
}
