// The per-film numbers of the reference bar, read from one spec.json (`bin/vawe see <film> --spec`). Pure: no decoding.
// Each number has one owner here; harness/dev/bar-from-refs.mjs takes its quantiles over films.

/** The q-quantile (0 to 1) of numbers by linear interpolation between ranks; null for none. Pure. */
export function quantile(values, q) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const at = (xs.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return xs[lo] + (xs[hi] - xs[lo]) * (at - lo);
}

const round = (x, digits) => (x === null ? null : Math.round(x * 10 ** digits) / 10 ** digits);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const MIN_MOVING_FRAMES = 3;
const MIN_WORD_LETTERS = 3;
const MAX_WORD_HEIGHT = 0.5;
const OVERSHOOT = 1.05;

/** The seconds that have at least one word on screen (union of the word intervals). Pure. */
export function coveredSeconds(words) {
  let covered = 0;
  let last = -1;
  for (const [t0, t1] of words.map((w) => [w.t0, w.t1]).sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    const from = Math.max(t0, last);
    if (t1 > from) { covered += t1 - from; last = t1; }
  }
  return covered;
}

/** Words of 3 or more letters or digits that are under half the frame high. Pure. */
export function readableWords(spec) {
  const height = spec.media.height;
  return (spec.textLines ?? []).flatMap((l) => l.words)
    .filter((w) => w.word.replace(/[^A-Za-z0-9]/g, '').length >= MIN_WORD_LETTERS && w.h / height < MAX_WORD_HEIGHT);
}

/** The tracked arrivals: elements with an easing fit and 3 or more moving frames. Pure. */
export const arrivals = (spec) => spec.shots.flatMap((s) => s.elements).filter((e) => e.easing && (e.movingFrames ?? 0) >= MIN_MOVING_FRAMES);

/** { peak_speed_median_fh_s, peak_speed_p90_fh_s, overshoot_share, text_time_share, word_dwell_s_median } of one spec.json; null where the film has nothing to measure. Pure. */
export function filmMetrics(spec) {
  const els = arrivals(spec);
  const speeds = els.filter((e) => e.peakSpeed != null).map((e) => (e.peakSpeed * spec.fps) / spec.media.height);
  const overshoots = els.filter((e) => e.overshoot != null).map((e) => e.overshoot);
  const words = readableWords(spec);
  return {
    peak_speed_median_fh_s: round(quantile(speeds, 0.5), 3),
    peak_speed_p90_fh_s: round(quantile(speeds, 0.9), 3),
    overshoot_share: overshoots.length ? round(mean(overshoots.map((o) => (o > OVERSHOOT ? 1 : 0))), 2) : null,
    text_time_share: round(coveredSeconds(words) / spec.duration, 3),
    word_dwell_s_median: words.length ? round(quantile(words.map((w) => w.t1 - w.t0), 0.5), 2) : null,
  };
}
