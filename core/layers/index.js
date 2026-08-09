// core/layers/index.js — the layer registry. Each primitive is a file exporting build(kit,el,L) and
// optionally frame(kit,el,L,t). `createRenderer(ctx)` binds the shared kit and dispatches by L.type, so
// scene.html stays a thin orchestrator (bg/camera/stings/timing) and adding a primitive = adding a file.
import { mergeProps } from '../props.js';
import { createKit } from './util.js';
import { buildFx, frameFx } from '../fx/index.js';
import * as text from './text.js';
import * as count from './count.js';
import * as image from './image.js';
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
import { canvasLayer } from './canvas.js';

// The four types whose whole output is a canvas are ONE primitive with four backends (core/surfaces/).
// They are still four names in scene JSON and four entries here — the collapse was internal, and 101
// scenes are written in the names.
const shader = canvasLayer('shader'), paint = canvasLayer('paint');
const raymarch = canvasLayer('raymarch'), three = canvasLayer('three');

const REGISTRY = { text, count, image, group, rect, glow, beam, svg, cursor, clip, html, component, board, doc, shader, lottie, paint, raymarch, three, composition };

// Exported so gates DERIVE the layer vocabulary instead of restating it. `make coverage` kept its own
// hand-typed list and silently reported 14/14 while a 15th type existed — the same failure as the
// schema advertising an anim that never existed (docs/MISTAKES.md #21, #65).
export const LAYER_TYPES = Object.keys(REGISTRY);

// The props each TYPE reads, taken off the modules that read them. Same contract as LAYER_TYPES, applied
// to the vocabulary inside a layer rather than the vocabulary of layers: a gate answers "does anything
// read `preset` on a glow?" by asking glow.js, never by scanning for it. `layer-props` used to scan, and
// a scan is a map of where the code lived on the day it was written — the day core/tracks/ appeared it
// reported 1454 live props as dropped (core/props.js has the full account).
//
// The four canvas types get theirs from core/layers/canvas.js, which merges the shared canvas procedure
// with its surface's own pixels vocabulary — so `paint` and `three` declare different sets under one
// primitive, exactly as they read different ones.
const declared = (t) => {
  const P = REGISTRY[t].PROPS;
  if (P === undefined)
    throw new Error(`layer type "${t}" declares no PROPS — a builder that reads layer props without `
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
// `block`, `comp` and `beat` are BUILD-TIME sugar, expanded by `make expand` (scripts/author/expand-blocks.mjs),
// so they get the message that names the actual next step rather than the generic one.
const pick = (L) => {
  const t = L.type;
  if (t == null || t === '' || t === 'text') return text;
  if (REGISTRY[t]) return REGISTRY[t];
  if (t === 'block' || t === 'comp' || t === 'beat') {
    // Deliberately does not name WHICH block/beat/comp this was. schema-drift guards the set of layer
    // props the ENGINE reads, and those three are author-facing build-time sugar the schema omits on
    // purpose, so reading one here would widen what the renderer claims to consume for a nicer string.
    throw new Error(`layer type "${t}" is build-time sugar, not a renderable primitive — `
      + `run \`make expand D=<scene.json>\` and render the .expanded.json. Rendering it directly would `
      + `silently draw nothing.`);
  }
  throw new Error(`unknown layer type "${t}" — known: ${LAYER_TYPES.join(', ')}. `
    + `An unknown type used to fall back to the text builder, which paints nothing.`);
};

export function createRenderer(ctx) {
  const kit = createKit(ctx);
  // Injected AFTER the kit exists (util.js cannot import this file — that would be circular). This is
  // what lets a group child run the same builder as a top-level layer instead of a re-implemented
  // subset of it (docs/MISTAKES.md #70).
  // The primitive builds the thing; its `modifiers` then modify what was built, in that order and never
  // the other way round. Routed through ONE helper so a group child and a top-level layer cannot end up
  // with different modifier support.
  const buildOne = (el, L) => { pick(L).build(kit, el, L); buildFx(kit, el, L); };
  kit.buildLeaf = buildOne;
  // A NESTED GROUP does not go through buildLeaf — addGroupChild lays it out itself and recurses — so
  // for as long as this slot has existed its modifiers were never built, silently. Not "refused": the
  // frame half still ran, so `tilt` half-worked and `mixBlend` did nothing at all, which is the exact
  // shape (input accepted and then ignored) the registry's hard-error dispatch was written to kill.
  // Exposed separately because the group's own construction is not a primitive build.
  kit.buildFx = (el, L) => buildFx(kit, el, L);
  return {
    kit,
    // construct a layer's DOM (default primitive = text; count reuses the text build)
    build(el, L) { buildOne(el, L); },
    // per-TYPE frame update (typing/count/cursor/clip/ken). Cross-cutting effects (cut, kinetic units,
    // motion track) are the per-frame pipeline in core/tracks/, which calls this from the `primitive`
    // slot — in the MIDDLE of that list, not before or after it (core/tracks/primitive.js says why).
    //
    // `scene` is a FROZEN read-only view of the rest of the frame: geometry (boxOf · specOf · ids), the
    // frame's own properties (light · camera · canvas · safe · bg), the clock, the theme's palette, and
    // the film's joints. A primitive used to be handed itself and the clock and nothing else, which is why
    // occlusion, a shadow keyed to a light, and per-layer 3D could not be written at all — none of
    // them is a property of one layer. It is frozen because a layer that could write to it would be
    // writing into the next layer's inputs, and renderFrame(n) has to stay pure in n.
    frame(el, L, t, scene) { const m = pick(L); if (m.frame) m.frame(kit, el, L, t, scene); },
    // per-frame MODIFIER pass (core/fx/index.js), kept a separate entry point from frame() on purpose:
    // it occupies the LAST slot of the pipeline (cut · units · vars · react · box · motion), and
    // frame() occupies one in the middle. Composition order is spelled out in core/fx/index.js.
    modify(el, L, t, scene) { frameFx(kit, el, L, t, scene); },
  };
}
