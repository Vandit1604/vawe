// harness/lib/ref-measure/camera.mjs: the camera of a film between two frames: zoom, pan and turn of the whole picture. A pure function of
// two grey frames (Uint8Array, w by h); nothing here starts ffmpeg or a browser.

export const halfRes = (g, w, h) => {
  const w2 = w >> 1, h2 = h >> 1, out = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const i = 2 * y * w + 2 * x;
    out[y * w2 + x] = (g[i] + g[i + 1] + g[i + w] + g[i + w + 1]) / 4;
  }
  return out;
};

const EDGE_GRADIENT = 12;
const MIN_EDGE_POINTS = 60;
const TRUNCATE = 30;
const FIT_SHARE = 0.7;
export const DEG = Math.PI / 180;

// B(x) = A(c + (x - c)/s - d): trimmed mean error (lowest 60%), so moving elements do not vote.
function camCost(A, B, w, h, s, dx, dy, hist) {
  hist.fill(0);
  let n = 0;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let y = 6; y < h - 6; y += 2) for (let x = 6; x < w - 6; x += 2) {
    const sx = cx + (x - cx) / s - dx, sy = cy + (y - cy) / s - dy;
    if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) continue;
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, i = y0 * w + x0;
    const a = A[i] * (1 - fx) * (1 - fy) + A[i + 1] * fx * (1 - fy) + A[i + w] * (1 - fx) * fy + A[i + w + 1] * fx * fy;
    hist[Math.min(255, Math.round(Math.abs(B[y * w + x] - a)))]++;
    n++;
  }
  let keep = Math.floor(n * 0.6);
  const want = keep || 1;
  let sum = 0;
  for (let b = 0; b < 256 && keep > 0; b++) { const c = Math.min(hist[b], keep); sum += c * b; keep -= c; }
  return n ? sum / want : Infinity;
}

/** The camera { s, dx, dy } that carries frame A onto frame B between two neighbouring frames (half-resolution grey planes, w by h); no zoom, pan or turn is { s: 1, dx: 0, dy: 0 }. */
export function estimateCamera(A, B, w, h) {
  const hist = new Uint32Array(256);
  const cost = (s, dx, dy) => camCost(A, B, w, h, s, dx, dy, hist) + 1e-3 * (Math.abs(dx) + Math.abs(dy) + Math.abs(s - 1) * 100);
  const c0 = cost(1, 0, 0);
  const still = { s: 1, dx: 0, dy: 0 };
  if (c0 < 0.4) return still;
  let best = { ...still, cost: c0 };
  const tryc = (s, dx, dy) => { const v = cost(s, dx, dy); if (v < best.cost) best = { s, dx, dy, cost: v }; };
  for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) tryc(1, dx, dy);
  for (let s = 0.9; s <= 1.101; s += 0.02) tryc(s, 0, 0);
  for (const step of [1, 1, 0.5, 0.5, 0.25]) {
    const b = { ...best };
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) tryc(b.s, b.dx + i * step, b.dy + j * step);
    const b2 = { ...best };
    for (const k of [-2, -1, 1, 2]) tryc(b2.s + k * step * 0.01, b2.dx, b2.dy);
  }
  return best.cost > c0 * 0.97 ? still : { s: best.s, dx: best.dx, dy: best.dy };
}

// The sample points of A on an edge (a step of EDGE_GRADIENT grey levels to a neighbour); null when there are too few: a flat ground says nothing about the camera.
function edgePoints(A, w, h) {
  const edges = [];
  for (let y = 6; y < h - 6; y += 2) {
    for (let x = 6; x < w - 6; x += 2) {
      const i = y * w + x;
      if (Math.abs(A[i + 1] - A[i - 1]) >= EDGE_GRADIENT || Math.abs(A[i + w] - A[i - w]) >= EDGE_GRADIENT) edges.push(i);
    }
  }
  return edges.length >= MIN_EDGE_POINTS ? edges : null;
}

// The bilinear value of A at (x, y), or NaN outside the picture.
function sampleAt(A, w, h, x, y) {
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return NaN;
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
  return A[i] * (1 - fx) * (1 - fy) + A[i + 1] * fx * (1 - fy) + A[i + w] * (1 - fx) * fy + A[i + w + 1] * fx * fy;
}

function solve4(H, g) {
  const M = H.map((row, i) => [...row, g[i]]);
  for (let c = 0; c < 4; c++) {
    let p = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 4; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 5; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[4] / row[i]);
}

const LK_ITERATIONS = 14;
const LK_HUBER = 12;

/** The mean error over the points of A carried by a similarity (a, b, tx, ty), each error cut at TRUNCATE grey levels. */
function truncatedCost(A, B, w, h, pts, a, b, tx, ty) {
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  let sum = 0, n = 0;
  for (const p of pts) {
    const x = p % w, y = (p - x) / w, u = x - cx, v = y - cy;
    const val = sampleAt(A, w, h, cx + a * u + b * v + tx, cy - b * u + a * v + ty);
    if (!Number.isFinite(val)) continue;
    sum += Math.min(TRUNCATE, Math.abs(B[p] - val)); n++;
  }
  return n ? sum / n : Infinity;
}

const MIN_QUADRANT_POINTS = 15;

/** True when the fit lowers the edge error by 30% in at least three of the four quadrants of the frame: a camera moves the whole picture, a moving element only its own corner. */
function explainsQuadrants(A, B, w, h, pts, [a, b, tx, ty]) {
  let good = 0;
  for (const q of [0, 1, 2, 3]) {
    const mine = pts.filter((p) => ((p % w) >= w / 2 ? 1 : 0) + (p / w >= h / 2 ? 2 : 0) === q);
    if (mine.length < MIN_QUADRANT_POINTS) continue;
    if (truncatedCost(A, B, w, h, mine, a, b, tx, ty) <= FIT_SHARE * truncatedCost(A, B, w, h, mine, 1, 0, 0, 0)) good++;
  }
  return good >= 3;
}

/**
 * The zoom, pan and turn that carry A onto B when the camera moves a fraction of a pixel a frame: Gauss-Newton on the similarity
 * B(x) = A(c + M (x - c) + t), M = [[a, b], [-b, a]], over the edge points with Huber weights. The fit stands only when it explains the edges, so a
 * picture that is one big moving element gives still. Returns { s, dx, dy, r } (r in radians) or null.
 */
function estimateSlowCamera(A, B, w, h) {
  const pts = edgePoints(A, w, h);
  if (!pts) return null;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  let a = 1, b = 0, tx = 0, ty = 0;
  for (let it = 0; it < LK_ITERATIONS; it++) {
    const H = Array.from({ length: 4 }, () => [0, 0, 0, 0]), g = [0, 0, 0, 0];
    for (const p of pts) {
      const x = p % w, y = (p - x) / w, u = x - cx, v = y - cy;
      const xa = cx + a * u + b * v + tx, ya = cy - b * u + a * v + ty;
      const val = sampleAt(A, w, h, xa, ya), gx = (sampleAt(A, w, h, xa + 1, ya) - sampleAt(A, w, h, xa - 1, ya)) / 2, gy = (sampleAt(A, w, h, xa, ya + 1) - sampleAt(A, w, h, xa, ya - 1)) / 2;
      if (!Number.isFinite(val + gx + gy)) continue;
      const e = B[p] - val, wt = Math.abs(e) <= LK_HUBER ? 1 : LK_HUBER / Math.abs(e);
      const J = [gx * u + gy * v, gx * v - gy * u, gx, gy];
      for (let i = 0; i < 4; i++) { g[i] += wt * J[i] * e; for (let j = 0; j < 4; j++) H[i][j] += wt * J[i] * J[j]; }
    }
    for (let i = 0; i < 4; i++) H[i][i] += 1e-3;
    const d = solve4(H, g);
    if (!d || d.some((x) => !Number.isFinite(x))) return null;
    a += d[0]; b += d[1]; tx += d[2]; ty += d[3];
    if (Math.hypot(d[0], d[1]) < 1e-5 && Math.hypot(d[2], d[3]) < 1e-3) break;
  }
  const fit = { s: 1 / Math.hypot(a, b), dx: -tx, dy: -ty, r: Math.atan2(b, a) };
  const near = Math.hypot(fit.dx, fit.dy) <= MAX_PAN_STEP && Math.abs(fit.s - 1) <= MAX_ZOOM_STEP && Math.abs(fit.r) <= MAX_TURN_STEP_DEG * DEG;
  return near && explainsQuadrants(A, B, w, h, pts, [a, b, tx, ty]) ? fit : null;
}

// The most one slow-camera estimate may move: a fit that runs further has found another picture, not a slower camera.
const MAX_PAN_STEP = 4;
const MAX_ZOOM_STEP = 0.08;
const MAX_TURN_STEP_DEG = 4;
const MIN_PAN = 0.12;
const MIN_ZOOM = 0.0012;
const MIN_TURN_DEG = 0.08;
const moves = (c) => Math.hypot(c.dx, c.dy) >= MIN_PAN || Math.abs(c.s - 1) >= MIN_ZOOM || Math.abs(c.r / DEG) >= MIN_TURN_DEG;

export function warp(A, B, w, h, cam) {
  const out = new Uint8Array(A.length), cx = (w - 1) / 2, cy = (h - 1) / 2, tx = cam.dx * 2, ty = cam.dy * 2, cr = Math.cos(cam.r ?? 0), sr = Math.sin(cam.r ?? 0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x - cx) / cam.s, v = (y - cy) / cam.s;
    const sx = cx + u * cr + v * sr - tx, sy = cy - u * sr + v * cr - ty;
    const o = y * w + x;
    if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) { out[o] = B[o]; continue; }
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, i = y0 * w + x0;
    out[o] = A[i] * (1 - fx) * (1 - fy) + A[i + 1] * fx * (1 - fy) + A[i + w] * (1 - fx) * fy + A[i + w + 1] * fx * fy;
  }
  return out;
}


const isStill = (c) => c.s === 1 && c.dx === 0 && c.dy === 0 && !c.r;

/**
 * A camera that moves less than a pixel a frame hides between two neighbouring frames. For each run of `gap` frames inside a shot where the frame-by-frame
 * estimate found no camera, the estimate between the two ends of the run replaces it, shared evenly over the frames (zoom as a root, pan and turn as a
 * division). `cams[f]` is the camera from frame f-1 to f; `spans` are the shots [{ f0, f1 }]; V is the decoded film { w, h, frame(i) }. Changes `cams` in place.
 */
export function slowCamera(V, cams, spans, gap) {
  const w = V.w >> 1, h = V.h >> 1;
  for (const { f0, f1 } of spans) {
    for (let a = f0; a < f1 - 2; a += gap) {
      const g = Math.min(gap, f1 - 1 - a);
      if (!cams.slice(a + 1, a + g + 1).every(isStill)) continue;
      const c = estimateSlowCamera(halfRes(V.frame(a), V.w, V.h), halfRes(V.frame(a + g), V.w, V.h), w, h);
      if (!c || !moves(c)) continue;
      for (let f = a + 1; f <= a + g; f++) cams[f] = { s: c.s ** (1 / g), dx: c.dx / g, dy: c.dy / g, r: (c.r ?? 0) / g };
    }
  }
}
