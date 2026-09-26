// core/tracks/index.js: the TRACK registry, the third application of the pattern in core/layers/
// index.js and core/fx/index.js. A layer TYPE answers "what is this thing"; a MODIFIER answers "what
// is done to it"; a TRACK answers "what does the engine do to EVERY layer on every frame".
//
// Each track is a file exporting `slot` (where it runs) and `frame(kit, el, L, units, t, f, start,
// end, scene)`. Until now the whole list was written out as statements in the body of `updateLayer`
// in films/scene/scene.js, which meant every cross-cutting per-frame job, the thing a motion
// engine is mostly made of, had to be added by editing a 940-line file in the exact right place,
// with nothing but a neighbouring comment to say where the right place was.
//
// WHERE THE LINE FALLS between a track and a modifier, because the next author will need it:
//   A MODIFIER is opt-in per layer (`modifiers: [{ tilt: … }]`), runs LAST, and changes how the
//   finished layer LOOKS. It may not write `transform`, `opacity` or `filter` on the layer element.
//   Those belong to the tracks, and core/fx/index.js says so as a purity rule.
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
// because those only produce a PARTIAL order. Two tracks with no edge between them would be run in
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
import { mergeProps } from '../registry/props.js';
import * as tCut from './cut.js';
import * as tUnits from './units.js';
import * as tRansom from './ransom.js';
import * as tPrimitive from './primitive.js';
import * as tResample from './resample.js';
import * as tBorderTrail from './border-trail.js';
import * as tCircle from './circle.js';
import * as tTrim from './trim.js';
import * as tEffector from './effector.js';
import * as tVars from './vars.js';
import * as tReact from './react.js';
import * as tBox from './box.js';
import * as tFollow from './follow.js';
import * as tMotion from './motion.js';
import { DEFAULT_SHUTTER } from './motion.js';
import { layerTime } from '../timeline/time.js';
import { groupClockAbsoluteTime } from '../timeline/group-clock.js';
import * as tIdle from './idle.js';
import * as tDrive from './drive.js';
import * as tModifiers from './modifiers.js';

const REGISTRY = { cut: tCut, units: tUnits, ransom: tRansom, primitive: tPrimitive, resample: tResample,
  borderTrail: tBorderTrail, circle: tCircle, trim: tTrim, effector: tEffector, vars: tVars, react: tReact,
  box: tBox, follow: tFollow, motion: tMotion, drive: tDrive, idle: tIdle, modifiers: tModifiers };

// Exported so a gate can DERIVE the pipeline instead of restating it, the contract LAYER_TYPES and
// FX_TYPES already have. A hand-typed copy of this list is how `make check GATE=coverage` reported 14/14 while a
// 15th layer type existed (engine-doctrine/MISTAKES.md #21, #65).
export const TRACK_TYPES = Object.keys(REGISTRY);

// The props the PIPELINE reads, merged from the tracks themselves, every layer rides all twelve, so
// this is a flat set rather than a per-track one. Derived for the same reason TRACK_TYPES is: a gate
// asking "does anything read `motionBlur`?" must read the answer off the code that reads it.
for (const name of TRACK_TYPES)
  if (REGISTRY[name].PROPS === undefined)
    throw new Error(`track "${name}" declares no PROPS: a track that reads layer props without saying `
      + `which ones puts them back out of a gate's reach. Export \`PROPS = {}\` if it reads none.`);
// `timeWarp` is the ORCHESTRATOR's own prop, not any track's: runTracks reads it to warp the clock it
// hands every track, so no single track can declare it. Merged in explicitly, because TRACK_PROPS
// collects the per-track declarations and an `export const PROPS` in this file is collected by nobody.
// That was the first attempt and it was silently dead: the prop-audit reported `timeWarp` as written
// and read by nothing, which is exactly the class it exists to catch, so it caught me.
const ORCHESTRATOR_TRACK_PROPS = { timeWarp: {}, timeRemap: {} };

export const TRACK_PROPS = Object.freeze(mergeProps(
  ...TRACK_TYPES.map((n) => REGISTRY[n].PROPS), ORCHESTRATOR_TRACK_PROPS));

// THE PIPELINE. Read top to bottom, this is the order every layer is composed in on every frame.
export const SLOTS = Object.freeze([
  'enter',      // a declared `cut` owns this layer's enter/exit styling, over driveClips's fade
  'split',      // kinetic split-text reveal on the layer's local clock
  'glyphs',     // per-glyph re-roll (ransom `cycle`)
  'primitive',  // the layer type's own frame(): count / typing / cursor / clip / ken
  'resample',   // re-sample the layer through a fragment shader. AFTER its own canvas drew this frame
  'orbit',      // the borderTrail arc's rotation
  'spin',       // circular text: rotate the whole ring
  'trim',       // AE trim paths: the revealed start/end/offset segment of an SVG path/stroke
  'effector',   // a falloff from a travelling point, spent on the layer's own children
  'vars',       // animated custom properties the layer's own CSS reads
  'react',      // audio-driven modulation from the baked spectrum
  'box',        // w / h / depth over time, the layer's SIZE, not its scale
  'follow',     // pin to another layer's live box, before that layer's own choreography plays
  'transform',  // the motion track and motion blur
  'drive',      // expressions as data: wiggle and link, composed onto the motion track's own transform
  'idle',       // ambient motion across the settled middle, riding outside the choreography above
  'post',       // modifiers (core/fx), always last, on a finished frame
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
      throw new Error(`track "${name}" declares slot "${slot}", which is not a slot, known: ${SLOTS.join(', ')}. `
        + `A track whose slot the pipeline does not know has no defined place to run.`);
    const prior = claimed.get(slot);
    if (prior)
      throw new Error(`tracks "${prior}" and "${name}" both claim slot "${slot}". A slot holds exactly one `
        + `track. Resolving this silently would put two tracks in an order nothing declares, the state `
        + `this registry replaced. Give one of them its own slot in SLOTS, at the point it belongs.`);
    if (typeof trk.frame !== 'function')
      throw new Error(`track "${name}" exports no frame(): a track that runs nothing is a slot held open.`);
    claimed.set(slot, name);
  }
  return Object.freeze(SLOTS.map((slot) => {
    const name = claimed.get(slot);
    if (!name)
      throw new Error(`slot "${slot}" is in the pipeline and no track claims it. An unclaimed slot is a `
        + `name in the running order that means nothing; delete it or add the track it was written for.`);
    // units.js keeps its frame() positional: core/tracks/units.test.mjs calls it directly that way.
    if (name === 'units') {
      const f = REGISTRY[name].frame;
      return (ctx) => f(ctx.kit, ctx.el, ctx.L, ctx.units, ctx.t, ctx.f, ctx.start, ctx.end);
    }
    return REGISTRY[name].frame;
  }));
})();

// runTracks: one layer, one frame. `start`/`end` are computed here rather than in each track because
// nine of the twelve need them and re-deriving them nine times is the one cost this loop cannot spend.
// One ctx object is built per layer per frame (not per track call), the allocation the loop below
// pays instead of fifteen argument lists.
// ---- THE LAYER'S CLOCK, warped ------------------------------------------------------------------
//
// `timeWarp`, `timeRemap` and `stepFps` all warp the layer's LOCAL time before any track reads it, and
// core/time.js owns all three: what each one means, and why an easing alone cannot express a hold, is
// written there rather than restated here.
//
// APPLIED HERE AND NOWHERE ELSE, which is what makes it a clock rather than a fifteenth effect. Every
// per-frame track takes `t` from this one call, so warping it once reaches the motion track, the box
// track, the idle, the primitive's own frame() and the modifiers, all in agreement. Doing it inside
// motionAt would have warped the position and left the typing behind.
export function runTracks(kit, el, L, units, t, f, scene) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  // A LOOPING GROUP composes ONE LEVEL UP from a layer's own clock: `L.groupClock` (baked at build by
  // core/layers/util.js resolveGroupWindow) remaps the film's `t` into where this child's cycle
  // believes it is, BEFORE `layerTime` reads it, so a child's own `timeWarp`/`timeRemap` still shapes
  // its clock inside the cycle it was given, the same composition order the camera and driveClips
  // already keep with a layer's own clock.
  const gt = L.groupClock ? groupClockAbsoluteTime(L.groupClock, t) : t;
  const ctx = { kit, el, L, units, t: layerTime(L, gt, start, end), f, start, end, scene };
  for (let i = 0; i < ORDER.length; i++) ORDER[i](ctx);
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
//
// `shutter` is the film's motion-blur shutter, for the same reason `idle` is here: it is a property of
// the FILM, one line for the whole cast, and the per-layer override (`motionBlur`) is what says a
// single layer disagrees. A default that every author has to remember to set on every layer is not a
// default, it is a per-call-site opt-in (engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md item 6).
//
// `cameraBlur` is the same kind of film-level dial and lives here for the same reason: a shutter that
// exposes the SENSOR is a property of the camera, not of any one layer, so it is one line for the whole
// cast. Default false, because switching it on puts a `filter` on layers that have never carried one
// and a `filter` flattens a preserve-3d subtree, which is a change no film should get without asking.
export function createTrackKit({ renderer, theme, M, fps, idle = null, shutter = DEFAULT_SHUTTER,
  cameraBlur = false }) {
  return Object.freeze({ renderer, theme, M, fps, idle, shutter, cameraBlur });
}
