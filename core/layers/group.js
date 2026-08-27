// core/layers/group.js, layout-by-containment: a flex/grid box whose children (any depth) flow with
// gap so a card+label+chip or a logo row can never desync. DOM ancestry = visual stacking.
// A group's own vocabulary is the LAYOUT, and layoutGroup/chipBox/addGroupChild read it, so it is
// declared in core/layers/util.js, where those live. This file reads only the tree.
export const PROPS = { children: {} };

export function build(kit, el, L) {
  kit.layoutGroup(el, L);
  kit.chipBox(el, L);
  for (const C of L.children || []) kit.addGroupChild(el, C, L);
}

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "layout by containment: a flex/grid box whose children (any depth) flow with a gap, so a card + label + chip can never desync";
