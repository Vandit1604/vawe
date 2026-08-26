// core/beat-bind.js — a scene names a beat grid, and the film's joints land ON the pulse.
//
// core/beats.js has computed a grid since it was written, `make beatmap` has written the sidecar,
// and NOTHING on the render path ever read either: the comment in scripts/media/beatmap.mjs told
// authors to snap cut times "by hand". That is the `cameraMove` failure again (docs/MISTAKES.md
// #424) — a value produced and never consumed — so the repair has the same shape: the binding
// happens once, at boot, on the one path every render goes through, and a scene that ASKS to be
// beat-matched and cannot be throws instead of quietly rendering unmatched.
//
// Pure and I/O-free, like core/beats.js and core/spectrum.js beside it: the sidecar is fetched by
// the caller and handed in. `bindBeats` mutates the scene DATA once, pre-first-frame, so
// renderFrame(n) never sees a grid and stays a pure function of n.

import { snapToBeat } from './beats.js';

// Below this the pulse is not a pulse. Same threshold scripts/media/beatmap.mjs prints as
// "WEAK — ambient/rubato, do not snap to this"; snapping to a grid that weak scatters cuts at
// times that mean nothing, which is worse than leaving them where the author put them.
const MIN_CONFIDENCE = 1.6;

// HOW FAR A JOINT MAY TRAVEL, and there is one answer. `snapToBeat` in core/beats.js already carries
// this as its own default, with the reason: past this the time the author wrote means more than the
// grid does. `scripts/media/beatsync.mjs` used to hold a second opinion (half a beat, capped at
// 0.18s), which at any tempo above 60 BPM is wider than the gap between beats — so nothing was ever
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
    throw new Error(`audio.beatSync names a beat grid that will not load: ${p} — ${FIX}. (${e.message})`);
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
 *  - `stings` do NOT snap. A sting is punctuation hung off a junction, and authors offset one from
 *    its cut on purpose. Snapping it independently would collapse that offset onto the cut's beat.
 *  - beat boundaries and bg windows need nothing: they are DERIVED from the cuts (core/junctions.js
 *    marksOf runs on the lowered scene, after this), so they follow for free. One fact, one owner.
 *
 * A joint further than `maxShift` from any beat is LEFT ALONE — snapToBeat's own refusal, honoured
 * and reported, never widened. An author who means a time writes `"snap": false` on that joint.
 */
export function snapJoints(data, grid, maxShift = DEFAULT_MAX_SHIFT) {
  const moved = [], held = [];
  const apply = (j, kind, centre) => {
    if (j.snap === false) return;                       // the author meant this time
    const to = snapToBeat(centre, grid, maxShift);
    if (to === centre) { held.push(`${kind}@${centre}`); return; }
    j.t = +(j.t + (to - centre)).toFixed(3);
    moved.push({ kind, from: centre, to, drift: +Math.abs(to - centre).toFixed(3) });
  };
  for (const c of data.cuts || []) if (c && typeof c.t === 'number') apply(c, 'cut', c.t);
  for (const s of data.seams || []) {
    if (!s || typeof s.t !== 'number') continue;
    apply(s, 'seam', typeof s.dur === 'number' ? +(s.t + s.dur / 2).toFixed(3) : s.t);
  }
  return { moved, held };
}

/**
 * THE OWNER on the render path. Read the declaration, validate the grid, apply the policy above once,
 * and say what moved.
 */
export function bindBeats(data, sidecar) {
  const cfg = beatSyncOf(data);
  if (!cfg) return null;
  if (!sidecar || typeof sidecar !== 'object')
    throw new Error(`audio.beatSync is set but no beat grid reached the render (${beatGridPath(data)}) — ${FIX}.`);
  const unit = cfg.bar ? 'downbeats' : 'beats';
  const pulse = sidecar[unit];
  if (!Array.isArray(pulse) || !pulse.length)
    throw new Error(`the beat grid ${beatGridPath(data)} carries no \`${unit}\` — ${FIX}.`);
  const conf = Number(sidecar.confidence);
  if (!(conf >= MIN_CONFIDENCE))
    throw new Error(`the beat grid ${beatGridPath(data)} scored confidence ${sidecar.confidence} `
      + `(below ${MIN_CONFIDENCE}): the track has no pulse worth snapping to. Use a bed with a clear `
      + 'beat, or drop audio.beatSync.');
  const maxShift = typeof cfg.maxShift === 'number' ? cfg.maxShift : DEFAULT_MAX_SHIFT;
  const grid = unrollGrid(pulse, Number(sidecar.seconds) || 0, Number(data.duration) || 0);
  const { moved, held } = snapJoints(data, grid, maxShift);
  return { unit, bpm: sidecar.bpm, confidence: conf, maxShift, moved, held };
}

/** One line an author can read in the render log: did the grid actually do anything? */
export function describeBind(r) {
  if (!r) return '';
  return `beatSync: ${r.bpm} BPM ${r.unit}, ${r.moved.length} joint(s) moved`
    + (r.moved.length ? ` (${r.moved.map((m) => `${m.kind} ${m.from}s → ${m.to}s`).join(', ')})` : '')
    + (r.held.length ? `, ${r.held.length} left where the author put them (>${r.maxShift}s from any beat): ${r.held.join(', ')}` : '');
}
