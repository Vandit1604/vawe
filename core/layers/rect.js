// core/layers/rect.js — a panel / card / pill: pure box, no text (put text on a higher track).
// `fill` is accepted as an alias for `bg`. It is the obvious name for "the colour inside the shape" and
// it is the real name on `svg`, so authors reach for it here constantly. It used to be swallowed: the
// validator's unknown-prop check is type-agnostic, so `fill` counted as known because svg uses it, and a
// rect written `{fill:'#d33'}` silently rendered the default white. Documented-looking input accepted and
// discarded is the failure mode this codebase hates most (docs/MISTAKES.md #213), and here the input is
// unambiguous, so the right answer is to honour it rather than to add an error.
export function build(kit, el, L) {
  if (L.h != null) el.style.height = L.h + 'px';
  const spec = L.fill != null && L.bg == null ? { ...L, bg: L.fill } : L;
  if (spec.bg == null && !spec.elevation) el.style.background = '#fff';
  kit.chipBox(el, spec);
}
