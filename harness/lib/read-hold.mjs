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
