// scripts/author/lightfield-model.mjs: the colour field, evaluated on the CPU, and the palette
// that best fits a photograph under it.
//
// WHY THIS EXISTS. `lightfield-seeds.mjs` and `lightfield-fit.mjs` both import this file. Neither has
// ever run: the module was never written and never committed, so both tools have died on
// `Cannot find module` since the day their imports were typed. They are the two tools that FIT a
// seed, which is the exact thing every layout change needs, so the library has been tuned by eye
// with the measuring instruments broken (docs/MISTAKES.md #332).
//
// THE ONE FACT THAT MAKES THIS POSSIBLE. The field is a stack of CSS gradients composited
// source-over, and source-over is `src*a + dst*(1-a)`. The alphas come from geometry alone: a lobe's
// position, its radii and the ramp. The colours never touch them. So at any point the painted colour
// is a WEIGHTED AVERAGE of the role colours, with weights that depend only on the seed, and the
// weights sum to 1 because the base covers the frame.
//
// That turns "which palette best matches this photograph" from a search into a linear least squares
// solve, and "which of four million layouts is closest" from a browser job at a second a shot into
// arithmetic. The whole point of the two tools upstream.
//
// WHAT IT DELIBERATELY DOES NOT MODEL, stated here rather than discovered by someone trusting the
// number: the pattern drawn over the field, the shadow falloff, the blend modes, and the `saturate()`
// filter. It also composites in sRGB while the real gradients interpolate `in oklab`. It is a RANKING
// model. `lightfield-fit.mjs` already knows this and runs it as a correction loop against real
// renders, which is where any number you report comes from.
import { fieldBlobs, RAMP, rampEnd } from '../../core/lightfield/index.js';
import { toRgb } from '../../core/lightfield/colour.js';
import { resolve } from '../../core/lightfield/options.js';

// THE BOX THE FIELD IS EVALUATED IN. It lives here, and lightfield-render.mjs re-exports it, rather
// than the other way round. Percent coordinates hide the aspect and the base gradient's angle needs
// it, so this is geometry, and geometry belongs with the model. The direction also matters
// practically: lightfield-render.mjs imports puppeteer at its first line, and lightfield-seeds.mjs
// is pure arithmetic that must not launch a browser to read two numbers.
export const W = 735, H = 420;

// The roles, in the order every caller unpacks them:
//   Object.assign(opts.colour, { bloom: hex[0], mid: hex[1], deep: hex[2], ground: hex[3], extra: … })
// Named here so the order is declared in one place instead of being an unwritten agreement between
// three files.
export const ROLES = ['bloom', 'mid', 'deep', 'ground'];

// Sample points at PIXEL CENTRES of a w-by-h grid, in percent, row-major from the top. Row-major
// from the top is not a detail: `pixels()` hands back an ffmpeg rgb24 raster in exactly that order,
// and a model that walked it the other way would score every field upside down and never say so.
export function gridPoints(w, h) {
  const pts = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) pts.push({ x: ((x + 0.5) / w) * 100, y: ((y + 0.5) / h) * 100 });
  }
  return pts;
}

export const toHex = ([r, g, b]) => '#' + [r, g, b]
  .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// ── the field, as weights ────────────────────────────────────────────────────────────────────────

// One lobe's alpha at a point. The gradient is
//   radial-gradient(rx% ry% at x% y%, C a 0%, C a*RAMP.mid RAMP.pos%, C 0 end%)
// so `rx`/`ry` are the ellipse at the gradient's 100% position and a colour stop at p% sits at p/100
// of that ellipse. Hence `d` below is already the stop position, in the same units as RAMP.pos.
function lobeAlpha({ x, y, rx, ry, a }, p, end) {
  const dx = (p.x - x) / Math.max(rx, 1e-6);
  const dy = (p.y - y) / Math.max(ry, 1e-6);
  const d = Math.sqrt(dx * dx + dy * dy) * 100;
  if (d >= end) return 0;
  if (d <= RAMP.pos) return a * (1 - (1 - RAMP.mid) * (d / RAMP.pos));
  return a * RAMP.mid * (1 - (d - RAMP.pos) / (end - RAMP.pos));
}

// The base: `linear-gradient(100deg, mix(deep,ground,.35) 0%, mix(deep,ground,.7) 52%, ground 100%)`.
// Every stop is a blend of exactly two roles, so the base contributes `1-k` of deep and `k` of ground
// and nothing else.
const BASE_DEG = 100;
function baseGroundShare(p) {
  // CSS measures the angle from "to top", clockwise, and the gradient line's length for a box is
  // |W·sinA| + |H·cosA|. Percent coordinates hide the box aspect, and the aspect is exactly what
  // decides where a 100deg line crosses the frame, so this converts back to pixels first.
  const A = (BASE_DEG * Math.PI) / 180;
  const sn = Math.sin(A), cs = Math.cos(A);
  const px = (p.x / 100) * W - W / 2;
  const py = (p.y / 100) * H - H / 2;
  const L = Math.abs(W * sn) + Math.abs(H * cs);
  const t = Math.min(1, Math.max(0, 0.5 + (px * sn - py * cs) / L));
  return t <= 0.52 ? 0.35 + (0.35 * t) / 0.52 : 0.7 + (0.3 * (t - 0.52)) / 0.48;
}

// The weight of every role at every sample point: `pts.length` rows of `nRoles` numbers, each row
// summing to 1.
//
// The blob's ROLE COMES FROM ITS POSITION IN THE ARRAY, never from matching its hex. fieldBlobs
// returns `[...accents, mid, ...lobes, deep]` by construction, and the callers hand it placeholder
// colours for the accents (`'#000000'` repeated), so hex identity would collapse several roles into
// one the moment a placeholder collided with a real value. Position is the declaration; hex is a
// guess that happens to work until it does not.
export function fieldWeights(given, nRoles, pts) {
  const opts = resolve(given);
  const blobs = fieldBlobs(opts);
  const nExtra = opts.colour.extra.length;
  const nLobes = opts.colour.lobes;
  const roleAt = (i) => {
    if (i < nExtra) return 4 + i;                       // accents, topmost
    if (i === nExtra) return 1;                         // mid
    if (i < nExtra + 1 + nLobes) return 0;              // the bloom cluster
    return 2;                                           // the deep blob, bottom-most
  };
  const end = rampEnd(opts.colour.spread);

  const rows = new Float64Array(pts.length * nRoles);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const row = rows.subarray(i * nRoles, (i + 1) * nRoles);
    const k = baseGroundShare(p);
    row[2] = 1 - k;   // deep
    row[3] = k;       // ground
    // CSS paints background-image layers with the FIRST one on top, so compositing bottom-up means
    // walking the array backwards.
    for (let b = blobs.length - 1; b >= 0; b--) {
      const a = lobeAlpha(blobs[b], p, end);
      if (a <= 0) continue;
      for (let j = 0; j < nRoles; j++) row[j] *= 1 - a;
      const r = roleAt(b);
      if (r < nRoles) row[r] += a;
      // A blob whose role is outside the requested palette (the caller asked for fewer stops than
      // the options carry) still OCCLUDES what is under it. Dropping its weight silently would let
      // the solve pay for light it cannot place, so its share is returned to the ground instead.
      else row[3] += a;
    }
  }
  return rows;
}

// ── the solve ────────────────────────────────────────────────────────────────────────────────────

// Gaussian elimination with partial pivoting on the normal equations. `n` is the number of stops,
// so it is single digits: the cost is nothing and a hand-rolled solve beats a dependency here.
function solve(AtA, Atb, n) {
  const M = Float64Array.from(AtA);
  const v = Float64Array.from(Atb);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r * n + c]) > Math.abs(M[piv * n + c])) piv = r;
    if (Math.abs(M[piv * n + c]) < 1e-9) continue;      // a role no point uses; its stop stays 0
    if (piv !== c) {
      for (let k = 0; k < n; k++) { const t = M[c * n + k]; M[c * n + k] = M[piv * n + k]; M[piv * n + k] = t; }
      const t = v[c]; v[c] = v[piv]; v[piv] = t;
    }
    for (let r = c + 1; r < n; r++) {
      const f = M[r * n + c] / M[c * n + c];
      if (!f) continue;
      for (let k = c; k < n; k++) M[r * n + k] -= f * M[c * n + k];
      v[r] -= f * v[c];
    }
  }
  const out = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    if (Math.abs(M[r * n + r]) < 1e-9) continue;
    let s = v[r];
    for (let k = r + 1; k < n; k++) s -= M[r * n + k] * out[k];
    out[r] = s / M[r * n + r];
  }
  return out;
}

const TAIL = 0.15;   // the same fraction lightfield-metrics.mjs calls the tail

// Solve for the `nRoles` stop colours that best reproduce `target` under this layout.
//
//   opts     the lightfield options (only the LAYOUT is read; the colours in them are ignored)
//   target   an rgb24 raster over the same grid as `pts`, as numbers
//   nRoles   4 + however many accents the palette may use
//   pts      from gridPoints()
//   passes   1 is a plain least squares fit. More re-solves with the worst points weighted up.
//
// WHY MORE THAN ONE PASS. A mean fit spends its accuracy where the points are, and the points are
// mostly flat background: it will happily trade the whole bloom away to shave the ground. Passes
// after the first weight each point by how badly the last fit missed it, so the few points that
// carry the picture get a vote proportional to the trouble they cause. Bounded at 4x, because
// unbounded reweighting chases whatever single pixel the model cannot express and takes the palette
// with it.
export function fitPalette(opts, target, nRoles, pts, passes = 1) {
  const A = fieldWeights(opts, nRoles, pts);
  const N = pts.length;
  let w = new Float64Array(N).fill(1);
  let stops = [];
  let mad = 0, tail = 0;

  for (let pass = 0; pass < Math.max(1, passes); pass++) {
    const AtA = new Float64Array(nRoles * nRoles);
    const Atb = [new Float64Array(nRoles), new Float64Array(nRoles), new Float64Array(nRoles)];
    for (let i = 0; i < N; i++) {
      const row = A.subarray(i * nRoles, (i + 1) * nRoles);
      const wi = w[i];
      for (let a = 0; a < nRoles; a++) {
        if (!row[a]) continue;
        for (let b = a; b < nRoles; b++) AtA[a * nRoles + b] += wi * row[a] * row[b];
        for (let c = 0; c < 3; c++) Atb[c][a] += wi * row[a] * target[i * 3 + c];
      }
    }
    for (let a = 0; a < nRoles; a++) {
      for (let b = 0; b < a; b++) AtA[a * nRoles + b] = AtA[b * nRoles + a];
      AtA[a * nRoles + a] += 1e-6;   // ridge: two lobes can overlap almost exactly and go singular
    }
    const ch = [0, 1, 2].map((c) => solve(AtA, Atb[c], nRoles));
    stops = Array.from({ length: nRoles }, (_, j) =>
      [0, 1, 2].map((c) => Math.max(0, Math.min(255, ch[c][j]))));

    // Residuals under the CLAMPED stops, because a stop out at -40 is not a colour anyone can use
    // and scoring the unclamped fit would report an accuracy the render cannot reach.
    const res = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const row = A.subarray(i * nRoles, (i + 1) * nRoles);
      let d = 0;
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let j = 0; j < nRoles; j++) v += row[j] * stops[j][c];
        d += Math.abs(v - target[i * 3 + c]);
      }
      res[i] = d / 3;
    }
    let sum = 0;
    for (let i = 0; i < N; i++) sum += res[i];
    mad = sum / N;
    const sorted = Float64Array.from(res).sort();
    const from = Math.max(0, N - Math.round(N * TAIL));
    let t = 0;
    for (let i = from; i < N; i++) t += sorted[i];
    tail = t / Math.max(1, N - from);

    if (pass + 1 < passes) {
      const next = new Float64Array(N);
      for (let i = 0; i < N; i++) next[i] = Math.min(4, Math.max(0.25, res[i] / Math.max(mad, 1e-6)));
      w = next;
    }
  }
  return { stops, mad, tail };
}

// Exported for a caller that has a palette already and only wants to know how it scores.
export function modelError(opts, target, pts) {
  const hex = [...ROLES.map((r) => resolve(opts).colour[r]), ...resolve(opts).colour.extra];
  const nRoles = hex.length;
  const A = fieldWeights(opts, nRoles, pts);
  const stops = hex.map((h) => { const { r, g, b } = toRgb(h); return [r, g, b]; });
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const row = A.subarray(i * nRoles, (i + 1) * nRoles);
    for (let c = 0; c < 3; c++) {
      let v = 0;
      for (let j = 0; j < nRoles; j++) v += row[j] * stops[j][c];
      sum += Math.abs(v - target[i * 3 + c]);
    }
  }
  return sum / (pts.length * 3);
}
