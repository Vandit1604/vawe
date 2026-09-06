// core/layers/index.js: the layer registry. Each primitive is a file exporting build(kit,el,L) and
// optionally frame(kit,el,L,t). `createRenderer(ctx)` binds the shared kit and dispatches by L.type, so
// scene.html stays a thin orchestrator (bg/camera/stings/timing) and adding a primitive = adding a file.
import { mergeProps } from '../registry/props.js';
import { blurbsOf, defineRegistry } from '../registry/registry.js';
import { checkLayerTree } from './vocabulary.js';
import { createKit } from './util.js';
import { buildFx, frameFx } from '../fx/index.js';
import { attachResample } from '../resample/index.js';
import * as text from './text.js';
import * as count from './count.js';
import * as image from './image.js';
import * as video from './video.js';
import * as group from './group.js';
import * as rect from './rect.js';
import * as glow from './glow.js';
import * as beam from './beam.js';
import * as svg from './svg.js';
import * as cursor from './cursor.js';
import * as clip from './clip.js';
import * as html from './html.js';
import * as component from './component.js';
import * as board from './board.js';
import * as doc from './doc.js';
import * as lottie from './lottie.js';
import * as composition from './composition.js';
import * as adjust from './adjust.js';
import { canvasLayer } from './canvas.js';

// The four types whose whole output is a canvas are ONE primitive with four backends (core/surfaces/).
// They are still four names in scene JSON and four entries here, the collapse was internal, and 101
// scenes are written in the names.
const shader = canvasLayer('shader', 'a full-frame generative WebGL field (see the ambient shaders), pure in t and palette-tintable; it carries no sampler, so it cannot read what is beneath it. `shaderKeys` cycles ONE panel through several looks on hard cuts, in one context, instead of stacking a layer per look');
const paint = canvasLayer('paint', 'a generative Canvas 2D field drawn per frame from local time. The canvas family written in JS rather than GLSL, and the one you can resample');
const raymarch = canvasLayer('raymarch', 'a lit implicit surface from a distance field: a camera, a normal and a silhouette. the most expensive primitive in the engine. One hero shot, sized to what it needs');
const three = canvasLayer('three', 'a real three.js scene graph (meshes, materials, lights, a camera) posed absolutely from t, for what a distance field cannot express: a font outline, a device body, a captured UI plane, a point cloud');
const globe = canvasLayer('globe', 'a dotted planet with tapered route arcs, drawn by vendored cobe: atmospheric glow and a diffuse terminator. reach for `three:"globe"` instead only when you need a real sun vector');
const particles = canvasLayer('particles', 'a deterministic particle emitter: `preset` picks confetti (a gravity-fed burst), sparks (a fast radial flash) or dust (a slow ambient drift). Closed-form per particle, seeded by `seed`, never a running sim');

const REGISTRY = { text, count, image, video, group, rect, glow, beam, svg, cursor, clip, html, component, board, doc, shader, lottie, paint, raymarch, three, globe, particles, composition, adjust };

// Exported so gates DERIVE the layer vocabulary instead of restating it. `make coverage` kept its own
// hand-typed list and silently reported 14/14 while a 15th type existed, the same failure as the
// schema advertising an anim that never existed (docs/MISTAKES.md #21, #65).
export const LAYER_TYPES = Object.keys(REGISTRY);

// The catalogue row for each type, DERIVED from the modules so the two cannot drift, and refused at load
// when one is missing. All 22 rendered as an em-dash in docs/EFFECTS.md until this existed: the layer
// vocabulary is the one thing every other effect in that document is a dial ON, and it was the one
// family the catalogue could not describe.
export const LAYER_BLURBS = blurbsOf('layer type', REGISTRY);

// THE REGISTRY IS FOR THE CATALOGUE, THE SEARCH AND has(). IT IS NOT THE DISPATCHER, and that is the
// whole shape of this one. `pick(L)` below needs one behaviour defineRegistry's `pick` deliberately
// does not have: a missing `type` means `text`, and only then does anything else throw. Replacing it
// would move frames, so it is left exactly as it was and this sits beside it.
//
// What it buys: the section below used to be hand-listed in scripts/site/effects-catalog.mjs with its
// usage form and its no-preview reason in a third file, and `scripts/author/arsenal.mjs` carried a
// hardcoded special case reading LAYER_TYPES + LAYER_BLURBS because layer types were not a registry
// (docs/MISTAKES.md #551: `beam`, whose blurb says "a light that travels the rounded-rect border", was
// invisible to a query naming exactly that). All of it is one declaration now.
export const LAYER_REGISTRY = defineRegistry('layer type', REGISTRY, { slot: 'layers[].type', blurbs: LAYER_BLURBS,
  catalog: {
    title: 'Layer types',
    tag: 'layer',
    intro: 'The vocabulary itself: `{ "type":"<name>" }`. Everything else in this document is a dial ON one of these. Full props per type: `formats/scene/schema.json`, and `docs/PRIMITIVES.md` for what each is FOR.',
    usage: (n, { j }) => j({ type: n }),
    noPreview: 'a layer type is the noun, not the effect. Every preview on this page is already one of them.',
  },
});

// The props each TYPE reads, taken off the modules that read them. Same contract as LAYER_TYPES, applied
// to the vocabulary inside a layer rather than the vocabulary of layers: a gate answers "does anything
// read `preset` on a glow?" by asking glow.js, never by scanning for it. `layer-props` used to scan, and
// a scan is a map of where the code lived on the day it was written, the day core/tracks/ appeared it
// reported 1454 live props as dropped (core/registry/props.js has the full account).
//
// The four canvas types get theirs from core/layers/canvas.js, which merges the shared canvas procedure
// with its surface's own pixels vocabulary, so `paint` and `three` declare different sets under one
// primitive, exactly as they read different ones.
const declared = (t) => {
  const P = REGISTRY[t].PROPS;
  if (P === undefined)
    throw new Error(`layer type "${t}" declares no PROPS: a builder that reads layer props without `
      + `saying which ones puts them out of a gate's reach, and a prop nothing reads is the most `
      + `expensive bug class in this repo. Export \`PROPS = {}\` if it reads none.`);
  return P;
};
export const LAYER_PROPS = Object.freeze(Object.fromEntries(
  LAYER_TYPES.map((t) => [t, Object.freeze(mergeProps(declared(t)))])));

// `REGISTRY[L.type] || text` was the dispatch, so ANY type the registry does not know quietly ran the
// text builder, which paints nothing when there is no `text` prop. A scene whose only layer was an
// un-expanded `block` therefore rendered a BLANK film, exit 0, no warning: `validate` refuses that scene
// and the renderer accepted it, so the two disagreed and the renderer looked like the lenient one. It
// was the wrong one. An author reading that mp4 concludes the gate is pedantic; the frame is empty.
//
// A missing `type` still means text (documented default). A type that is present and unknown is a bug.
// `block`, `comp` and `beat` USED to be build-time sugar a separate `make expand` step had to resolve
// first; core/engine/expand.js `expandScene` now runs at LOAD (core/transitions/lower.js `loadScene`, called
// by formats/scene/scene.js before any layer is built), so none of the three ever reach this dispatch
// any more. A scene that somehow still carries one is an unknown type, same as any other typo.
const pick = (L) => {
  const t = L.type;
  if (t == null || t === '' || t === 'text') return text;
  if (REGISTRY[t]) return REGISTRY[t];
  throw new Error(`unknown layer type "${t}", known: ${LAYER_TYPES.join(', ')}. `
    + `An unknown type used to fall back to the text builder, which paints nothing.`);
};

export function createRenderer(ctx) {
  const kit = createKit(ctx);
  // THE MATTE SOURCE PROTOCOL, injected here for the same reason the builder below is: util.js cannot
  // import this file, and this is the only place that holds the type registry.
  //
  // Before it, `core/fx/matte.js` decided what could be a mask by reading the SCENE JSON for an image
  // file or a declared gradient `bg`, which is a hardcoded list of four types inside the one effect
  // that should not care what it is masking with. So a `beam`, the layer whose entire job is making
  // travelling light, could not feed the matte, the effect whose entire job is revealing through light.
  // Two features built for one technique with no way to connect.
  //
  // A type opts in by exporting `maskPaint(L, lt, geom)`. Nothing else changes: the matte asks, and
  // falls back to reading the JSON exactly as before for every type that stays quiet. Adding the next
  // live matte source is one function in one file and no edit to matte.js at all, which is the whole
  // point of doing it this way rather than adding `beam` to the list.
  kit.maskPaintOf = (spec, lt, geom) => {
    const mod = REGISTRY[spec && spec.type];
    return mod && typeof mod.maskPaint === 'function' ? mod.maskPaint(spec, lt, geom) : null;
  };
  // Injected AFTER the kit exists (util.js cannot import this file, that would be circular). This is
  // what lets a group child run the same builder as a top-level layer instead of a re-implemented
  // subset of it (docs/MISTAKES.md #70).
  // The primitive builds the thing; its `modifiers` then modify what was built, in that order and never
  // the other way round. Routed through ONE helper so a group child and a top-level layer cannot end up
  // with different modifier support.
  // `attachResample` LAST and for every type, not only the two that own a raster. image.js and
  // canvas.js still attach their own inside build() (they know where their pixels are); this call is
  // idempotent and picks up everything else, queueing a build-time bake of the subtree. One site, so
  // "which layer types can be resampled" is not a list anybody maintains.
  const buildOne = (el, L) => { pick(L).build(kit, el, L); buildFx(kit, el, L); attachResample(kit, el, L); };
  kit.buildLeaf = buildOne;
  // A NESTED GROUP does not go through buildLeaf: addGroupChild lays it out itself and recurses, so
  // for as long as this slot has existed its modifiers were never built, silently. Not "refused": the
  // frame half still ran, so `tilt` half-worked and `mixBlend` did nothing at all, which is the exact
  // shape (input accepted and then ignored) the registry's hard-error dispatch was written to kill.
  // Exposed separately because the group's own construction is not a primitive build.
  kit.buildFx = (el, L) => buildFx(kit, el, L);
  return {
    kit,
    // construct a layer's DOM (default primitive = text; count reuses the text build)
    //
    // The vocabulary check runs HERE, at the one entry point the orchestrator calls, and it walks the
    // whole subtree. Putting it inside buildOne would miss a nested group (addGroupChild lays those out
    // itself and never calls buildLeaf), and putting it in two places would let the two drift.
    // It THROWS: an unknown prop is accepted-then-ignored, the one outcome this repo refuses.
    build(el, L) { checkLayerTree(L, LAYER_PROPS); buildOne(el, L); },
    // per-TYPE frame update (typing/count/cursor/clip/ken). Cross-cutting effects (cut, kinetic units,
    // motion track) are the per-frame pipeline in core/tracks/, which calls this from the `primitive`
    // slot, in the MIDDLE of that list, not before or after it (core/tracks/primitive.js says why).
    //
    // `scene` is a FROZEN read-only view of the rest of the frame: geometry (boxOf · specOf · ids), the
    // frame's own properties (light · camera · canvas · safe · bg), the clock, the theme's palette, and
    // the film's joints. A primitive used to be handed itself and the clock and nothing else, which is why
    // occlusion, a shadow keyed to a light, and per-layer 3D could not be written at all, none of
    // them is a property of one layer. It is frozen because a layer that could write to it would be
    // writing into the next layer's inputs, and renderFrame(n) has to stay pure in n.
    frame(el, L, t, scene) { const m = pick(L); if (m.frame) m.frame(kit, el, L, t, scene); },
    // per-frame MODIFIER pass (core/fx/index.js), kept a separate entry point from frame() on purpose:
    // it occupies the LAST slot of the pipeline (cut · units · vars · react · box · motion), and
    // frame() occupies one in the middle. Composition order is spelled out in core/fx/index.js.
    modify(el, L, t, scene) { frameFx(kit, el, L, t, scene); },
  };
}
