// harness/lib/ref-measure/words.mjs: every APPEARANCE of a word on screen, not every distinct word.
// A repeated word ("the", a slogan word shown twice) keeps each appearance; two copies on screen at once
// stay two tracks because a track follows one box. Pure except refineWordTimes, which reads gray frames.
//
//   trackWords(samples, fps)      per-sample OCR words -> appearances { text, t0, t1, samples[] }
//   refineWordTimes(V, apps, ...)  snap t0/t1 to the frame the pixels change, not the OCR sample
//   buildLines(apps, fps)          appearances -> lines with a stagger direction
import { r1, r3, median } from '../move-fit.mjs';

export const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const MAX_GAP_SAMPLES = 2;
const STILL_GAP_SAMPLES = 6;
const MAX_STAGGER_S = 1;

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return row[b.length];
}

// A misread ("Stylo" for "Style") is the same word: one edit for 4+ letters, two for 8+.
const sameWord = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && levenshtein(a, b) <= (Math.min(a.length, b.length) >= 8 ? 2 : 1));

// One or two characters are usually noise (a stray "4", "bd"): keep them only when read strongly and for long.
function keepTrack(tr) {
  const n = tr.samples.length, conf = tr.samples.reduce((s, x) => s + x.conf, 0) / n;
  if (tr.key.length < 2) return false;
  if (tr.key.length === 2) return n >= 3 && conf >= 85;
  return n >= 2 || (tr.samples[0].conf >= 85 && tr.key.length >= 4);
}
const REST_QUANTILE = 0.25;
const ONSET = 0.98;
const q = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];

/**
 * samples: [{ t, words: [{ text, conf, cx, cy, w, h }] }] in one length unit (reference px).
 * A word joins the open track of the same text whose last box is nearest, within 3 box heights or one
 * width; a track survives one missed sample (OCR flicker). A single-sample track is kept only when
 * the read was strong, since a lone weak read is usually noise.
 */
export function trackWords(samples, fps) {
  const tracks = [];
  samples.forEach((s, i) => {
    const pairs = [];
    s.words.forEach((w, wi) => {
      for (const tr of tracks) {
        if (tr.last < i - STILL_GAP_SAMPLES || !sameWord(tr.key, norm(w.text))) continue;
        const p = tr.samples[tr.samples.length - 1];
        const d = Math.hypot(w.cx - p.cx, w.cy - p.cy);
        const still = d <= 0.5 * Math.max(w.h, p.h);
        if (tr.last < i - MAX_GAP_SAMPLES && !still) continue;
        if (d <= Math.max(3 * Math.max(w.h, p.h), w.w)) pairs.push({ tr, wi, d });
      }
    });
    const usedT = new Set(), usedW = new Set();
    for (const p of pairs.sort((a, b) => a.d - b.d)) {
      if (usedT.has(p.tr) || usedW.has(p.wi) || p.tr.last === i) continue;
      usedT.add(p.tr); usedW.add(p.wi);
      p.tr.samples.push({ t: s.t, ...s.words[p.wi] });
      p.tr.last = i;
      if (s.words[p.wi].conf >= Math.max(...p.tr.samples.map((x) => x.conf))) p.tr.key = norm(s.words[p.wi].text);
    }
    s.words.forEach((w, wi) => {
      if (!usedW.has(wi)) tracks.push({ key: norm(w.text), last: i, samples: [{ t: s.t, ...w }] });
    });
  });
  return tracks
    .filter(keepTrack)
    .map((tr) => {
      const seen = tr.samples;
      const text = seen.reduce((b, s) => (s.conf > b.conf ? s : b)).text;
      return { text, t0: seen[0].t, t1: seen[seen.length - 1].t, samples: seen };
    })
    .sort((a, b) => a.t0 - b.t0 || a.samples[0].cx - b.samples[0].cx);
}

// The box at rest: a low quantile of width and height, because blur only ever grows a box.
export function restBox(appearance) {
  const s = appearance.samples;
  return { w: q(s.map((x) => x.w), REST_QUANTILE), h: q(s.map((x) => x.h), REST_QUANTILE),
    x: median(s.map((x) => x.cx)), y: median(s.map((x) => x.cy)) };
}

/**
 * Snap each appearance's t0 and t1 to the pixels. d(f) is the mean gray distance of the word's box
 * from the box at the rest frame. Before the word arrives d is large and falls as it fades or wipes
 * in: t0 is the first frame where it has fallen below 85% of its early value. t1 mirrors it.
 * V: { w, h, frame(i), n }, W the reference width in px, fps the decode rate. Error: one decode frame.
 */
export function refineWordTimes(V, apps, W, fps, windowS = 0.5) {
  const k = V.w / W;
  return apps.map((a) => {
    const b = restBox(a);
    const x0 = Math.max(0, Math.floor((b.x - b.w / 2) * k) - 1), x1 = Math.min(V.w - 1, Math.ceil((b.x + b.w / 2) * k) + 1);
    const y0 = Math.max(0, Math.floor((b.y - b.h / 2) * k) - 1), y1 = Math.min(V.h - 1, Math.ceil((b.y + b.h / 2) * k) + 1);
    const restF = Math.min(V.n - 1, Math.round(((a.t0 + a.t1) / 2) * fps));
    const rest = V.frame(restF);
    const dist = (f) => {
      const g = V.frame(f);
      let s = 0, n = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { s += Math.abs(g[y * V.w + x] - rest[y * V.w + x]); n++; }
      return n ? s / n : 0;
    };
    const win = Math.round(windowS * fps);
    const inF = Math.round(a.t0 * fps), outF = Math.round(a.t1 * fps);
    let t0 = a.t0, t1 = a.t1;
    const from = Math.max(0, inF - win);
    const early = Math.max(...Array.from({ length: inF - from + 1 }, (_, i) => dist(from + i)));
    if (early >= 3) {
      let f = inF;
      while (f > from && dist(f - 1) < ONSET * early) f--;
      t0 = f / fps;
    }
    const to = Math.min(V.n - 1, outF + win);
    const late = Math.max(...Array.from({ length: to - outF + 1 }, (_, i) => dist(outF + i)));
    if (late >= 3) {
      let f = Math.max(restF, outF - win);
      while (f < to && dist(f) < (1 - ONSET) * late) f++;
      t1 = f / fps;
    }
    return { ...a, t0: r3(Math.min(t0, a.t0)), t1: r3(t1), refined: true };
  });
}

const overlapsX = (a, b) => Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2) > 0.5 * Math.min(a.w, b.w);

/** Appearances -> [{ index, text, y, t0, t1, stagger, stepS, words[] }], words in reveal order. */
export function buildLines(apps, fps) {
  const items = apps.map((a) => ({ a, box: restBox(a) })).sort((p, r) => p.a.t0 - r.a.t0 || p.box.x - r.box.x);
  const lines = [];
  for (const it of items) {
    const home = lines.find((l) => Math.abs(l.y - it.box.y) <= 0.6 * Math.max(l.h, it.box.h)
      && it.a.t0 - l.lastT0 <= MAX_STAGGER_S && !l.items.some((o) => o.a.t1 >= it.a.t0 && overlapsX(o.box, it.box)));
    if (home) {
      home.items.push(it);
      home.lastT0 = it.a.t0;
      home.t1 = Math.max(home.t1, it.a.t1);
      home.y = median(home.items.map((o) => o.box.y));
      home.h = median(home.items.map((o) => o.box.h));
    } else lines.push({ y: it.box.y, h: it.box.h, t0: it.a.t0, t1: it.a.t1, lastT0: it.a.t0, items: [it] });
  }
  return lines.map((l, i) => {
    const byTime = [...l.items].sort((p, r) => p.a.t0 - r.a.t0 || p.box.x - r.box.x);
    const stag = stagger(byTime, fps);
    const inX = [...l.items].sort((p, r) => p.box.x - r.box.x);
    return { index: i + 1, text: inX.map((o) => o.a.text).join(' '), y: r1(l.y), h: r1(l.h), t0: r3(l.t0), t1: r3(l.t1), ...stag,
      words: byTime.map((o) => ({ word: o.a.text, line: i + 1, t0: r3(o.a.t0), t1: r3(o.a.t1), x: r1(o.box.x), y: r1(o.box.y), w: r1(o.box.w), h: r1(o.box.h) })) };
  });
}

function stagger(byTime, fps) {
  const eps = 1.5 / fps;
  if (byTime.length < 2) return { stagger: 'single', stepS: 0 };
  const t = byTime.map((o) => o.a.t0);
  if (t[t.length - 1] - t[0] <= eps) return { stagger: 'all-at-once', stepS: 0 };
  let up = 0, down = 0;
  const steps = [];
  for (let i = 1; i < byTime.length; i++) {
    if (t[i] - t[i - 1] <= eps) continue;
    steps.push(t[i] - t[i - 1]);
    if (byTime[i].box.x > byTime[i - 1].box.x) up++; else down++;
  }
  const frac = up / Math.max(1, up + down);
  return { stagger: frac >= 0.8 ? 'left-to-right' : frac <= 0.2 ? 'right-to-left' : 'mixed', stepS: r3(median(steps)) };
}
