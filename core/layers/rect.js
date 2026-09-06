// core/layers/rect.js. A panel / card / pill: pure box, no text (put text on a higher track).
import { propsOf } from '../registry/props.js';

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
// the shape, and it passed the unknown-prop check for exactly the reason `fill` did, because TEXT
// layers declare it and that check is type-agnostic. A bar written `{type:"rect", color:"var(--accent)"}`
// rendered WHITE, which is the default, which is the one outcome indistinguishable from "I meant white".
// Found by authoring a bar chart, not by a gate. Same reasoning and same resolution as #213: the input
// is unambiguous, so honour it. docs/MISTAKES.md #369.
// The props are read off this signature (propsOf, core/props.js), not typed a second time below it.
// The layer arrives as `L` for the delegation, and the fourth parameter destructures it: the name in
// the pattern IS the read, so a prop this builder does not consume cannot be declared and then ignored,
// and deleting a read deletes the declaration with it.
export function build(kit, el, L, { h, bg, fill, color, elevation } = L) {
  if (h != null) el.style.height = h + 'px';
  const paint = bg ?? fill ?? color;
  if (paint == null && !elevation) el.style.background = '#fff';
  // `{ __proto__: L }`, not `{ ...L }`. A spread reads EVERY key off the layer, and a layer is watched
  // by core/prop-audit.js. One spread would mark the whole vocabulary consumed and hand every rect in
  // the library a free pass on the audit. Delegation reads only the keys chipBox actually asks for.
  kit.chipBox(el, paint != null && bg == null ? { __proto__: L, bg: paint } : L);
}

export const PROPS = propsOf(build);

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "a plain box, panel, card or pill. it carries no text: put that on a higher track";
