// scripts/lib/layers.mjs: walking a scene's layer TREE, once.
//
// `layers` is a tree: a group carries `children`, and a gate that reasons about "every layer" has to
// flatten it first. Five gates did, in four slightly different ways, and the differences were all
// accidental. Two of them dropped the guard the other three had, which is the only part that mattered:
//
//   seam-snap.mjs   `(ls||[]).flatMap((l) => [l, ...walk(l.children)])`, a `null` left in the array
//                   (a deleted layer, a trailing comma an editor turned into a hole) threw
//                   `TypeError: cannot read properties of null` out of the seam gate, so the check that
//                   exists to catch a black flash reported a crash instead of a frame.
//   inspect.mjs     no guard either, and it PUSHES what it walks, so a stray string in `layers` was
//                   handed to `textOf`/`animated` as if it were a layer. `"x".children` is undefined
//                   rather than an error, so nothing threw: the string was silently counted as a layer
//                   present at that beat, and a `mustShow` needle could match against it.
//
// Both are the silent-substitution class CLAUDE.md names: input the tool accepts and then treats as
// something it is not. One guarded definition, so a non-object in `layers` is skipped everywhere and
// the validator stays the thing that complains about it.

/**
 * flattenLayers(list) → every layer OBJECT in the tree, parents before their children (pre-order,
 * which is the order all five call sites already produced). Non-objects are skipped, not thrown on.
 */
export function flattenLayers(list, out = []) {
  for (const l of Array.isArray(list) ? list : []) {
    if (!l || typeof l !== 'object') continue;
    out.push(l);
    if (Array.isArray(l.children)) flattenLayers(l.children, out);
  }
  return out;
}

/** flattenLayer(layer) → that one layer plus its descendants. The single-layer signature inspect.mjs
 *  needs, expressed in terms of the same walk rather than as a second one. */
export const flattenLayer = (l) => flattenLayers([l]);
