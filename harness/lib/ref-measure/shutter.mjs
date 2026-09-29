// harness/lib/ref-measure/shutter.mjs: shutter angle of a moving element, from how far its edges smear.
// A shutter open for a share s of the frame interval smears an edge over s * (travel per frame) pixels.
// So angle = blur length / travel per frame * 360. The blur length is read from the 10-90% width of the
// element's leading and trailing edges along its motion axis, minus the same edge's width at rest.
// A pure function of decoded gray frames: V = { w, h, frame(i) -> gray }.

const MIN_TRAVEL = 4;
const RAMP = 0.8;
const MAX_ANGLE = 400;

function profile(g, V, pt, axis, half) {
  const { w, h } = V, cx = pt.x, cy = pt.y;
  const out = [];
  for (let k = -half; k <= half; k++) {
    let s = 0, n = 0;
    for (let j = -2; j <= 2; j++) {
      const x = axis === 'x' ? Math.round(cx) + k : Math.round(cx) + j, y = axis === 'x' ? Math.round(cy) + j : Math.round(cy) + k;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      s += g[y * w + x]; n++;
    }
    out.push(n ? s / n : NaN);
  }
  return out;
}

// 10-90% width of the first step between the level at index `from` (outside) and the level at `to` (element centre).
function edgeWidth(p, from, to) {
  const step = Math.sign(to - from), outside = p[from], inside = p[to];
  const span = inside - outside;
  if (Math.abs(span) < 30 || p.some(Number.isNaN)) return null;
  const at = (share) => {
    for (let i = from; i !== to; i += step) {
      const a = (p[i] - outside) / span, b = (p[i + step] - outside) / span;
      if (a < share && b >= share) return i + step * ((share - a) / Math.max(1e-6, b - a));
    }
    return null;
  };
  const lo = at(0.1), hi = at(0.9);
  return lo == null || hi == null ? null : Math.abs(hi - lo);
}

function edgeWidths(g, V, pt, axis) {
  const size = axis === 'x' ? pt.w : pt.h, half = Math.round(size / 2) + 12;
  if (half > 70) return null;
  const p = profile(g, V, pt, axis, half), mid = half;
  const a = edgeWidth(p, 0, mid), b = edgeWidth(p, p.length - 1, mid);
  return a == null || b == null ? null : (a + b) / 2;
}

/**
 * pts: refined track points { f, x, y, w, h } in grid px (w, h the element's own size); axis: 'x' or 'y'.
 * Returns { angleDeg, errDeg, frames } or null when the element moves too little or too rarely to tell, or when its edges are not clean steps
 * (a measured angle above 400 degrees cannot be a shutter: the shutter never stays open longer than the frame).
 */
export function estimateShutter(V, pts, axis) {
  const rest = pts[pts.length - 1], w0 = edgeWidths(V.frame(rest.f), V, rest, axis);
  if (w0 == null) return null;
  const angles = [], travels = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const travel = Math.abs(pts[i + 1][axis] - pts[i - 1][axis]) / 2;
    if (travel < MIN_TRAVEL) continue;
    const wm = edgeWidths(V.frame(pts[i].f), V, pts[i], axis);
    if (wm == null) continue;
    const blur = Math.sqrt(Math.max(0, wm * wm - w0 * w0)) / RAMP;
    angles.push((blur / travel) * 360); travels.push(travel);
  }
  if (angles.length < 2) return null;
  const sorted = [...angles].sort((x, y) => x - y), med = sorted[sorted.length >> 1];
  if (med > MAX_ANGLE) return null;
  const mad = [...angles.map((a) => Math.abs(a - med))].sort((x, y) => x - y)[angles.length >> 1];
  const meanTravel = travels.reduce((s, t) => s + t, 0) / travels.length;
  return { angleDeg: Math.round(med), errDeg: Math.round(Math.max(1.5 * mad, (0.7 / meanTravel) * 360)), frames: angles.length };
}
