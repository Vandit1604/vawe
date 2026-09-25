import { defineRegistry } from '../registry/registry.js';
// core/three-scenes.js: the `three` scene NAME registry, and nothing else.
//
// It is split out for one concrete reason: core/surfaces/three-fx.js imports the vendored three.js by its
// BROWSER-absolute path (/assets/vendor/three.module.js), which Node cannot resolve. Every gate that
// needs the list of scenes runs in Node, so importing the implementation to read its registry made
// `make schema-drift` crash outright.
//
// The obvious alternative, hand-copying the names into each gate, is the exact failure this repo has
// now logged three times in one day (#83 counts, #90 doc claims, #94 coverage lists): a hand-kept
// list of things that exist elsewhere decays the moment someone ships. So there is still exactly ONE
// list, here, with no imports; core/surfaces/three-fx.js imports it, and lib-test asserts that the SCENES it
// actually implements match it name for name. Splitting the file does not get to mean splitting the
// source of truth.
// EACH SCENE DESCRIBES ITSELF. This was a bare array of names, so all eleven rendered their blurb as
// an em-dash in engine-doctrine/EFFECTS.md and on the site. A capability an author is never shown and therefore
// cannot choose. Same shape as SHADER_ID -> SHADER_FX (core/stings.js): the map is the source, the
// array is derived, and the two cannot drift because one is computed from the other.
export const THREE_SCENES = {
  deviceShowcase: 'a GLTF device body turning in real light with a LIVE HTML screen mapped onto it',
  uiParallax: 'flat UI planes stacked at depth, the camera moving past them so the layers separate',
  pointCloud: 'a GPU point cloud: thousands of lit points posed absolutely from t',
  extrudeText: 'a real font outline extruded into a lit 3D solid that rotates through space',
  globe: 'a rotating globe of land dots, with arcs available between coordinates',
  shatter: 'one solid slab holds, then breaks into a seeded grid of shards that tumble outward and toward camera',
  magnetic: 'field lines arcing from pole to pole, traced from the real summed inverse-square field, with charges sliding along them',
  liquidBackground: 'a subdivided plane churning under summed sine displacement, specular highlights sliding across the swells',
  codeExtrude: 'syntax-coloured code on lit beveled slabs, rising out of depth and growing to thickness, top line first',
  codeDissolve: 'code resolving out of seeded noise behind a chromatic burn edge, then holding crisp',
  codeAssemble: 'thousands of GPU points flying from a seeded cloud to the exact glyph positions and resolving into readable code',
  litPlane: 'a captured UI plane, LIT (MeshStandardMaterial under the studio rig, not MeshBasicMaterial), rising with a tilt and a rotation into a soft-shadowed ground with an overshoot settle; `motionBlur` (true, or a 0..1 strength, the same word every layer uses) opts it into a shutter-accumulated smear on the fast rise',
};
export const THREE_FX = Object.keys(THREE_SCENES);

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a three scene" when someone writes it somewhere else. core/registry.js.
const THREE_AKA = {
  deviceShowcase: ['a turning phone or laptop', 'device with a live screen', '3D product device'],
  uiParallax: ['UI layers at depth', 'parallax screens', 'stacked flat panels in 3D'],
  pointCloud: ['a cloud of points', 'particle point cloud', 'thousands of lit dots'],
  extrudeText: ['3D extruded text', 'thick lettering that rotates', 'a font turned into a solid'],
  globe: ['a spinning 3D globe', 'a rotating world with arcs', 'a dotted world map in 3D'],
  shatter: ['breaking into pieces', 'a slab shattering', 'shards flying outward'],
  magnetic: ['magnetic field lines', 'field lines between poles', 'charges sliding along arcs'],
  liquidBackground: ['a churning liquid surface', 'a rippling 3D plane', 'a wavy specular background'],
  codeExtrude: ['code rising out of depth', 'syntax-highlighted 3D slabs', 'code growing into blocks'],
  codeDissolve: ['code resolving from noise', 'code fading in through static', 'a chromatic burn reveal of code'],
  codeAssemble: ['code assembling from a point cloud', 'glyphs flying into place', 'text forming from scattered points'],
  litPlane: ['a lit UI screenshot in 3D', 'a captured screen rising with a tilt', 'a shadowed product screen'],
};

export const THREE_REGISTRY = defineRegistry('three scene', Object.fromEntries(THREE_FX.map((n) => [n, n])), { slot: 'three', blurbs: THREE_SCENES, aka: THREE_AKA,
  catalog: {
    title: 'three.js scenes (real geometry)',
    tag: 'layer',
    intro: '`{ "type":"three", "three":"<name>" }`. A scene graph: meshes, materials, lights, a camera. For what a distance field structurally cannot express: a font outline, a device body, a captured UI plane, a point cloud. Deterministic by contract. Every object is POSED ABSOLUTELY from t, never stepped by delta (`core/surfaces/three-fx.js`), and `make canvas-purity` hashes the real pixels to prove it.',
    register: 'three',
    usage: (n, { full }) => full({ type: 'three', three: n }),
    preview: (n, { base, OVER }) => base({ layers: [{ type: 'three', three: n, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6 }, { ...OVER, text: n }] }),
  },
});
