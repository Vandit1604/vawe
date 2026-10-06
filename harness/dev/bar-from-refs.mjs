#!/usr/bin/env node
// The measured quality bar of the reference films: p10, median and p90 of the metrics the bar-check rules use.
//   node harness/dev/bar-from-refs.mjs <measures.json> [--json]
// Reads the file `bin/vawe spec` measurements are collected in (one entry per film with a `spec` block). Our own
// films (group "ours") and films marked `out_of_scope` are left out. The numbers go into the rules' `numbers` by hand;
// no check reads the measures file.
import fs from 'node:fs';

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

function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) {
    console.error('usage: node harness/dev/bar-from-refs.mjs <measures.json> [--json]');
    process.exit(2);
  }
  const bar = barOf(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (flag === '--json') { console.log(JSON.stringify(bar, null, 1)); return; }
  console.log(`reference films: ${bar.films}`);
  for (const m of METRICS) {
    const b = bar[m.name];
    console.log(`${m.label}: p10 ${b.p10}, median ${b.median}, p90 ${b.p90} (n ${b.n})`);
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
