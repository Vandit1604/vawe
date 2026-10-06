// The seconds the fresh judge looks at full size: settled moments, never a frame in flight. The brief's Words
// `settle s` times when it has them, else the calmest frame of each shot (of equal slices of the film when the
// brief names no shots). `motion` is [{ t, d, spread }]: the mean grey change that arrives at frame t (any steady rate) and the
// spread of grey levels in that frame; a blank frame is never picked while the shot shows anything else.
// Pure; harness/media/judge-fresh.mjs feeds it.

const MIN_GAP_S = 0.4;
// A frame whose grey levels spread less than this (0-255 scale) is a blank or a fade: calm, but nothing to look at.
const BLANK_SPREAD = 6;
const EDGE_S = 0.05;

const spread = (list, count) => (list.length <= count ? list : Array.from({ length: count }, (_, i) => list[Math.round((i * (list.length - 1)) / (count - 1))]));

// The change around a frame: the larger of the change into it and out of it.
const unrest = (motion, i) => Math.max(motion[i].d, motion[i + 1]?.d ?? 0);

function calmest(motion, from, to) {
  let best = null;
  const shown = motion.some((m) => m.t >= from && m.t <= to && !(m.spread < BLANK_SPREAD));
  motion.forEach((m, i) => {
    if (m.t < from || m.t > to) return;
    if (shown && m.spread < BLANK_SPREAD) return;
    const u = unrest(motion, i);
    if (!best || u < best.u || (u === best.u && m.t > best.t)) best = { t: m.t, u };
  });
  return best?.t ?? null;
}

function shotWindows(shots, dur) {
  const starts = shots.filter((s) => typeof s.start === 'number');
  return starts.map((s, i) => [s.start, typeof s.end === 'number' ? s.end : starts[i + 1]?.start ?? dur]);
}

function slices(dur, count) {
  return Array.from({ length: count }, (_, i) => [(i * dur) / count, ((i + 1) * dur) / count]);
}

/** Up to `count` second values, sorted, at least MIN_GAP_S apart, inside the film. */
export function settledMoments({ words = [], shots = [], motion, dur, count = 6 }) {
  const settles = [...new Set(words.map((w) => w.settle).filter((t) => typeof t === 'number' && t > 0 && t < dur))].sort((a, b) => a - b);
  const windows = shotWindows(shots, dur);
  const picked = settles.length ? spread(settles, count)
    : spread(windows.length ? windows : slices(dur, count), count).map(([a, b]) => calmest(motion, a, b)).filter((t) => t !== null);
  const out = [];
  for (const t of [...picked].sort((a, b) => a - b)) if (!out.length || t - out.at(-1) >= MIN_GAP_S) out.push(Math.min(t, dur - EDGE_S));
  return out;
}
