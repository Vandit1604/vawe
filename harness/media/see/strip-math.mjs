// Pure parts of `vawe strip`: the window around a moment, the cuts of a film, and when the motion in a window starts and settles.
// No I/O and no heavy imports: harness/cli/verbs.mjs loads this file to check the arguments.

export const STRIP_SPAN = 1;
export const STRIP_FPS = 8;
const BURST_GAP_S = 0.2;
const MOTION_SHARE = 0.1;
const SAMPLE_S = 0.1;

const round = (n) => +n.toFixed(3);

/** The first problem in the arguments of strip, or null. Pure. */
export function stripProblem({ at, cuts, span, fps }) {
  if (cuts && at !== undefined) return 'give --at <s> or --cuts, not both';
  if (!cuts && at === undefined) return 'missing --at <s> (the moment to look at) or --cuts (one strip per world change or shot cut)';
  if (!cuts && !(Number.isFinite(Number(at)) && Number(at) >= 0)) return `--at is not a number of seconds: "${at}"`;
  if (!(span > 0)) return '--span must be more than 0 seconds';
  if (!(fps >= 1 && fps <= 30)) return '--fps must be from 1 to 30';
  return null;
}

/** The window { from, to } of `span` seconds centred on `at`, moved to stay inside [0, dur] (shorter than `span` only when the film is). Pure. */
export function stripWindow(at, span, dur) {
  const len = Math.min(span, dur);
  const from = Math.max(0, Math.min(at - len / 2, dur - len));
  return { from: round(from), to: round(from + len) };
}

/** The world changes of measured spans [{ id, start, end }]: [{ at, from, to }], `at` the middle between the end of the world before and the start of the next. Worlds never shown are skipped. Pure. */
export function worldCuts(spans) {
  const shown = spans.filter((s) => s.start != null).sort((a, b) => a.start - b.start);
  const cuts = [];
  let last = shown[0];
  for (const s of shown.slice(1)) {
    cuts.push({ at: round((last.end + s.start) / 2), from: last.id, to: s.id });
    if (s.end > last.end) last = s;
  }
  return cuts;
}

/** The cuts of a reference from its measured shots [{ start }]: one at the start of each shot after the first. Pure. */
export const shotCuts = (shots) => shots.slice(1).map((s, i) => ({ at: round(s.start), from: `shot ${i + 1}`, to: `shot ${i + 2}` }));

/**
 * What the energy series (one { t, v } per 0.1 s) says about the motion inside [from, to): where it starts, peaks and settles, and how many
 * separate bursts it has. Motion is energy above `floor` and above a tenth of the window's peak. A dip of under 0.2 s does not split a burst,
 * so a spring turning at its far end stays one burst: energy cannot tell an overshoot from a second move, and this does not claim to. Pure.
 */
export function motionRead(energy, from, to, floor) {
  const inside = energy.filter((p) => p.t >= from - 1e-9 && p.t < to - 1e-9);
  if (!inside.length) return null;
  const peak = inside.reduce((m, p) => (p.v > m.v ? p : m), inside[0]);
  if (peak.v < floor) return { moving: false, peak: round(peak.v) };
  const threshold = Math.max(floor, MOTION_SHARE * peak.v);
  const bursts = [];
  for (const p of inside.filter((x) => x.v > threshold)) {
    const open = bursts.at(-1);
    if (open && p.t - open.t1 < BURST_GAP_S - 1e-9) open.t1 = p.t + SAMPLE_S;
    else bursts.push({ t0: p.t, t1: p.t + SAMPLE_S });
  }
  const end = inside.at(-1).t + SAMPLE_S;
  return {
    moving: true,
    peak: +peak.v.toFixed(2),
    peakAt: round(peak.t),
    start: round(bursts[0].t0),
    startedBefore: bursts[0].t0 <= inside[0].t + 1e-9,
    settle: round(bursts.at(-1).t1),
    settled: bursts.at(-1).t1 < end - 1e-9,
    bursts: bursts.map((b) => ({ t0: round(b.t0), t1: round(b.t1) })),
  };
}

/** The lines that say a motionRead in words: the numbers an agent can act on. Pure. */
export function motionLines(read, floor) {
  if (!read) return ['motion: no energy samples in this window'];
  if (!read.moving) return [`motion: nothing moves in this strip (peak energy ${read.peak}, under ${floor})`];
  const start = read.startedBefore ? `already moving at the strip start (${read.start.toFixed(2)} s)` : `starts ${read.start.toFixed(2)} s`;
  const settle = read.settled ? `settles ${read.settle.toFixed(2)} s` : 'still moving at the strip end';
  const lines = [`motion: ${start}, peaks ${read.peak} at ${read.peakAt.toFixed(2)} s, ${settle}; ${read.bursts.length} burst${read.bursts.length === 1 ? '' : 's'}`];
  if (read.bursts.length > 1) lines.push(`bursts: ${read.bursts.map((b) => `${b.t0.toFixed(2)}-${b.t1.toFixed(2)} s`).join(', ')} (a second move, or a spring coming back: read the frames)`);
  return lines;
}

/** The energy rows of a window, one line per 0.1 s with a bar, or one line of numbers when `compact`. Pure. */
export function energyLines(energy, from, to, { compact = false } = {}) {
  const rows = energy.filter((p) => p.t >= from - 1e-9 && p.t < to - 1e-9);
  if (compact) return [`energy per 0.1 s from ${(rows[0]?.t ?? from).toFixed(1)} s: ${rows.map((p) => p.v.toFixed(1)).join(' ')}`];
  const top = Math.max(1, ...rows.map((p) => p.v));
  return ['energy per 0.1 s:', ...rows.map((p) => `  ${p.t.toFixed(2)} s  ${p.v.toFixed(2).padStart(6)}  ${'#'.repeat(Math.round((20 * p.v) / top))}`)];
}

/** The film name a mp4 of out/ belongs to: `out/<name>.mp4`, `<name>-draft.mp4` or `<name>.web.mp4` give <name>. Pure. */
export const filmNameOf = (file) => file.split('/').pop().replace(/\.(web\.)?mp4$/, '').replace(/-draft$/, '');
