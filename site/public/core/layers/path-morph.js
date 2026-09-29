// core/path-morph.js, TRUE shape morph: melt one SVG path into another (a blob into a logo, one icon
// into the next). Flubber's idea, kept deterministic and seek-safe: resample BOTH paths to the same number
// of points ONCE at build (via getPointAtLength. A DOM read, but a build-time one, exactly like the
// measure() in core/morph.js), then per frame lerp the two point sets and rebuild the `d` as a polyline.
// The point sets are precomputed, so morphD(u) is a PURE function of u, no per-frame DOM read, no
// accumulation → renderFrame(n) stays byte-identical regardless of render order.
//
// Why a polyline and not a curve tween: with N≈180 points the intermediate reads as smooth, and it needs
// no command-by-command path matching (the part flubber gets wrong on mismatched shapes). The ENDPOINTS
// stay crisp because the layer renders the raw source `d` at u≤0 and the raw target `d` at u≥1, the
// polyline only exists during the melt.
//
// The pure maths (lerpPoints / pointsToD / bestRotation / morphPoints) take plain arrays and are covered
// by `make test`; only resamplePath needs a live <path> element.

// resamplePath(pathEl, n) → [{x,y}]: n points spaced evenly BY LENGTH along the path. Build-time DOM read.
export function resamplePath(pathEl, n = 180) {
  const total = pathEl.getTotalLength();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const p = pathEl.getPointAtLength((i / n) * total);
    pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

// pure: rotate point array `b` by integer `k` (wrap) so index i of a lines up with i of the rotated b.
export const rotatePoints = (b, k) => b.map((_, i) => b[(i + k) % b.length]);

// pure: the ordering offset of `b` that minimises the summed squared distance to `a`. Closed shapes have
// no canonical start point, so without this the morph can twist unnaturally. Samples every `step`-th
// rotation (full search is O(n^2); step keeps it O(n^2/step), plenty accurate for the look).
export function bestRotation(a, b, step = 4) {
  const n = Math.min(a.length, b.length);
  let best = 0, bestD = Infinity;
  for (let k = 0; k < n; k += step) {
    let d = 0;
    for (let i = 0; i < n; i += step) { const bp = b[(i + k) % n]; const dx = a[i].x - bp.x, dy = a[i].y - bp.y; d += dx * dx + dy * dy; }
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

// pure: linear blend of two equal-length point arrays at u∈[0,1]. `spin` (radians) rotates the blend
// around its centroid, scaled by u. The "rotate AND morph into the logo" move.
export function lerpPoints(a, b, u, spin = 0) {
  const n = Math.min(a.length, b.length);
  const out = Array.from({ length: n });
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { out[i] = { x: a[i].x + (b[i].x - a[i].x) * u, y: a[i].y + (b[i].y - a[i].y) * u }; cx += out[i].x; cy += out[i].y; }
  if (spin) {
    cx /= n; cy /= n; const ang = spin * (1 - u), c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < n; i++) { const dx = out[i].x - cx, dy = out[i].y - cy; out[i] = { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c }; }
  }
  return out;
}

// pure: points → an SVG `d` polyline. `closed` appends Z (logos/icons are closed shapes).
export function pointsToD(points, closed = true) {
  if (!points.length) return '';
  let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) d += `L${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  return closed ? d + 'Z' : d;
}

// pure: the whole melt in one call, from-points → to-points (pre-rotated) blended at u, as a `d` string.
export function morphD(from, to, u, { spin = 0, closed = true } = {}) {
  return pointsToD(lerpPoints(from, to, u, spin), closed);
}
