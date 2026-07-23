// core/transitions-lower.js — the UNIFIED transition surface, lowered to the four raw mechanisms.
//
// An author has ONE way to declare a transition; the engine routes it to the correct mechanism:
//   • boundary (between two beats)  →  data.transitions: [{ at, fx, dur, dir, timing, mech? }]
//   • layer entrance/exit           →  layers[].transition: { in, out, dir, dur }
//
// This is PURE SUGAR: lowerScene() expands the unified surface into the raw fields the engine already
// renders (data.cuts / data.stings / data.seams / layer.anim|out), then the existing parsers take over
// untouched. So the render path, the seam bake, cutStyle and every gate are unchanged — the unified API
// adds a normalisation pass, it does not rewrite anything. Determinism is preserved (a pure data→data
// transform in array order), and a scene that uses no unified key lowers to a byte-identical no-op.
//
// Routing is a LOOKUP, not a heuristic: core/transitions.js already maps every fx to its mechanism(s).
import { TRANSITIONS } from './transitions.js';

// fx name → the set of mechanisms that implement it (derived from the catalog, so it can't drift).
const MECHS_OF = new Map();
for (const t of TRANSITIONS) {
  if (!MECHS_OF.has(t.name)) MECHS_OF.set(t.name, new Set());
  MECHS_OF.get(t.name).add(t.mechanism);
}

// A BOUNDARY transition is scene-level: cut · seam · sting (anim is layer-level, never a boundary).
// Precedence when a name exists in several mechanisms: CUT first — so the ambiguous basics
// (fade/slide/wipe/dissolve/push/uncover) are a cheap root cut by default and `mech:"seam"` upgrades to
// the real two-scene GPU blend. seam-only names (whipPan/crossWarp/cinematicZoom) resolve to seam;
// sting-only (glitch/chromaticSplit) to sting.
const BOUNDARY_ORDER = ['cut', 'seam', 'sting'];

export function boundaryMechanism(fx, mech) {
  const have = MECHS_OF.get(fx);
  if (!have) throw new Error(`unknown transition fx "${fx}" — see \`make transitions\` for the catalog`);
  if (mech) {
    if (mech === 'anim') throw new Error(`transition "${fx}": mech "anim" is a LAYER transition, not a boundary — put it in a layer's transition.in/out`);
    if (!have.has(mech)) throw new Error(`transition "${fx}" is not a ${mech} — it is a ${[...have].join('/')} (drop \`mech\`, or pick a ${mech} fx)`);
    return mech;
  }
  for (const m of BOUNDARY_ORDER) if (have.has(m)) return m;
  // only anim implements it → it is a layer entrance, not a boundary
  throw new Error(`"${fx}" is a layer entrance (anim), not a boundary transition — use it in a layer's transition.in/out`);
}

const clean = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };

// lowerScene(data): expand the unified surface into the raw fields, in place, and CONSUME the unified
// keys so re-lowering is a no-op (idempotent — validate and the engine may each call it). Hand-written
// raw fields are preserved; a unified entry is appended alongside them (a beat carrying both is an
// authoring error a gate flags, not something this silently reconciles).
export function lowerScene(data) {
  if (!data || typeof data !== 'object') return data;

  const boundary = Array.isArray(data.transitions) ? data.transitions : [];
  if (boundary.length) {
    const cuts = data.cuts ? [...data.cuts] : [];
    const stings = data.stings ? [...data.stings] : [];
    const seams = data.seams ? [...data.seams] : [];
    for (const T of boundary) {
      if (!T || typeof T !== 'object') continue;
      const at = T.at ?? T.t;
      const m = boundaryMechanism(T.fx, T.mech);
      if (m === 'seam') seams.push(clean({ t: at, fx: T.fx, dur: T.dur, dir: T.dir, seed: T.seed, intensity: T.intensity, timing: T.timing }));
      else if (m === 'cut') cuts.push(clean({ t: at, style: T.fx, dur: T.dur, dir: T.dir, timing: T.timing, cx: T.cx, cy: T.cy, dist: T.dist }));
      else stings.push(clean({ t: at, fx: T.fx, dur: T.dur, seed: T.seed, intensity: T.intensity, color: T.color }));
    }
    if (cuts.length) data.cuts = cuts;
    if (stings.length) data.stings = stings;
    if (seams.length) data.seams = seams;
    delete data.transitions;
  }

  for (const L of data.layers || []) {
    const tr = L && L.transition;
    if (!tr || typeof tr !== 'object') continue;
    if (tr.in != null && L.anim == null) L.anim = tr.in;      // layer entrance
    if (tr.out != null && L.out == null) L.out = tr.out;      // layer exit
    if (tr.dir != null && L.dir == null) L.dir = tr.dir;
    if (tr.dur != null) {
      if (tr.in != null && L.enterDur == null) L.enterDur = tr.dur;
      if (tr.out != null && L.exitDur == null) L.exitDur = tr.dur;
    }
    delete L.transition;
  }
  return data;
}
