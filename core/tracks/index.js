// core/tracks/index.js — the TRACK registry, the third application of the pattern in core/layers/
// index.js and core/fx/index.js. A layer TYPE answers "what is this thing"; a MODIFIER answers "what
// is done to it"; a TRACK answers "what does the engine do to EVERY layer on every frame".
//
// Each track is a file exporting `slot` (where it runs) and `frame(kit, el, L, units, t, f, start,
// end, scene)`. Until now the whole list was written out as statements in the body of `updateLayer`
// in formats/scene/scene.js, which meant every cross-cutting per-frame job — the thing a motion
// engine is mostly made of — had to be added by editing a 940-line file in the exact right place,
// with nothing but a neighbouring comment to say where the right place was.
//
// WHERE THE LINE FALLS between a track and a modifier, because the next author will need it:
//   A MODIFIER is opt-in per layer (`modifiers: [{ tilt: … }]`), runs LAST, and changes how the
//   finished layer LOOKS. It may not write `transform`, `opacity` or `filter` on the layer element —
//   those belong to the tracks, and core/fx/index.js says so as a purity rule.
//   A TRACK runs for EVERY layer whether or not the author asked, and it BUILDS the frame: it writes
//   the very properties a modifier is forbidden to touch, and it has to interleave with the other
//   tracks at an exact point to do it. If a feature needs to land between two existing tracks, it is
//   a track. If it can live after all of them, it is a modifier, and modifiers are cheaper.
//
// ---- THE ORDERING MECHANISM: named slots, one occupant each ----
//
// SLOTS below is the pipeline, in order, and it is the ONLY place that order lives. A track names the
// slot it occupies; the engine resolves the running order from those declarations ONCE, at module
// load, into ORDER. Nothing sorts, allocates or looks anything up per frame.
//
// Named slots rather than integer priorities because integers invite `order: 45` wedged between 40
// and 50 and say nothing about WHY a track goes there, and rather than declared before/after edges
// because those only produce a PARTIAL order — two tracks with no edge between them would be run in
// whatever sequence the topological sort happened to emit, which is the same implicit ordering this
// registry exists to delete, just harder to read.
//
// A SLOT HOLDS EXACTLY ONE TRACK. Two tracks claiming the same slot is a hard error naming both, and
// so is a slot nobody claims or a slot name the list does not know. There is deliberately no rule for
// resolving a tie: "these two both run at `transform`, in some order" is precisely the state the old
// statement list was in. Adding a track means adding its name to SLOTS at the point it belongs, which
// is one line, in the one file that documents the pipeline.
// Bound under `t<Name>` so the registry's keys stay the track names while `units` and `motion` remain
// free as the argument and kit-field names they have carried since updateLayer.
import { mergeProps } from '../props.js';
import * as tCut from './cut.js';
import * as tUnits from './units.js';
import * as tRansom from './ransom.js';
import * as tPrimitive from './primitive.js';
import * as tResample from './resample.js';
import * as tBorderTrail from './border-trail.js';
import * as tCircle from './circle.js';
import * as tVars from './vars.js';
import * as tReact from './react.js';
import * as tBox from './box.js';
import * as tFollow from './follow.js';
import * as tMotion from './motion.js';
import * as tIdle from './idle.js';
import * as tModifiers from './modifiers.js';

const REGISTRY = { cut: tCut, units: tUnits, ransom: tRansom, primitive: tPrimitive, resample: tResample,
  borderTrail: tBorderTrail, circle: tCircle, vars: tVars, react: tReact, box: tBox,
  follow: tFollow, motion: tMotion, idle: tIdle, modifiers: tModifiers };

// Exported so a gate can DERIVE the pipeline instead of restating it — the contract LAYER_TYPES and
// FX_TYPES already have. A hand-typed copy of this list is how `make coverage` reported 14/14 while a
// 15th layer type existed (docs/MISTAKES.md #21, #65).
export const TRACK_TYPES = Object.keys(REGISTRY);

// The props the PIPELINE reads, merged from the tracks themselves — every layer rides all twelve, so
// this is a flat set rather than a per-track one. Derived for the same reason TRACK_TYPES is: a gate
// asking "does anything read `motionBlur`?" must read the answer off the code that reads it.
for (const name of TRACK_TYPES)
  if (REGISTRY[name].PROPS === undefined)
    throw new Error(`track "${name}" declares no PROPS — a track that reads layer props without saying `
      + `which ones puts them back out of a gate's reach. Export \`PROPS = {}\` if it reads none.`);
export const TRACK_PROPS = Object.freeze(mergeProps(...TRACK_TYPES.map((n) => REGISTRY[n].PROPS)));

// THE PIPELINE. Read top to bottom, this is the order every layer is composed in on every frame.
export const SLOTS = Object.freeze([
  'enter',      // a declared `cut` owns this layer's enter/exit styling, over driveClips's fade
  'split',      // kinetic split-text reveal on the layer's local clock
  'glyphs',     // per-glyph re-roll (ransom `cycle`)
  'primitive',  // the layer type's own frame() — count / typing / cursor / clip / ken
  'resample',   // re-sample the layer through a fragment shader — AFTER its own canvas drew this frame
  'orbit',      // the borderTrail arc's rotation
  'spin',       // circular text: rotate the whole ring
  'vars',       // animated custom properties the layer's own CSS reads
  'react',      // audio-driven modulation from the baked spectrum
  'box',        // w / h / depth over time — the layer's SIZE, not its scale
  'follow',     // pin to another layer's live box, before that layer's own choreography plays
  'transform',  // the motion track and motion blur
  'idle',       // ambient motion across the settled middle, riding outside the choreography above
  'post',       // modifiers (core/fx) — always last, on a finished frame
]);

// Resolved at MODULE LOAD, not per frame. updateLayer used to run for every layer on every frame of
// every render, so anything this file does more than once is paid ~50,000 times a minute of video.
// ORDER is a flat array of the frame functions themselves: the per-frame cost of the registry is one
// indexed array read, which is what the statement list cost too.
export const ORDER = (() => {
  const claimed = new Map();
  for (const name of TRACK_TYPES) {
    const trk = REGISTRY[name];
    const slot = trk.slot;
    if (!SLOTS.includes(slot))
      throw new Error(`track "${name}" declares slot "${slot}", which is not a slot — known: ${SLOTS.join(', ')}. `
        + `A track whose slot the pipeline does not know has no defined place to run.`);
    const prior = claimed.get(slot);
    if (prior)
      throw new Error(`tracks "${prior}" and "${name}" both claim slot "${slot}". A slot holds exactly one `
        + `track. Resolving this silently would put two tracks in an order nothing declares — the state `
        + `this registry replaced. Give one of them its own slot in SLOTS, at the point it belongs.`);
    if (typeof trk.frame !== 'function')
      throw new Error(`track "${name}" exports no frame() — a track that runs nothing is a slot held open.`);
    claimed.set(slot, name);
  }
  return Object.freeze(SLOTS.map((slot) => {
    const name = claimed.get(slot);
    if (!name)
      throw new Error(`slot "${slot}" is in the pipeline and no track claims it. An unclaimed slot is a `
        + `name in the running order that means nothing; delete it or add the track it was written for.`);
    return REGISTRY[name].frame;
  }));
})();

// runTracks — one layer, one frame. `start`/`end` are computed here rather than in each track because
// nine of the twelve need them and re-deriving them nine times is the one cost this loop cannot spend.
//
// Arguments are POSITIONAL and no options object is built: this runs once per layer per frame, and an
// object literal here is an allocation per layer per frame that the garbage collector pays for in the
// middle of a render. `kit` is the scene's own long-lived bindings (renderer · theme · the theme's
// motion personality · fps), built once by createTrackKit below.
export function runTracks(kit, el, L, units, t, f, scene) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  for (let i = 0; i < ORDER.length; i++) ORDER[i](kit, el, L, units, t, f, start, end, scene);
}

// The scene-instance bindings a track cannot import for itself. Everything that IS importable
// (cutStyle, animateUnits, motionAt, easings…) a track imports directly, so this stays the short list
// of things that differ per film. `M` is the theme's motion personality (core/motion.js
// motionDefaults), which supplies the default stagger a layer did not set. Frozen because a track
// writing into it would be writing into the next layer's inputs, and renderFrame(n) has to stay pure
// in n.
//
// `idle` is the film's scene-level idle, so a whole cast opts in on one line instead of per layer.
// It belongs here rather than on the layer because it is a property of the FILM, and the alternative
// (copying it onto every layer at build) would make a scene default indistinguishable from an author
// who wrote it out fifty times.
export function createTrackKit({ renderer, theme, M, fps, idle = null }) {
  return Object.freeze({ renderer, theme, M, fps, idle });
}
