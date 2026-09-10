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

/** parseFragmentSpec("_together.card.html @ center@900x520") → {path, edge}. path/edge are null when unstated; edge carries {error} the same way parseEdge does. */
export function parseFragmentSpec(raw) {
  if (raw == null) return { path: null, edge: null };
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s) return { path: null, edge: null };
  const m = FRAGMENT_SEP_RE.exec(s);
  if (!m) return { path: s, edge: null };   // no "@": a plain file override, no placement stated
  const [, pathPart, placementRaw] = m;
  return { path: pathPart || null, edge: parseEdge(placementRaw) };
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
  if (!m) return { error: `"${s}" is not "<selector>@<kind>:<band>", "hold:<idle>", or "<shape>:<band>" (e.g. "pan:cinematic"). Known shapes: ${Object.keys(SHAPES).join(', ')}. Known idles: ${IDLE_NAMES.join(', ')}` };
  const [, shape, band] = m;
  if (!SHAPES[shape]) {
    const near = nearMisses(shape, Object.keys(SHAPES));
    return { error: `"${shape}" is not a known move shape${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${Object.keys(SHAPES).join(', ')}` };
  }
  if (!SPEED_BAND[band]) {
    const near = nearMisses(band, Object.keys(SPEED_BAND));
    return { error: `"${band}" is not a speed band${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${Object.keys(SPEED_BAND).join(', ')}` };
  }
  return { scope: 'layer', shape, band };
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
