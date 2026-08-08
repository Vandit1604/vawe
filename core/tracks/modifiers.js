// core/tracks/modifiers.js — the per-layer modifier pass (core/fx/index.js). LAST, so a modifier acts
// on the finished frame rather than on a half-composed one. A layer that declares none never enters
// this call.
//
// "Modifiers are always last" was a sentence in three files' comments and a statement at the bottom of
// a function. It is now the final entry in SLOTS, and a second track claiming `post` is an error at
// load rather than a diff somebody notices in a render.
export const slot = 'post';

export function frame(kit, el, L, units, t, f, start, end, scene) {
  kit.renderer.modify(el, L, t, scene);
}
