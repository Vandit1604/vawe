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

// Exported so gates DERIVE the layer vocabulary instead of restating it. `make check GATE=coverage` kept its own
// hand-typed list and silently reported 14/14 while a 15th type existed, the same failure as the
// schema advertising an anim that never existed (engine-doctrine/MISTAKES.md #21, #65).
export const LAYER_TYPES = Object.keys(REGISTRY);

// The catalogue row for each type, DERIVED from the modules so the two cannot drift, and refused at load
// when one is missing. All 22 rendered as an em-dash in engine-doctrine/EFFECTS.md until this existed: the layer
// vocabulary is the one thing every other effect in that document is a dial ON, and it was the one
// family the catalogue could not describe.
export const LAYER_BLURBS = blurbsOf('layer type', REGISTRY);

// THE REGISTRY IS FOR THE CATALOGUE, THE SEARCH AND has(). IT IS NOT THE DISPATCHER, and that is the
// whole shape of this one. `pick(L)` below needs one behaviour defineRegistry's `pick` deliberately
// does not have: a missing `type` means `text`, and only then does anything else throw. Replacing it
// would move frames, so it is left exactly as it was and this sits beside it.
//
// What it buys: the section below used to be hand-listed in scripts/site/effects-catalog.mjs with its
// usage form and its no-preview reason in a third file, and `harness/author/arsenal.mjs` carried a
// hardcoded special case reading LAYER_TYPES + LAYER_BLURBS because layer types were not a registry
// (engine-doctrine/MISTAKES.md #551: `beam`, whose blurb says "a light that travels the rounded-rect border", was
// invisible to a query naming exactly that). All of it is one declaration now.
// LAYER_DOCS: the doctrine route for the 24 layer types, and only the 24. This is the one vocabulary
// where a wrong choice is a real craft decision (which type of primitive to reach for, and how to use
// it well), not a catalogue row where the blurb already is the whole story, so it is the one place
// `defineRegistry`'s `docs` option gets used today. `{ doc, brief }`: `brief` is a VERBATIM quote from
// the doc, checked at load (Node-side: harness/lib/registry-docs.mjs, reusing craft-rules.mjs's own doc
// checker) so the pointer fails loudly the day the doc's own wording moves out from under it, the same
// freshness contract engine-doctrine/CRAFT/rules/*.json already proves for a craft rule's `doc`.
//
// The six that USED to have no doctrine beyond this file's own blurb: `video`, `clip`, `board`, `doc`,
// `globe`, `particles`. All six turned out reachable already, `make arsenal` returns a blurb row for
// every layer type unconditionally (blurbsOf above, no `docs` needed for that), so none was missing a
// FIND path, only a doctrine one. Opening every real hit (not the word used for something else) found
// craft prose for five of them already written and simply unlinked: `clip`/`board`/`doc` share a
// bullet each in PRIMITIVES.md's light/depth/density list, `globe` has a real placement case study in
// LAYOUT.md, and `particles` has real per-preset "when" guidance generated into EFFECTS.md from its own
// registry. `video`, the most-used of the six (real footage, 4 layers in films/scene/vawe-flow-2.json)
// was the one with genuinely nothing: a new bullet was added next to `clip`'s in PRIMITIVES.md. None of
// the six is a deletion candidate on the evidence found: each has a real consumer (core/layers/*.js),
// each was already discoverable, and `board`/`globe` have real (if sparse) corpus usage. `clip`/`doc`/
// `particles` show zero corpus usage today; `reach.json`'s own method calls that shape "unwanted"
// (documented, reachable, simply unchosen), not "unreachable", and `unwanted` is not its removal
// bucket. `doc` (a markdown/diff FILE card) is the narrowest of the six, useful mainly to a dev-tool
// product recreation, and is the one worth a second look if it is still unused after a few more of
// those; that is a note for the next audit, not a case for deleting a working primitive today.
const LAYER_DOCS = {
  text: { doc: 'engine-doctrine/PRIMITIVES.md#kinetic-type-coretypetypejs-31-presets-charwordline-splits',
    brief: 'JSON knobs on a layer' },
  count: { doc: 'engine-doctrine/CRAFT/MOTION-REGISTERS.md#3-seven-motion-devices-not-two',
    brief: 'a number has no mass and overshoot paints a false value for several frames' },
  image: { doc: 'engine-doctrine/CRAFT/IMAGERY.md',
    brief: 'Prefer the lightest real visual: captured real UI' },
  group: { doc: 'engine-doctrine/PRIMITIVES.md#the-open-canvas-filmsscene',
    brief: 'group is the DEFAULT for anything with a spatial relationship' },
  rect: { doc: 'engine-doctrine/CRAFT/LAYOUT.md#0-guardrails-you-build-for-the-web-video-frames-are-not-pages',
    brief: 'a rect with a motion track on w, or parts with drawOn' },
  glow: { doc: 'engine-doctrine/CRAFT/EYE-TRACE.md#the-eye-is-steered-not-only-ranked',
    brief: 'A glow that arrives cold and wide, tightens, and goes hot as the beat resolves.' },
  beam: { doc: 'engine-doctrine/CRAFT/EYE-TRACE.md#the-eye-is-steered-not-only-ranked',
    brief: 'A beam used as a matte means the words do not fade in, they are found.' },
  svg: { doc: 'engine-doctrine/RULES/svg-inline.md',
    brief: 'The svg layer type has no src field.' },
  cursor: { doc: 'engine-doctrine/PRIMITIVES.md#the-open-canvas-filmsscene',
    brief: 'cursor in full.' },
  html: { doc: 'engine-doctrine/CRAFT/HTML-FRAGMENTS.md',
    brief: 'Writing HTML fragments, and making them move' },
  component: { doc: 'engine-doctrine/CRAFT/RECREATION.md',
    brief: 'Reflecting a live SITE rather than a film? This step is the whole job.' },
  shader: { doc: 'engine-doctrine/PRIMITIVES.md#ambient-shader-looks-coresurfacesshaders-ambientjs-23-continuous-webgl-fields-the-shader-layer',
    brief: 'these are LOOPING looks placed as a shader layer, pure in local t' },
  lottie: { doc: 'engine-doctrine/MISTAKES.md#136-a-lottie-layer-with-a-root-relative-src-silently-rendered-empty-no-warning',
    brief: 'preloadLottie now normalises a non-absolute src to root-relative' },
  paint: { doc: 'engine-doctrine/PRIMITIVES.md#the-open-canvas-filmsscene',
    brief: 'a canvas sized to the layer box, redrawn every frame from local time' },
  raymarch: { doc: 'engine-doctrine/PRIMITIVES.md#raymarched-3d-coresurfacesraymarch-fxjs-the-raymarch-layer-type-6-scenes',
    brief: 'A fullscreen quad plus a signed distance field IS a renderer: march a ray' },
  three: { doc: 'engine-doctrine/PRIMITIVES.md#the-open-canvas-filmsscene',
    brief: 'Adding a canvas-drawn look = adding a file to core/surfaces/ and a line' },
  composition: { doc: 'engine-doctrine/CRAFT/AUTHOR-THE-FRAME.md#the-full-ceiling-a-hand-authored-timeline-per-beat-via-composition',
    brief: 'when a beat needs MORE than that, overlapping tweens, cross-timed hand-offs' },
  adjust: { doc: 'engine-doctrine/CRAFT/GRAMMAR.md#there-are-three-ways-to-invert-a-frame-not-one',
    brief: 'The third is a glow or beam layer, or an adjust layer grading everything beneath.' },
  video: { doc: 'engine-doctrine/PRIMITIVES.md#light-depth-density-july-11-the-looks-like-the-site-vocabulary',
    brief: 'Reach for it over `clip` when the footage is real captured or licensed video' },
  clip: { doc: 'engine-doctrine/PRIMITIVES.md#light-depth-density-july-11-the-looks-like-the-site-vocabulary',
    brief: 'a generated/any video played DETERMINISTICALLY as a preloaded PNG frame sequence' },
  board: { doc: 'engine-doctrine/PRIMITIVES.md#light-depth-density-july-11-the-looks-like-the-site-vocabulary',
    brief: 'dim + fade it behind a foreground card for real density' },
  doc: { doc: 'engine-doctrine/PRIMITIVES.md#light-depth-density-july-11-the-looks-like-the-site-vocabulary',
    brief: 'a markdown/source FILE card from pure data' },
  globe: { doc: 'engine-doctrine/CRAFT/LAYOUT.md#how-this-actually-goes-wrong-here',
    brief: 'The fix was one column: the globe centred at 1200 wide and running past the' },
  particles: { doc: 'engine-doctrine/EFFECTS.md#particles-presets-particles-layer',
    brief: 'a fast radial flash from the box centre, additive-blended, gone in under a second' },
};

// The plain words a person would say instead of the type name (word-action `words` half; the `action`
// half is each type's own blurb above, LAYER_BLURBS). Kept here, not per-module, because it is a
// property of the CATALOGUE entry, not of the builder.
const LAYER_AKA = {
  text: ['words on screen', 'headline', 'caption text'],
  count: ['counting number', 'ticking stat', 'number that goes up'],
  image: ['a photo', 'a picture', 'a screenshot'],
  video: ['real footage', 'a video clip', 'captured recording'],
  group: ['a container', 'nested layers', 'a folder of layers'],
  rect: ['a box', 'a solid panel', 'a rectangle'],
  glow: ['a soft light', 'a halo', 'a glowing highlight'],
  beam: ['a light bar', 'a travelling light', 'a light border'],
  svg: ['vector art', 'an inline icon shape', 'scalable line art'],
  cursor: ['a mouse pointer', 'a fake cursor', 'a click demo pointer'],
  clip: ['a baked animation', 'a frame sequence', 'a pre-rendered clip'],
  html: ['a hand-written fragment', 'real markup', 'a web snippet'],
  component: ['a captured UI block', 'a reflected site section', 'a recreated page piece'],
  board: ['a background card', 'a dimmed backdrop panel', 'a behind card'],
  doc: ['a file card', 'a markdown card', 'a source-file preview'],
  shader: ['a generative background', 'a WebGL field', 'an ambient full-frame look'],
  lottie: ['a Lottie animation', 'an After Effects export', 'a JSON animation file'],
  paint: ['a canvas 2D field', 'a drawn generative background', 'a resamplable canvas look'],
  raymarch: ['a 3D distance field', 'a lit 3D surface', 'a raymarched shape'],
  three: ['a real 3D scene', 'a three.js object', 'a posed 3D mesh'],
  globe: ['a spinning globe', 'a dotted planet', 'a world map globe'],
  particles: ['confetti', 'sparks', 'a dust burst'],
  composition: ['a hand-timed sub-timeline', 'nested keyframed motion', 'a custom mini animation'],
  adjust: ['a color grade layer', 'a filter over everything below', 'a full-frame adjustment'],
};

export const LAYER_REGISTRY = defineRegistry('layer type', REGISTRY, { slot: 'layers[].type', blurbs: LAYER_BLURBS,
  aka: LAYER_AKA,
  docs: LAYER_DOCS,
  catalog: {
    title: 'Layer types',
    tag: 'layer',
    intro: 'The vocabulary itself: `{ "type":"<name>" }`. Everything else in this document is a dial ON one of these. Full props per type: `films/scene/schema.json`, and `engine-doctrine/PRIMITIVES.md` for what each is FOR.',
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
// by films/scene/scene.js before any layer is built), so none of the three ever reach this dispatch
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
  // subset of it (engine-doctrine/MISTAKES.md #70).
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
    // `scene` is a FROZEN read-only view of the rest of the frame: geometry (boxOf · exposedOf · specOf
    // · ids), the frame's own properties (light · camera · canvas · safe · bg), the clock, the theme's palette, and
    // the film's joints. A primitive used to be handed itself and the clock and nothing else, which is why
    // occlusion, a shadow keyed to a light, and per-layer 3D could not be written at all, none of
    // them is a property of one layer. It is frozen because a layer that could write to it would be
    // writing into the next layer's inputs, and renderFrame(n) has to stay pure in n.
    frame(el, L, t, scene) { const m = pick(L); if (m.frame) m.frame(kit, el, L, t, scene); },
    // per-frame MODIFIER pass (core/fx/index.js), kept a separate entry point from frame() on purpose:
    // it occupies the LAST slot of the pipeline (cut · units · vars · react · box · motion), and
    // frame() occupies one in the middle. Composition order is spelled out in core/fx/index.js.
    modify(el, L, t, scene) { frameFx(kit, el, L, t, scene); },
    // expose(L, t, scene) → a plain object of NAMED values this layer publishes about its own private
    // state (which character its caret sits at, so what x; core/layers/text.js is the first case), or
    // null if this type or this layer exposes nothing. The general form of `boxOf`: a fact a layer
    // already computes internally, made readable BY NAME instead of a second private computation
    // drifting from the first. Optional per type; most expose nothing. Pure in (L, t, scene): no DOM
    // read, no state kept between frames, so it is safe to resolve before any layer's own frame() runs
    // and to re-run out of order (make check GATE=probe samples frames out of order for exactly this reason).
    expose(L, t, scene) { const m = pick(L); return m.expose ? m.expose(L, t, scene) : null; },
  };
}
