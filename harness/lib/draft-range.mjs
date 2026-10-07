// The reference range beside a draft: the draft's eye, ground and overshoot numbers, measured with the code that measured the
// reference films (ref-measure/eye-path.mjs, ground.mjs), against taste/build/ref-range.json. Advice only.
import fs from 'node:fs';
import RANGE from '../../taste/build/ref-range.json' with { type: 'json' };
import { SHAPE_METRICS } from '../dev/bar-from-refs.mjs';
import { measureEye } from './ref-measure/eye-path.mjs';
import { measureGround } from './ref-measure/ground.mjs';
import { findTransitions, shotSpans } from './ref-measure/transition.mjs';
import { decode } from './ref-measure/decode.mjs';
import { probeSize } from './frame-forensics.mjs';
import { scratch } from './scratch.mjs';

const GRID_W = 160;
const MIN_WORLDS = 2;

// `approx` marks the eye numbers: the measure is weak on soft cuts.
const ROWS = [
  { key: 'eye_jump_median_fh', label: 'eye jump at a cut (H)', approx: true },
  { key: 'eye_carried_pct', label: 'cuts that carry the eye %', approx: true },
  { key: 'eye_moved_pct', label: 'cuts that move it on %', approx: true },
  { key: 'eye_centre_pct', label: 'eye near the centre %', approx: true },
  { key: 'eye_travel_median_fh', label: 'eye travel in a shot (H)', approx: true },
  { key: 'ground_changed_pct', label: 'cuts that change the ground %' },
  { key: 'ground_turn_pct', label: 'cuts that turn the world %' },
  { key: 'ground_drift_pct', label: 'shots where the light drifts %' },
  { key: 'overshoot_pct', label: 'arrivals that overshoot %' },
];

const num = (v) => `${Math.round(v * 100) / 100}`;

/** The mark for a value against { p10, p90 }: '<' under, '>' over, '' inside or unmeasured. Pure. */
export const markOf = (value, { p10, p90 }) => (value == null ? '' : value < p10 ? '<' : value > p90 ? '>' : '');

/** The block `bin/vawe dev` prints: one line per measure, `values` is { <metric key>: number or null }. Pure. */
export function rangeLines(values, range = RANGE) {
  const rows = ROWS.map(({ key, label, approx }) => {
    const r = range.metrics[key], v = values[key] ?? null;
    return [`${approx ? '~ ' : '  '}${label}`, v == null ? 'n/a' : num(v), `${num(r.p10)}..${num(r.p90)} (${num(r.median)})`, markOf(v, r)];
  });
  const width = Math.max(...rows.map((r) => r[0].length));
  return [
    `range: ${range.films} reference films, ${range.cuts} cuts; advice; ~ eye numbers are approximate (the measure is weak on soft cuts); < under, > over`,
    `  ${'measure'.padEnd(width)}  your draft  reference p10..p90 (median)`,
    ...rows.map(([label, v, r, mark]) => `${label.padEnd(width)}  ${v.padEnd(10)}  ${r}${mark ? `  ${mark}` : ''}`),
  ];
}

/**
 * Frame spans of the measured worlds, in start order; the shots the ref-measure code reads. A world that opens while the last
 * one still shows (the starter cuts a frame early) takes the shot from it: the last frame of a shot must be its own world. Pure.
 */
export function worldShots(worlds, fps, n) {
  const shots = (worlds ?? []).filter((w) => w.start != null)
    .sort((a, b) => a.start - b.start)
    .map((w) => ({ f0: Math.min(n - 1, Math.round(w.start * fps)), f1: Math.min(n, Math.round(w.end * fps)) }));
  return shots.map((s, i) => (shots[i + 1] && shots[i + 1].f0 > s.f0 ? { ...s, f1: Math.min(s.f1, shots[i + 1].f0) } : s));
}

/** { <metric key>: number or null } of a draft video. Cuts are the world spans the page declares, or the detected transitions when the page shows fewer than two worlds. Null when there is no cut. */
export function measureDraftShape(mp4, worlds, fps) {
  const { width, height } = probeSize(mp4);
  if (!width || !height) return null;
  const dir = scratch('draft-range', `${process.pid}`);
  try {
    const V = decode(mp4, fps, dir, width, height, GRID_W);
    const declared = worldShots(worlds, fps, V.n);
    const shots = declared.length >= MIN_WORLDS ? declared : shotSpans(findTransitions(V), V.n);
    if (shots.length < MIN_WORLDS) return null;
    const spec = { eye: measureEye(V, shots, fps), ground: measureGround(V, shots, fps) };
    return Object.fromEntries(SHAPE_METRICS.filter((m) => ROWS.some((r) => r.key === m.name)).map((m) => [m.name, m.pick(spec) ?? null]));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
