// core/transitions-lower.js: the UNIFIED transition surface, lowered to the raw mechanisms.
//
// An author declares a BOUNDARY transition (between two beats) in one place, and the engine routes it
// to the correct mechanism: data.transitions: [{ at, fx, dur, dir, timing, mech? }].
//
// This is PURE SUGAR: lowerScene() expands the unified surface into the raw fields the engine already
// renders (data.cuts / data.stings / data.seams), then the existing parsers take over untouched. So
// the render path, the seam bake, cutStyle and every gate are unchanged, the unified API adds a
// normalisation pass, it does not rewrite anything. Determinism is preserved (a pure data→data
// transform in array order), and a scene that uses no unified key lowers to a byte-identical no-op.
//
// Routing is a LOOKUP, not a heuristic: core/transitions.js already maps every fx to its mechanism(s).
//
// A per-layer `transition: { in, out, dir, dur }` sugar used to live here too, expanding to
// anim/out/dir/enterDur/exitDur on lowerScene. It duplicated those five fields exactly, with no
// motion it could express that writing them directly could not, and it measured zero users across
// every scene in the library. Removed rather than kept as a second way to say `anim`/`out` (#gsap-audit).
import { TRANSITIONS } from './catalog.js';
import { resolveSeconds } from '../registry/vocab.js';
import { parseColor } from '../motion/motion.js';
import { ENERGY, okEnergy } from './energy.js';

export const PROPS = {};

// fx name → the set of mechanisms that implement it (derived from the catalog, so it can't drift).
const MECHS_OF = new Map();
for (const t of TRANSITIONS) {
  if (!MECHS_OF.has(t.name)) MECHS_OF.set(t.name, new Set());
  MECHS_OF.get(t.name).add(t.mechanism);
}
// `none` is deliberately absent from the catalog's cut row (core/transitions/catalog.js: it is the
// absence of an effect, not one to browse in `make transitions`), but it IS a real PRESENTATIONS entry
// and a boundary transition must be able to say "hard cut, no visual transition", the same thing a raw
// `cuts[].style:"none"` always meant.
MECHS_OF.get('none')?.add('cut');

// A BOUNDARY transition is scene-level: cut · seam · sting (anim is layer-level, never a boundary).
// Precedence when a name exists in several mechanisms: CUT first, so the ambiguous basics
// (fade/slide/wipe/dissolve/push/uncover) are a cheap root cut by default and `mech:"seam"` upgrades to
// the real two-scene GPU blend. seam-only names (whipPan/crossWarp/cinematicZoom) resolve to seam;
// sting-only (glitch/chromaticSplit) to sting.
const BOUNDARY_ORDER = ['cut', 'seam', 'sting'];

// SPEED BY DEFAULT for MOTION transitions. A spatial fx (a whip, a zoom, a slide, a squeeze) with no
// `timing` reads FLAT, and a film whose seams are all flat feels repetitive (docs/CRAFT/TRANSITIONS.md,
// "speed is the anti-repetition lever"). So when the agent authors a motion fx through the `transitions`
// sugar and names no timing, it gets the slow-fast-slow speed ramp for free. A pure blend (fade/dissolve)
// stays on the gentle default. An explicit `timing` always wins, and raw hand-authored `seams`/`cuts`
// are untouched (this only fills the sugar's default, so no legacy film re-times silently).
// Exported so harness/author/migrate-junctions.mjs can PIN the render-time default (`smooth`, see
// core/cuts/index.js and formats/scene/scene.js) explicitly on a raw cut/seam it is converting, rather
// than let it fall through to this ramp: a legacy scene earns identical rendered output, never a
// silent re-time, from moving into `transitions[]`.
export const RAMP_BY_DEFAULT = new Set(['whipPan', 'whip', 'cinematicZoom', 'zoom', 'squeeze', 'slide', 'push', 'uncover']);
const defaultTiming = (fx) => (RAMP_BY_DEFAULT.has(fx) ? 'ramp' : undefined);

export function boundaryMechanism(fx, mech) {
  const have = MECHS_OF.get(fx);
  if (!have) throw new Error(`unknown transition fx "${fx}", see \`make transitions\` for the catalog`);
  if (mech) {
    if (mech === 'anim') throw new Error(`transition "${fx}": mech "anim" is a LAYER transition, not a boundary. Put it in a layer's transition.in/out`);
    if (!have.has(mech)) throw new Error(`transition "${fx}" is not a ${mech}. It is a ${[...have].join('/')} (drop \`mech\`, or pick a ${mech} fx)`);
    return mech;
  }
  for (const m of BOUNDARY_ORDER) if (have.has(m)) return m;
  // only anim implements it → it is a layer entrance, not a boundary
  throw new Error(`"${fx}" is a layer entrance (anim), not a boundary transition, use it in a layer's transition.in/out`);
}

// A STING TINT IS A COLOUR, NOT A HEX STRING, and it used to be read as one. The renderer turned
// `color` into a vec3 with `parseInt(hex, 16)`, so anything that is not a bare hex became NaN and then
// [0,0,0]: a theme token, an `rgb()`, a named colour all tinted the sting BLACK, with no error and
// nothing on screen to say why. That is the silent substitution this repo hates (docs/MISTAKES.md
// #476). RESOLUTION is not ours: core/filters.js `glowRGB` is the engine's one owner of "an author
// colour that may be a theme token -> literal rgb", and feFlood has the identical problem for the
// identical reason. What belongs HERE is the REFUSAL, because lowerScene is the one pass every
// consumer of a scene already runs (the renderer, the validator, the gates), so an unresolvable tint
// is named by `make validate` instead of being discovered as a black flash in a rendered mp4.
//
// KEEP THIS LIST IN STEP WITH glowRGB: it resolves --accent and --ink and falls back to white for
// every other token, and a silent white is the same class of bug as a silent black.
const STING_TOKEN = /^var\(\s*--(accent|ink)\b/;

/** checkStingColor(color, where) -> the colour string, or throws naming the value. Pure. */
export function checkStingColor(color, where) {
  const s = String(color ?? '').trim();
  if (STING_TOKEN.test(s) || parseColor(s)) return s;
  throw new Error(`${where}: ${JSON.stringify(color)} is not a colour this engine can resolve. A sting `
    + `tint becomes a WebGL uniform, so it must be a literal colour (hex, rgb(), or a CSS colour name) `
    + `or one of the theme tokens var(--accent) / var(--ink).`);
}

const clean = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };

// DURATION WORDS are resolved HERE and nowhere else, because this is the one pass every consumer of a
// scene already runs (the renderer at formats/scene/scene.js, the validator, six gates) and it is a
// pure data→data transform in array order, so determinism is unchanged. Resolving instead at each of
// the eleven read sites would be eleven chances to miss one, and a missed one is a NaN in a timeline.
// A number passes through itself, so a scene that names 0.42 keeps naming 0.42 and re-lowering stays
// a no-op. An unknown word throws out of resolveSeconds; it is never defaulted. core/vocab.js.
//
// LAYER TIMING ONLY, and the boundary is a real one rather than a first cut. A junction `dur` (a cut,
// a seam, a sting) carries min/max in the schema, and the schema's range check switches on the
// declared type. A string value would pass through unranged, so `instant` (0.08s) would slip under a
// cut's own 0.1s floor with nothing to say so. The layer slots below declare no range, so widening
// them to accept a word loses no check at all.
const durs = (o, keys) => { for (const k of keys) if (o && o[k] != null) o[k] = resolveSeconds(o[k]); return o; };

// lowerScene(data): expand the unified surface into the raw fields, in place, and CONSUME the unified
// keys so re-lowering is a no-op (idempotent, validate and the engine may each call it). Hand-written
// raw fields are preserved; a unified entry is appended alongside them (a beat carrying both is an
// authoring error a gate flags, not something this silently reconciles).
export function lowerScene(data) {
  if (!data || typeof data !== 'object') return data;

  // ENERGY is the film-wide default speed curve (core/energy.js). It fills the `timing` of any cut or
  // seam that names none, sugar or hand-authored, and an explicit `timing` always wins. It is only ever
  // a value when the film declares `energy`, so a legacy scene (no energy) writes nothing and re-lowers
  // byte-identical. When set, it OUTRANKS the per-fx `defaultTiming` ramp: the film's chosen velocity is
  // more specific than a blanket motion default.
  const bandTiming = okEnergy(data.energy) ? ENERGY[data.energy] : undefined;

  const boundary = Array.isArray(data.transitions) ? data.transitions : [];
  if (boundary.length) {
    const cuts = data.cuts ? [...data.cuts] : [];
    const stings = data.stings ? [...data.stings] : [];
    const seams = data.seams ? [...data.seams] : [];
    // AUTHOR NOTES (`_why`, `note`, any `_`-prefixed key, the convention core/engine/expand.js
    // `isNote` names) ride along untouched: they carry no engine meaning, so dropping them at THIS
    // pass is not an authoring correction, it is data loss, indistinguishable from `migrate-junctions.mjs`
    // silently erasing an author's comment on the one boundary that survived to disk.
    const notesOf = (T) => { const n = {}; for (const k of Object.keys(T)) if (k === 'note' || k.startsWith('_')) n[k] = T[k]; return n; };
    for (const T of boundary) {
      if (!T || typeof T !== 'object') continue;
      const at = T.at ?? T.t;
      const m = boundaryMechanism(T.fx, T.mech);
      const timing = T.timing ?? bandTiming ?? defaultTiming(T.fx);   // energy, else the motion-fx speed ramp
      if (m === 'seam') seams.push(clean({ t: at, snap: T.snap, fx: T.fx, dur: T.dur, dir: T.dir, seed: T.seed, intensity: T.intensity, feather: T.feather, timing, ...notesOf(T) }));
      else if (m === 'cut') cuts.push(clean({ t: at, snap: T.snap, style: T.fx, dur: T.dur, dir: T.dir, timing, cx: T.cx, cy: T.cy, dist: T.dist, ...notesOf(T) }));
      else stings.push(clean({ t: at, fx: T.fx, dur: T.dur, seed: T.seed, intensity: T.intensity, color: T.color, colors: T.colors, ...notesOf(T) }));
    }
    if (cuts.length) data.cuts = cuts;
    if (stings.length) data.stings = stings;
    if (seams.length) data.seams = seams;
    delete data.transitions;
  }

  // ENERGY reaches HAND-AUTHORED cuts/seams too, so the film-wide velocity is not limited to the
  // `transitions` sugar. Only fires when `energy` is set (bandTiming defined), and only fills a `timing`
  // that is absent, so re-lowering is a no-op and a legacy film is untouched.
  if (bandTiming) {
    for (const c of data.cuts || []) if (c && typeof c === 'object' && c.timing == null) c.timing = bandTiming;
    for (const s of data.seams || []) if (s && typeof s === 'object' && s.timing == null) s.timing = bandTiming;
  }

  // Every sting's tint, hand-written or lowered from `transitions`, checked at the one place they all
  // pass through. Idempotent: a colour that passed once passes again, so re-lowering stays a no-op.
  for (const s of data.stings || []) {
    if (!s || typeof s !== 'object') continue;
    if (s.color != null) checkStingColor(s.color, `stings[] at t=${s.t}: color`);
    if (Array.isArray(s.colors))
      s.colors.forEach((c, i) => checkStingColor(c, `stings[] at t=${s.t}: colors[${i}]`));
  }

  // A group's children are layers with the same timing props, so the words have to reach them too.
  // A word that works at the top level and silently NaNs one nesting level down is worse than no word.
  const timings = (L) => {
    if (!L || typeof L !== 'object') return;
    durs(L, ['enterDur', 'exitDur', 'duration']);
    for (const c of L.children || []) timings(c);
  };

  for (const L of data.layers || []) timings(L);
  return data;
}
