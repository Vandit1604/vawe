// contract.mjs: THE PER-BEAT CONTRACT for a fan-out of per-scene HTML-fragment agents.
//
// It is NOT a second planning artefact. It reads the SAME storyboard `make scaffold` already writes
// (scripts/author/storyboard-parse.mjs), off two fields scaffold now also emits per beat:
//   object_in:  "<placement>@<w>x<h>[/rot:<deg>][/op:<0-1>]"   the object's POSE at this beat's START
//   object_out: "<placement>@<w>x<h>[/rot:<deg>][/op:<0-1>]"   its POSE at this beat's END
// `<placement>` is a name from the safe-area PLACEMENT registry (core/layout/safe.js), never a raw
// pixel: an author writes "bottom-left@120x40", not "x:65,y:975", so the contract is aspect-portable
// the same way `pin` already is. `<w>x<h>` is the object's size in px at that edge; `/rot:` and `/op:`
// are optional trailing pose fields, degrees and an opacity multiplier, both omittable (default 0/1).
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

const EDGE_RE = /^\s*([a-z][a-z0-9-]*)\s*@\s*(\d+)\s*x\s*(\d+)\s*((?:\/[a-z]+\s*[:=]\s*-?[\d.]+\s*)*)$/i;
const POSE_TOKEN_RE = /\/([a-z]+)\s*[:=]\s*(-?[\d.]+)/gi;
const POSE_FIELDS = { rot: 'rot', op: 'opacity' };

/** parseEdge("bottom-left@120x40/rot:15/op:0.4") → {placement,w,h,rot,opacity} | null (null = no opinion) */
export function parseEdge(raw) {
  if (raw == null) return null;
  // storyboard-parse.mjs's generic fieldIn() does not strip quotes (only frontmatter's field() does),
  // so a beat line written `- object_in: "bottom-left@120x40"` arrives with the quotes still attached.
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s || /^<fill:/i.test(s) || /^REPLACE/i.test(s)) return null; // scaffold's own unfilled markers
  const m = EDGE_RE.exec(s);
  if (!m) return { error: `"${s}" is not "<placement>@<w>x<h>" (e.g. "bottom-left@120x40", optionally "/rot:15" and/or "/op:0.4")` };
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
      if (!POSE_FIELDS[key]) return { error: `"${key}" in "${s}" is not a known pose field. Known: rot, op` };
      pose[POSE_FIELDS[key]] = +pm[2];
    }
  }
  return { placement, w: +w, h: +h, rot: pose.rot, opacity: pose.opacity };
}

const edgeEq = (a, b) => a && b && a.placement === b.placement && a.w === b.w && a.h === b.h
  && a.rot === b.rot && a.opacity === b.opacity;
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

// ── THE MOTION PLAN: what moves in a beat, beyond the one continuous object above ──────────────────
//
// object_in/object_out say where the ONE thing that survives every cut is. Everything ELSE in a beat
// (a headline that pushes in, a card that pops) had no contract at all: a fragment agent invented its
// own entrances, `assemble.mjs` never built them, and a storyboard that said "the headline slides in
// hard" produced a film where nothing moved, because nothing read that sentence.
//
// `motion:` on a beat is one or more entries, `;`-separated: `<selector>@<kind>:<inBand>[/<outBand>]`.
//   - <selector>  a CSS selector into the fragment's own markup (`[data-part="headline"]`), the SAME
//     selector `parts[].select` already takes (core/motion/parts.js). Naming it here, before the
//     fragment is written, is what scenes.mjs's brief now hands the fragment author: give this element
//     that attribute or that class, or the motion plan has nothing to reach.
//   - <kind>      one of the engine's own named part entrances (growUp, fadeUp, slide-left, …,
//     PART_NAMES below): a placement name for MOTION the same way `<placement>` above is one for
//     POSITION, checkable by a person who knows the vocabulary rather than by reading a bezier.
//   - <inBand>/<outBand>  one of the four named speed bands already in this repo's doctrine
//     (docs/RULES/speed-bands.md: energy · professional · gravity · cinematic), reused rather than
//     invented so a beat's motion plan speaks the same words a duration decision already speaks.
//     <outBand> defaults to <inBand> when only one is given. THIS is the boundary velocity: a fast
//     (short) exit band arrives at the next cut moving quickly, which is exactly what the content-aware
//     cut (core/timeline/velocity-cut.js) is hunting for, and a named band is something a plan can be
//     reviewed against without anyone doing the px/s arithmetic by hand.
export const SPEED_BAND = { energy: 0.22, professional: 0.4, gravity: 0.65, cinematic: 1.2 };

const MOTION_RE = /^\s*([^@]+?)\s*@\s*([a-z-]+)\s*:\s*([a-z]+)(?:\s*\/\s*([a-z]+))?\s*$/i;

/** parseMotionEntry("[data-part=\"headline\"]@slide-left:energy/cinematic") → {selector,kind,inBand,outBand} | {error} */
export function parseMotionEntry(raw) {
  const s = String(raw).trim();
  const m = MOTION_RE.exec(s);
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
  return { selector: selector.trim(), kind, inBand, outBand };
}

/** parseMotion("a@k:b; c@k2:b2") → [{...} | {error}] for a beat's raw `motion:` field. Empty for unset ("no opinion", same convention as parseEdge). */
export function parseMotion(raw) {
  if (raw == null) return [];
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s || /^<fill:/i.test(s) || /^none$/i.test(s)) return [];
  return s.split(';').map((e) => e.trim()).filter(Boolean).map(parseMotionEntry);
}

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
