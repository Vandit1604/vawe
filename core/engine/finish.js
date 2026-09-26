// core/engine/finish.js: the scene-level "finish" pass, ONE dial for the cinematic grade a premium
// launch film needs (large soft light, bloom, grade, chromatic aberration, vignette, grain, depth of
// field). It adds NO new per-frame rendering: every effect is an ordinary layer, or a mutation of an
// authored one, built from primitives that already exist and already have their own vocabulary:
//   large soft light   core/lightfield (dropped in as an `html` layer, per its own README)
//   bloom / grade /    core/looks/filters.js's SVG defs (bloomFilter, resolveFilter, chromaSplitFilter),
//   aberration         composited over the whole frame by core/layers/adjust.js's backdrop-filter
//   vignette           core/looks/filters.js's own overlay-div preset, on a full-frame transparent layer
//   grain              core/backgrounds/fx.js's canvas grain, already wired to every `bg` window
//   depth of field     a layer's EXISTING `depth`/`plane` z (core/fx/plane.js) and the camera's
//                       EXISTING keyframed focus `f` (core/engine/produce.js bakeFocus) composed into a
//                       blur, which neither primitive drove before this. No new authoring vocabulary:
//                       a film racks focus the same way it already racks a dolly.
// Called from core/engine/boot.js at produce time, so renderFrame(n) stays pure: everything here is
// math on the JSON, before a single frame renders.
import { bloomFilter, chromaSplitFilter, resolveFilter } from '../looks/filters.js';
import { lightfield } from '../lightfield/index.js';
import { defineRegistry } from '../registry/registry.js';

// FINISH_REGISTRY, so `make arsenal Q="cinematic look"` (or "bloom", "film grain", "depth of field")
// surfaces this block. Before this registry existed a film agent had no way to find `finish` short of
// reading this file: it is a scene-level dial, not a layer type or a bg preset, so it lived in none of
// the vocabularies arsenal already scans. engine-doctrine/MISTAKES.md.
const FINISH_ENTRIES = { light: true, bloom: true, grade: true, aberration: true, vignette: true, grain: true, dof: true };
const FINISH_AKA = {
  light: ['large soft light', 'ambient key light', 'soft light source', 'premium launch glow'],
  bloom: ['glow', 'highlight bloom', 'blown out highlights', 'halo'],
  grade: ['colour grade', 'cinematic grade', 'film look', 'cinematic look'],
  aberration: ['chromatic aberration', 'lens fringing', 'colour split', 'rgb split'],
  vignette: ['dark corners', 'darkened edges', 'frame edge falloff'],
  grain: ['film grain', 'texture noise', 'analog grain', 'grainy texture'],
  dof: ['depth of field', 'focus rack', 'background blur', 'bokeh'],
};
export const FINISH_REGISTRY = defineRegistry('finish key', FINISH_ENTRIES, {
  slot: 'finish',
  aka: FINISH_AKA,
  blurbs: {
    light: 'a large soft key light dropped in as an html layer (core/lightfield), the premium launch-film source',
    bloom: 'blurs the frame 16px, lifts brightness 9% and screens the halo back over the sharp original',
    grade: 'a named colour grade (core/looks/filters.js) laid over the whole frame',
    aberration: 'a chromatic split in px over the whole frame, the lens-fringing finish',
    vignette: 'a full-frame vignette rect, amount 0..1 plus an optional colour',
    grain: 'a strength override on the existing bg grain toggle, applied to every window that already carries one',
    dof: "a blur baked from the camera's own keyframed focus against each layer's plane z, no new authoring vocabulary needed",
  },
  catalog: {
    title: 'Scene finish keys', tag: 'finish', intro: 'data.finish is the ONE dial for the cinematic grade a '
      + 'premium launch film needs: large soft light, bloom, grade, chromatic aberration, vignette, grain, '
      + 'depth of field (core/engine/finish.js). Composed of primitives that already exist, added at produce time.',
    usage: (n) => ({ finish: { [n]: true } }),
    noPreview: 'a scene-level pass, not a per-layer effect: render the film to see it',
  },
});

const FULL = (type, extra, W, H, total) =>
  ({ type, w: W, h: H, start: 0, duration: total, acrossBeats: true, ...extra });

function lightLayer(spec, W, H, total) {
  const html = lightfield(spec === true ? {} : spec);
  return FULL('html', { html, track: -1000 }, W, H, total);
}

function bloomLayer(spec, W, H, total) {
  const { threshold, strength = 1, radius = 24 } = spec === true ? {} : spec;
  return FULL('adjust', {
    filter: bloomFilter({ threshold, radius, intensity: strength }), blend: 'screen', track: 9000,
  }, W, H, total);
}

function gradeLayer(spec, W, H, total) {
  const s = typeof spec === 'string' ? spec
    : Object.entries(spec).map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(',') : v}`)[0];
  return FULL('adjust', { filter: resolveFilter(s).filter, track: 9001 }, W, H, total);
}

function aberrationLayer(spec, W, H, total) {
  const px = typeof spec === 'number' ? spec : spec.px ?? 2;
  return FULL('adjust', { filter: chromaSplitFilter({ px }), track: 9002 }, W, H, total);
}

function vignetteLayer(spec, W, H, total) {
  const amount = typeof spec === 'number' ? spec : spec.amount ?? 0.45;
  const color = typeof spec === 'object' ? spec.color : null;
  return FULL('rect', {
    bg: 'transparent', filter: `vignette:${amount}${color ? ',' + color : ''}`, track: 9003,
  }, W, H, total);
}

const LAYER_FROM = { light: lightLayer, bloom: bloomLayer, grade: gradeLayer, aberration: aberrationLayer, vignette: vignetteLayer };

// `finish.grain` is a strength override on the EXISTING grain toggle (`data.grain: true`, stripped by
// default in films/scene/scene.js unless set), forwarded per-window through `bg[i].opts.grain`
// (core/backgrounds/index.js `applyBgOver`, which already reads `over.grain` into the fx's own
// `alpha`). Only reaches a window that can carry it: a NAMED preset's own fx list is not known here
// (it resolves later, against the theme), so this only overrides a window ALREADY composed by hand
// with a `grain` fx (`bg[i].fx`) or one that already states `opts.grain`. A preset with no grain of
// its own (`black`, by design: AGENTS.md) needs one composed by hand, same as any other bg fx.
function resolveGrain(data, amount) {
  data.grain = true;
  for (const w of data.bg || []) {
    if (w.opts && w.opts.grain != null) continue;
    if (!Array.isArray(w.fx) || !w.fx.some((fx) => fx && fx.type === 'grain')) continue;
    w.opts = { ...(w.opts || {}), grain: amount };
  }
}

// resolveFinishLayers(data, W, H): the half of `finish` that adds or mutates AUTHORED layers. Called
// early in core/engine/boot.js's resolveThemeAndBake, before resolveCoords/produceBaseline, so the
// synthetic layers this adds go through the SAME production pass (motion defaults, id assignment) as
// anything an author wrote by hand.
export function resolveFinishLayers(data, W, H) {
  const f = data.finish;
  if (!f) return;
  const total = Number(data.duration) || 9999;
  const extra = [];
  for (const [key, build] of Object.entries(LAYER_FROM)) if (f[key]) extra.push(build(f[key], W, H, total));
  if (f.grain) resolveGrain(data, typeof f.grain === 'number' ? f.grain : 0.5);
  data.layers = [...(data.layers || []), ...extra];
}

// A layer's `plane` z, post-bakeDepth (core/engine/produce.js): `modifiers:[{plane:{z,hold}}]` or the
// raw shorthand `modifiers:[{plane:-600}]`. `null` when the layer stands at the picture plane.
function planeZ(L) {
  const m = (L.modifiers || []).find((x) => x && x.plane != null);
  if (!m) return null;
  return typeof m.plane === 'number' ? m.plane : m.plane.z;
}

const addFilter = (existing, add) => (existing ? `${existing} ${add}` : add);

// bakeDepthOfField(data): the camera's own keyframed focus (`camera[].f`, already resolved to a
// number by bakeFocus) against each layer's own `plane` z, into a blur. `k` is px of blur per px of
// misfocus; `finish.dof.strength` overrides it (default 6, roughly a soft rack over a 300px pull).
//
// APPROXIMATION, named rather than hidden: a focus rack with more than two keyframes is reduced to
// its FIRST and LAST (the vars track this reuses, core/tracks/vars.js, only tweens two points). A
// scene racking focus through a middle point and back needs a second, hand-authored `adjust` layer;
// this covers the pull that is actually common, one point to another.
export function bakeDepthOfField(data) {
  const cam = Array.isArray(data.camera) ? data.camera.filter((k) => k && typeof k.f === 'number') : [];
  if (!cam.length) return;
  // z is a px distance from the picture plane (core/fx/plane.js: -600 back, +240 front is its own
  // worked range), so 0.03 turns a 600px rack into an 18px blur, a soft rack rather than an opaque one.
  const k = data.finish?.dof?.strength ?? 0.03;
  const first = cam[0], last = cam[cam.length - 1];
  for (const L of data.layers || []) {
    const z = planeZ(L);
    if (z == null) continue;
    if (cam.length === 1 || first.f === last.f) {
      const b = Math.abs(z - first.f) * k;
      if (b > 0.05) L.filter = addFilter(L.filter, `blur(${b.toFixed(2)}px)`);
      continue;
    }
    const b0 = Math.abs(z - first.f) * k, b1 = Math.abs(z - last.f) * k;
    L.vars = { ...(L.vars || {}), '--dof': [+b0.toFixed(2), +b1.toFixed(2)] };
    L.varsDelay = { ...(typeof L.varsDelay === 'object' ? L.varsDelay : {}), '--dof': first.t ?? 0 };
    L.varsDur = { ...(typeof L.varsDur === 'object' ? L.varsDur : {}), '--dof': Math.max(0.01, (last.t ?? 1) - (first.t ?? 0)) };
    L.filter = addFilter(L.filter, 'blur(calc(var(--dof, 0) * 1px))');
  }
}
