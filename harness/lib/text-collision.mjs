// Two visible text runs painted over each other at one sampled time. Reads the draft's text probe
// (harness/media/draft-check.mjs sampleText), whose lines carry a CSS px box [x, y, w, h], the boxes of each
// wrapped line (`rects`, when the text wraps) and the beat it sits in (`world`).

const OVERLAP_SHARE = 0.25;
const MOVING_SHARE = 0.5; // a line that moves more than this share of its own height between two samples is travelling, not placed

const overlapShare = ([ax, ay, aw, ah], [bx, by, bw, bh]) => {
  const w = Math.min(ax + aw, bx + bw) - Math.max(ax, bx);
  const h = Math.min(ay + ah, by + bh) - Math.max(ay, by);
  const smaller = Math.min(aw * ah, bw * bh);
  return w > 0 && h > 0 && smaller > 0 ? (w * h) / smaller : 0;
};

const rectsOf = (l) => (l.rects?.length ? l.rects : [l.box]);
const overlaps = (a, b) => rectsOf(a).some((ra) => rectsOf(b).some((rb) => overlapShare(ra, rb) >= OVERLAP_SHARE));
const sameLine = (a, b) => a.text === b.text && a.block === b.block;
const travelled = (a, b) => Math.hypot(a.box[0] + a.box[2] / 2 - b.box[0] - b.box[2] / 2, a.box[1] + a.box[3] / 2 - b.box[1] - b.box[3] / 2);
const isMoving = (l, neighbours) => neighbours.some((lines) => lines.some((o) => o.box && sameLine(o, l) && travelled(o, l) > MOVING_SHARE * l.box[3]));
const otherWorlds = (a, b) => a.world != null && b.world != null && a.world !== b.world;

/**
 * The first sampled time each pair of different texts overlaps by a quarter of the smaller box. A wrapped text is
 * tested line by line. Texts of two different worlds (a cut in progress) and a text that travels between samples are skipped. Pure.
 */
export function textCollisions(samples) {
  const found = new Map();
  samples.forEach(({ t, lines }, s) => {
    const boxed = lines.filter((l) => l.box);
    const near = [samples[s - 1]?.lines ?? [], samples[s + 1]?.lines ?? []];
    const moving = boxed.map((l) => isMoving(l, near));
    for (let i = 0; i < boxed.length; i++) {
      for (let j = i + 1; j < boxed.length; j++) {
        const [a, b] = [boxed[i], boxed[j]];
        const key = [a.text, b.text].sort().join('\n');
        if (a.text === b.text || found.has(key) || moving[i] || moving[j] || otherWorlds(a, b) || !overlaps(a, b)) continue;
        found.set(key, { t, a: a.text, b: b.text });
      }
    }
  });
  return [...found.values()];
}

/** One advice line per collision, naming the time, both texts and the fix. Pure. */
export function textCollisionLines(samples) {
  return textCollisions(samples).map((c) => `text "${c.a}" and "${c.b}" overlap at ${c.t.toFixed(2)} s: move one, or time one out before the other comes in`);
}
