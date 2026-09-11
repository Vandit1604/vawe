// contract.mjs: THE PER-BEAT CONTRACT for a fan-out of per-scene HTML-fragment agents.
//
// It is NOT a second planning artefact. It reads the SAME storyboard `make scaffold` already writes
// (harness/author/storyboard-parse.mjs), off two fields scaffold now also emits per beat:
//   object_in:  "<placement>@<w>x<h>[/rot:<deg>][/op:<0-1>][/radius:<px>]"   the object's POSE at beat START
//   object_out: "<placement>@<w>x<h>[/rot:<deg>][/op:<0-1>][/radius:<px>]"   its POSE at beat END
// `<placement>` is a name from the safe-area PLACEMENT registry (core/layout/safe.js), never a raw
// pixel: an author writes "bottom-left@120x40", not "x:65,y:975", so the contract is aspect-portable
// the same way `pin` already is. `<w>x<h>` is the object's size in px at that edge; `/rot:` and `/op:`
// are optional trailing pose fields, degrees and an opacity multiplier, both omittable (default 0/1),
// and `/radius:` is the corner in px, omittable with no default at all: unstated means the layer
// keeps its authored corner. Those three together are what turns a rectangle into a pill and then a
// circle, which is the one shape change a continuous object could not previously express.
//
// WHY A NAME AND NOT A PIXEL: three scene agents each write a fragment against ONE film, and the only
// thing that keeps their three beautiful, independently-authored fragments from being three unrelated
// pictures is that the object handing off between them lands in the SAME place. A placement name is
// something a person reviewing the contract can actually check ("bottom-left, that's the same corner");
// a pixel pair is not. `rot`/`op` stay raw numbers for the same reason `w`/`h` already are: a degree or
// an opacity fraction is something a reviewer can sanity-check by eye, unlike a bezier or a matrix.
//
// A POSE, NOT ONLY A POSITION. `formats/scene/higgsfield-recreation.json`, the film this repo holds up
// as its best, has an object that holds a constant bbox AREA while it travels (measured ~800px² at both
// x=170 and x=98, which is exactly what w/h already encode), spins into its fastest frame and rights
// itself on landing (rot), and fades its label out as it goes (opacity). Before this, `w`/`h` were
// parsed and then THROWN AWAY by assemble.mjs (only x/y made it into the built motion track), so this
// contract could say a size and never keep the promise. `rot`/`op` are new; `w`/`h` were always here,
// they just were not honoured. All four are properties `layers[].motion[]` can already key
// (formats/scene/schema.json: x, y, w, h, rot, opacity), so this is a REACH problem, not a capability
// one: assemble.mjs now builds them (see there), no core/** change is needed or made.
//
// WHAT THIS STILL CANNOT SAY: a shape morph (rectangle -> pill -> circle) needs a keyable corner
// `radius`, which `layers[].motion[]` does not have today; getting there is a core/** change, out of
// scope for this file. `morph` (character/path melt), `becomes` (hand off to a DIFFERENT layer id) and
// `lag` (follow-through overrun, Dan Ebberts) stay reachable the way they already are, hand-authored on
// a layer directly, because each names a mechanism between DIFFERENT layers or shapes and folding all
// three into a single per-beat edge would be a second, parallel way to say what a layer's own `becomes`/
// `modifiers[].lag`/`follow` fields already say once, which is the drift CLAUDE.md calls a fork, not a fix.
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
// score/toks: the SAME word-overlap ranker `make arsenal` uses (harness/author/arsenal.mjs), reused
// rather than reimplemented so "nearest 3" here and "nearest 3" there can never rank a query
// differently. Pure and sync (no registry discovery), safe to import from a gate.
import { score, toks, collect as arsenalCollect, pasteOf } from '../author/arsenal.mjs';

const EDGE_RE = /^\s*([a-z][a-z0-9-]*)\s*@\s*(\d+)\s*x\s*(\d+)\s*((?:\/[a-z]+\s*[:=]\s*-?[\d.]+\s*)*)$/i;
const POSE_TOKEN_RE = /\/([a-z]+)\s*[:=]\s*(-?[\d.]+)/gi;
// `radius` joins as a TOKEN rather than a third positional segment, because the token grammar already
// generalises and a fourth number in `@120x40x11` reads as a typo. Its default is undefined, not 0:
// an edge that says nothing about radius must leave the layer's authored corner alone, which is the
// same identity `radius` carries in core/timeline/sequence.js's POSE table.
const POSE_FIELDS = { rot: 'rot', op: 'opacity', r: 'radius', radius: 'radius' };

/** parseEdge("bottom-left@120x40/rot:15/op:0.4") → {placement,w,h,rot,opacity} | null (null = no opinion) */
export function parseEdge(raw) {
  if (raw == null) return null;
  // storyboard-parse.mjs's generic fieldIn() does not strip quotes (only frontmatter's field() does),
  // so a beat line written `- object_in: "bottom-left@120x40"` arrives with the quotes still attached.
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s || /^<fill:/i.test(s) || /^REPLACE/i.test(s)) return null; // scaffold's own unfilled markers
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

// ── THE FRAGMENT LINE: which file backs a beat, and where it sits ──────────────────────────────────
//
// `fragment:` on a beat is OPTIONAL and answers two questions assemble.mjs otherwise answers by
// convention alone: which HTML file backs this beat (default `<base>.scene<N>.html`) and where in the
// canvas it sits (default full-bleed, x:0 y:0 w:canvasW h:canvasH). Two forms, either half omittable:
//   fragment: _together.card.html @ center@900x520     file AND placement
//   fragment: _together.card.html                       file only, still full-bleed
//   fragment: @ center@900x520                          placement only, default file
// The placement clause reuses parseEdge above: the SAME "<placement>@<w>x<h>" grammar object_in/
// object_out already speak, never a second copy of the keyword math. Two CONSECUTIVE beats naming the
// SAME file is how assemble.mjs keeps one shared component alive across a cut instead of tearing it
// down and rebuilding it (docs/CRAFT/STORYBOARD-TEMPLATE.md).
const FRAGMENT_SEP_RE = /^(?:(.+?)\s+)?@\s*(.+)$/;

// `fragment: none` (optionally `, <reason>`) is the one spelling every reader of `fragment:` accepts
// for "this beat has no fragment file": a beat built from native layers alone (an image + text pair,
// a solid card), never a pretend filename standing in for "nothing to author here". One convention,
// taught to the one parser, so stage/storyboard-check/frame-check never each invent their own guess
// at what "no fragment" looks like (docs/CRAFT/STORYBOARD-TEMPLATE.md).
const FRAGMENT_NONE_RE = /^none\b/i;

/** parseFragmentSpec("_together.card.html @ center@900x520") → {path, edge, none}. path/edge are null
 * when unstated; edge carries {error} the same way parseEdge does; none is true for "fragment: none". */
export function parseFragmentSpec(raw) {
  if (raw == null) return { path: null, edge: null, none: false };
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s) return { path: null, edge: null, none: false };
  if (FRAGMENT_NONE_RE.test(s)) return { path: null, edge: null, none: true };
  // A trailing "(a note)" is a remark, not part of the path or the placement clause: strip it once,
  // here, rather than in every caller that used to re-derive the same split.
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

// ── THE MOVE: one grammar, three scopes, read from the ENTRY, not the field name ────────────────────
//
// Three fields used to compete for one job, split by DURATION instead of by what the author was
// actually deciding: `motion:` always built a `parts[]` entrance, `move:` always built a track on the
// beat's own layer, and `rest:` (what should keep a hold alive) was parsed by storyboard-parse.mjs and
// built by nobody. 19 storyboards write `rest:` and none of it ever reached a render.
//
// SCOPE is the real axis, and an entry already says which one it means without a field name's help:
//   `<selector>@<kind>:<band>[/<outBand>]`   an `@` names a CSS selector INTO THE FRAGMENT: scope PART,
//                                             a `parts[]` entrance on that one element (core/motion/parts.js)
//   `hold:<idle>`                            scope HOLD, the beat's own layer keeps living through the
//                                             hold: `idle: "<idle>"` (core/engine/idle.js), never a
//                                             second idle mechanism
//   `<shape>:<band>`                         anything else: scope LAYER, a hand-keyed track on the
//                                             beat's own layer, spanning the whole beat
// (band, above, is one of the four named speed bands in this repo's doctrine: energy · professional ·
// gravity · cinematic, docs/RULES/speed-bands.md.)
//
// ONE PARSER for all three, `parseMoveEntry` below, because the PART form is not new grammar: it is the
// exact string `motion:` always accepted (`<selector>@<kind>:<band>`), so `motion:` and `move:` writing
// a part-scope entry are the same sentence, not two. `parseMotionEntry`/`parseMotion` are now aliases of
// `parseMoveEntry`/`parseMoveEntries` (a `motion:` entry always contains `@`, so it is always scope
// PART), kept under their old names because `motion:` stays a legal field: see the compat note below
// `moveErrors`.
//
// `rest:` IS NOT MIGRATED, on purpose. Its 100+ existing lines are free-text narration ("the arm never
// stops, it's a metronome"; "the depth rule keeps falling"), almost all describing motion a fragment or
// a `move:`/`motion:` entry ALREADY builds, not an ambient idle. Auto-converting prose into `hold:`
// directives would be a guess wearing a migration's clothes, and a wrong guess here changes a render
// ("no rendered film may change" is the one invariant this whole change is not allowed to cost). So
// `rest:` keeps parsing exactly as before (storyboard-parse.mjs), stays documentary and unbuilt, and any
// of its 19 storyboards can adopt the one line that now actually reaches the engine, `move: hold:<idle>`,
// by hand, when an author decides that beat's hold should really breathe or drift.
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
  // A curve name (arc/dip/wave/ramp, the same catalog core/fx/along-path.js sets a caption's TYPE on)
  // is the same "<word>:<band>" sentence as a move shape, resolved against a second registry: it flies
  // the whole LAYER along the curve (MotionPathPlugin, formats/scene/scene.js `L.motionPath`) instead
  // of keying x/y/scale, so it is scope PATH, not LAYER, but it costs no new syntax to say.
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

// COMPAT: `motion:` is still a legal field (40 shipped films write it), and it needs no wrapper because
// every `motion:` entry names a selector, so it is always scope PART already: the alias is exact, not
// approximate.
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

// ── THE CAMERA: `camera:` names a move, reached the same way `move:`/`transition_in:` are ────────────
//
// Measured (see AGENTS.md's build brief): the core has 14 named camera moves plus a 14-phrase "camera
// word" registry (core/registry/vocab.js CAMERA_WORDS, "push in" -> slowPush), and across 42 authored
// films, ZERO use a named move: 13 hand-key `camera[]` and the rest say nothing at all. `camera:` on a
// beat was already parsed (storyboard-parse.mjs) and read by NOTHING: a storyboard could describe the
// exact shot the engine already has a name for and the film would render with no camera at all.
//
// SYNTAX: `<move> [key=value ...]`, the same "name first, params after" shape `parseRecipeLine` already
// uses. `<move>` is either a real cameraMove name (core/camera-moves/index.js CAMERA_MOVE_NAMES) or a
// shot phrase from the SAME `camera word` registry `make arsenal` already searches (resolveCameraMove);
// there is deliberately no second phrase table here. Params are read straight off the resolved move's
// own function signature (cameraMoveParams, core/camera-moves/index.js), never a hand-kept list, so a
// move that gains a param is valid here the day it lands there.
//
// DECISIVE vs PROSE, the same test `transition_in:` uses one field down: a single token (or an exact
// camera-word phrase) is an ATTEMPT at the grammar and a wrong one is an ERROR naming the near misses.
// Anything else -- a sentence, "the camera pushes in slowly on the card" -- is read as what `camera:`
// has always been, documentary prose, and is reported as a WARNING (never silently dropped) naming the
// 3 nearest named moves by the SAME ranker `make arsenal` uses (harness/author/arsenal.mjs score/toks),
// so a warning that cannot resolve a decision at least narrows the search.
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

// ── THE CAMERA HOLDS ITS END POSE (OWNER'S DECISION, skills/vawe-camera/SKILL.md): every camera move keeps
// its last keyframe until a LATER move changes it (core/timeline/sequence.js cameraAt holds the final
// key; core/engine/produce.js bakeCameraMove never closes a leg). The engine keeps rendering that; this
// is a report-only warning so a beat planned for the normal/rest framing is not silently shot pushed in.
//
// A REAL END POSE, not a second arithmetic: resolved through buildCameraMove, the same builder
// bakeCameraMove calls at render time, so a move's actual endpoint (including the `ease`/leg math each
// core/camera-moves/*.js file owns) is read once and never re-derived here.
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

// `window-dolly` (recipes/recipes.json, kind "camera") is the one non-hand-authored path onto the
// camera: a diveIn-shaped push toward a named layer's box. Its target position is not known at plan
// time (it depends on the target layer's real box), but a dolly-in NEVER ends at rest by construction
// (`zoomTo` defaults to 1.3, and the recipe's whole point is "tightening the frame"), so the scale
// alone already answers the only question this file asks: is the camera away from rest.
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

// A beat "plans a normal camera" when the plan itself reads as the rest/full-frame composition, by any
// ONE of four independent signals docs/CRAFT/STORYBOARD-TEMPLATE.md already gives a beat to state this
// in. Kept as named, separately-testable regexes rather than one clever combined rule, per CLAUDE.md's
// "fewer, clearer rules" - each is a fact about the plan's own words, not an inference about intent.
const NORMAL_SHOT_RE = /\b(wide|full|establishing|rest|normal)\b/i;
const NORMAL_EYE_START_RE = /\b(whole|full)\s+(frame|window|screen|app|composition)\b/i;
// `picture:`/`onscreen:` prose read for a full-frame composition, and ONLY when the beat names no
// camera/shot of its own: with either present, those are the decisive signal and prose is not asked
// to guess past them.
const NORMAL_PICTURE_RE = /\bfull(?:[\s-])?(?:frame|screen)\b|\bfills?\s+the\s+frame\b|\bwhole\s+(?:app|window|screen|frame)\b/i;
// A "full frame" object_in: centred and covering most of a standard canvas, regardless of which of the
// five aspect ratios (docs/AGENTS.md) is in play - 1,400,000px^2 clears every one of them (smallest is
// 1080x1080 = 1,166,400) while still excluding a merely large card or panel.
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
    // Judged against the pose the camera carries ENTERING this beat, i.e. whatever an EARLIER beat left
    // it at: this beat's own camera: line (a push starting from rest and ending pushed, say, over an
    // establishing shot) is this beat's own decision, not an inherited defect, so it must not be graded
    // against its own not-yet-applied end pose.
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

// ── THE EYE: every device points somewhere, and the plan has to say where ──────────────────────────
//
// The owner's own framing: per-word colour is not decoration, it directs the eye onto the key word,
// and the same is true of a camera push, a cursor, contrast, size, a blur-to-sharp focus pull. `eye:`
// on a beat is the line that names the journey: "<where it starts> -> <what pulls it, naming the
// device> -> <where it lands>", e.g. "eye: terminal title -> cursor travels and the caret blinks ->
// the prompt bar". For a beat whose device is a word-by-word reveal, the start/land are the WORDS
// themselves: "eye: \"make\" -> per-word cobalt flash walks the phrase -> \"launch film\"".
//
// THE DEVICE MUST BE REAL, the same test every other field on this file already applies to a bare
// decisive token: it either names one of the words below (a device this repo actually has a mechanism
// for) or overlaps a capability the beat ALREADY declares in camera:/move:/motion:/use:/recipe: (the
// SAME word-overlap ranker `make arsenal` uses, score/toks, never a second ranker). A device invented
// with no mechanism behind it is a promise the film cannot keep.
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

// A beat "has motion" when it declares anything the eye could plausibly be pulled by: a real camera,
// a layer-scope move, a parts entrance, or a recipe (window-dolly/flow-seam and friends are all
// motion). A beat with none of those has nothing an `eye:` line would even describe.
export function hasEyeCandidateMotion(b) {
  return !!(b.camera || b.move || b.motion || b.recipe || (b.uses && b.uses.length));
}

// Curated on purpose, narrower than EYE_DEVICE_WORDS above: these are the devices this repo can name
// in a beat's OWN prose (mechanism:/recipe:/motion:/move:/uses) with little ambiguity. A generic word
// like "motion" or "camera" appears in nearly every beat's mechanism and would make this check fire on
// almost everything; these five do not, so a match here is a real, specific device declared and never
// pointed anywhere.
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

// Multi-word phrases only, deliberately narrower than EYE_DEVICE_WORDS: a bare word like "travel" or
// "push" is an ordinary verb as often as it is a device ("the cursor travels" names ONE device, the
// cursor, not two), so counting single-word hits produced false "competing" findings on prose that was
// naming one thing twice. A named PHRASE is unambiguous.
export const EYE_DEVICE_PHRASES = ['per-word colour', 'per-word color', 'word-by-word', 'camera push',
  'camera dolly', 'camera pan', 'camera dive', 'camera travel', 'blur-to-sharp', 'colour flash',
  'color flash', 'cursor click', 'drawn line'];
const EYE_ORDER_WORDS = /\bthen\b|\bfirst\b|\bbefore\b|\bafter\b|\bfollowed by\b|\bwhile\b/i;

/** competingEyeDevices(device) -> the >=2 named phrases a beat's own `eye:` device text pulls toward
 * at once with no stated order between them, or `null` when there is at most one, or an order is
 * already stated (Material's one-focal-point-per-transition rule, docs/MOTION-CRAFT.md). */
export function competingEyeDevices(device) {
  const dLower = String(device || '').toLowerCase();
  const hits = EYE_DEVICE_PHRASES.filter((p) => dLower.includes(p));
  return (hits.length >= 2 && !EYE_ORDER_WORDS.test(dLower)) ? hits : null;
}

// A boundary description with no cut is a `flow-seam` recipe's job (recipes/README.md), and an author
// has no reason to know one exists unless it is named. Shared with harness/live/beat-surfacer.mjs (the
// same push, at storyboard-save time) so the "no cut here" test and the "which recipe to suggest" pick
// have exactly one owner between the two call sites.
export const BOUNDARY_NO_CUT_RE = /\b(exits?|leaves?|arrives?|no cut|crossfades?)\b/i;

/** seamRecipeEntry() -> [name, def] for the first recipes/recipes.json entry whose kind is "seam", or null. */
export function seamRecipeEntry() {
  return Object.entries(RECIPES).find(([, r]) => r.kind === 'seam') || null;
}

// A boundary whose ARRIVING beat carries `recipe:` gets no default cut from assemble.mjs (the recipe
// seam IS the boundary, measured off real films with zero `transitions[]` entries and every joint a
// recipe: madera, vawe-flow). So a camera leg ending on one side of that boundary and a second leg
// starting on the other are NOT separated by a real edit the way every other junction here is. Every
// camera move in core/camera-moves/*.js resets x/y to an identity pose at its own `start` key (read
// each file: slowPush/diveIn/orbit/panFollow/truck/workspaceZoomOut/punchIn/cameraShake/driftHold all
// open `{x:0, y:0, ...}`; none accepts an arbitrary starting x/y), so two independent legs across a
// seam with no cut to hide the reset would visibly SNAP mid-shot, the exact defect a real cut already
// masks everywhere else in this film. Refused rather than silently built wrong.
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

// ── STAGING: a documented cause becomes a mechanical stagger ────────────────────────────────────────
//
// `trigger:` on a beat (docs/CRAFT/STORYBOARD-TEMPLATE.md, graded by storyboard-check.mjs) already
// answers WHAT MADE THIS BEAT HAPPEN. storyboard-check reports "N/M junctions caused" and then throws
// that answer away: nobody stages, because staging means inventing an id and typing arithmetic.
// isCausedTrigger is the ONE test for "this junction names a real cause", shared verbatim with
// storyboard-check.mjs (previously two copies of the same two regexes) so the count that gate reports
// and the stagger assemble.mjs builds can never drift apart.
//
// post hoc is not propter hoc: a trigger that only says WHEN ("then", "3.2s", "the beat ends") is a
// sequence, and a slideshow already has one of those; it does not earn a stagger.
export const TRIGGER_SEQUENCE = /^(then\b|next\b|and then\b|afterwards?\b|later\b|time passes|the (?:beat|shot|scene|cut|film) (?:begins|starts|ends|changes|moves on)|\d+(?:\.\d+)?\s*s\b)/i;
export const TRIGGER_EMPTY = /^(none|nothing|n\/?a|tbd|[-\u2013\u2014.\u00b7]+)$/i;

/** isCausedTrigger(raw) → true when a beat's `trigger:` names a real cause, not a sequence marker. */
export function isCausedTrigger(raw) {
  if (!raw) return false;
  const s = String(raw).trim();
  if (!s || TRIGGER_EMPTY.test(s)) return false;
  return !TRIGGER_SEQUENCE.test(s);
}

// STAGE_S: the causal stagger assemble.mjs offsets a caused beat's start by. Evidence, not a guess:
// higgsfield-recreation.json (docs/MISTAKES.md's own reference film) stages its three key events
// roughly 30ms and 150ms apart (button lands 3.07s, world floods 3.10s, ring appears 3.25s). 0.05s
// sits at the small end of that range on purpose: it is enough to read as "because", never enough to
// visibly shorten a beat or read as its own edit. `docs/CRAFT/PER-SCENE-FANOUT.md` names it.
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

// ── LAYER-SCOPE BUILD: sustained motion on a beat's own layer, not a one-shot entrance ──────────────
//
// docs/MISTAKES.md #610: three swept axes (entrance density, overlap, travel/duration) all failed to
// stop a film going still, because every one of them is still a one-shot ENTRANCE that lands and holds.
// The one axis that worked, measured median motion 0.17-1.61 against a 0.66 reference, is a keyed x/y/
// scale track on the LAYER that never stops moving for the length of the beat. A LAYER-scope `move:`
// entry is that decision (`move: pan:cinematic`, `move: drift:gravity`), and a beat naming none builds
// nothing here and assembles exactly as it did before (byte-identical, harness/author/assemble.test.mjs).
//
// WHY BAND SCALES MAGNITUDE AND NEVER DURATION. The requirement this field exists to meet is that the
// track spans the WHOLE beat, so nothing goes still inside it; if a band shortened the track, the beat
// would hold still for whatever was left over, which is the exact bug this field closes. So `dur` is
// always the beat's own duration, never negotiable, and band instead scales how FAR/BIG the shape's own
// measured motion is: `professional` reproduces the shape's own default untouched (the neutral point
// `motion:` already treats every band relative to), `energy` shrinks it, `gravity`/`cinematic` grow it.

// The props a "how far/big" scale actually means something for, paired with their identity (the value
// that means "no movement"), so scaling never invents a magic number per shape: it grows or shrinks the
// DISTANCE from identity that the shape itself already chose. `opacity`/`ease` are left alone on
// purpose, a band changes how much a layer travels, never how much it fades.
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

// A curve's own box, at the neutral `professional` band. `MotionPathPlugin` reads only the `d` string
// (no `align`, so it moves the layer's OWN x/y along it, never a DOM path element), so the "distance
// from identity" a band scales is the curve's amplitude, exactly like MOVE_SCALABLE above: bigger box,
// bigger swing, same shape.
const PATH_BOX = { w: 500, h: 220 };

/** pathMotion({curve,band}, dur) → the `layers[].motionPath` object a scope-'path' `move:` entry builds. */
export function pathMotion({ curve, band }, dur) {
  const factor = SPEED_BAND[band] / SPEED_BAND.professional;
  const w = r3(PATH_BOX.w * factor), h = r3(PATH_BOX.h * factor);
  return { path: PATH_CURVES[curve](w, h), dur };
}

// ── THE CUT IN: `transition_in` names the boundary a beat arrives ON, parsed per-beat since
// storyboard-parse.mjs but never built (assemble.mjs derives every boundary from the theme's own
// default, `look.cuts.default`, uniformly). Beat i+1's `transition_in` is the author's own opinion
// about the cut BETWEEN beat i and beat i+1. Beat 1's own `transition_in` describes how the film OPENS,
// not a boundary (there is no beat before it), so it is read everywhere else (the studio label) but
// builds nothing here.
//
// THE FIELD IS MOSTLY PROSE, NOT A NAME, and that is measured, not assumed: across every shipped
// storyboard, `transition_in` reads "cut (blur)", "dissolve 0.5s", "cut", "content turnover (no root
// cut; the film is one take)", almost never a bare fx word the catalog itself would recognise ("cut"
// is not one: the catalog's hard cut is "none"). That is the exact shape `rest:` (above) was found in
// and deliberately NOT auto-built from: guessing a decision out of prose is a guess wearing a
// migration's clothes, and `formats/scene/vawe-oblique.json` (this repo's own byte-identity contract)
// already writes "cut" and "cinematicZoom" as documentary colour, never vetted against reaching a
// render. Auto-building a bare word would silently change it, the one thing this whole file may not do.
//
// So the DECISIVE form is `fx:<name>` (mirrors `transitions[].fx`, the field it becomes), the same
// "an entry already says which one it means" test `move:` uses for its three scopes and `trigger:`
// (isCausedTrigger, above) uses to tell a real cause from a sequence marker: a shape no existing
// storyboard has ever written cannot retroactively change one, so every already-committed film reads
// exactly as it did. `transition_in: fx:cinematicZoom` is a decision; `transition_in: cinematicZoom` or
// `cut` stays what it always was, prose for a human, read by nothing.
//
// EXTRA SYNTAX: `fx:<name> timing=<timing> dur=<s> dir=<dir>`, the same three fields
// `transitions[]` itself already carries (core/transitions/lower.js). `timing` is a cut timing
// (core/cuts/timings.js TIMINGS, the SAME word `make arsenal` resolves for a `cutTiming`); `dur` is
// seconds; `dir` is left/right/up/down or a number of degrees (a numeric dir means anything only for
// `mech:"seam"`, and `boundaryMechanism` still decides that below, unchanged). Any of the three may be
// omitted; an author who writes none of them gets exactly the plain `fx:<name>` this always was.
const TRANSITION_NAMES = [...new Set(TRANSITIONS.map((t) => t.name))];
const TIMING_NAMES = Object.keys(TIMINGS);
const TRANSITION_LINE_RE = /^fx\s*:\s*([A-Za-z][A-Za-z0-9-]*)\s*((?:\s+\w+\s*=\s*\S+)*)\s*$/i;
const TRANSITION_PARAM_RE = /(\w+)\s*=\s*(\S+)/g;
const TRANSITION_DIR_WORDS = ['left', 'right', 'up', 'down'];

/** parseTransitionIn(raw) → {fx,timing?,dur?,dir?} | null (prose, no decision stated) | {error}. */
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
    if (!['timing', 'dur', 'dir'].includes(key)) {
      return { error: `transition_in "${key}" is not a known param. Known: timing, dur, dir.` };
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

// ── RECIPES: structure copied from real video (recipes/recipes.json, recipes/README.md) ────────────
// A beat's `recipe:` line names one recipe and fills its slots/params, one grammar for both the plan
// gate and assemble to read, so the two never drift the way two parsers of the same field always do:
//   `<name> <key>=<value> ...`             e.g. "flow-seam out=window in=tagline axis=x"
// A bracketed value is a list ("ground=[g1,g2]"); everything else is a bare token. Which field a key
// lands in (slot vs param) is read off the recipe's own definition, never guessed: `out`/`in`/`ground`
// are `flow-seam`'s slots, `axis`/`gap`/... are its params. `at` is never written here: it is the
// beat's own start, already the film's clock, so restating it on the line would be a second copy of a
// number the storyboard already carries once.
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
  // A slot's description marks itself optional with a trailing "?" (recipes/README.md's own example,
  // "[layer id, layer id]?") or the word "optional" (recipes.json's own `ground` entry writes it out);
  // `at` is never author-filled (see above).
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

// ── THE DECISION PROCEDURE, AS DATA (docs/CRAFT/TRANSITIONS.md #the-decision-procedure-the-algorithm-
// to-run-at-every-seam): a boundary's RELATIONSHIP and FEELING, and whether the seam should disappear or
// speak, written down as `transition_why: <relationship> · <feeling> · <invisible|expressive>` on the
// arriving beat, the same beat that already carries `transition_in`. Read here, next to it, because a
// second parser for the same boundary would drift the way two readers of one field always do.
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

/** boundaryCovered(prev, b) → true when the boundary INTO `b` (from `prev`) is covered by something
 * other than silence: a `transition_in` line (resolved or not, prose still counts as a decision made),
 * a seam recipe, a declared camera travel on either side, or a shared element (`becomes:`) crossing it.
 * Mirrors the taxonomy's own non-cut devices (core/transitions/relationships.js DEVICES). */
function boundaryCovered(prev, b) {
  if (b.transition_in) return true;
  if (isSeamRecipe(b) || isSeamRecipe(prev)) return true;
  const camB = resolvedCamera(b);
  const camPrev = resolvedCamera(prev);
  if ((camB && camB.move === 'travel') || (camPrev && camPrev.move === 'travel')) return true;
  if (b.becomes || prev.becomes) return true;
  return false;
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
        + '(docs/CRAFT/TRANSITIONS.md#the-decision-procedure-the-algorithm-to-run-at-every-seam).');
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

// ── USE: the general door onto the arsenal's 790-entry corpus (harness/author/arsenal.mjs collect()),
// the SAME index `make arsenal Q="…"` already searches. A beat may carry several `use:` lines
// (storyboard-parse.mjs fieldAllIn collects them as a list, unlike every single-valued field above).
// Syntax: "use: <name> [on=<layer id>] [key=value …]", or "use: <kind>:<name> …" when a bare name
// exists in more than one kind (`preset` alone is kinetic/glow/particles; `kinetic preset:weight`
// picks one).
//
// NO SECOND MECHANISM. A kind that already has a dedicated field (camera:, transition_in:, move:,
// motion:, recipe:) reaches the engine there; `use:` refuses it and names the field, rather than
// becoming a second spelling of the same decision. `idle` is refused the same way: its names are
// already reachable as `move: hold:<idle>` (core/engine/idle.js IDLE_NAMES, the exact set
// parseMoveEntry's HOLD_RE branch reads), so a `use:` door onto it would be a second HOLD mechanism.
export const USE_DEDICATED_FIELD = {
  'camera move': 'camera:', 'camera word': 'camera:',
  cut: 'transition_in:', 'seam fx': 'transition_in:', 'sting fx': 'transition_in:', 'cut timing': 'transition_in:',
  'move shape': 'move:', 'path curve': 'move:',
  idle: 'move: hold:<idle>',
  'part entrance': 'motion:',
  recipe: 'recipe:',
};

// INTERNAL: engine machinery an author never names from a storyboard. Each is refused naming the doc
// or field that actually sets it, decided by reading its slot text and catalog tag (never a per-family
// guess): all thirteen are either an implementation detail no beat has a reason to pick (a generator, a
// keyframe handle, an interpolation mode, a scramble charset), a value derived from something else on
// the layer rather than chosen (a shadow direction, field motion, an envelope shape/anchor, a lightfield
// pattern, an effector drive/falloff), owned by a different file entirely (a theme look key, themes/*.json),
// or a slot that is not a plain value at all (`ransom.faces`, a LIST of {family, weight} records).
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
  if (matches.length > 1) return { ambiguous: matches.map((e) => `${e.kind}:${e.name}`) };
  if (matches.length === 1) {
    const entry = matches[0];
    if (USE_DEDICATED_FIELD[entry.kind]) return { entry, refusedField: USE_DEDICATED_FIELD[entry.kind] };
    if (USE_INTERNAL_KIND[entry.kind]) return { entry, refusedInternal: USE_INTERNAL_KIND[entry.kind] };
    return { entry };
  }
  // No exact/aka match anywhere. A single bare word (or hyphenated word) is a DECISIVE attempt at the
  // grammar, the same test `camera:`/`transition_in:` use one field up: anything else is read as what
  // `use:` free text has always been able to be, prose, and reported as a warning naming the 3 nearest
  // entries, never silently dropped.
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
