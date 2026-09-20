import { defineRegistry, withBlurb, blurbsOf } from '../registry/registry.js';
import { resolveCameraMove } from '../registry/vocab.js';
// core/camera-moves/index.js: CAMERA CHOREOGRAPHY, the runner. Every move is its own file, pure
// (params) → camera-keyframe array, the same shape core/timeline/sequence.js `cameraAt` interpolates
// ([{t,s,x,y,rx,ry,ease}], t in absolute seconds). A move is smooth and CALCULATED instead of
// hand-typed, and the multi-keyframe ones emit interior `ease:"linear"` automatically so a chained push
// is velocity-CONTINUOUS (engine-doctrine/MISTAKES.md #125: a chained ease-in-out pulses because it zeroes velocity
// at every keyframe. The "shaking zoom"). Only the final settle eases out. All pure → renderFrame(n)
// stays seek-safe; assert the endpoints with `make lib-test`.
//
// Pan math: the camera transform is `scale(s) translate(x,y)` about the stage centre, so translating by
// (W/2 - tx, H/2 - ty) brings a target point (tx,ty) to centre at ANY scale, diveIn uses exactly this.
//
// ADD A MOVE = ADD ONE FILE. Write `core/camera-moves/<name>.js` exporting the generator (shared
// arithmetic lives in `./units.js`: `span`/`hold` guard every duration), import it below, and add its
// entry to CAMERA_MOVES with a blurb. CAMERA_MOVE_NAMES, CAMERA_MOVE_BLURBS and CAMERA_REGISTRY are all
// DERIVED from that one map, so nothing else has to be told a move now exists.
//
// Author sugar: `"cameraMove": { "move":"diveIn", ... }` at the scene root bakes to `data.camera` at
// load (`bakeCameraMove`, core/engine/produce.js, called from core/engine/boot.js and core/engine/expand.js). Compose legs
// by hand for anything these don't cover.

import { slowPush } from './slow-push.js';
import { diveIn } from './dive-in.js';
import { panFollow } from './pan-follow.js';
import { workspaceZoomOut } from './workspace-zoom-out.js';
import { orbit } from './orbit.js';
import { multiPhase } from './multi-phase.js';
import { travel } from './travel.js';
import { truck } from './truck.js';
import { cameraShake } from './camera-shake.js';
import { punchIn } from './punch-in.js';
import { dollyZoom } from './dolly-zoom.js';
import { followCursor } from './follow-cursor.js';
import { driftHold } from './drift-hold.js';
import { followCamera } from './follow.js';
import { hold } from './hold.js';

export { slowPush, diveIn, panFollow, workspaceZoomOut, orbit, multiPhase, travel, truck, cameraShake,
  punchIn, dollyZoom, followCursor, driftHold, followCamera, hold };

// name → generator, each carrying its own catalogue row. The descriptions used to live in a hand-kept
// map inside scripts/site/effects-catalog.mjs, which knew eight of the eleven: cameraShake, punchIn and
// driftHold rendered as an em-dash in engine-doctrine/EFFECTS.md, so three of the engine's camera moves existed and
// could not be chosen. The blurb rides the entry non-enumerably (core/registry/registry.js), so CAMERA_MOVES is
// still exactly a name → function map for everything that walks it.
export const CAMERA_MOVES = {
  slowPush: withBlurb('gentle continuous zoom in (the frame stays alive)', slowPush),
  diveIn: withBlurb('zoom INTO a target point (it travels to centre)', diveIn),
  panFollow: withBlurb('camera pans to track downward-growing content (terminal)', panFollow),
  workspaceZoomOut: withBlurb('pull back from a detail to reveal the whole', workspaceZoomOut),
  orbit: withBlurb('a gentle 3D swing around the frame (ry through 0)', orbit),
  multiPhase: withBlurb('chain legs into one journey (push, hold-drift, settle)', multiPhase),
  travel: withBlurb('station-to-station flight between points in STAGE coords. THE CAMERA AS THE TRANSITION (no cut)', travel),
  truck: withBlurb('plain lateral travel, linear, so it reads as tracking rather than a lurch', truck),
  cameraShake: withBlurb('an IMPACT: a decaying ~16Hz shake pre-sampled at author time to one key per frame, then 0.1s of eased recovery so the frame LANDS instead of stopping', cameraShake),
  punchIn: withBlurb('a crash zoom: the frame accelerates AT you (easeInExpo), recoils past its resting scale, then rings back elastic. the only move here that is not a `.out`', punchIn),
  dollyZoom: withBlurb('THE VERTIGO SHOT: the lens ramps while the camera holds its distance, so the subject on the picture plane keeps its exact size and the world BEHIND it rushes in or falls away · the only move here that changes the relationship between planes rather than the framing, and it needs layers standing at a `plane` depth or there is nothing to counter-scale against', dollyZoom),
  followCursor: withBlurb('THE CAMERA FOLLOWS THE CURSOR: derived from the `path` and `clicks` on a `cursor` layer, so the pointer stays the single owner of where the camera goes. It pushes toward the spot the pointer is about to click, arrives just BEFORE the click, holds across it and releases. Clicks too close in time or space share one framing, so six clicks are never six crash zooms', followCursor),
  driftHold: withBlurb('a held frame that is never dead: a sub-12px Lissajous micro-drift, x and y at different frequencies so it breathes instead of walking a diagonal', driftHold),
  hold: withBlurb('the camera is LOCKED OFF: zero motion, on purpose. Not driftHold, which keeps breathing; this emits no keyframes at all, the explicit way to declare "no camera" instead of leaving `camera:` blank', hold),
  // NOT named `follow`: that word is already a shot-word alias for `panFollow` (core/registry/vocab.js
  // CAMERA_WORDS), so `{move:"follow"}` would silently resolve to a different move than this one, the
  // exact silent-substitution class this engine refuses everywhere else. `followLayer` is unambiguous.
  followLayer: withBlurb('CAMERA TRACKS A LAYER BY ID, at RENDER time, off the same live-box accessor `follow` (the layer track) reads. Holds still while the target sits inside a soft margin of frame centre, translating only the minimum to keep it in once it would cross the edge, rather than rigidly re-centring it every frame (which reads as the world sliding, not the camera tracking). Zoom is HELD (`to`), not framed. The one move here `bakeCameraMove` resolves onto `data.cameraFollow`, not `data.camera`, and it cannot be composed with another leg', followCamera),
};
export const CAMERA_MOVE_NAMES = Object.keys(CAMERA_MOVES);
export const CAMERA_MOVE_BLURBS = blurbsOf('camera move', CAMERA_MOVES);

// The params a move accepts, READ OFF ITS OWN SIGNATURE rather than declared in a table beside it. A
// table is a second source of truth that drifts the first time somebody adds a param, and this package's
// whole contract is that the vocabulary derives from the code (CAMERA_MOVES above does the same).
// Nothing minifies here: core/*.js is served raw to the browser and imported raw by the gates.
const paramsOf = (f) => {
  const src = String(f);
  const open = src.indexOf('{', src.indexOf('('));
  if (open < 0) return null;                       // not a destructuring signature: cannot say, so don't
  let depth = 0, close = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { close = i; break; }
  }
  if (close < 0) return null;
  const names = [];
  let d = 0, cur = '';
  for (const ch of src.slice(open + 1, close)) {
    if ('{[('.includes(ch)) d++;
    else if ('}])'.includes(ch)) d--;
    if (ch === ',' && d === 0) { names.push(cur); cur = ''; } else cur += ch;
  }
  names.push(cur);
  return new Set(names.map((n) => n.split('=')[0].trim()).filter(Boolean));
};

/** cameraMoveParams(name) → the Set of param names this move's own signature reads, or null when the
 * move is not a plain destructured (params)=>keys generator (nothing here isn't, but a future one
 * might not be). Exported so a plan-time reader (harness/lib/contract.mjs, the `camera:` beat field)
 * can validate a param name against the SAME source `buildCameraMove` already reads, rather than a
 * second hand-kept list that drifts the first time a move gains a param. */
export function cameraMoveParams(name) {
  const f = CAMERA_MOVES[name];
  return f ? paramsOf(f) : null;
}

// A move that centres a POINT needs to know the frame it is centring in. Landscape is only the default
// because this module cannot see the scene; the sugar path can, so it must pass it.
const TARGETING = new Set(['diveIn', 'workspaceZoomOut', 'travel', 'followCursor']);
const targetsAPoint = (name, params) => TARGETING.has(name)
  // followCursor centres a point ALWAYS, and it is the one move here that does not name it in the spec:
  // the point comes from the cursor's path. So it can never be excused by "no tx/ty was written", which
  // is exactly how it would have mis-centred every portrait demo by 420px per axis in silence.
  && (name === 'followCursor' || params.tx != null || params.ty != null
    || (Array.isArray(params.stations) && params.stations.some((s) => s && (s.tx != null || s.ty != null))));

// buildCameraMove(spec, canvas). The sugar resolver: { move, ...params } → a camera-keyframe array.
// `canvas` is [W, H] from the scene's own aspect (harness/author/expand-blocks.mjs passes sceneDims(d)).
export function buildCameraMove(spec, canvas = null) {
  if (!spec || !spec.move) throw new Error('cameraMove needs a "move" name');
  // A SHOT WORD resolves to a move name first ("pull back" → workspaceZoomOut), so the description a
  // director would say is accepted in the slot the code name is accepted (core/registry/vocab.js). A real move
  // name passes through untouched, so nothing already authored changes.
  const move = resolveCameraMove(spec.move);
  const f = CAMERA_MOVES[move];
  if (!f) CAMERA_REGISTRY.pick(move);        // throws, and names the other list if the word belongs to one
  const { move: _written, ...params } = spec;
  // A KEY THIS MOVE DOES NOT READ IS A TYPO, and a silently dropped param is the worst failure class in
  // this engine: `station:` for `stations:` reached travel as an ignored extra and threw about a missing
  // array; `too:` for `to:` on slowPush would have rendered a move nobody asked for and said nothing.
  const known = paramsOf(f);
  if (known) {
    const unknown = Object.keys(params).filter((k) => !known.has(k));
    if (unknown.length) throw new Error(`cameraMove "${move}" does not read ${unknown.map((k) => `"${k}"`).join(', ')}`
      + `. It accepts: ${[...known].join(', ')}. A dropped param renders a move you did not author.`);
  }
  // The pan math is `canvasW/2 - tx`, so a landscape default under a 1080x1920 portrait scene mis-centres
  // every target by 420px on each axis, silently. No scene in the library hits this today, because every
  // one that names a target also spells out canvasW/canvasH by hand, which is the workaround that says
  // the default was wrong. Resolve it from the scene, and refuse to guess when nobody can supply it.
  if (targetsAPoint(move, params)) {
    if (canvas) { params.canvasW = params.canvasW ?? canvas[0]; params.canvasH = params.canvasH ?? canvas[1]; }
    if (params.canvasW == null || params.canvasH == null)
      throw new Error(`cameraMove "${move}" centres a point (tx/ty), so it needs the frame it centres in.`
        + ` Pass the scene canvas as buildCameraMove(spec, sceneDims(data)), or set canvasW/canvasH on the spec.`);
  }
  return f(params);
}

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a camera move" when someone writes it somewhere else. core/registry/registry.js.
// "handheld camera feel" found nothing across all 445 named things, and `driftHold` IS that shot: a
// held frame breathing on a sub-12px Lissajous. `handheld` is the only word a director would use for it
// and no honest rewrite of that blurb puts it there, which is what `aka` is for.
const CAMERA_AKA = { driftHold: ['handheld', 'breathing camera', 'operator float', 'not locked off'] };
export const CAMERA_REGISTRY = defineRegistry('camera move', Object.fromEntries(CAMERA_MOVE_NAMES.map((n) => [n, n])), { slot: 'cameraMove.move', blurbs: CAMERA_MOVE_BLURBS, aka: CAMERA_AKA,
  catalog: {
    title: 'Camera moves',
    tag: 'camera',
    intro: '`"cameraMove": { "move":"<name>", ... }`. A calculated camera path → `data.camera` (smooth, velocity-continuous). `{ "move":"diveIn","tx":960,"ty":300,"to":1.6 }`',
    usage: (n, { j }) => j({ cameraMove: { move: n } }),
    noPreview: 'a camera move is only legible against a scene laid out for it, which is the film, not a swatch.',
  },
});
// The slot is `cameraMove.move` and not `cameraMove`: nothing reads a bare `"cameraMove": "slowPush"`,
// bakeCameraMove (core/engine/produce.js) reads `spec.move` off the object. The short form made `make arsenal`
// print a paste that throws.

// A CAMERA DIAL is a top-level scene key that changes what the camera DOES rather than where it goes,
// and until now there was no way to find one. `make arsenal` searches registries, so a film-level dial
// was invisible to the one tool an author is told to reach for before inventing anything: you could
// only meet `cameraBlur` by reading schema.json. Registered for exactly the reason FILTER_REGISTRY was,
// so the search can answer for the engine and not for a hand-kept index (core/registry/registry.js).
export const CAMERA_DIAL_REGISTRY = defineRegistry('camera dial', { cameraBlur: 'cameraBlur' }, {
  slot: 'cameraBlur (a top-level boolean)',
  blurbs: {
    cameraBlur: 'CAMERA MOTION BLUR: blur the frame when the camera whips. Every layer smears by its '
      + 'velocity RELATIVE TO THE CAMERA, so a fast pan streaks the whole frame and a layer travelling '
      + 'with the camera stays sharp. Off by default; the film\'s `shutter` (degrees) says how much, and '
      + 'one layer opts out with `motionBlur: false`. A zoom and a roll are radial and are not modelled',
  },
  catalog: {
    title: 'Camera dials',
    tag: 'camera',
    intro: 'Top-level scene keys that change what the camera DOES rather than where it goes. `"cameraBlur": true` gives the film a real shutter: every layer smears by its velocity RELATIVE to the camera, so a whip pan streaks the frame and a layer travelling with the camera stays sharp. How much is the film\'s `shutter`, in degrees; one layer opts out with `motionBlur: false`.',
    usage: (_, { j }) => j({ cameraBlur: true }),
    noPreview: 'a shutter is only visible on a frame that is already moving fast, and the whole point is that it is invisible on a still. Its A/B is films/scene/_camera-blur-probe.json, which renders the same whip pan with the dial up and down.',
  },
});
