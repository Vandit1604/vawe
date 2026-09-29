// The unified boundary transition surface (data.transitions: [{ at, fx, dur, dir, timing, mech? }]),
// lowered to the raw cuts/stings/seams the renderer, seam bake and gates already read.
import { TRANSITIONS } from './catalog.js';
import { resolveSeconds } from '../registry/vocab.js';
import { parseColor } from '../color/engine.js';
import { ENERGY, okEnergy } from './energy.js';

export const PROPS = {};

// fx name → the set of mechanisms that implement it (derived from the catalog, so it can't drift).
const MECHS_OF = new Map();
for (const t of TRANSITIONS) {
  if (!MECHS_OF.has(t.name)) MECHS_OF.set(t.name, new Set());
  MECHS_OF.get(t.name).add(t.mechanism);
}
// `none` is absent from the catalog's cut row (it browses as no effect) but is a real cut style.
MECHS_OF.get('none')?.add('cut');

// Precedence when an fx name exists in several mechanisms: cut first (cheap default), `mech:"seam"`
// upgrades to the real two-scene GPU blend.
const BOUNDARY_ORDER = ['cut', 'seam', 'sting'];

// Motion fx (whip/zoom/slide/squeeze) with no `timing` gets the slow-fast-slow ramp by default so a
// film's seams don't all read flat; an explicit `timing` always wins. Exported so
// harness/author/migrate-junctions.mjs can pin the old render-time default on a raw cut/seam it converts.
export const RAMP_BY_DEFAULT = new Set(['whipPan', 'whip', 'cinematicZoom', 'zoom', 'squeeze', 'slide', 'push', 'uncover']);
const defaultTiming = (fx) => (RAMP_BY_DEFAULT.has(fx) ? 'ramp' : undefined);

export function boundaryMechanism(fx, mech) {
  const have = MECHS_OF.get(fx);
  if (!have) throw new Error(`unknown transition fx "${fx}", see \`make study-tool X=transitions\` for the catalog`);
  if (mech) {
    if (mech === 'anim') throw new Error(`transition "${fx}": mech "anim" is a LAYER transition, not a boundary. Put it in a layer's transition.in/out`);
    if (!have.has(mech)) throw new Error(`transition "${fx}" is not a ${mech}. It is a ${[...have].join('/')} (drop \`mech\`, or pick a ${mech} fx)`);
    return mech;
  }
  for (const m of BOUNDARY_ORDER) if (have.has(m)) return m;
  // only anim implements it → it is a layer entrance, not a boundary
  throw new Error(`"${fx}" is a layer entrance (anim), not a boundary transition, use it in a layer's transition.in/out`);
}

// A non-hex sting `color` used to become NaN then black with no error (engine-doctrine/MISTAKES.md
// #476); this refuses it here so `make check GATE=validate` names it instead. Keep in step with core/filters.js
// `glowRGB`, the one owner of resolving a theme token to a literal rgb.
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

// Duration words resolve here, once, via core/vocab.js resolveSeconds; a number passes through itself.
// Layer timing slots only: a junction dur is range-checked by the schema and a word would skip that.
const durs = (o, keys) => { for (const k of keys) if (o && o[k] != null) o[k] = resolveSeconds(o[k]); return o; };

// AUTHOR NOTES (`_why`, `note`, any `_`-prefixed key, the convention core/engine/expand.js `isNote`
// names) ride along untouched: they carry no engine meaning.
const notesOf = (T) => { const n = {}; for (const k of Object.keys(T)) if (k === 'note' || k.startsWith('_')) n[k] = T[k]; return n; };

function lowerBoundaryEntry(T, bandTiming, bins) {
  if (!T || typeof T !== 'object') return;
  const at = T.at ?? T.t;
  const m = boundaryMechanism(T.fx, T.mech);
  const timing = T.timing ?? bandTiming ?? defaultTiming(T.fx);
  if (m === 'seam') bins.seams.push(clean({ t: at, snap: T.snap, fx: T.fx, dur: T.dur, dir: T.dir, seed: T.seed, intensity: T.intensity, feather: T.feather, timing, ...notesOf(T) }));
  else if (m === 'cut') bins.cuts.push(clean({ t: at, snap: T.snap, style: T.fx, dur: T.dur, dir: T.dir, timing, cx: T.cx, cy: T.cy, dist: T.dist, ...notesOf(T) }));
  else bins.stings.push(clean({ t: at, fx: T.fx, dur: T.dur, seed: T.seed, intensity: T.intensity, color: T.color, colors: T.colors, ...notesOf(T) }));
}

function applyBoundaryBins(data, bins) {
  if (bins.cuts.length) data.cuts = bins.cuts;
  if (bins.stings.length) data.stings = bins.stings;
  if (bins.seams.length) data.seams = bins.seams;
  delete data.transitions;
  // Marks this pass's own output so validate.mjs `authoredJunctionErrors` can tell it apart from a
  // hand-written cuts[]/stings[]/seams[], which it refuses.
  data._lowered = true;
}

// Unified `transitions[]` lowers into the raw cuts/stings/seams the renderer and every gate already
// read, consuming the unified keys so re-lowering is a no-op. Hand-written raw fields are preserved.
function lowerBoundaryTransitions(data, bandTiming) {
  const boundary = Array.isArray(data.transitions) ? data.transitions : [];
  if (!boundary.length) return;
  const bins = { cuts: data.cuts ? [...data.cuts] : [], stings: data.stings ? [...data.stings] : [], seams: data.seams ? [...data.seams] : [] };
  for (const T of boundary) lowerBoundaryEntry(T, bandTiming, bins);
  applyBoundaryBins(data, bins);
}

// Reaches HAND-AUTHORED cuts/seams too, only filling a `timing` that is absent.
function fillBandTiming(data, bandTiming) {
  if (!bandTiming) return;
  for (const c of data.cuts || []) if (c && typeof c === 'object' && c.timing == null) c.timing = bandTiming;
  for (const s of data.seams || []) if (s && typeof s === 'object' && s.timing == null) s.timing = bandTiming;
}

function checkStingColors(data) {
  for (const s of data.stings || []) {
    if (!s || typeof s !== 'object') continue;
    if (s.color != null) checkStingColor(s.color, `stings[] at t=${s.t}: color`);
    if (Array.isArray(s.colors))
      s.colors.forEach((c, i) => checkStingColor(c, `stings[] at t=${s.t}: colors[${i}]`));
  }
}

// cursor `snapTo` string sugar takes its `t` from the layer's first `clicks` entry; a snap with no
// moment to hang on is a missing authoring decision, not a default, so this throws instead of guessing.
function lowerSnapTo(L) {
  if (!L || typeof L !== 'object') return;
  if (typeof L.snapTo === 'string') {
    const clicks = Array.isArray(L.clicks) ? L.clicks.filter((c) => typeof c === 'number') : [];
    if (!clicks.length)
      throw new Error(`layer${L.id ? ` "${L.id}"` : ''}: snapTo "${L.snapTo}" names a landing target `
        + `but has no \`clicks\` entry to take its time from, and a snap with no moment is a missing `
        + `decision, not a default. Either add a \`clicks\` entry (the click this snap lands on), or `
        + `write the array form yourself with an explicit t: [{"t": <seconds>, "id": "${L.snapTo}"}].`);
    L.snapTo = [{ t: Math.min(...clicks), id: L.snapTo }];
  }
  for (const c of L.children || []) lowerSnapTo(c);
}

function lowerLayerTimings(L) {
  if (!L || typeof L !== 'object') return;
  durs(L, ['enterDur', 'exitDur', 'duration']);
  for (const c of L.children || []) lowerLayerTimings(c);
}

// lowerScene(data): expand the unified surface into the raw fields, in place, idempotently.
export function lowerScene(data) {
  if (!data || typeof data !== 'object') return data;

  // ENERGY (core/energy.js) is the film-wide default speed curve; it outranks the per-fx ramp below.
  const bandTiming = okEnergy(data.energy) ? ENERGY[data.energy] : undefined;

  lowerBoundaryTransitions(data, bandTiming);
  fillBandTiming(data, bandTiming);
  checkStingColors(data);

  for (const L of data.layers || []) { lowerLayerTimings(L); lowerSnapTo(L); }
  return data;
}
