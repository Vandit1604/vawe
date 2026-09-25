// pan-resolve, `panWith: "<layerId>"` copies another layer's motion track onto this one, keeping the
// SAME wall clock and this layer's OWN origin. A pan of the page is not a camera move: a camera
// transforms the whole frame, scrim included, so a film that wants the page to slide under a fixed
// frame has to move the chosen layers together. Doing that by hand means writing the same deltas once
// per layer and time-shifting each by its own start, which is what the exemplar does, twice, across
// five of its six moving layers (engine-doctrine/CRAFT/KEYED-MOTION.md). Six identical delta lists kept in sync by
// hand, where a one-key drift is invisible in the JSON and obvious on screen.
//
// Copied as DELTAS, not absolute values, because each layer sits at its own x/y; and shifted by the
// difference in `start`, because a `motion` t is local to its layer.
//
// Lives in its own module, importable from the browser renderer AND from node, so the gate that checks
// the resolved track checks the SAME track the renderer draws. A gate that re-implements the merge is a
// gate that can agree with itself and disagree with the film.
import { motionAt } from './sequence.js';

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const near = (a, b) => Math.abs(a - b) < 1e-6;

// A layer rides the page until it LEAVES it, and it leaves by stating a position of its own. After that
// the source's remaining keys must stop applying: a thing that has peeled off cannot still be dragged
// along by what it peeled off from. Before this rule the pan kept contributing past the break, so the
// page's later keys yanked the layer back onto a path it had already left, 194px of reversal in two
// frames in `cadence`, which is what the snap at 2.87s was (engine-doctrine/MISTAKES.md #194).
//
// Only x/y count as leaving, because x/y are the only properties a pan supplies. A key that states just
// `rot` or `scale` is the layer doing its own thing WHILE it rides (the spinner turns as it travels),
// and must not end the pan.
// The origin key is own[0]: identified BY INDEX, the same way ox/oy read it, never by comparing its
// time to the pan's first key. The spinner's origin sits at t=0 while the track it rides opens at
// t=-0.08, so a time comparison read that origin as a peel and silently stopped the spinner panning.
// `panWith` names the source; the merge then reads this layer's own track and clock to place the copy.
export const PROPS = { panWith: {}, motion: { when: 'panWith' }, id: {}, start: {} };

export function peelTime(own) {
  let peel = Infinity;
  for (let i = 1; i < own.length; i++) {         // [0] is where the ride starts, not where it ends
    const k = own[i];
    if (k.x == null && k.y == null) continue;    // rot/scale/opacity ride along
    const t = num(k.t, 0);
    if (t < peel) peel = t;
  }
  return peel;
}

// A merged track is read key-to-key, so every key the merge FABRICATES has to state the layer's whole
// pose. An omitted property is not "unchanged", it is identity, and the next key snaps to it, which is
// what makes `animates`/`poseAt` sampling necessary rather than reading own[0] (engine-doctrine/MISTAKES.md #195).
function mergedSharedKey(k, own, ctx) {
  const { shift, bx, by, ox, oy, animates, poseAt } = ctx;
  const t = +(num(k.t, 0) + shift).toFixed(4);
  const out = { ...k, t };
  if (k.x != null) out.x = +(ox + (num(k.x, 0) - bx)).toFixed(3);
  if (k.y != null) out.y = +(oy + (num(k.y, 0) - by)).toFixed(3);
  const pose = poseAt(t);
  if (pose) {
    if (animates.has('scale')) out.scale = pose.scale;
    if (animates.has('rot')) out.rot = pose.rot;
    if (animates.has('opacity')) out.opacity = pose.opacity;
    if (animates.has('blur')) out.blur = pose.blur;
    if (k.y == null && animates.has('y')) out.y = pose.dy;   // the pan supplies x only; y stays the layer's
  }
  // The layer's own key at a shared time WINS, x and y included: the pan only supplies what the layer
  // did not state.
  const mine = own.find((o) => near(num(o.t, 0), t));
  if (mine) for (const p of Object.keys(mine)) if (p !== 't') out[p] = mine[p];
  return out;
}

// The layer's own key at a time the pan does not cover, wherever it falls, completed with the pan's
// x/y at that instant so a key that states only `rot` does not silently read as x=0.
function filledExtraKey(o, shared) {
  if (!shared.length) return o;
  const t = num(o.t, 0);
  const filled = { ...o };
  const pan = motionAt(shared, t);                   // holds the last shared value past the peel
  if (o.x == null && shared.some((s) => s.x != null)) filled.x = +pan.dx.toFixed(3);
  if (o.y == null && shared.some((s) => s.y != null)) filled.y = +pan.dy.toFixed(3);
  return filled;
}

// Merge one layer's own track with its pan source's. Returns the resolved key list; does not mutate.
export function mergePan(L, src) {
  const shift = num(src.start, 0) - num(L.start, 0);   // src-local t → this layer's local t
  const own = Array.isArray(L.motion) ? L.motion : [];
  const base = src.motion;
  const bx = num(base[0].x, 0), by = num(base[0].y, 0);// deltas from the source's first key
  const ox = num(own[0]?.x, 0), oy = num(own[0]?.y, 0);// ...applied from THIS layer's own origin

  const animates = new Set();
  for (const k of own) for (const p of ['x', 'y', 'scale', 'rot', 'opacity', 'blur']) if (k[p] != null) animates.add(p);
  const poseAt = (t) => (own.length ? motionAt(own, t) : null);
  const peel = peelTime(own);
  const ctx = { shift, bx, by, ox, oy, animates, poseAt };

  const shared = [];
  for (const k of base) {
    const t = +(num(k.t, 0) + shift).toFixed(4);
    if (t > peel + 1e-6) continue;                     // the layer has left the page by now
    shared.push(mergedSharedKey(k, own, ctx));
  }
  // Restricting extra keys to times after the pan ended silently dropped a key between two shared ones
  // (engine-doctrine/MISTAKES.md #194); keys are then sorted, because motionAt walks the track in order.
  const extra = own.filter((o) => !shared.some((sh) => near(sh.t, num(o.t, 0)))).map((o) => filledExtraKey(o, shared));
  return shared.concat(extra).sort((a, b) => num(a.t, 0) - num(b.t, 0));
}

// Throws the same errors the renderer threw, so a bad reference fails identically wherever it is caught.
export function resolvePans(data) {
  const byId = {};
  for (const L of data.layers || []) if (L.id) byId[L.id] = L;
  for (const L of data.layers || []) {
    if (typeof L.panWith !== 'string') continue;
    const src = byId[L.panWith];
    if (!src) throw new Error(`layer "${L.id || '?'}" panWith: no layer with id "${L.panWith}"`);
    if (src === L) throw new Error(`layer "${L.id}" panWith: a layer cannot pan with itself`);
    if (typeof src.panWith === 'string') throw new Error(`layer "${L.id}" panWith "${src.id}", which itself pans with another layer. Chain them off the ORIGIN so one track stays the source of truth`);
    if (!Array.isArray(src.motion) || !src.motion.length) throw new Error(`layer "${L.id}" panWith "${src.id}", but "${src.id}" has no motion track to share`);
    L.motion = mergePan(L, src);
  }
}
