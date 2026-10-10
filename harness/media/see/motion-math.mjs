// Pure parts of the motion read of `vawe see`: when the picture starts moving, peaks and settles, per frame, against the film's own noise.
// No I/O and no heavy imports.

const NOISE_SHARE = 0.2;
const START_SIGMA = 6;
const END_SIGMA = 2.5;
const START_PEAK_SHARE = 0.03;
const END_PEAK_SHARE = 0.02;
const ABS_MIN = 0.02;
const MIN_STOP_S = 0.17;
const MIN_BURST_FRAMES = 2;

const round = (n, d = 3) => +n.toFixed(d);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };

/** { mu, sigma } of an energy series [{ t, v }]: the median and the robust spread (1.4826 times the MAD) of its quietest fifth. */
export function noiseOf(series) {
  if (!series.length) return { mu: 0, sigma: 0 };
  const quiet = series.map((p) => p.v).sort((a, b) => a - b).slice(0, Math.max(3, Math.ceil(series.length * NOISE_SHARE)));
  const mu = median(quiet);
  return { mu, sigma: 1.4826 * median(quiet.map((v) => Math.abs(v - mu))) };
}

/** The series with each value replaced by the median of itself and its two neighbours: a one-frame spike (an encoder keyframe, a pop) goes, a move of two frames or more stays. */
export const despike = (series) => series.map((p, i) => ({ t: p.t, v: median([series[Math.max(0, i - 1)].v, p.v, series[Math.min(series.length - 1, i + 1)].v]) }));

/** The sample spacing of a series in seconds (the median gap). */
export function stepOf(series) {
  const gaps = series.slice(1).map((p, i) => p.t - series[i].t).filter((g) => g > 1e-6);
  return gaps.length ? median(gaps) : 0.1;
}

/**
 * What a per-frame energy series [{ t, v }] says about the window [from, to): the bursts of motion (a burst opens above mu + 6 sigma and
 * closes below mu + 2.5 sigma, both raised to a share of the window's peak so a noise-free file still has a scale), bursts closer than
 * 0.17 s joined (a spring turning at its far end is one move), a burst of one frame dropped (that is a cut or a pop). Energy of frame k
 * is the change from frame k-1, so a burst starts one step before its first sample.
 */
export function readMotion(raw, from, to, noise = noiseOf(raw)) {
  const series = despike(raw);
  const inside = series.filter((p) => p.t >= from - 1e-9 && p.t < to - 1e-9);
  if (!inside.length) return null;
  const step = stepOf(series);
  const peak = inside.reduce((m, p) => (p.v > m.v ? p : m), inside[0]);
  const hi = Math.max(noise.mu + START_SIGMA * noise.sigma, START_PEAK_SHARE * peak.v, ABS_MIN);
  const lo = Math.max(noise.mu + END_SIGMA * noise.sigma, END_PEAK_SHARE * peak.v, ABS_MIN / 2);
  if (peak.v < hi) return { moving: false, peak: round(peak.v, 2), mean: round(inside.reduce((s, p) => s + p.v, 0) / inside.length, 3) };
  const runs = [];
  for (let i = 0; i < inside.length; i++) {
    if (inside[i].v < hi) continue;
    let a = i, e = i;
    while (a > 0 && inside[a - 1].v > lo) a--;
    while (e + 1 < inside.length && inside[e + 1].v > lo) e++;
    runs.push({ a, e });
    i = e;
  }
  const joined = [];
  for (const b of runs) {
    const last = joined.at(-1);
    if (last && inside[b.a].t - inside[last.e].t < MIN_STOP_S + 1e-9) last.e = b.e;
    else joined.push({ ...b });
  }
  const bursts = joined.filter((b) => b.e - b.a + 1 >= MIN_BURST_FRAMES).map((b) => {
    const seg = inside.slice(b.a, b.e + 1);
    const top = seg.reduce((m, p) => (p.v > m.v ? p : m), seg[0]);
    return { t0: round(inside[b.a].t - step), t1: round(inside[b.e].t), peak: round(top.v, 2), peakAt: round(top.t) };
  });
  if (!bursts.length) return { moving: false, peak: round(peak.v, 2), mean: round(inside.reduce((s, p) => s + p.v, 0) / inside.length, 3) };
  const edge = inside.at(-1).t;
  return {
    moving: true,
    peak: round(peak.v, 2),
    peakAt: round(peak.t),
    mean: round(inside.reduce((s, p) => s + p.v, 0) / inside.length, 3),
    start: bursts[0].t0,
    startedBefore: bursts[0].t0 <= inside[0].t - step + 1e-9,
    settle: bursts.at(-1).t1,
    settled: bursts.at(-1).t1 < edge - 1e-9,
    bursts,
  };
}
