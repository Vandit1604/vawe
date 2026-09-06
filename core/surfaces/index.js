// core/surfaces/index.js: the SURFACE registry, the fourth application of the pattern in core/layers/
// index.js, core/fx/index.js and core/tracks/index.js. A layer TYPE answers "what is this thing"; a
// MODIFIER answers "what is done to it"; a TRACK answers "what the engine does to every layer"; a
// SURFACE answers "what draws the pixels", for the layer types whose whole output is a canvas.
//
// It exists because `paint`, `shader`, `raymarch` and `three` were four files repeating one procedure,
// and each said so in its own header ("Mirrors core/layers/shader.js exactly"). The procedure is:
// size a canvas to the layer box, build a drawing instance once, redraw it every frame from LOCAL
// time, clear it when the layer is off its window, and stamp the dataset so the renderer's
// static-frame dedup can see a canvas-only change. Only the last step of the draw differed. Four
// copies meant a fix landed in one and not the others, which is how `three` and `raymarch` still
// ignore `resample` while the other two honour it, and how an unknown `shader` name has always drawn
// an empty canvas rather than saying so.
//
// A surface is NOT a layer type of its own and never appears in scene JSON. `paint`, `shader`,
// `raymarch` and `three` remain four author-facing type names, bound to this registry by
// core/layers/canvas.js. The names are the vocabulary 101 scenes are written in; the duplication was
// never something an author could see.
//
// WHERE THE LINE FALLS, because the next author will need it: a surface owns PIXELS and nothing else.
// It does not size itself, style its canvas, append it, decide the stamp, or know that resample
// exists, core/layers/canvas.js does all of that once, for all four. A surface that needed its own
// build order would not belong here; it would be a layer type, like `glow` and `beam`, which paint
// with CSS gradients and own no canvas at all.
import { mergeProps } from '../registry/props.js';
import * as paint from './paint.js';
import * as shader from './shader.js';
import * as globe from './globe.js';
import * as raymarch from './raymarch.js';
import * as three from './three.js';
import * as particles from './particles.js';

const REGISTRY = { paint, shader, raymarch, three, globe, particles };

// Exported so a gate can DERIVE this vocabulary instead of restating it, the contract LAYER_TYPES,
// FX_TYPES and TRACK_TYPES already have. A hand-typed copy of such a list is how `make coverage`
// reported 14/14 while a 15th layer type existed (docs/MISTAKES.md #21, #65).
export const SURFACE_TYPES = Object.keys(REGISTRY);

// The layer props each surface reads, keyed by surface name. `PROPS` is in REQUIRED below for the same
// reason `validate` is: a surface that reads props without declaring them puts them out of a gate's
// reach, and the whole point of the declaration is that adding a file cannot open a blind spot.
export const SURFACE_PROPS = Object.freeze(Object.fromEntries(
  SURFACE_TYPES.map((n) => [n, Object.freeze(mergeProps(REGISTRY[n].PROPS))])));

// THE CONTRACT, checked at MODULE LOAD rather than described in a comment: core/layers/canvas.js
// calls all five of these on every surface, and a surface missing one would fail deep inside a build
// or, worse for `validate`, would accept any effect name and draw an empty canvas.
const REQUIRED = ['size', 'stamp', 'resamplable', 'validate', 'create', 'PROPS'];
for (const name of SURFACE_TYPES)
  for (const k of REQUIRED)
    if (REGISTRY[name][k] === undefined)
      throw new Error(`surface "${name}" declares no \`${k}\`: a surface owes core/layers/canvas.js `
        + `all of: ${REQUIRED.join(', ')}.`);

// An unknown name is a HARD ERROR. Reachable only from core/layers/canvas.js at module load, so a
// surface name that does not resolve is a wiring mistake caught before a scene is ever parsed,
// never a layer that builds and draws nothing.
export const pick = (name) => {
  const s = REGISTRY[name];
  if (!s) throw new Error(`unknown surface "${name}", known: ${SURFACE_TYPES.join(', ')}. `
    + `A surface is bound at module load by core/layers/canvas.js; a name the registry does not know `
    + `would build a layer whose canvas nothing ever draws into.`);
  return s;
};
