#!/usr/bin/env node
// The measured quality bar of the reference films: p10, median and p90 of the metrics the bar-check rules use.
//   node harness/dev/bar-from-refs.mjs <measures.json> [--json]
// Reads the file `bin/vawe spec` measurements are collected in (one entry per film with a `spec` block). Our own
// films (group "ours") and films marked `out_of_scope` are left out. The numbers go into the rules' `numbers` by hand;
// no check reads the measures file.
import fs from 'node:fs';
import path from 'node:path';
import { refsDir, readRegistry } from '../lib/refs.mjs';

export const METRICS = [
  { name: 'peak_speed_p90_fh_s', label: 'peak speed p90 (frame heights per second)', pick: (s) => s.peak_speed_p90_fh_s },
  { name: 'overshoot_pct', label: 'arrivals that overshoot (%)', pick: (s) => s.overshoot_share * 100 },
  { name: 'text_time_pct', label: 'film time with text on screen (%)', pick: (s) => s.text_time_share * 100 },
  { name: 'word_dwell_s_median', label: 'word held on screen, median (s)', pick: (s) => s.word_dwell_s_median },
];

/** The q-quantile (0 to 1) of numbers by linear interpolation between ranks. Pure. */
export function quantile(values, q) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const at = (xs.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return xs[lo] + (xs[hi] - xs[lo]) * (at - lo);
}

const round = (x) => (x === null ? null : Math.round(x * 1000) / 1000);

/** The films that set the bar: every entry with a spec block that is not ours and not out of scope. Pure. */
export const referenceFilms = (measures) => Object.values(measures).filter((f) => f.spec && f.group !== 'ours' && !f.out_of_scope);

/** { films, <metric>: { p10, median, p90, n } } over the reference films. Pure. */
export function barOf(measures) {
  const films = referenceFilms(measures);
  const bar = { films: films.length };
  for (const m of METRICS) {
    const values = films.map((f) => m.pick(f.spec)).filter((v) => Number.isFinite(v));
    bar[m.name] = { p10: round(quantile(values, 0.1)), median: round(quantile(values, 0.5)), p90: round(quantile(values, 0.9)), n: values.length };
  }
  return bar;
}

const pct = (v) => (v == null ? null : v * 100);

const eyeMetrics = (prefix, from, note) => [
  { name: `${prefix}_jump_median_fh`, label: `eye jump at a cut, median per film (frame heights)${note}`, pick: (s) => from(s)?.jumpMedian },
  { name: `${prefix}_carried_pct`, label: `cuts where the eye is carried (jump under 0.15 H) (%)${note}`, pick: (s) => pct(from(s)?.carriedShare) },
  { name: `${prefix}_moved_pct`, label: `cuts where the eye moves on (jump over 0.35 H) (%)${note}`, pick: (s) => pct(from(s)?.movedShare) },
  { name: `${prefix}_travel_median_fh`, label: `eye travel inside a shot, median per film (frame heights)${note}`, pick: (s) => from(s)?.travelMedian },
  { name: `${prefix}_centre_pct`, label: `eye points within 0.15 H of the frame centre (%)${note}`, pick: (s) => pct(from(s)?.centreShare) },
  { name: `${prefix}_centred_shot_pct`, label: `shots whose eye stays within 0.15 H of the centre (%)${note}`, pick: (s) => pct(from(s)?.centredShotShare) },
];

// Where the eye goes and how the ground moves: one value per film, read from the eye and ground blocks of spec.json.
export const SHAPE_METRICS = [
  ...eyeMetrics('eye', (s) => s.eye?.summary, ''),
  ...eyeMetrics('eye_motion', (s) => s.eye?.summary.motion, ' (motion points only)'),
  { name: 'eye_motion_point_pct', label: 'eye points found from motion, not contrast (%)', pick: (s) => pct(s.eye?.summary.motionPointShare) },
  { name: 'ground_change_de_median', label: 'ground change at a cut, median per film (deltaE)', pick: (s) => s.ground?.summary.dEMedian },
  { name: 'ground_changed_pct', label: 'cuts where the ground changes (deltaE 6 or more) (%)', pick: (s) => pct(s.ground?.summary.changedShare) },
  { name: 'ground_turn_pct', label: 'cuts where the ground turns to a new world (deltaE over 15) (%)', pick: (s) => pct(s.ground?.summary.turnShare) },
  { name: 'ground_drift_pct', label: 'shots where the light drifts (median L change 3 or more) (%)', pick: (s) => pct(s.ground?.summary.driftShotShare) },
];

/** { films, cuts, shots, <metric>: { p10, median, p90, n } } over spec.json objects that carry an eye block. Pure. */
export function shapeBarOf(specs) {
  const withEye = specs.filter((s) => s.eye && s.ground);
  const bar = { films: withEye.length, shots: withEye.reduce((a, s) => a + s.eye.summary.shots, 0), cuts: withEye.reduce((a, s) => a + s.eye.summary.cuts, 0), motionCuts: withEye.reduce((a, s) => a + (s.eye.summary.motion?.cuts ?? 0), 0) };
  for (const m of SHAPE_METRICS) {
    const values = withEye.map((s) => m.pick(s)).filter((v) => Number.isFinite(v));
    bar[m.name] = { p10: round(quantile(values, 0.1)), median: round(quantile(values, 0.5)), p90: round(quantile(values, 0.9)), n: values.length };
  }
  return bar;
}

/** The spec.json of each registered film that has one; only films in scope unless all is true. */
export function readSpecs(dir, all = false) {
  const registry = readRegistry(dir) ?? [];
  return registry.filter((r) => r.spec && (all || r.inScope)).flatMap((r) => {
    try { return [JSON.parse(fs.readFileSync(path.join(dir, r.spec), 'utf8'))]; } catch { return []; }
  });
}

export const RANGE_KEYS = ['eye_jump_median_fh', 'eye_carried_pct', 'eye_moved_pct', 'eye_centre_pct', 'eye_travel_median_fh', 'ground_changed_pct', 'ground_turn_pct', 'ground_drift_pct'];

/** taste/build/ref-range.json: aggregates only (p10, median, p90, film count) of the numbers `bin/vawe dev` prints beside a draft. Pure. */
export function rangeOf(shapeBar, filmBar, date) {
  const metrics = Object.fromEntries([...RANGE_KEYS.map((k) => [k, shapeBar[k]]), ['overshoot_pct', filmBar.overshoot_pct]]);
  return {
    _source: `node harness/dev/bar-from-refs.mjs --range, ${date}: eye and ground from ${shapeBar.films} in-scope reference films (${shapeBar.cuts} cuts, bin/vawe spec); overshoot share from ${filmBar.overshoot_pct.n} films (measures.json); one value per film, then p10, median and p90`,
    films: shapeBar.films, cuts: shapeBar.cuts, metrics,
  };
}

function printBar(bar, metrics, heading) {
  console.log(heading);
  for (const m of metrics) {
    const b = bar[m.name];
    console.log(`${m.label}: p10 ${b.p10}, median ${b.median}, p90 ${b.p90} (n ${b.n})`);
  }
}

function main() {
  const args = process.argv.slice(2), json = args.includes('--json'), all = args.includes('--all');
  const file = args.find((a) => !a.startsWith('--'));
  if (args.includes('--range')) {
    const films = barOf(JSON.parse(fs.readFileSync(path.join(refsDir(), 'measures.json'), 'utf8')));
    console.log(JSON.stringify(rangeOf(shapeBarOf(readSpecs(refsDir())), films, new Date().toISOString().slice(0, 10)), null, 1));
    return;
  }
  if (args.includes('--refs')) {
    const bar = shapeBarOf(readSpecs(refsDir(), all));
    if (json) { console.log(JSON.stringify(bar, null, 1)); return; }
    printBar(bar, SHAPE_METRICS, `reference films: ${bar.films}, shots ${bar.shots}, cuts ${bar.cuts} (${bar.motionCuts} between two motion points)${all ? ' (all with a spec)' : ' (in scope)'}`);
    return;
  }
  if (!file) {
    console.error('usage: node harness/dev/bar-from-refs.mjs <measures.json> [--json]\n       node harness/dev/bar-from-refs.mjs --refs [--all] [--json]   (eye and ground, from ~/.vawe/refs/spec)\n       node harness/dev/bar-from-refs.mjs --range > taste/build/ref-range.json   (the aggregates bin/vawe dev prints)');
    process.exit(2);
  }
  const bar = barOf(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (json) { console.log(JSON.stringify(bar, null, 1)); return; }
  printBar(bar, METRICS, `reference films: ${bar.films}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
