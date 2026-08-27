// core/tracks/primitive.js. The layer type's OWN frame(): the count number, the typing cursor, the
// pointer path, the clip's frame, the image's ken burns (core/layers/<type>.js).
//
// It is a track, and the reason is the only reason anything here is a track: the primitive does not
// run before the cross-cutting jobs or after them, it runs IN THE MIDDLE of them, and nothing said so.
// `updateLayer` had `renderer.frame(el, L, t, scene)` sitting as the fourth of nine statements with a
// comment describing it as a different kind of thing, and the position was load-bearing in both
// directions at once:
//   - AFTER `enter`: core/layers/cursor.js writes `el.style.transform` outright, so the cut kit's
//     transform is deliberately discarded for a pointer. Run the primitive first and the cut would
//     win instead, and a cursor inside a declared cut would slide with the beat rather than sit still.
//   - BEFORE `spin` / `react` / `transform`: those three read the transform already on the element and
//     compose onto it. A cursor's path only survives to the screen because they run after it.
// Both facts lived in nobody's head. They live in this file now.
export const slot = 'primitive';

// Reads no prop of its own: it hands the layer to the type's builder, which declares its own. Stated
// rather than omitted, because "declares nothing" and "nobody wrote the declaration yet" have to differ.
export const PROPS = {};

export function frame(kit, el, L, units, t, f, start, end, scene) {
  kit.renderer.frame(el, L, t, scene);
}
