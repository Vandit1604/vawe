// harness/lib/ref-measure/transition.mjs: every shot change in a decoded video, found and classified from
// pixels. A pure function of frames: V = { w, h, n, rgb } with rgb frame-major, 3 bytes a pixel (the same
// object ref-spec.mjs decodes). Nothing here starts ffmpeg or a browser.
//
// A change is a run of frames a..b: frame a-1 is the last stable old frame, frame b the first stable new
// frame, and frames = b - a + 1 is how many frame steps the change takes (a hard cut is 1).
//   cut        one step
//   crossfade  every middle frame is a*A + b*B with a + b = 1 (dip: a + b falls below 1, a fade through a colour)
//   wipe       every middle pixel is A or B where it stands, and a front crosses the frame
//   push       middle frames are A and B slid along one axis; slide = only one of them moves
//   match      a cut whose foreground shape lands where the old one stood
//   other      the whole frame changes but none of the above fits
import { r1, r2 } from '../move-fit.mjs';

const STEP = 2;
const SPIKE_MIN = 8;
const ACTIVE_MIN = 0.8;
const CHANGED_SHARE = 0.3;
const MAX_FRAMES = 60;
const PIX_TOL = 10;

function small(V, f) {
  const w = V.w >> 1, h = V.h >> 1, out = new Int16Array(w * h * 3), base = f * V.w * V.h * 3;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = base + (y * STEP * V.w + x * STEP) * 3, i = (y * w + x) * 3;
    out[i] = V.rgb[o]; out[i + 1] = V.rgb[o + 1]; out[i + 2] = V.rgb[o + 2];
  }
  return { d: out, w, h };
}

const pixDiff = (a, b, i) => Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));

function meanDiffs(V) {
  const d = new Float64Array(V.n), fs = [];
  for (let f = 0; f < V.n; f++) fs.push(small(V, f).d);
  for (let f = 1; f < V.n; f++) {
    let s = 0;
    const a = fs[f - 1], b = fs[f];
    for (let i = 0; i < a.length; i += 3) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    d[f] = s / a.length;
  }
  return d;
}

function changedShare(A, B) {
  let n = 0;
  for (let i = 0; i < A.d.length; i += 3) if (pixDiff(A.d, B.d, i) > 16) n++;
  return n / (A.d.length / 3);
}

/** Runs of changed frames: [{ a, b, spike }]. A single-frame jump far above its neighbours is a cut; a longer
 *  run counts only when frame a-1 and frame b differ over a large share of the picture. */
export function findRuns(V, d = meanDiffs(V)) {
  const runs = [], isSpike = new Uint8Array(V.n);
  for (let f = 1; f < V.n; f++) {
    const med = Math.max(0.05, d[f - 1] || 0, d[f + 1] || 0);
    if (d[f] >= SPIKE_MIN && d[f] >= 5 * med) { isSpike[f] = 1; runs.push({ a: f, b: f, spike: r1(d[f] / med) }); }
  }
  const base = [...d].slice(1).sort((x, y) => x - y)[Math.floor((V.n - 1) / 2)] || 0;
  const active = (f) => !isSpike[f] && d[f] > Math.max(ACTIVE_MIN, 3 * base);
  let f = 1;
  while (f < V.n) {
    if (!active(f)) { f++; continue; }
    let e = f;
    while (e + 1 < V.n && (active(e + 1) || (active(e + 2) && !isSpike[e + 1]))) e++;
    if (e - f + 1 >= 2 && e - f + 1 <= MAX_FRAMES) {
      const A = small(V, f - 1), B = small(V, e);
      if (changedShare(A, B) >= CHANGED_SHARE) runs.push({ a: f, b: e, spike: r1(Math.max(...d.slice(f, e + 1)) / Math.max(0.05, base)) });
    }
    f = e + 1;
  }
  return runs.sort((x, y) => x.a - y.a);
}

// F = p*A + q*B by least squares over every channel of the pixels where A and B differ.
function blendFit(A, B, F) {
  let saa = 0, sbb = 0, sab = 0, sfa = 0, sfb = 0, n = 0, contrast = 0;
  for (let i = 0; i < A.d.length; i++) {
    if (Math.abs(A.d[i] - B.d[i]) < 12) continue;
    saa += A.d[i] * A.d[i]; sbb += B.d[i] * B.d[i]; sab += A.d[i] * B.d[i]; sfa += F.d[i] * A.d[i]; sfb += F.d[i] * B.d[i];
    contrast += Math.abs(A.d[i] - B.d[i]); n++;
  }
  const det = saa * sbb - sab * sab;
  if (n < 50 || Math.abs(det) < 1e-6) return null;
  const p = (sfa * sbb - sfb * sab) / det, q = (sfb * saa - sfa * sab) / det;
  let err = 0;
  for (let i = 0; i < A.d.length; i++) {
    if (Math.abs(A.d[i] - B.d[i]) < 12) continue;
    err += Math.abs(F.d[i] - (p * A.d[i] + q * B.d[i]));
  }
  return { p, q, residual: err / Math.max(1, contrast) };
}

// Share of informative pixels (A and B differ there) in which F equals A or B where it stands.
function stillMask(A, B, F) {
  let n = 0, hit = 0, isNew = 0, sx = 0, sy = 0, ox = 0, oy = 0, no = 0;
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    const i = (y * A.w + x) * 3;
    if (pixDiff(A.d, B.d, i) < 24) continue;
    n++;
    const da = pixDiff(F.d, A.d, i), db = pixDiff(F.d, B.d, i);
    if (Math.min(da, db) <= PIX_TOL) hit++;
    if (db < da) { isNew++; sx += x; sy += y; } else { no++; ox += x; oy += y; }
  }
  return { n, purity: n ? hit / n : 0, newShare: n ? isNew / n : 0,
    newC: isNew ? [sx / isNew, sy / isNew] : null, oldC: no ? [ox / no, oy / no] : null };
}

// Best 1-D slide of source S so it lands on F along one axis: how many of F's textured lines it explains.
function slideFit(S, F, axis, range) {
  const len = axis === 'x' ? S.w : S.h, cross = axis === 'x' ? S.h : S.w;
  const at = (u, v) => (axis === 'x' ? v * S.w + u : u * S.w + v) * 3;
  const textured = [];
  for (let u = 0; u < len; u++) {
    let lo = 255 * 3, hi = 0;
    for (let v = 0; v < cross; v += 2) { const i = at(u, v), s = F.d[i] + F.d[i + 1] + F.d[i + 2]; lo = Math.min(lo, s); hi = Math.max(hi, s); }
    if (hi - lo > 45) textured.push(u);
  }
  const lineCost = (u, us) => {
    let c = 0;
    for (let v = 0; v < cross; v += 2) { const i = at(u, v), j = at(us, v); c += Math.abs(F.d[i] - S.d[j]) + Math.abs(F.d[i + 1] - S.d[j + 1]) + Math.abs(F.d[i + 2] - S.d[j + 2]); }
    return c / (cross / 2) / 3;
  };
  let best = { o: 0, covered: new Set(), score: -1 };
  for (let o = -range; o <= range; o++) {
    const covered = new Set(textured.filter((u) => u + o >= 0 && u + o < len && lineCost(u, u + o) < 6));
    const score = covered.size - 0.001 * Math.abs(o);
    if (score > best.score) best = { o, covered, score };
  }
  return { ...best, textured: textured.length };
}

function slideMiddle(A, B, F) {
  let best = null;
  for (const axis of ['x', 'y']) {
    const len = axis === 'x' ? A.w : A.h, range = len - 4;
    const a = slideFit(A, F, axis, range), b = slideFit(B, F, axis, range);
    if (!a.textured) continue;
    const union = new Set([...a.covered, ...b.covered]).size / a.textured;
    if (!best || union > best.union) best = { axis, union, oA: a.o, oB: b.o, coverA: a.covered.size / a.textured, coverB: b.covered.size / a.textured };
  }
  return best;
}

function foreground(A) {
  const hist = new Map();
  for (let i = 0; i < A.d.length; i += 3) { const k = ((A.d[i] >> 3) << 10) | ((A.d[i + 1] >> 3) << 5) | (A.d[i + 2] >> 3); hist.set(k, (hist.get(k) || 0) + 1); }
  const top = [...hist.entries()].sort((x, y) => y[1] - x[1])[0][0], bg = [(top >> 10) << 3, ((top >> 5) & 31) << 3, (top & 31) << 3];
  const m = new Uint8Array(A.d.length / 3);
  for (let i = 0; i < m.length; i++) m[i] = Math.max(Math.abs(A.d[i * 3] - bg[0]), Math.abs(A.d[i * 3 + 1] - bg[1]), Math.abs(A.d[i * 3 + 2] - bg[2])) > 24 ? 1 : 0;
  return m;
}

function shapeOverlap(A, B) {
  const ma = foreground(A), mb = foreground(B);
  let inter = 0, uni = 0, sa = 0, sb = 0;
  for (let i = 0; i < ma.length; i++) { inter += ma[i] & mb[i]; uni += ma[i] | mb[i]; sa += ma[i]; sb += mb[i]; }
  return { iou: uni ? inter / uni : 0, fgA: sa / ma.length, fgB: sb / mb.length };
}

const DIR = { x: ['left', 'right'], y: ['up', 'down'] };

function crossfadeVerdict(blends) {
  if (!blends.every(Boolean)) return null;
  const res = Math.max(...blends.map((x) => x.residual)), minSum = Math.min(...blends.map((x) => x.p + x.q));
  if (res >= 0.18) return null;
  const dip = minSum < 0.75;
  return { type: dip ? 'dip' : 'crossfade', dir: '', confidence: r2(1 - (res / 0.18) * 0.5),
    evidence: `${blends.length + 1} steps; old weight ${blends.map((x) => r2(x.p)).join(' ')}; worst residual ${r2(res)}${dip ? `; a+b falls to ${r2(minSum)}` : ''}` };
}

function slideVerdict(slides, purity) {
  const union = slides.length ? slides.reduce((s, x) => s + x.union, 0) / slides.length : 0;
  const moved = slides.filter((s) => Math.abs(s.oA) >= 2 || Math.abs(s.oB) >= 2);
  if (union < 0.85 || moved.length < Math.ceil(slides.length / 2) || purity >= 0.97) return { union, verdict: null };
  const s = moved[Math.floor(moved.length / 2)], oldMoves = Math.abs(s.oA) >= 2, newMoves = Math.abs(s.oB) >= 2;
  const dir = DIR[s.axis][(oldMoves ? s.oA : s.oB) > 0 ? 0 : 1];
  const what = oldMoves && newMoves ? 'old and new slide' : newMoves ? 'new slides over the old' : 'old slides off the new';
  return { union, verdict: { type: oldMoves && newMoves ? 'push' : 'slide', dir, confidence: r2(Math.min(1, union)),
    evidence: `${what} ${dir}; lines explained ${r2(union)}; static match ${r2(purity)}` } };
}

function wipeVerdict(still, purity) {
  if (!still.length || purity < 0.9) return null;
  const mid = still.reduce((best, s) => (Math.abs(s.newShare - 0.5) < Math.abs(best.newShare - 0.5) ? s : best));
  let dir = '';
  if (mid.newC && mid.oldC) {
    const dx = mid.oldC[0] - mid.newC[0], dy = mid.oldC[1] - mid.newC[1];
    dir = Math.abs(dx) >= Math.abs(dy) ? DIR.x[dx > 0 ? 1 : 0] : DIR.y[dy > 0 ? 1 : 0];
  }
  return { type: 'wipe', dir, confidence: r2(Math.min(1, (purity - 0.9) * 5 + 0.5)), evidence: `front moves ${dir}; pixels equal old or new in place ${r2(purity)}` };
}

function classifyMiddle(V, a, b, A, B) {
  const mids = [];
  for (let f = a; f < b; f++) mids.push(small(V, f));
  const fade = crossfadeVerdict(mids.map((F) => blendFit(A, B, F)));
  if (fade) return fade;
  const still = mids.map((F) => stillMask(A, B, F)).filter((s) => s.n > 100);
  const purity = still.length ? still.reduce((s, x) => s + x.purity, 0) / still.length : 0;
  const slide = slideVerdict(mids.map((F) => slideMiddle(A, B, F)).filter(Boolean), purity);
  if (slide.verdict) return slide.verdict;
  return wipeVerdict(still, purity) || { type: 'other', dir: '', confidence: 0.3,
    evidence: `no blend, wipe or slide fits (in-place match ${r2(purity)}, slide ${r2(slide.union)})` };
}

/** Classify one run: { type, dir, frames, startFrame, endFrame, confidence, evidence, ... }. Frames are 0-based. */
export function classifyRun(V, run) {
  const { a, b } = run, frames = b - a + 1;
  const A = small(V, a - 1), B = small(V, b);
  const out = { startFrame: a, endFrame: b, frames, spike: run.spike };
  if (frames === 1) {
    const s = shapeOverlap(A, B), changed = changedShare(A, B);
    const match = s.iou >= 0.6 && s.fgA > 0.02 && s.fgA < 0.75 && s.fgB > 0.02 && s.fgB < 0.75 && changed >= 0.15;
    return { ...out, type: match ? 'match' : 'cut', dir: '', confidence: r2(match ? Math.min(1, s.iou) : 1),
      evidence: match ? `foreground shapes overlap ${r2(s.iou)} (IoU) across the cut, ${r2(changed)} of pixels change` : `one frame step, ${r2(changed)} of pixels change; shape overlap ${r2(s.iou)}` };
  }
  return { ...out, ...classifyMiddle(V, a, b, A, B) };
}

export function findTransitions(V) {
  const kept = [];
  for (const run of findRuns(V)) {
    const c = classifyRun(V, run);
    if (c.type === 'other' && changedShare(small(V, run.a - 1), small(V, run.b)) < 0.6) continue;
    kept.push(c);
  }
  return kept;
}

/** The shots between transitions as [{ f0, f1 }] over `n` frames: a transition's own frames belong to no shot. Pure. */
export const shotSpans = (transitions, n) => transitions.reduce((acc, t) => { acc[acc.length - 1].f1 = t.startFrame; acc.push({ f0: t.endFrame, f1: n }); return acc; }, [{ f0: 0, f1: n }]);
