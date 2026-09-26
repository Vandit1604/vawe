// core/beats/index.js (was core/beat-bind.js, W9): a scene names a beat grid, and the film's
// joints land ON the pulse.
//
// core/beats/detect.js (was core/beats.js) has computed a grid since it was written, `make
// beatmap` has written the sidecar,
// and NOTHING on the render path ever read either: the comment in harness/media/beatmap.mjs told
// authors to snap cut times "by hand". That is the `cameraMove` failure again (engine-doctrine/MISTAKES.md
// #424) (a value produced and never consumed) so the repair has the same shape: the binding
// happens once, at boot, on the one path every render goes through, and a scene that ASKS to be
// beat-matched and cannot be throws instead of quietly rendering unmatched.
//
// Pure and I/O-free, like core/beats.js and core/spectrum.js beside it: the sidecar is fetched by
// the caller and handed in. `bindBeats` mutates the scene DATA once, pre-first-frame, so
// renderFrame(n) never sees a grid and stays a pure function of n.

import { snapToBeat } from './detect.js';

// Below this the pulse is not a pulse. Same threshold harness/media/beatmap.mjs prints as
// "WEAK, ambient/rubato, do not snap to this"; snapping to a grid that weak scatters cuts at
// times that mean nothing, which is worse than leaving them where the author put them.
const MIN_CONFIDENCE = 1.6;

// HOW FAR A JOINT MAY TRAVEL, and there is one answer. `snapToBeat` in core/beats.js already carries
// this as its own default, with the reason: past this the time the author wrote means more than the
// grid does. `harness/media/beatsync.mjs` used to hold a second opinion (half a beat, capped at
// 0.18s), which at any tempo above 60 BPM is wider than the gap between beats, so nothing was ever
// left alone and the tool's own "left as-is" report could not fire. A scene overrides per film with
// `audio.beatSync.maxShift`; the CLI with `SNAP=`.
export const DEFAULT_MAX_SHIFT = 0.12;
const FIX = 'run `make beatmap MUSIC=<the track>.wav` to write it';

/** The declaration, normalised. `null` when the scene does not ask for beat matching. */
export function beatSyncOf(data) {
  const v = data && data.audio && data.audio.beatSync;
  if (!v) return null;
  return v === true ? {} : v;
}

/** Where the grid lives: an explicit `grid`, else the sidecar `make beatmap` writes beside the bed. */
export function beatGridPath(data) {
  const cfg = beatSyncOf(data);
  if (!cfg) return null;
  if (cfg.grid) return String(cfg.grid);
  const m = data.audio.music;
  if (typeof m !== 'string' || m === 'auto')
    throw new Error('audio.beatSync needs a track to take its pulse from, and audio.music is '
      + `${JSON.stringify(m)}. Name a bed or a .wav in audio.music, or point audio.beatSync.grid `
      + 'at a .beats.json directly.');
  // Mirror the mixer's own resolution of a bare bed name (core/validate.mjs makes the same call):
  // "calm" is assets/music/calm.wav, so its grid is assets/music/calm.beats.json.
  const bare = !/[\\/]/.test(m) && !/\.[a-z0-9]+$/i.test(m);
  return bare ? `assets/music/${m}.beats.json` : m.replace(/\.wav$/i, '') + '.beats.json';
}

/** Fetch the sidecar the scene names. Throws loudly rather than returning null on a miss. */
export async function loadBeatGrid(data, fetchJson) {
  const p = beatGridPath(data);
  if (!p) return null;
  try {
    return await fetchJson(p.startsWith('/') ? p : '/' + p, 'beat grid');
  } catch (e) {
    throw new Error(`audio.beatSync names a beat grid that will not load: ${p}, ${FIX}. (${e.message})`, { cause: e });
  }
}

/**
 * A short bed LOOPS to fill the film (the Go mixer repeats music.wav), but a sidecar only covers the
 * track file: `warm` is 8 seconds, so a 20-second film has no beats past 8 and every later joint would
 * hold for want of a grid rather than for want of a pulse. A seamless bed keeps its phase, so beat b
 * recurs at b + k*period. Returns a NEW array; the caller's sidecar is never touched.
 */
export function unrollGrid(pulse, period, dur) {
  const grid = pulse.slice();
  if (!(period > 0.5) || !(dur > period + 0.1)) return grid;
  const base = grid.slice();
  for (let k = 1; k * period < dur; k++) for (const b of base) {
    const t = +(b + k * period).toFixed(4);
    if (t <= dur) grid.push(t);
  }
  grid.sort((x, y) => x - y);
  return grid;
}

/** The gap the grid itself declares: the median beat period. Median, not mean, so one dropped beat
 * in a sidecar does not stretch the reach a sting is allowed to ride from. */
export function beatPeriod(grid) {
  if (!Array.isArray(grid) || grid.length < 2) return 0;
  const gaps = [];
  for (let i = 1; i < grid.length; i++) gaps.push(grid[i] - grid[i - 1]);
  gaps.sort((a, b) => a - b);
  return gaps[gaps.length >> 1];
}

/**
 * THE POLICY, and the ONLY copy of it. Which of a film's joints move onto a grid, and by how much.
 *
 * `bindBeats` (the render path, from an `audio.beatSync` declaration) and `make beatsync` (the
 * author-time preview) both call THIS. They used to answer the question separately, with a different
 * tolerance and a different set of joints, and the CLI re-implemented the nearest-beat search rather
 * than importing `snapToBeat`, so nothing linked the two and neither knew it disagreed with the other.
 *
 * The scene must be LOWERED first (core/transitions-lower.js): a junction written as `transitions`
 * is not a cut or a seam until then, and snapping its `at` would snap a seam by its start.
 *
 * What snaps, and what does not:
 *  - `cuts` snap their `t`. A cut IS the joint; landing it on the pulse is the whole point.
 *  - `seams` snap their CENTRE (t + dur/2), because a blend is felt in the middle of its window,
 *    not at its start. A seam wrapped around an already-snapped cut therefore stays wrapped.
 *  - `stings` RIDE the joint they punctuate: they are moved by the SAME delta as the nearest cut or
 *    seam within half a beat, so an offset the author wrote is preserved exactly and a sting authored
 *    ON a cut is still on that cut afterwards. Snapping a sting independently would collapse its
 *    offset onto the cut's beat, which is why this file used to leave them alone entirely -- and
 *    leaving them alone drifts a sting off the very cut it punctuates, by up to `maxShift`. A sting
 *    that punctuates nothing (no joint within half a beat) keeps the time the author wrote.
 *    engine-doctrine/MISTAKES.md #475.
 *  - beat boundaries and bg windows need nothing: they are DERIVED from the cuts (core/junctions.js
 *    marksOf runs on the lowered scene, after this), so they follow for free. One fact, one owner.
 *
 * A joint further than `maxShift` from any beat is LEFT ALONE, snapToBeat's own refusal, honoured
 * and reported, never widened. An author who means a time writes `"snap": false` on that joint.
 */
// PER-JOINT SNAP GRANULARITY: `j.snap` may be the string "beat"/"bar"/"downbeat" instead of the
// existing boolean, naming which pulse THIS ONE joint lands on regardless of the scene's own
// `audio.beatSync.bar` default (still what every joint that leaves `snap` unset uses). Only bindBeats
// has both pulses to offer (`ctx.altGrids`); every other caller (the CLI preview, every existing
// test) passes none, so every joint keeps using the one grid it was given, unchanged.
function gridFor(snap, ctx) {
  if (snap == null || !ctx.altGrids) return ctx.grid;
  if (snap === 'bar' || snap === 'downbeat') return ctx.altGrids.bar || ctx.grid;
  if (snap === 'beat') return ctx.altGrids.fine || ctx.grid;
  throw new Error(`snap ${JSON.stringify(snap)}: must be false, "beat", "bar", or "downbeat".`);
}

function snapMark(j, kind, centre, ctx) {
  if (j.snap === false) return;                       // the author meant this time
  const grid = gridFor(typeof j.snap === 'string' ? j.snap : null, ctx);
  const to = snapToBeat(centre, grid, ctx.maxShift);
  if (to === centre) { ctx.held.push(`${kind}@${centre}`); return; }
  const delta = to - centre;
  j.t = +(j.t + delta).toFixed(3);
  ctx.shifts.push({ kind, at: centre, delta });
  ctx.moved.push({ kind, from: centre, to, drift: +Math.abs(delta).toFixed(3) });
}

function nearestShift(t, shifts, reach) {
  let best = null;
  for (const j of shifts) {
    const d = Math.abs(t - j.at);
    if (d <= reach && (!best || d < best.d)) best = { d, j };
  }
  return best;
}

// The sting is the one mark that does not have its own opinion about the grid: it punctuates a
// joint, so it goes where that joint goes. HALF A BEAT is the reach, and it is read off the grid
// rather than invented -- inside half a beat of a joint there is no other pulse a sting could be
// sitting on, so it is punctuating that joint.
function snapStings(data, grid, ctx) {
  const reach = beatPeriod(grid) / 2;
  for (const s of data.stings || []) {
    if (!s || typeof s.t !== 'number' || s.snap === false) continue;
    const best = nearestShift(s.t, ctx.shifts, reach);
    if (!best) { ctx.held.push(`sting@${s.t}`); continue; }
    const from = s.t;
    s.t = +(s.t + best.j.delta).toFixed(3);
    ctx.moved.push({ kind: 'sting', from, to: s.t, drift: +Math.abs(best.j.delta).toFixed(3), rides: best.j.kind });
  }
}

export function snapJoints(data, grid, maxShift = DEFAULT_MAX_SHIFT, altGrids = null) {
  const ctx = { grid, altGrids, maxShift, moved: [], held: [], shifts: [] };
  for (const c of data.cuts || []) if (c && typeof c.t === 'number') snapMark(c, 'cut', c.t, ctx);
  for (const s of data.seams || []) {
    if (!s || typeof s.t !== 'number') continue;
    snapMark(s, 'seam', typeof s.dur === 'number' ? +(s.t + s.dur / 2).toFixed(3) : s.t, ctx);
  }
  snapStings(data, grid, ctx);
  return { moved: ctx.moved, held: ctx.held };
}

const GRID_PIN_RX = /^beat:(\d+)$/;

/**
 * EXPLICIT GRID PINS: a cut/seam/sting's `t` may still read "beat:12" (bare, no `.start`/`.end`) here,
 * left untouched on purpose by core/timeline/relative-time.js `isGridPin` because the real grid was
 * not loaded yet. Resolved ONCE, before any nearest-beat nudging, to the exact seconds of that INDEX
 * (0-based) in `grid` (the fine pulse: an author pins to a beat, not a bar, by number). `snap` is then
 * forced false, so the nudge pass below leaves a pin exactly where it was pinned rather than treating
 * it as an ordinary authored time that happens to already sit on the grid.
 */
function resolveGridPins(data, grid) {
  const pins = [];
  const pinList = (list, kind) => {
    for (const j of list || []) {
      if (!j || typeof j.t !== 'string') continue;
      const m = GRID_PIN_RX.exec(j.t.trim());
      if (!m) continue;
      const n = Number(m[1]);
      if (!(n < grid.length)) throw new Error(`${kind} "beat:${n}": the music grid only has `
        + `${grid.length} beat(s) (0-${grid.length - 1}), ${FIX} against a longer track.`);
      const from = j.t;
      j.t = grid[n];
      j.snap = false;
      pins.push(`${kind} ${from} -> ${j.t}s`);
    }
  };
  pinList(data.cuts, 'cut');
  pinList(data.seams, 'seam');
  pinList(data.stings, 'sting');
  return pins;
}

/**
 * THE OWNER on the render path. Read the declaration, validate the grid, resolve any explicit pin,
 * apply the nudge policy above once, and say what moved.
 */
export function bindBeats(data, sidecar) {
  const cfg = beatSyncOf(data);
  if (!cfg) return null;
  if (!sidecar || typeof sidecar !== 'object')
    throw new Error(`audio.beatSync is set but no beat grid reached the render (${beatGridPath(data)}), ${FIX}.`);
  const unit = cfg.bar ? 'downbeats' : 'beats';
  const pulse = sidecar[unit];
  if (!Array.isArray(pulse) || !pulse.length)
    throw new Error(`the beat grid ${beatGridPath(data)} carries no \`${unit}\`, ${FIX}.`);
  const conf = Number(sidecar.confidence);
  if (!(conf >= MIN_CONFIDENCE))
    throw new Error(`the beat grid ${beatGridPath(data)} scored confidence ${sidecar.confidence} `
      + `(below ${MIN_CONFIDENCE}): the track has no pulse worth snapping to. Use a bed with a clear `
      + 'beat, or drop audio.beatSync.');
  const maxShift = typeof cfg.maxShift === 'number' ? cfg.maxShift : DEFAULT_MAX_SHIFT;
  const period = Number(sidecar.seconds) || 0;
  const dur = Number(data.duration) || 0;
  const grid = unrollGrid(pulse, period, dur);
  // Both pulses unrolled the SAME way, so a per-joint override (`snap:"beat"`/`"bar"`) lands on the
  // real grid rather than a different phase of it. `bar` may be absent from an older sidecar.
  const fineGrid = unrollGrid(sidecar.beats || [], period, dur);
  const barGrid = Array.isArray(sidecar.downbeats) && sidecar.downbeats.length
    ? unrollGrid(sidecar.downbeats, period, dur) : null;
  const pinned = resolveGridPins(data, fineGrid);
  const { moved, held } = snapJoints(data, grid, maxShift, { fine: fineGrid, bar: barGrid });
  return { unit, bpm: sidecar.bpm, confidence: conf, maxShift, moved, held, pinned };
}

/** One line an author can read in the render log: did the grid actually do anything? */
export function describeBind(r) {
  if (!r) return '';
  return `beatSync: ${r.bpm} BPM ${r.unit}, ${r.moved.length} joint(s) moved`
    + (r.moved.length ? ` (${r.moved.map((m) => `${m.kind} ${m.from}s → ${m.to}s`).join(', ')})` : '')
    + (r.pinned && r.pinned.length ? `, ${r.pinned.length} pinned (${r.pinned.join(', ')})` : '')
    + (r.held.length ? `, ${r.held.length} left where the author put them (>${r.maxShift}s from any beat): ${r.held.join(', ')}` : '');
}
