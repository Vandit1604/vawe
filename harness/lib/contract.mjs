import { PLACEMENT } from '../../core/layout/safe.js';
import { nearMisses } from '../../core/registry/registry.js';
import { PART_NAMES } from '../../core/motion/parts.js';
import { SHAPES } from '../../core/motion/shapes.js';
import { IDLE_NAMES } from '../../core/engine/idle.js';
import { CURVES as PATH_CURVES } from '../../core/motion/path-curves.js';
import { boundaryMechanism } from '../../core/transitions/lower.js';
import { TRANSITIONS } from '../../core/transitions/catalog.js';
import { RELATIONSHIP_KEYS, candidatesFor } from '../../core/transitions/relationships.js';
import { pickRecipe, RECIPES } from '../../recipes/index.mjs';
import { CAMERA_MOVE_NAMES, CAMERA_MOVE_BLURBS, cameraMoveParams, buildCameraMove } from '../../core/camera-moves/index.js';
import { CAMERA_WORDS, resolveCameraMove } from '../../core/registry/vocab.js';
import { TIMINGS } from '../../core/cuts/timings.js';
import { BG_NAMES } from '../../core/backgrounds/index.js';
import { PRESETS as KINETIC_PRESETS } from '../../core/kinetic/presets.js';
import { LAYER_TYPES } from '../../core/layers/index.js';
import { score, toks, collect as arsenalCollect, pasteOf } from '../author/arsenal.mjs';

const EDGE_RE = /^\s*([a-z][a-z0-9-]*)\s*@\s*(\d+)\s*x\s*(\d+)\s*((?:\/[a-z]+\s*[:=]\s*-?[\d.]+\s*)*)$/i;
const POSE_TOKEN_RE = /\/([a-z]+)\s*[:=]\s*(-?[\d.]+)/gi;
const POSE_FIELDS = { rot: 'rot', op: 'opacity', r: 'radius', radius: 'radius' };

/** parseEdge("bottom-left@120x40/rot:15/op:0.4") → {placement,w,h,rot,opacity} | null (null = no opinion) */
export function parseEdge(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s || /^<fill:/i.test(s) || /^REPLACE/i.test(s)) return null; // the template's own unfilled markers
  const m = EDGE_RE.exec(s);
  if (!m) return { error: `"${s}" is not "<placement>@<w>x<h>" (e.g. "bottom-left@120x40", optionally "/rot:15", "/op:0.4", "/radius:11")` };
  const [, placement, w, h, poseRaw] = m;
  if (!PLACEMENT[placement]) {
    const near = nearMisses(placement, Object.keys(PLACEMENT));
    return { error: `"${placement}" is not a known placement${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${Object.keys(PLACEMENT).join(', ')}` };
  }
  const pose = { rot: 0, opacity: 1 };
  if (poseRaw) {
    POSE_TOKEN_RE.lastIndex = 0;
    let pm;
    while ((pm = POSE_TOKEN_RE.exec(poseRaw))) {
      const key = pm[1].toLowerCase();
      if (!POSE_FIELDS[key]) return { error: `"${key}" in "${s}" is not a known pose field. Known: rot, op, radius` };
      pose[POSE_FIELDS[key]] = +pm[2];
    }
  }
  return { placement, w: +w, h: +h, rot: pose.rot, opacity: pose.opacity, ...(pose.radius != null ? { radius: pose.radius } : {}) };
}

const edgeEq = (a, b) => a && b && a.placement === b.placement && a.w === b.w && a.h === b.h
  && a.rot === b.rot && a.opacity === b.opacity && a.radius === b.radius;
const fmtEdge = (e) => {
  if (!e) return '(unset)';
  let s = `${e.placement}@${e.w}x${e.h}`;
  if (e.rot) s += `/rot:${e.rot}`;
  if (e.opacity !== 1) s += `/op:${e.opacity}`;
  return s;
};

/**
 * chainErrors(beats) → string[]. `beats` are storyboard-parse.mjs beats, each carrying `object_in` /
 * `object_out` raw strings. A beat that names neither field is NOT a chain participant (a film with no
 * continuous object has nothing to check); once ANY beat names one, every beat must, and every
 * consecutive pair must hand off: beat i's object_out === beat i+1's object_in, placement AND size.
 * A broken chain is refused with BOTH values named, never silently patched.
 */
export function chainErrors(beats) {
  const parsed = beats.map((b) => ({ b, in: parseEdge(b.object_in), out: parseEdge(b.object_out) }));
  const participates = parsed.some((p) => p.in || p.out);
  if (!participates) return [];
  const errs = [];
  parsed.forEach((p, i) => {
    if (p.in && p.in.error) errs.push(`beat ${i + 1} (${p.b.name}) object_in: ${p.in.error}`);
    if (p.out && p.out.error) errs.push(`beat ${i + 1} (${p.b.name}) object_out: ${p.out.error}`);
    if (!p.in || p.in.error) errs.push(`beat ${i + 1} (${p.b.name}) is missing a valid object_in (the chain is in use once any beat names one)`);
    if (!p.out || p.out.error) errs.push(`beat ${i + 1} (${p.b.name}) is missing a valid object_out`);
  });
  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1], cur = parsed[i];
    if (!prev.out || prev.out.error || !cur.in || cur.in.error) continue; // already reported above
    if (!edgeEq(prev.out, cur.in)) {
      errs.push(`beat ${i} (${prev.b.name}) ends at ${fmtEdge(prev.out)} but beat ${i + 1} (${cur.b.name}) starts at ${fmtEdge(cur.in)}. The edges must match: fix one beat's object_in or the other's object_out.`);
    }
  }
  return errs;
}

/** edges(beats) → [{name,start,end,in,out}] for beats whose object_in/out both parse clean. Empty when the film has no continuous object. */
export function edges(beats) {
  if (chainErrors(beats).length) return [];
  return beats.map((b) => ({ name: b.name, start: b.start, end: b.end, in: parseEdge(b.object_in), out: parseEdge(b.object_out) }))
    .filter((e) => e.in && e.out && !e.in.error && !e.out.error);
}

const FRAGMENT_SEP_RE = /^(?:(.+?)\s+)?@\s*(.+)$/;

const FRAGMENT_NONE_RE = /^none\b/i;

/** parseFragmentSpec("_together.card.html @ center@900x520") → {path, edge, none}. path/edge are null
 * when unstated; edge carries {error} the same way parseEdge does; none is true for "fragment: none". */
export function parseFragmentSpec(raw) {
  if (raw == null) return { path: null, edge: null, none: false };
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s) return { path: null, edge: null, none: false };
  if (FRAGMENT_NONE_RE.test(s)) return { path: null, edge: null, none: true };
  const stripNote = (v) => { const t = (v || '').split(/\s+\(/)[0].trim(); return t || null; };
  const m = FRAGMENT_SEP_RE.exec(s);
  if (!m) return { path: stripNote(s), edge: null, none: false };   // no "@": a plain file override
  const [, pathPart, placementRaw] = m;
  return { path: stripNote(pathPart), edge: parseEdge(placementRaw), none: false };
}

/** fragmentErrors(beats) → string[] naming every beat whose `fragment:` placement clause does not parse. */
export function fragmentErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    const { edge } = parseFragmentSpec(b.fragment);
    if (edge && edge.error) errs.push(`beat ${i + 1} (${b.name}) fragment: ${edge.error}`);
  });
  return errs;
}

export const SPEED_BAND = { energy: 0.22, professional: 0.4, gravity: 0.65, cinematic: 1.2 };

const PART_RE = /^\s*([^@]+?)\s*@\s*([a-z-]+)\s*:\s*([a-z]+)(?:\s*\/\s*([a-z]+))?\s*$/i;
const HOLD_RE = /^\s*hold\s*:\s*([a-z]+)\s*$/i;
const LAYER_RE = /^\s*([a-z-]+)\s*:\s*([a-z]+)\s*$/i;

/**
 * parseMoveEntry(raw) → one unified entry, scope read off the string itself:
 *   {scope:'part', selector,kind,inBand,outBand} | {scope:'hold', name} | {scope:'layer', shape,band}
 *   | {error}
 */
export function parseMoveEntry(raw) {
  const s = String(raw).trim();
  if (s.includes('@')) {
    const m = PART_RE.exec(s);
    if (!m) return { error: `"${s}" is not "<selector>@<kind>:<band>[/<outBand>]" (e.g. "[data-part=\\"headline\\"]@slide-left:energy")` };
    const [, selector, kind, inBand, outBandRaw] = m;
    if (!PART_NAMES.includes(kind)) {
      const near = nearMisses(kind, PART_NAMES);
      return { error: `"${kind}" is not a known part entrance${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${PART_NAMES.join(', ')}` };
    }
    if (!SPEED_BAND[inBand]) {
      const near = nearMisses(inBand, Object.keys(SPEED_BAND));
      return { error: `"${inBand}" is not a speed band${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${Object.keys(SPEED_BAND).join(', ')}` };
    }
    const outBand = outBandRaw || inBand;
    if (!SPEED_BAND[outBand]) return { error: `"${outBand}" is not a speed band. Known: ${Object.keys(SPEED_BAND).join(', ')}` };
    return { scope: 'part', selector: selector.trim(), kind, inBand, outBand };
  }
  const holdM = HOLD_RE.exec(s);
  if (holdM) {
    const name = holdM[1].toLowerCase();
    if (!IDLE_NAMES.includes(name)) {
      const near = nearMisses(name, IDLE_NAMES);
      return { error: `"${name}" is not a known idle${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${IDLE_NAMES.join(', ')}` };
    }
    return { scope: 'hold', name };
  }
  const m = LAYER_RE.exec(s);
  if (!m) return { error: `"${s}" is not "<selector>@<kind>:<band>", "hold:<idle>", or "<shape>:<band>" (e.g. "pan:cinematic"). Known shapes: ${Object.keys(SHAPES).join(', ')}. Known curves: ${Object.keys(PATH_CURVES).join(', ')}. Known idles: ${IDLE_NAMES.join(', ')}` };
  const [, shape, band] = m;
  const isPath = !SHAPES[shape] && !!PATH_CURVES[shape];
  if (!SHAPES[shape] && !isPath) {
    const near = nearMisses(shape, [...Object.keys(SHAPES), ...Object.keys(PATH_CURVES)]);
    return { error: `"${shape}" is not a known move shape or path curve${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${[...Object.keys(SHAPES), ...Object.keys(PATH_CURVES)].join(', ')}` };
  }
  if (!SPEED_BAND[band]) {
    const near = nearMisses(band, Object.keys(SPEED_BAND));
    return { error: `"${band}" is not a speed band${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${Object.keys(SPEED_BAND).join(', ')}` };
  }
  return isPath ? { scope: 'path', curve: shape, band } : { scope: 'layer', shape, band };
}

/** parseMoveEntries(raw) → [{...}|{error}], `;`-separated. Empty for unset ("no opinion", same convention as parseEdge). */
export function parseMoveEntries(raw) {
  if (raw == null) return [];
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s || /^<fill:/i.test(s) || /^none$/i.test(s)) return [];
  return s.split(';').map((e) => e.trim()).filter(Boolean).map(parseMoveEntry);
}

// COMPAT: `motion:` is still a legal field (40 shipped films write it); a `motion:` entry always names a selector so it is always scope PART, and the alias is exact, not approximate.
export const parseMotionEntry = parseMoveEntry;
export const parseMotion = parseMoveEntries;

/** motionErrors(beats) → string[] naming every beat whose `motion:` entry does not parse. */
export function motionErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    for (const e of parseMotion(b.motion)) {
      if (e.error) errs.push(`beat ${i + 1} (${b.name}) motion: ${e.error}`);
    }
  });
  return errs;
}

/** moveErrors(beats) → string[] naming every beat whose `move:` entry does not parse (any scope). */
export function moveErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    for (const e of parseMoveEntries(b.move)) {
      if (e.error) errs.push(`beat ${i + 1} (${b.name}) move: ${e.error}`);
    }
  });
  return errs;
}

const KINETIC_PRESET_NAMES = Object.keys(KINETIC_PRESETS);
const SPLIT_MODES = ['word', 'char', 'line'];

/** parseGroundLine(raw) -> null | {name} | {error}. `raw` is a bare background-preset name. */
export function parseGroundLine(raw) {
  if (raw == null) return null;
  const name = String(raw).trim();
  if (!name) return null;
  if (!BG_NAMES.includes(name)) {
    const near = nearMisses(name, BG_NAMES);
    return { error: `"${name}" is not a background preset${near.length ? `, did you mean "${near[0]}"?` : ''}. Presets: ${BG_NAMES.join(' · ')}.` };
  }
  return { name };
}

/** groundErrors(beats) -> string[] naming every beat whose `ground:` is not a real background preset. */
export function groundErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    const p = parseGroundLine(b.ground);
    if (p && p.error) errs.push(`beat ${i + 1} (${b.name}) ground: ${p.error}`);
  });
  return errs;
}

/** parseKineticLine(raw) -> null | {preset, split} | {error}. "<preset> [split=word|char|line]". */
export function parseKineticLine(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = /^(\S+)(?:\s+split\s*=\s*(\S+))?\s*$/.exec(s);
  if (!m) return { error: `"${s}" does not parse. Syntax: "<kinetic preset> [split=word|char|line]".` };
  const [, presetRaw, splitRaw] = m;
  if (!KINETIC_PRESET_NAMES.includes(presetRaw)) {
    const near = nearMisses(presetRaw, KINETIC_PRESET_NAMES);
    return { error: `"${presetRaw}" is not a kinetic preset${near.length ? `, did you mean "${near[0]}"?` : ''}. Presets: ${KINETIC_PRESET_NAMES.join(' · ')}.` };
  }
  if (splitRaw && !SPLIT_MODES.includes(splitRaw)) {
    return { error: `split "${splitRaw}" is not one of ${SPLIT_MODES.join(' · ')}.` };
  }
  return { preset: presetRaw, split: splitRaw || null };
}

/** kineticErrors(beats) -> string[] naming every beat whose `kinetic:` line does not parse. */
export function kineticErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    const p = parseKineticLine(b.kinetic);
    if (p && p.error) errs.push(`beat ${i + 1} (${b.name}) kinetic: ${p.error}`);
  });
  return errs;
}

/** parseElementsLine(raw) -> null | {types: string[]} | {error}. `;`-separated layer type names. */
export function parseElementsLine(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const types = s.split(';').map((t) => t.trim()).filter(Boolean);
  const unknown = types.filter((t) => !LAYER_TYPES.includes(t));
  if (unknown.length) {
    return { error: `${unknown.map((t) => `"${t}"`).join(', ')} ${unknown.length > 1 ? 'are' : 'is'} not a layer type. `
      + `Types: ${LAYER_TYPES.join(' · ')}.` };
  }
  return { types };
}

/** elementsErrors(beats) -> string[] naming every beat whose `elements:` names an unknown layer type. */
export function elementsErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    const p = parseElementsLine(b.elements);
    if (p && p.error) errs.push(`beat ${i + 1} (${b.name}) elements: ${p.error}`);
  });
  return errs;
}

// `transition_value:` declares whether a boundary carries the ground from dark to light, light to dark, or holds it; the set matches exactly what quality/gates/ground-arc.mjs measures a frame into (core/backgrounds LIGHT/DARK bands), so declared and measured values are directly comparable (quality/gates/plan-vs-render.mjs).
export const TRANSITION_VALUES = ['dark->light', 'light->dark', 'held'];

/** parseTransitionValueLine(raw) -> null | {value} | {error}. */
export function parseTransitionValueLine(raw) {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (!TRANSITION_VALUES.includes(value)) {
    return { error: `"${value}" is not one of ${TRANSITION_VALUES.join(' · ')}.` };
  }
  return { value };
}

/** transitionValueErrors(beats) -> string[] naming every beat whose `transition_value:` is not legal. */
export function transitionValueErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    const p = parseTransitionValueLine(b.transition_value);
    if (p && p.error) errs.push(`beat ${i + 1} (${b.name}) transition_value: ${p.error}`);
  });
  return errs;
}

// Measured (AGENTS.md's build brief): the core has 14 named camera moves plus a 14-phrase "camera word" registry, and across 42 authored films, ZERO use a named move.
const CAMERA_PARAM_RE = /(\w+)\s*=\s*(-?[\w.]+)/g;
const CAMERA_WORD_BY_LOWER = new Map(Object.keys(CAMERA_WORDS).map((w) => [w.toLowerCase(), w]));
const DECISIVE_CAMERA_TOKEN_RE = /^[a-z][a-z0-9-]*$/i;

/** nearestCameraMoves(text, n) -> the n camera moves whose name+blurb best answer `text`, via the same
 * ranker `make arsenal` uses (never a second ranker). */
export function nearestCameraMoves(text, n = 3) {
  const qt = toks(text);
  return CAMERA_MOVE_NAMES
    .map((name) => ({ name, blurb: CAMERA_MOVE_BLURBS[name] }))
    .map((e) => ({ ...e, s: score({ name: e.name, kind: 'camera move', blurb: e.blurb }, qt) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n);
}

/**
 * parseCameraLine(raw) ->
 *   null                       unset / no opinion (same convention as parseEdge)
 *   {move, params}             a resolved cameraMove spec, ready to window and build
 *   {error}                    a decisive attempt at the grammar that did not resolve
 *   {prose: true, text}        free text: documentary, unbuilt, reported as a warning by the caller
 */
export function parseCameraLine(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s || /^<fill:/i.test(s) || /^none$/i.test(s)) return null;
  const firstParam = s.search(/\b\w+\s*=/);
  const moveRaw = (firstParam >= 0 ? s.slice(0, firstParam) : s).trim();
  const paramsRaw = firstParam >= 0 ? s.slice(firstParam) : '';
  if (!moveRaw) return { error: `"${s}" names no camera move. Syntax: "<move> [key=value ...]" (e.g. "slowPush to=1.08", "follow id=window").` };
  const wordMatch = CAMERA_WORD_BY_LOWER.get(moveRaw.toLowerCase());
  const decisive = DECISIVE_CAMERA_TOKEN_RE.test(moveRaw) || !!wordMatch;
  const resolved = resolveCameraMove(wordMatch || moveRaw);
  if (!CAMERA_MOVE_NAMES.includes(resolved)) {
    if (!decisive) return { prose: true, text: s };
    const near = nearMisses(moveRaw, [...CAMERA_MOVE_NAMES, ...Object.keys(CAMERA_WORDS)]);
    return { error: `"${moveRaw}" is not a known camera move or camera word${near.length ? `, did you mean "${near[0]}"?` : ''}. `
      + `Moves: ${CAMERA_MOVE_NAMES.join(', ')}. Words: ${Object.keys(CAMERA_WORDS).join(', ')}.` };
  }
  const params = {};
  let pm; CAMERA_PARAM_RE.lastIndex = 0;
  while ((pm = CAMERA_PARAM_RE.exec(paramsRaw))) {
    const [, key, valRaw] = pm;
    params[key] = /^-?[\d.]+$/.test(valRaw) ? +valRaw : valRaw;
  }
  const known = cameraMoveParams(resolved);
  if (known) {
    const unknown = Object.keys(params).filter((k) => !known.has(k));
    if (unknown.length) return { error: `camera "${resolved}" does not read ${unknown.map((k) => `"${k}"`).join(', ')}. It accepts: ${[...known].join(', ')}.` };
  }
  return { move: resolved, params };
}

/** cameraErrors(beats) -> string[] naming every beat whose `camera:` is a decisive-but-wrong attempt. */
export function cameraErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    const p = parseCameraLine(b.camera);
    if (p && p.error) errs.push(`beat ${i + 1} (${b.name}) camera: ${p.error}`);
  });
  return errs;
}

/** cameraWarnings(beats) -> string[] naming every beat whose `camera:` is prose that resolves to nothing. */
export function cameraWarnings(beats) {
  const warns = [];
  beats.forEach((b, i) => {
    const p = parseCameraLine(b.camera);
    if (p && p.prose) {
      const near = nearestCameraMoves(p.text, 3);
      warns.push(`beat ${i + 1} (${b.name}) camera: "${p.text}" reads as documentary prose, not a `
        + `resolvable camera move, so it never reaches the engine. Nearest named moves: `
        + `${near.map((n) => `${n.name} (${n.blurb})`).join(' · ')}. Write "camera: <move> [key=value ...]" `
        + `to make it real, e.g. "camera: ${near[0] ? near[0].name : 'slowPush'}".`);
    }
  });
  return warns;
}

/** resolvedCamera(b) -> {move,params} | null. `b.camera` already validated by cameraErrors. */
export function resolvedCamera(b) {
  const p = parseCameraLine(b.camera);
  return (p && !p.error && !p.prose) ? p : null;
}

const REST_S_EPS = 0.02, REST_PX_EPS = 1, REST_DEG_EPS = 1;

/** isRestCameraPose({s,x,y,rx,ry,roll}) -> true when every channel sits at its identity value. */
export function isRestCameraPose(pose) {
  if (!pose) return true;
  return Math.abs(pose.s - 1) < REST_S_EPS && Math.abs(pose.x) < REST_PX_EPS && Math.abs(pose.y) < REST_PX_EPS
    && Math.abs(pose.rx) < REST_DEG_EPS && Math.abs(pose.ry) < REST_DEG_EPS && Math.abs(pose.roll) < REST_DEG_EPS;
}

/** cameraMoveEndPose(move, params, dims) -> {s,x,y,rx,ry,roll} | null. Builds the move's real keyframes
 * and reads the last one; null when the move cannot be built at plan time (a param this grammar cannot
 * supply, e.g. `followCursor`'s cursor path) - unresolvable is reported as "no opinion", never as rest. */
export function cameraMoveEndPose(move, params, dims = [1920, 1080]) {
  try {
    const kf = buildCameraMove({ move, ...params }, dims);
    if (!Array.isArray(kf) || !kf.length) return null;
    const last = kf.reduce((m, k) => (k.t > m.t ? k : m), kf[0]);
    return { s: last.s ?? 1, x: last.x ?? 0, y: last.y ?? 0, rx: last.rx ?? 0, ry: last.ry ?? 0, roll: last.roll ?? 0 };
  } catch { return null; }
}

function windowDollyEndPose(rp) {
  const zoomTo = rp.params.zoomTo != null ? parseFloat(rp.params.zoomTo) : (rp.def.params?.zoomTo?.default ?? 1.3);
  return { s: Number.isFinite(zoomTo) ? zoomTo : 1.3, x: 0, y: 0, rx: 0, ry: 0, roll: 0 };
}

/** beatCameraEndPose(b, dims) -> {pose, label} | null. Where THIS beat's own camera: line or
 * camera-kind recipe leaves the camera, or null when the beat names no camera move at all (a beat that
 * names one but cannot be resolved still returns {pose:null,...} so the caller can tell "no move" from
 * "a move whose end pose is unknown"). */
export function beatCameraEndPose(b, dims = [1920, 1080]) {
  const cam = resolvedCamera(b);
  if (cam) {
    const paramStr = Object.entries(cam.params).map(([k, v]) => `${k}=${v}`).join(' ');
    return { pose: cameraMoveEndPose(cam.move, cam.params, dims), label: `camera: ${cam.move}${paramStr ? ' ' + paramStr : ''}` };
  }
  if (b.recipe) {
    const rp = parseRecipeLine(b.recipe);
    if (!rp.error && rp.def && rp.def.kind === 'camera') {
      return { pose: rp.name === 'window-dolly' ? windowDollyEndPose(rp) : null, label: `recipe: ${b.recipe}` };
    }
  }
  return null;
}

const NORMAL_SHOT_RE = /\b(wide|full|establishing|rest|normal)\b/i;
const NORMAL_EYE_START_RE = /\b(whole|full)\s+(frame|window|screen|app|composition)\b/i;
const NORMAL_PICTURE_RE = /\bfull(?:[\s-])?(?:frame|screen)\b|\bfills?\s+the\s+frame\b|\bwhole\s+(?:app|window|screen|frame)\b/i;
// FULL_FRAME_OBJECT_AREA clears the smallest of the five aspect ratio canvases (1080x1080); engine-doctrine/RESEARCH/TIMING-SOURCES.md part 6
// 1,400,000px^2 clears every one of the five canvas sizes (smallest is 1080x1080 = 1,166,400) while still excluding a large card or panel; MEDIUM-DERIVED, not invented (engine-doctrine/RESEARCH/TIMING-SOURCES.md part 6).
const FULL_FRAME_OBJECT_AREA = 1_400_000;

/** normalCameraEvidence(b) -> the matched evidence string, or null. Exported (not just the boolean
 * below) so a caller can NAME what it saw, which the warning message needs. */
export function normalCameraEvidence(b) {
  if (b.shot && NORMAL_SHOT_RE.test(b.shot)) return `shot: "${b.shot}"`;
  const inEdge = parseEdge(b.object_in);
  if (inEdge && !inEdge.error && inEdge.placement === 'center' && inEdge.w * inEdge.h >= FULL_FRAME_OBJECT_AREA)
    return `object_in: "${b.object_in}" (full frame)`;
  if (b.eye) {
    const eyeStart = String(b.eye).split('->')[0].trim();
    if (NORMAL_EYE_START_RE.test(eyeStart)) return `eye: "${eyeStart}" (the whole frame)`;
  }
  if (!b.camera && !b.shot) {
    const text = `${b.picture || ''} ${(Array.isArray(b.onscreen) ? b.onscreen.join(' ') : b.onscreen || '')}`;
    if (NORMAL_PICTURE_RE.test(text)) return 'a full composition (picture/onscreen)';
  }
  return null;
}

const fmtCameraPose = (pose) => {
  const parts = [`s=${pose.s.toFixed(2)}`];
  if (Math.abs(pose.x) >= REST_PX_EPS || Math.abs(pose.y) >= REST_PX_EPS) parts.push(`x=${pose.x.toFixed(0)} y=${pose.y.toFixed(0)}`);
  for (const [k, v] of [['rx', pose.rx], ['ry', pose.ry], ['roll', pose.roll]]) if (Math.abs(v) >= REST_DEG_EPS) parts.push(`${k}=${v.toFixed(0)}°`);
  return parts.join(', ');
};

/**
 * cameraStillHeldWarnings(beats, dims) -> string[]. Walks beats in order, tracking whether the camera
 * is currently held away from rest by an earlier `camera:`/camera-recipe leg. When a LATER beat plans
 * the normal camera (normalCameraEvidence) while that hold is still open, warns and names the exact
 * move and the return line to paste. Report-only (skills/vawe-camera/SKILL.md keeps the hold as the render):
 * this exists so an author who did not intend the hold finds out before the render does.
 */
export function cameraStillHeldWarnings(beats, dims = [1920, 1080]) {
  const warns = [];
  let held = null; // {pose, label, beatIdx, isRecipe} | null once returned to rest
  beats.forEach((b, i) => {
    const evidence = normalCameraEvidence(b);
    if (evidence && held) {
      warns.push(`camera-still-held: beat ${i + 1} (${b.name}) plans ${evidence} but the camera is still `
        + `at ${fmtCameraPose(held.pose)} from beat ${held.beatIdx + 1}'s \`${held.label}\`; add a return: `
        + `camera: slowPush to=1 or a window-dolly with zoomTo=1, whichever the grammar supports.`);
    }
    const own = beatCameraEndPose(b, dims);
    if (own && own.pose) held = isRestCameraPose(own.pose) ? null : { pose: own.pose, label: own.label, beatIdx: i };
  });
  return warns;
}

// A device named in `eye:` must be real: it either names one of these words (a mechanism this repo actually has) or overlaps a capability the beat already declares in camera:/move:/motion:/use:/recipe:, ranked the same word-overlap way `make arsenal` scores.
export const EYE_DEVICE_WORDS = ['cursor', 'caret', 'camera', 'push', 'dolly', 'travel', 'pan',
  'dive', 'zoom', 'colour', 'color', 'contrast', 'size', 'scale', 'blur', 'focus', 'motion',
  'stagger', 'reveal', 'cut', 'draw', 'wordmark', 'flash', 'word-by-word', 'ground', 'type', 'typing'];

const EYE_RE = /^\s*(.+?)\s*->\s*(.+?)\s*->\s*(.+?)\s*$/;

/**
 * parseEyeLine(raw, beat) -> {start, device, land} | null (unset, same convention as parseEdge) |
 * {error}. `beat` (a storyboard-parse.mjs beat) is read only for its camera/move/motion/recipe/uses,
 * the capability fallback the device may resolve against instead of the named list above.
 */
export function parseEyeLine(raw, beat) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s || /^<fill:/i.test(s)) return null;
  const m = EYE_RE.exec(s);
  if (!m) return { error: `"${s}" is not "<where it starts> -> <what pulls it, naming the device> -> <where it lands>" (two "->" arrows).` };
  const [, start, device, land] = m;
  const dLower = device.toLowerCase();
  const named = EYE_DEVICE_WORDS.some((w) => dLower.includes(w));
  let capability = false;
  if (!named && beat) {
    const capText = [beat.camera, beat.move, beat.motion, beat.recipe, ...(beat.uses || [])].filter(Boolean).join(' ');
    const dt = toks(device), ct = toks(capText);
    capability = dt.some((t) => ct.includes(t));
  }
  if (!named && !capability) {
    return { error: `"${device.trim()}" in "${s}" does not name a known device (${EYE_DEVICE_WORDS.slice(0, 8).join(', ')}, …) or overlap a capability this beat already declares in camera:/move:/motion:/use:/recipe:. Name the real device, or add it to one of those fields first.` };
  }
  return { start: start.trim(), device: device.trim(), land: land.trim() };
}

/** eyeErrors(beats) -> string[] naming every beat whose `eye:` line does not parse or names an unresolved device. */
export function eyeErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    const p = parseEyeLine(b.eye, b);
    if (p && p.error) errs.push(`beat ${i + 1} (${b.name}) eye: ${p.error}`);
  });
  return errs;
}

// A beat "has motion" when it declares anything the eye could plausibly be pulled by: a real camera, a layer-scope move, a parts entrance, or a recipe. A beat with none of those has nothing an `eye:` line would even describe.
export function hasEyeCandidateMotion(b) {
  return !!(b.camera || b.move || b.motion || b.recipe || (b.uses && b.uses.length));
}

// Curated on purpose, narrower than EYE_DEVICE_WORDS: a generic word like "motion" or "camera" appears in nearly every beat's mechanism and would fire on almost everything, so only these five unambiguous names are checked here.
export const EYE_NAMED_DEVICE_HINTS = [
  { re: /per-word|word-by-word|word.*colou?r|colou?r.*word/i, name: 'per-word colour' },
  { re: /\bcursor\b/i, name: 'cursor' },
  { re: /\bcaret\b/i, name: 'caret' },
  { re: /drawOn|\bdraws?\b|\bdrawn\b|\btraces?\b/i, name: 'a drawn line' },
];

/** declaredEyeDevices(b) -> the names of EYE_NAMED_DEVICE_HINTS this beat's own fields (mechanism,
 * recipe, move, motion, uses) actually mention. */
export function declaredEyeDevices(b) {
  const text = [b.mechanism, b.recipe, b.move, b.motion, ...(b.uses || [])].filter(Boolean).join(' ');
  return EYE_NAMED_DEVICE_HINTS.filter((h) => h.re.test(text)).map((h) => h.name);
}

/** eyeUntargetedDevices(b) -> the declared devices (above) this beat's own `eye:` line never mentions.
 * Empty when the beat names no such device, or its `eye:` line already covers everything it named. */
export function eyeUntargetedDevices(b) {
  const declared = declaredEyeDevices(b);
  if (!declared.length || !b.eye) return [];
  const p = parseEyeLine(b.eye, b);
  if (!p || p.error) return [];
  return declared.filter((name) => !EYE_NAMED_DEVICE_HINTS.find((h) => h.name === name).re.test(p.device));
}

// Multi-word phrases only, deliberately narrower than EYE_DEVICE_WORDS: a bare word like "travel" or "push" is an ordinary verb as often as it is a device, so only unambiguous named phrases count here.
export const EYE_DEVICE_PHRASES = ['per-word colour', 'per-word color', 'word-by-word', 'camera push',
  'camera dolly', 'camera pan', 'camera dive', 'camera travel', 'blur-to-sharp', 'colour flash',
  'color flash', 'cursor click', 'drawn line'];
const EYE_ORDER_WORDS = /\bthen\b|\bfirst\b|\bbefore\b|\bafter\b|\bfollowed by\b|\bwhile\b/i;

/** competingEyeDevices(device) -> the >=2 named phrases a beat's own `eye:` device text pulls toward
 * at once with no stated order between them, or `null` when there is at most one, or an order is
 * already stated (Material's one-focal-point-per-transition rule, engine-doctrine/MOTION-CRAFT.md). */
export function competingEyeDevices(device) {
  const dLower = String(device || '').toLowerCase();
  const hits = EYE_DEVICE_PHRASES.filter((p) => dLower.includes(p));
  return (hits.length >= 2 && !EYE_ORDER_WORDS.test(dLower)) ? hits : null;
}

// A boundary with no cut is a `flow-seam` recipe's job (recipes/README.md); shared with harness/live/beat-surfacer.mjs so the "no cut here" test and the "which recipe to suggest" pick have exactly one owner.
export const BOUNDARY_NO_CUT_RE = /\b(exits?|leaves?|arrives?|no cut|crossfades?)\b/i;

/** seamRecipeEntry() -> [name, def] for the first recipes/recipes.json entry whose kind is "seam", or null. */
export function seamRecipeEntry() {
  return Object.entries(RECIPES).find(([, r]) => r.kind === 'seam') || null;
}

// Every camera move in core/camera-moves/*.js resets x/y to an identity pose at its own `start` key (none accepts an arbitrary starting x/y), so two legs across a boundary with no cut to hide the reset would visibly snap mid-shot.
/** cameraContinuityErrors(beats) -> string[]: a camera: pairing across a boundary this film builds no cut for. */
export function cameraContinuityErrors(beats) {
  const errs = [];
  for (let i = 0; i < beats.length - 1; i++) {
    const next = beats[i + 1];
    if (!next.recipe) continue;   // a real cut lands here; a reset at a cut is normal editing grammar
    const cur = resolvedCamera(beats[i]);
    const nxt = resolvedCamera(next);
    if (cur && nxt) {
      const rp = parseRecipeLine(next.recipe);
      errs.push(`beat ${i + 1} (${beats[i].name}) and beat ${i + 2} (${next.name}) each declare camera:, `
        + `and beat ${i + 2}'s \`recipe: ${rp.name || next.recipe}\` means this film builds NO cut between `
        + `them (the recipe seam IS the boundary, a continuous flow-through). Every camera move here resets `
        + `to an identity pose at its own start (core/camera-moves/*.js), so two independent legs across a `
        + `cut-free boundary would visibly snap. Combine the two into one continuous journey instead `
        + `(hand-author \`cameraMove: [{"move":"multiPhase", "legs":[...]}]\`, core/camera-moves/multi-phase.js), `
        + `or move one beat's camera: to a boundary this film DOES cut at.`);
    }
  }
  return errs;
}

// post hoc is not propter hoc: a trigger that only says WHEN ("then", "3.2s", "the beat ends") is a sequence marker, not a cause, and does not earn a stagger.
export const TRIGGER_SEQUENCE = /^(then\b|next\b|and then\b|afterwards?\b|later\b|time passes|the (?:beat|shot|scene|cut|film) (?:begins|starts|ends|changes|moves on)|\d+(?:\.\d+)?\s*s\b)/i;
export const TRIGGER_EMPTY = /^(none|nothing|n\/?a|tbd|[-\u2013\u2014.\u00b7]+)$/i;

/** isCausedTrigger(raw) → true when a beat's `trigger:` names a real cause, not a sequence marker. */
export function isCausedTrigger(raw) {
  if (!raw) return false;
  const s = String(raw).trim();
  if (!s || TRIGGER_EMPTY.test(s)) return false;
  return !TRIGGER_SEQUENCE.test(s);
}

// Evidence, not a guess: higgsfield-recreation.json (engine-doctrine/MISTAKES.md's reference film) stages its three key events roughly 30ms and 150ms apart (3.07s, 3.10s, 3.25s); 0.05s sits at the small end of that range on purpose.
export const STAGE_S = 0.05;

/**
 * stagedSchedule(beats) → { caused, shiftedStart, shiftedEnd }, the ONE shifted timeline both
 * assemble.mjs (to BUILD the film) and storyboard-check.mjs (to CHECK it) read. A caused junction
 * (isCausedTrigger on that beat's `trigger:`) inserts STAGE_S of real time before it; every beat keeps
 * its full planned span, so nothing is carved out to make room. Two independent copies of "when does
 * beat i really start" is exactly the drift CLAUDE.md calls a fork, so this is the only place it is
 * computed; a film with no `trigger:` at all reproduces `beats[i].start/end` exactly (shift stays 0).
 */
export function stagedSchedule(beats) {
  const caused = beats.map((b, i) => i > 0 && isCausedTrigger(b.trigger));
  const shiftedStart = [], shiftedEnd = [];
  let shift = 0;
  beats.forEach((b, i) => {
    if (caused[i]) shift += STAGE_S;
    shiftedStart.push(+(b.start + shift).toFixed(3));
    shiftedEnd.push(+(b.end + shift).toFixed(3));
  });
  return { caused, shiftedStart, shiftedEnd };
}

// engine-doctrine/MISTAKES.md #610: three swept axes (entrance density, overlap, travel/duration) all failed to

const MOVE_SCALABLE = { x: 0, y: 0, scale: 1, rot: 0 };
const r3 = (v) => +Number(v).toFixed(3);

/** scaleMove(keys, factor) → keys with x/y/scale/rot pulled toward or away from identity by `factor`. */
function scaleMove(keys, factor) {
  if (factor === 1) return keys;
  return keys.map((k) => {
    const out = { ...k };
    for (const [prop, identity] of Object.entries(MOVE_SCALABLE)) {
      if (typeof out[prop] === 'number') out[prop] = r3(identity + (out[prop] - identity) * factor);
    }
    return out;
  });
}

/** moveKeys({shape,band}, dur) → the named shape's own keyframes, scaled by the band, spanning `dur`. */
export function moveKeys({ shape, band }, dur) {
  const factor = SPEED_BAND[band] / SPEED_BAND.professional;
  return scaleMove(SHAPES[shape]({ dur }), factor);
}

const PATH_BOX = { w: 500, h: 220 };

/** pathMotion({curve,band}, dur) → the `layers[].motionPath` object a scope-'path' `move:` entry builds. */
export function pathMotion({ curve, band }, dur) {
  const factor = SPEED_BAND[band] / SPEED_BAND.professional;
  const w = r3(PATH_BOX.w * factor), h = r3(PATH_BOX.h * factor);
  return { path: PATH_CURVES[curve](w, h), dur };
}

const TRANSITION_NAMES = [...new Set(TRANSITIONS.map((t) => t.name))];
const TIMING_NAMES = Object.keys(TIMINGS);
const TRANSITION_LINE_RE = /^fx\s*:\s*([A-Za-z][A-Za-z0-9-]*)\s*((?:\s+\w+\s*=\s*\S+)*)\s*$/i;
const TRANSITION_PARAM_RE = /(\w+)\s*=\s*(\S+)/g;
const TRANSITION_DIR_WORDS = ['left', 'right', 'up', 'down'];

const TRANSITION_MECH_NAMES = ['cut', 'seam', 'sting'];

/** parseTransitionIn(raw) → {fx,timing?,dur?,dir?,mech?} | null (prose, no decision stated) | {error}. */
export function parseTransitionIn(raw) {
  if (!raw) return null;
  const m = TRANSITION_LINE_RE.exec(String(raw).trim());
  if (!m) return null; // prose ("cut", "cut (blur)", "dissolve 0.5s", ...): documentary only, unbuilt
  const [, fx, paramsRaw] = m;
  try { boundaryMechanism(fx); } catch (e) {
    if (/^unknown transition fx/.test(e.message)) {
      const near = nearMisses(fx, TRANSITION_NAMES);
      return { error: `"${fx}" is not a known transition${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${TRANSITION_NAMES.join(', ')}` };
    }
    return { error: e.message };
  }
  const out = { fx };
  let pm; TRANSITION_PARAM_RE.lastIndex = 0;
  while ((pm = TRANSITION_PARAM_RE.exec(paramsRaw))) {
    const [, key, valRaw] = pm;
    if (!['timing', 'dur', 'dir', 'mech'].includes(key)) {
      return { error: `transition_in "${key}" is not a known param. Known: timing, dur, dir, mech.` };
    }
    if (key === 'timing') {
      if (!TIMING_NAMES.includes(valRaw)) {
        const near = nearMisses(valRaw, TIMING_NAMES);
        return { error: `transition_in timing "${valRaw}" is not a known cut timing${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${TIMING_NAMES.join(', ')}` };
      }
      out.timing = valRaw;
    } else if (key === 'dur') {
      const n = Number(valRaw);
      if (!Number.isFinite(n) || n <= 0) return { error: `transition_in dur "${valRaw}" is not a positive number of seconds.` };
      out.dur = n;
    } else if (key === 'dir') {
      const n = Number(valRaw);
      if (TRANSITION_DIR_WORDS.includes(valRaw)) out.dir = valRaw;
      else if (Number.isFinite(n)) out.dir = n;
      else return { error: `transition_in dir "${valRaw}" is not left|right|up|down or a number of degrees.` };
    } else if (key === 'mech') {
      if (!TRANSITION_MECH_NAMES.includes(valRaw)) {
        return { error: `transition_in mech "${valRaw}" is not one of ${TRANSITION_MECH_NAMES.join(', ')}.` };
      }
      try { boundaryMechanism(fx, valRaw); } catch (e) { return { error: e.message }; }
      out.mech = valRaw;
    }
  }
  return out;
}

/** transitionInErrors(beats) → string[] naming every beat (after the first) whose bare-word transition_in is not a real boundary fx. */
export function transitionInErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    if (i === 0) return;
    const p = parseTransitionIn(b.transition_in);
    if (p && p.error) errs.push(`beat ${i + 1} (${b.name}) transition_in: ${p.error}`);
  });
  return errs;
}

/** nearestTransitions(text, n) -> the n transitions whose name+family best answer `text`, via the SAME
 * ranker `make arsenal` uses. `TRANSITIONS` carries no prose blurb of its own (core/transitions/catalog.js
 * is an inventory, not a description layer), so the corpus is name+family+mechanism, thinner than a
 * real blurb but the same ranker, never a second one. */
export function nearestTransitions(text, n = 3) {
  const qt = toks(text);
  const seen = new Set();
  const uniq = TRANSITIONS.filter((t) => (seen.has(t.name) ? false : (seen.add(t.name), true)));
  return uniq
    .map((t) => ({ ...t, s: score({ name: t.name, kind: t.mechanism, blurb: `${t.family} transition` }, qt) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n);
}

/** transitionInWarnings(beats) → string[]: a beat (after the first) whose transition_in is prose that
 * resolves to nothing, reported rather than silently dropped, with the nearest named fx and, when the
 * prose itself describes a cut-free boundary, the `flow-seam` recipe line that already answers it
 * (the same push harness/live/beat-surfacer.mjs gives at save time, reused here rather than reinvented). */
export function transitionInWarnings(beats) {
  const warns = [];
  beats.forEach((b, i) => {
    if (i === 0 || !b.transition_in) return;
    const text = String(b.transition_in).trim();
    if (!text) return;
    if (parseTransitionIn(text)) return; // resolved fx: line, or its own error, already reported above
    const near = nearestTransitions(text, 3);
    const seam = seamRecipeEntry();
    let msg = `beat ${i + 1} (${b.name}) transition_in: "${text}" reads as documentary prose, not a `
      + `resolvable transition, so it never reaches the engine. Nearest named fx: `
      + `${near.map((n) => `${n.name} (${n.family}/${n.mechanism})`).join(' · ')}. `
      + `Write "transition_in: fx:<name> [timing=<name>] [dur=<s>] [dir=<left|right|up|down>]" to make it real.`;
    if (seam && BOUNDARY_NO_CUT_RE.test(text)) {
      const [name, r] = seam;
      msg += ` This also describes a boundary with no cut: recipes/README.md already measures that off `
        + `a real film, add \`recipe: ${name} out=<fill: outgoing layer id> in=<fill: incoming layer id> axis=x\`.`;
    }
    warns.push(msg);
  });
  return warns;
}

/** resolvedTransitionIn(b) → {fx,mech,timing?,dur?,dir?} | null. `b.transition_in` already validated by transitionInErrors. */
export function resolvedTransitionIn(b) {
  const p = parseTransitionIn(b.transition_in);
  if (!p || p.error) return null;
  const { fx, ...rest } = p;
  return { fx, mech: boundaryMechanism(fx), ...rest };
}

const RECIPE_TOKEN_RE = /(\w+)=(\[[^\]]*\]|\S+)/g;

/**
 * parseRecipeLine("flow-seam out=window in=tagline axis=x") →
 *   {name, def, slots, params, unknown, missingSlots} | {name, error}
 */
export function parseRecipeLine(raw) {
  const s = String(raw || '').trim();
  const m = /^(\S+)\s*(.*)$/.exec(s);
  if (!m) return { name: s, error: `recipe line "${raw}" has no recipe name` };
  const [, name, rest] = m;
  let def;
  try { def = pickRecipe(name); } catch (e) { return { name, error: e.message }; }
  const slots = {}, params = {}, unknown = [];
  for (const [, key, valRaw] of rest.matchAll(RECIPE_TOKEN_RE)) {
    const val = valRaw.startsWith('[') ? valRaw.slice(1, -1).split(',').map((v) => v.trim()).filter(Boolean) : valRaw;
    if (Object.hasOwn(def.slots, key)) slots[key] = val;
    else if (def.params && Object.hasOwn(def.params, key)) params[key] = val;
    else unknown.push(key);
  }
  const OPTIONAL_SLOT = /\?\s*$|\boptional\b/i;
  const missingSlots = Object.keys(def.slots)
    .filter((k) => k !== 'at' && !OPTIONAL_SLOT.test(String(def.slots[k])) && !Object.hasOwn(slots, k));
  return { name, def, slots, params, unknown, missingSlots };
}

/** recipeErrors(beats) → string[] naming every beat whose `recipe:` line names an unknown recipe, an
 * unknown slot/param, or leaves a required slot unfilled. */
export function recipeErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    if (!b.recipe) return;
    const p = parseRecipeLine(b.recipe);
    if (p.error) { errs.push(`beat ${i + 1} (${b.name}) recipe: ${p.error}`); return; }
    if (p.unknown.length) errs.push(`beat ${i + 1} (${b.name}) recipe "${p.name}" does not take ${p.unknown.join(', ')}. `
      + `Slots: ${Object.keys(p.def.slots).join(', ')}. Params: ${Object.keys(p.def.params || {}).join(', ') || '(none)'}.`);
    if (p.missingSlots.length) errs.push(`beat ${i + 1} (${b.name}) recipe "${p.name}" is missing slot(s): ${p.missingSlots.join(', ')}. recipes/README.md.`);
  });
  return errs;
}

/** isSeamRecipe(b) → true when this beat's `recipe:` line names a recipe of kind "seam"
 * (recipes/recipes.json), the same "a boundary with no cut" job seamRecipeEntry() already names. Used
 * as boundary COVERAGE by the transition procedure below: a `flow-seam`/`object-wipe`/`colour-wipe`
 * recipe IS the boundary, same as a real transitions[] entry would be. */
export function isSeamRecipe(b) {
  if (!b || !b.recipe) return false;
  const p = parseRecipeLine(b.recipe);
  return !!(p && p.def && p.def.kind === 'seam');
}

const TRANSITION_WHY_RE = /^\s*([a-z][a-z-]*)\s*·\s*([^·]+?)\s*·\s*(invisible|expressive)\s*$/i;

/** parseTransitionWhy(raw) → {relationship,feeling,mode} | {error} | null (nothing written). */
export function parseTransitionWhy(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = TRANSITION_WHY_RE.exec(s);
  if (!m) {
    return { error: `transition_why "${raw}" must read "<relationship> · <feeling> · <invisible|expressive>". `
      + `Relationships: ${RELATIONSHIP_KEYS.join(', ')}.` };
  }
  const [, relRaw, feeling, modeRaw] = m;
  const relationship = relRaw.toLowerCase();
  if (!RELATIONSHIP_KEYS.includes(relationship)) {
    const near = nearMisses(relationship, RELATIONSHIP_KEYS);
    return { error: `transition_why relationship "${relRaw}" is not one of ${RELATIONSHIP_KEYS.join(', ')}`
      + `${near.length ? `, did you mean "${near[0]}"?` : ''}.` };
  }
  return { relationship, feeling: feeling.trim(), mode: modeRaw.toLowerCase() };
}

/** transitionWhyErrors(beats) → string[]: every beat (after the first) whose `transition_why` is
 * written but does not parse (bad shape, or a relationship word the taxonomy does not name). */
export function transitionWhyErrors(beats) {
  const errs = [];
  beats.forEach((b, i) => {
    if (i === 0) return;
    const p = parseTransitionWhy(b.transition_why);
    if (p && p.error) errs.push(`beat ${i + 1} (${b.name}) transition_why: ${p.error}`);
  });
  return errs;
}

/** sameFragment(prev, b) → true when two consecutive beats explicitly name the identical `fragment:`
 * file, the convention assemble.mjs already reads to keep one shared component alive across a cut
 * instead of tearing it down and rebuilding it (parseFragmentSpec above). Beats 2-3-4-5 all pointing at
 * one terminal fragment is the same boundary, not three separate cuts each waiting on a transition. */
function sameFragment(prev, b) {
  const pf = parseFragmentSpec(prev.fragment).path;
  const bf = parseFragmentSpec(b.fragment).path;
  return !!pf && pf === bf;
}

/** isContinuousBoundary(prev, b) → true when the boundary is not a cut at all: the same fragment file
 * carries across it, a shared element (`becomes:`) crosses it, or a camera `travel` move spans it
 * (core/transitions/relationships.js DEVICES: "camera travel"/"shared-element morph"). A continuous
 * boundary needs no transition and is never `boundary-uncovered`; `make study-tool X=transitions D=` reports it as
 * "continuous (same surface)" via the same check, so the gate and the report can't disagree. */
export function isContinuousBoundary(prev, b) {
  if (sameFragment(prev, b)) return true;
  if (b.becomes || prev.becomes) return true;
  const camB = resolvedCamera(b);
  const camPrev = resolvedCamera(prev);
  if ((camB && camB.move === 'travel') || (camPrev && camPrev.move === 'travel')) return true;
  return false;
}

/** boundaryCovered(prev, b) → true when the boundary INTO `b` (from `prev`) is covered by something
 * other than silence: a `transition_in` line (resolved or not, prose still counts as a decision made),
 * a seam recipe, or a continuous boundary (isContinuousBoundary above). */
function boundaryCovered(prev, b) {
  if (b.transition_in) return true;
  if (isSeamRecipe(b) || isSeamRecipe(prev)) return true;
  return isContinuousBoundary(prev, b);
}

/** transitionFindings(beats) → { unreasoned, uncovered, mismatch }, each a string[], the three
 * report-only findings storyboard-check.mjs routes to `transition-unreasoned` / `boundary-uncovered` /
 * `transition-reason-mismatch`. One function, three arrays, so the per-boundary loop runs once. */
export function transitionFindings(beats) {
  const unreasoned = [], uncovered = [], mismatch = [];
  beats.forEach((b, i) => {
    if (i === 0) return;
    const prev = beats[i - 1];
    const hasSeam = isSeamRecipe(b) || isSeamRecipe(prev);
    const why = parseTransitionWhy(b.transition_why);
    if ((b.transition_in || hasSeam) && !why) {
      unreasoned.push(`beat ${i + 1} (${b.name}) has a transition_in or recipe seam into it but no `
        + `transition_why. Answer the procedure: relationship, feeling, invisible or expressive `
        + '(engine-doctrine/CRAFT/TRANSITIONS.md#the-decision-procedure-the-algorithm-to-run-at-every-seam).');
    }
    if (!boundaryCovered(prev, b)) {
      const guess = nearestTransitions(`${prev.name} ${b.name}`, 3).map((t) => t.name).join(', ');
      uncovered.push(`beat ${i} (${prev.name}) -> beat ${i + 1} (${b.name}) has no transition_in, no `
        + `recipe seam, and no declared camera travel or shared element (becomes:) across it. Name the `
        + `relationship (${RELATIONSHIP_KEYS.join(', ')}) and pick a transition: nearest by name ${guess}.`);
    }
    if (why && !why.error && b.transition_in) {
      const resolved = resolvedTransitionIn(b);
      const candidates = candidatesFor(why.relationship) || [];
      if (resolved && !candidates.includes(resolved.fx)) {
        mismatch.push(`beat ${i + 1} (${b.name}) transition_why relationship "${why.relationship}" names `
          + `${candidates.join(', ')}, not "${resolved.fx}". Either the relationship or the fx is wrong.`);
      }
    }
  });
  return { unreasoned, uncovered, mismatch };
}

// `use:` is the general door onto the arsenal's 790-entry corpus (harness/author/arsenal.mjs collect()). NO SECOND MECHANISM: a kind that already has a dedicated field reaches the engine there, and `use:` refuses it rather than becoming a second spelling of the same decision.
export const USE_DEDICATED_FIELD = {
  'camera move': 'camera:', 'camera word': 'camera:',
  cut: 'transition_in:', 'seam fx': 'transition_in:', 'sting fx': 'transition_in:', 'cut timing': 'transition_in:',
  'move shape': 'move:', 'path curve': 'move:',
  idle: 'move: hold:<idle>',
  'part entrance': 'motion:',
  recipe: 'recipe:',
  'background preset': 'ground:', 'kinetic preset': 'kinetic:', 'layer type': 'elements:',
};

// INTERNAL: engine machinery an author never names from a storyboard, each refused naming the doc or field that actually sets it (a generator, a keyframe handle, a derived value, or a slot owned by a different file entirely).
export const USE_INTERNAL_KIND = {
  generator: 'a lightfield generator is chosen by the field\'s own config (core/generators/generators.js), never named per beat.',
  'envelope shape': 'an envelope shape is an internal keyframe-shaping detail (envelope.kind), not authored from a storyboard.',
  'envelope anchor': 'an envelope anchor is an internal keyframe-shaping detail (envelope.anchor), not authored from a storyboard.',
  'field motion': 'field motion is a lightfield internal (motion.kind), not authored per beat.',
  'lightfield pattern': 'a lightfield pattern is set inside the lightfield\'s own config (pattern.kind), not from a storyboard.',
  'shadow direction': 'a shadow direction is computed from the layer\'s own light (shadow.direction), not authored.',
  'effector drive': 'an effector drive is an internal particle-system detail (effector.drives), not authored per beat.',
  'effector falloff': 'an effector falloff is an internal particle-system detail (effector.falloff), not authored per beat.',
  'keyframe handle': 'a keyframe handle is an internal easing-curve detail (easeOut), not authored per beat.',
  'interpolation mode': 'interpolation mode is an internal path-easing detail, not authored per beat.',
  'scramble charset': 'a scramble charset is an internal text-fx detail (presetOpts.chars), not authored per beat.',
  'theme look key': 'a theme look key belongs to the theme file (themes/*.json), never a per-beat use:.',
  'ransom face': 'a ransom face is a text layer\'s own `ransom.faces`, a LIST of {family, weight} records, not a single name a use: line can write.',
  'surface look': 'a surface look is set once for the whole theme (look.surface in themes/*.json), read by composeLook/cardChrome; not a per-beat use:.',
};

let _arsenalCorpus = null;
/** arsenalCorpus() -> Promise<entry[]>, the collect() corpus, cached for the process: a gate run
 * resolves every beat's `use:` line against one import pass of the arsenal, not one per line. */
export function arsenalCorpus() { return _arsenalCorpus || (_arsenalCorpus = arsenalCollect()); }

const USE_PARAM_RE = /([\w.]+)\s*=\s*(\S+)/g;

/** parseUseLine(raw) -> {kindHint, name, on, params} | {error} */
export function parseUseLine(raw) {
  const s = String(raw || '').trim();
  if (!s) return { error: 'use: line is empty. Syntax: "use: <name> [on=<layer id>] [key=value …]" or "use: <kind>:<name> …" when a name exists in more than one kind.' };
  const firstParam = s.search(/(?:^|\s)[\w.]+\s*=/);
  const head = (firstParam >= 0 ? s.slice(0, firstParam) : s).trim();
  const paramsRaw = firstParam >= 0 ? s.slice(firstParam) : '';
  if (!head) return { error: `"${s}" names nothing to use. Syntax: "use: <name> [on=<layer id>] [key=value …]".` };
  const colon = head.indexOf(':');
  const kindHint = colon > 0 ? head.slice(0, colon).trim().toLowerCase() : null;
  const name = (colon > 0 ? head.slice(colon + 1) : head).trim();
  if (!name) return { error: `"${s}" names a kind ("${kindHint}") but no name after the colon.` };
  const params = {};
  let pm; USE_PARAM_RE.lastIndex = 0;
  while ((pm = USE_PARAM_RE.exec(paramsRaw))) {
    const [, key, valRaw] = pm;
    params[key] = /^-?[\d.]+$/.test(valRaw) ? +valRaw : valRaw;
  }
  const on = params.on; delete params.on;
  return { kindHint, name, on: on || null, params };
}

/**
 * resolveUse(p, corpus) -> one of:
 *   {entry}                          exact name (or aka), in exactly one kind
 *   {entry, refusedField}            that kind already has a dedicated field (USE_DEDICATED_FIELD)
 *   {entry, refusedInternal}         that kind is engine-internal (USE_INTERNAL_KIND)
 *   {ambiguous: ['kind:name', …]}    the bare name exists in more than one kind
 *   {prose: true, text}              not decisive: free text, reported as a warning, never dropped
 *   {error}                          a decisive-looking token that names nothing real, or a bad kind:
 */
export function resolveUse(p, corpus) {
  if (p.error) return p;
  const nameLc = p.name.toLowerCase();
  const matches = corpus.filter((e) => {
    if (p.kindHint && e.kind.toLowerCase() !== p.kindHint) return false;
    return e.name.toLowerCase() === nameLc || (e.aka || []).some((a) => String(a).toLowerCase() === nameLc);
  });
  if (p.kindHint) {
    const kindsKnown = [...new Set(corpus.map((e) => e.kind))];
    if (!kindsKnown.includes(p.kindHint)) {
      const near = nearMisses(p.kindHint, kindsKnown);
      return { error: `use: "${p.kindHint}" is not a known kind${near.length ? `, did you mean "${near[0]}"?` : ''}. Known kinds: ${kindsKnown.join(', ')}.` };
    }
  }
  // A kindHint already narrowed matches to one kind, so it stands as given. A bare name hides
  // engine-internal kinds from the ambiguity count first: an author choosing between "neon" the
  // grading look and "neon" the theme's surface look was never a real choice, since the surface one
  // is never reachable from a beat at all (USE_INTERNAL_KIND). Falls back to the full match list when
  // every match is internal, so that case still gets a real answer (a match, or its own refusal).
  const visible = p.kindHint ? matches : matches.filter((e) => !USE_INTERNAL_KIND[e.kind]);
  const effective = visible.length ? visible : matches;
  if (effective.length > 1) return { ambiguous: effective.map((e) => `${e.kind}:${e.name}`) };
  if (effective.length === 1) {
    const entry = effective[0];
    if (USE_DEDICATED_FIELD[entry.kind]) return { entry, refusedField: USE_DEDICATED_FIELD[entry.kind] };
    if (USE_INTERNAL_KIND[entry.kind]) return { entry, refusedInternal: USE_INTERNAL_KIND[entry.kind] };
    return { entry };
  }
  const decisive = /^[a-z][a-z0-9-]*$/i.test(p.name);
  if (!decisive) return { prose: true, text: p.name };
  const near = nearMisses(p.name, corpus.map((e) => e.name));
  return { error: `use: "${p.name}" is not a known name${near.length ? `, did you mean "${near[0]}"?` : ''}. Run \`make arsenal Q="${p.name}"\` to search.` };
}

/** useErrors(beats, corpus) -> string[]: every beat's `use:` line that is ambiguous, refused (a
 * dedicated field or an internal kind), or a decisive-but-unknown name. */
export function useErrors(beats, corpus) {
  const errs = [];
  beats.forEach((b, i) => {
    for (const raw of b.uses || []) {
      const p = parseUseLine(raw);
      const r = resolveUse(p, corpus);
      if (r.error) { errs.push(`beat ${i + 1} (${b.name}) use: ${r.error}`); continue; }
      if (r.ambiguous) { errs.push(`beat ${i + 1} (${b.name}) use: "${p.name}" names more than one kind: ${r.ambiguous.join(', ')}. Write "use: <kind>:<name>" to pick one.`); continue; }
      if (r.refusedField) { errs.push(`beat ${i + 1} (${b.name}) use: "${p.name}" (${r.entry.kind}) already has a dedicated field: write "${r.refusedField}" instead of use:.`); continue; }
      if (r.refusedInternal) errs.push(`beat ${i + 1} (${b.name}) use: "${p.name}" is not authored from a storyboard: ${r.refusedInternal}`);
    }
  });
  return errs;
}

/** useWarnings(beats, corpus) -> string[]: a `use:` line that reads as free prose, with the 3
 * best-ranked entries it might have meant, via the SAME ranker `make arsenal` uses (score/toks), never
 * a second one. */
export function useWarnings(beats, corpus) {
  const warns = [];
  beats.forEach((b, i) => {
    for (const raw of b.uses || []) {
      const p = parseUseLine(raw);
      if (p.error) continue;
      const r = resolveUse(p, corpus);
      if (!r.prose) continue;
      const qt = toks(r.text);
      const ranked = corpus.map((e) => ({ e, s: score(e, qt) })).filter((x) => x.s > 0)
        .sort((a, z) => z.s - a.s).slice(0, 3);
      const near = ranked.map(({ e }) => `${e.name} (${e.kind}: ${e.blurb})`).join(' · ') || '(nothing clearly matches)';
      const lines = ranked.map(({ e }) => `use: ${e.kind}:${e.name}`).join(' · ');
      warns.push(`beat ${i + 1} (${b.name}) use: "${r.text}" reads as free prose, not a resolvable name, so it never `
        + `reaches the engine. Nearest: ${near}.${lines ? ` Try: ${lines}.` : ''}`);
    }
  });
  return warns;
}

/** resolvedUses(b, corpus) -> [{entry, on, params}], the beat's `use:` lines that resolve cleanly
 * (already validated by useErrors: a caller reads only the clean resolutions). */
export function resolvedUses(b, corpus) {
  const out = [];
  for (const raw of b.uses || []) {
    const p = parseUseLine(raw);
    if (p.error) continue;
    const r = resolveUse(p, corpus);
    if (r.entry && !r.refusedField && !r.refusedInternal) out.push({ entry: r.entry, on: p.on, params: p.params });
  }
  return out;
}

/** useSlotPath(entry) -> the pasteOf() skeleton for this entry's slot, or null when the slot is prose
 * or has a segment that is not a plain field name (e.g. "per-frame", "svgIcon()"): assemble.mjs's slot
 * writer refuses those rather than guessing a path, reusing pasteOf (harness/author/arsenal.mjs) rather
 * than a second slot parser. */
export function useSlotPath(entry) {
  const obj = pasteOf(entry);
  if (!obj) return null;
  const flat = JSON.stringify(obj);
  const segs = (entry.slot || '').replace(/\[\]|\{\}/g, '').replace(/\(.*\)/, '').split('.');
  if (segs.some((s) => s && !/^[A-Za-z_$][\w$]*$/.test(s))) return null;
  return flat ? obj : null;
}
