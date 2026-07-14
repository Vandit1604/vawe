// core/layers/group.js — layout-by-containment: a flex/grid box whose children (any depth) flow with
// gap so a card+label+chip or a logo row can never desync. DOM ancestry = visual stacking.
export function build(kit, el, L) {
  kit.layoutGroup(el, L);
  kit.chipBox(el, L);
  for (const C of L.children || []) kit.addGroupChild(el, C, L);
}
