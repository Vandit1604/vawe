// Two visible text runs painted over each other at one sampled time. Reads the draft's text probe
// (harness/media/draft-check.mjs sampleText), whose lines carry a CSS px box [x, y, w, h].

const OVERLAP_SHARE = 0.25;

const overlapShare = ([ax, ay, aw, ah], [bx, by, bw, bh]) => {
  const w = Math.min(ax + aw, bx + bw) - Math.max(ax, bx);
  const h = Math.min(ay + ah, by + bh) - Math.max(ay, by);
  const smaller = Math.min(aw * ah, bw * bh);
  return w > 0 && h > 0 && smaller > 0 ? (w * h) / smaller : 0;
};

/** The first sampled time each pair of different texts overlaps by a quarter of the smaller box. Pure. */
export function textCollisions(samples) {
  const found = new Map();
  for (const { t, lines } of samples) {
    const boxed = lines.filter((l) => l.box);
    for (let i = 0; i < boxed.length; i++) {
      for (let j = i + 1; j < boxed.length; j++) {
        const [a, b] = [boxed[i], boxed[j]];
        const key = [a.text, b.text].sort().join('\n');
        if (a.text === b.text || found.has(key) || overlapShare(a.box, b.box) < OVERLAP_SHARE) continue;
        found.set(key, { t, a: a.text, b: b.text });
      }
    }
  }
  return [...found.values()];
}

/** One advice line per collision, naming the time, both texts and the fix. Pure. */
export function textCollisionLines(samples) {
  return textCollisions(samples).map((c) => `text "${c.a}" and "${c.b}" overlap at ${c.t.toFixed(2)} s: move one, or time one out before the other comes in`);
}
