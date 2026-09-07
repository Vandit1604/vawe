// contract.mjs: THE PER-BEAT CONTRACT for a fan-out of per-scene HTML-fragment agents.
//
// It is NOT a second planning artefact. It reads the SAME storyboard `make scaffold` already writes
// (scripts/author/storyboard-parse.mjs), off two fields scaffold now also emits per beat:
//   object_in:  "<placement>@<w>x<h>"   the continuous object's state at the START of this beat
//   object_out: "<placement>@<w>x<h>"   its state at the END of this beat
// `<placement>` is a name from the safe-area PLACEMENT registry (core/layout/safe.js), never a raw
// pixel: an author writes "bottom-left@120x40", not "x:65,y:975", so the contract is aspect-portable
// the same way `pin` already is. `<w>x<h>` is the object's size in px at that edge.
//
// WHY A NAME AND NOT A PIXEL: three scene agents each write a fragment against ONE film, and the only
// thing that keeps their three beautiful, independently-authored fragments from being three unrelated
// pictures is that the object handing off between them lands in the SAME place. A placement name is
// something a person reviewing the contract can actually check ("bottom-left, that's the same corner");
// a pixel pair is not.
import { PLACEMENT } from '../../core/layout/safe.js';
import { nearMisses } from '../../core/registry/registry.js';
import { PART_NAMES } from '../../core/motion/parts.js';

const EDGE_RE = /^\s*([a-z][a-z0-9-]*)\s*@\s*(\d+)\s*x\s*(\d+)\s*$/i;

/** parseEdge("bottom-left@120x40") → {placement,w,h} | null (also null for "" / undefined: no opinion) */
export function parseEdge(raw) {
  if (raw == null) return null;
  // storyboard-parse.mjs's generic fieldIn() does not strip quotes (only frontmatter's field() does),
  // so a beat line written `- object_in: "bottom-left@120x40"` arrives with the quotes still attached.
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!s || /^<fill:/i.test(s) || /^REPLACE/i.test(s)) return null; // scaffold's own unfilled markers
  const m = EDGE_RE.exec(s);
  if (!m) return { error: `"${s}" is not "<placement>@<w>x<h>" (e.g. "bottom-left@120x40")` };
  const [, placement, w, h] = m;
  if (!PLACEMENT[placement]) {
    const near = nearMisses(placement, Object.keys(PLACEMENT));
    return { error: `"${placement}" is not a known placement${near.length ? `, did you mean "${near[0]}"?` : ''}. Known: ${Object.keys(PLACEMENT).join(', ')}` };
  }
  return { placement, w: +w, h: +h };
}

const edgeEq = (a, b) => a && b && a.placement === b.placement && a.w === b.w && a.h === b.h;
const fmtEdge = (e) => e ? `${e.placement}@${e.w}x${e.h}` : '(unset)';

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
