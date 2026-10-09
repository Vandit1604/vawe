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

const MOVE_PX = 2; // between two samples 1/30 s apart: slower than this is a drift, not a move
const CROSS_SAMPLES = 3;
const idOf = (l) => `${l.text}\u0000${l.block}`;
const moved = (a, b) => a.box.some((v, k) => Math.abs(v - b.box[k]) > MOVE_PX);

/** Texts of one source: the same data-id or view-transition-name, one element, or one inside the other. */
const sameSource = (a, b) => (a.source != null && a.source === b.source) || (a.own != null && b.own != null && (a.own === b.own || a.up?.includes(b.own) || b.up?.includes(a.own)));

const movingIds = (cur, prev, next) => {
  const ids = new Set();
  for (const l of cur) if ([prev, next].some((m) => m?.get(idOf(l)) && moved(l, m.get(idOf(l))))) ids.add(idOf(l));
  return ids;
};

/**
 * Two different texts whose boxes overlap for at least CROSS_SAMPLES consecutive samples while both move: the words cross during a move,
 * which the settled check skips. `samples` are the dense text samples (harness/media/draft-check.mjs sampleTextMotion). Texts of one
 * source, of two worlds, and pairs the settled check already names are skipped. Pure.
 */
export function textCrossings(samples, settled = []) {
  const named = new Set(settled.map((c) => [c.a, c.b].sort().join('\n')));
  const bySample = samples.map(({ lines }) => new Map(lines.filter((l) => l.box).map((l) => [idOf(l), l])));
  const runs = new Map();
  const found = [];
  samples.forEach(({ t }, s) => {
    const lines = [...bySample[s].values()];
    const moving = movingIds(lines, bySample[s - 1], bySample[s + 1]);
    const live = new Set();
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const [a, b] = [lines[i], lines[j]];
        if (a.text === b.text || !moving.has(idOf(a)) || !moving.has(idOf(b)) || otherWorlds(a, b) || sameSource(a, b) || !overlaps(a, b)) continue;
        const key = [idOf(a), idOf(b)].sort().join('\n');
        live.add(key);
        const run = runs.get(key) ?? { from: t, n: 0, a: a.text, b: b.text };
        run.n += 1;
        run.to = t;
        runs.set(key, run);
        const textKey = [a.text, b.text].sort().join('\n');
        if (run.n === CROSS_SAMPLES && !named.has(textKey)) { found.push(run); named.add(textKey); }
      }
    }
    for (const key of runs.keys()) if (!live.has(key)) runs.delete(key);
  });
  return found.map(({ from, to, a, b }) => ({ t: from, to, a, b }));
}

/** One advice line per collision, naming the time, both texts and the fix. `moving` is the dense text samples, for the crossings during a move. Pure. */
export function textCollisionLines(samples, moving = []) {
  const settled = textCollisions(samples);
  const crossings = textCrossings(moving, settled);
  return [
    ...settled.map((c) => `text "${c.a}" and "${c.b}" overlap at ${c.t.toFixed(2)} s: move one, or time one out before the other comes in`),
    ...crossings.map((c) => `text "${c.a}" and "${c.b}" cross while moving from ${c.t.toFixed(2)} to ${c.to.toFixed(2)} s: keep their paths apart, or time one out before the other comes in`),
  ];
}
