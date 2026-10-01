// The film against the brief's SPEC tables. Every check is { label, spec, got, dev, unit }: `dev` is how far
// the film is from the spec (Infinity when the thing was not found), in `unit`. The times to sample come from
// specTimes; the samples are the draft's text probe (harness/media/draft-check.mjs sampleSpec) and box tracks.
import { RULES } from './draft-check.mjs';

export const GRID_S = 0.05;
const WINDOW_STEPS = 5;
const REST_SHARE = 0.005;
export const APPEAR_TOL_S = 0.05;
export const LAYOUT_TOL_PCT = 1;

const round = (t) => +t.toFixed(3);
const grid = (t) => Array.from({ length: 2 * WINDOW_STEPS + 1 }, (_, k) => round(t + (k - WINDOW_STEPS) * GRID_S)).filter((x) => x >= 0);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
const has = (v) => typeof v === 'number';

/** The seconds to sample: { text, boxes }, each sorted and unique. A window of 0.25 s each side of every spec time. Pure. */
export function specTimes({ words = [], objects = [] }) {
  const sorted = (list) => [...new Set(list)].sort((a, b) => a - b);
  return {
    text: sorted(words.flatMap((w) => [...(has(w.appear) ? grid(w.appear) : []), ...(has(w.settle) ? [round(w.settle)] : [])])),
    boxes: sorted(objects.flatMap((o) => [o.in, o.settle, o.out].filter(has).flatMap(grid))),
  };
}

const lineFor = (sample, text) => {
  const lines = sample?.lines ?? [];
  return lines.find((l) => norm(l.text) === norm(text)) || lines.find((l) => norm(l.text).includes(norm(text))) || null;
};

const sampleAt = (samples, t) => samples.find((s) => Math.abs(s.t - t) < 1e-6);

const check = (label, spec, got, unit) => ({ label, spec, got, dev: got === null ? Infinity : Math.abs(got - spec), unit });

/** Per spec word: the first time its text shows vs `appear s`, then cap height, x and y at `settle s`. Pure. */
export function wordChecks(words, samples, { frameW, frameH }) {
  const out = [];
  for (const w of words) {
    if (has(w.appear)) {
      const first = grid(w.appear).find((t) => lineFor(sampleAt(samples, t), w.text));
      out.push(check(`"${w.text}" appears`, w.appear, first ?? null, 's'));
    }
    if (!has(w.settle)) continue;
    const line = lineFor(sampleAt(samples, round(w.settle)), w.text);
    const got = line && { cap: (RULES.capOfFont * line.fontPx * 100) / frameH, x: (line.box[0] * 100) / frameW, y: (line.box[1] * 100) / frameH };
    for (const [key, name] of [['cap', 'cap height'], ['x', 'x'], ['y', 'y']]) {
      if (has(w[key])) out.push(check(`"${w.text}" ${name} at ${w.settle} s`, w[key], got ? got[key] : null, '%'));
    }
  }
  return out;
}

const alphaOf = (box) => box[4];

function restTime(track, times, settle, frameW, frameH) {
  const window = grid(settle).map((t) => times.indexOf(t)).filter((k) => k >= 0 && track[k]);
  if (window.length < 2) return null;
  const last = track[window[window.length - 1]];
  const still = (k) => Math.abs(track[k][0] - last[0]) <= REST_SHARE * frameW && Math.abs(track[k][1] - last[1]) <= REST_SHARE * frameH
    && Math.abs(track[k][2] - last[2]) <= REST_SHARE * frameW && Math.abs(track[k][3] - last[3]) <= REST_SHARE * frameH;
  const first = window.findIndex((_, i) => window.slice(i).every(still));
  return times[window[first]];
}

/**
 * Per spec object: when it is half visible (`in`), when it stops moving (`settle`), when it drops under half
 * visible (`out`). `boxes` is sampleBoxTracks with { selectors }: tracks of [x, y, w, h, alpha, own], and
 * `matched`, the track index of each selector or -1. Pure.
 */
export function objectChecks(objects, boxes, { frameW, frameH }) {
  const out = [];
  objects.forEach((o, i) => {
    const track = boxes.tracks[boxes.matched[i]];
    if (!track) { out.push(check(`${o.id} (${o.selector}) found`, 0, null, 's')); return; }
    const visible = (k) => alphaOf(track[k]) >= 0.5;
    if (has(o.in)) out.push(check(`${o.id} in`, o.in, grid(o.in).find((t) => visible(boxes.times.indexOf(t))) ?? null, 's'));
    if (has(o.settle)) out.push(check(`${o.id} settle`, o.settle, restTime(track, boxes.times, o.settle, frameW, frameH), 's'));
    if (has(o.out)) out.push(check(`${o.id} out`, o.out, grid(o.out).find((t) => !visible(boxes.times.indexOf(t))) ?? null, 's'));
  });
  return out;
}

/**
 * Each shot start after the first is a cut in the spec. Where the film has a hard jump within half a second,
 * the cut must land within one frame; with no jump nearby the shot change is a soft transition and is left alone. Pure.
 */
export function cutChecks(shots, jumps, fps = 30) {
  const out = [];
  for (const s of shots.slice(1)) {
    if (!has(s.start)) continue;
    const nearest = jumps.filter((j) => Math.abs(j - s.start) <= 0.5).sort((a, b) => Math.abs(a - s.start) - Math.abs(b - s.start))[0];
    if (nearest !== undefined) out.push({ label: `${s.id} cut`, spec: s.start, got: nearest, dev: Math.abs(nearest - s.start) * fps, unit: 's', frames: true });
  }
  return out;
}

const fmt = (x, unit) => (unit === '%' ? `${x.toFixed(1)}%` : `${x.toFixed(2)} s`);

/** The advice line for one check. Pure. */
export function checkLine(c) {
  return c.got === null
    ? `${c.label}: not found within the sampled window (spec ${fmt(c.spec, c.unit)})`
    : `${c.label}: spec ${fmt(c.spec, c.unit)}, film ${fmt(c.got, c.unit)}${c.frames ? ` (${c.dev.toFixed(1)} frames off)` : ''}`;
}

/** One advice line per check outside `tol`. Pure. */
export const checkLines = (checks, tol) => checks.filter((c) => c.dev > tol + 1e-9).map(checkLine);
