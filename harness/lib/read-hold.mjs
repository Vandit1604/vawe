// harness/lib/read-hold.mjs: the readable-hold rule (engine-doctrine/RULES/readable-hold.md) as a pure function.
const READ_PER_WORD = 0.6;      // prose: words x 0.6 s
const READ_FLOOR = 1.2;         // no held frame under 1.2 s
const READ_OTHER_WPS = 3;
const PROSE_WORDS = 4;
const MIN_TEXT_H = 0.02;        // share of frame height below which text is a caption or credit, not read on the way past

/** Group word tracks that arrive and settle together into lines, then compare each line's still time to its read time. Pure. */
export function readHoldProblems(tracks) {
  const words = tracks.filter((w) => w.sizeSettled >= MIN_TEXT_H && w.tOut - w.tIn > 0.3).sort((a, b) => a.tIn - b.tIn);
  const groups = [];
  for (const w of words) {
    const g = groups.find((x) => Math.abs(x.tIn - w.tIn) <= 0.5 && Math.abs(x.tSettled - w.tSettled) <= 0.5);
    if (g) g.words.push(w); else groups.push({ tIn: w.tIn, tSettled: w.tSettled, words: [w] });
  }
  const out = [];
  for (const g of groups) {
    const n = g.words.length;
    const need = n >= PROSE_WORDS ? n * READ_PER_WORD : Math.max(READ_FLOOR, n / READ_OTHER_WPS);
    const tSettled = Math.max(...g.words.map((w) => w.tSettled));
    const tOut = Math.min(...g.words.map((w) => w.tOut));
    const hold = tOut - tSettled;
    if (hold < need * 0.9) out.push({ text: g.words.map((w) => w.text).join(' '), n, tSettled, tOut, hold, need });
  }
  return out;
}

/**
 * Word tracks for readHoldProblems from the draft's text samples: every run of samples that shows one line
 * is a track per word, in at the run's first sample minus half a step, out at its last plus half a step. A
 * word of the brief's Words table that the line holds gives the settle time; without one the run's start stands
 * in for it, so the hold is the whole time on screen. Pure.
 */
export function probeTracks(samples, { step, frameH }, words = []) {
  const tracks = [];
  const open = new Map();
  const close = (key) => {
    const r = open.get(key);
    open.delete(key);
    for (const w of r.text.split(' ')) tracks.push({ text: w, sizeSettled: r.h / frameH, tIn: r.tIn, tSettled: r.tSettled, tOut: r.tOut });
  };
  for (const { t, lines } of samples) {
    const seen = new Set();
    for (const l of lines) {
      const text = l.text.replace(/\s+/g, ' ').trim();
      if (!text || !l.box) continue;
      seen.add(text);
      const r = open.get(text) || { text, h: l.box[3], tIn: Math.max(0, t - step / 2) };
      const spec = words.find((w) => typeof w.settle === 'number' && text.toLowerCase().includes(w.text.toLowerCase()));
      r.tSettled = Math.max(r.tIn, spec ? spec.settle : r.tIn);
      r.tOut = t + step / 2;
      open.set(text, r);
    }
    for (const key of [...open.keys()]) if (!seen.has(key)) close(key);
  }
  for (const key of [...open.keys()]) close(key);
  return tracks;
}
