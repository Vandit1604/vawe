// harness/lib/ref-measure/subpixel.mjs: sub-pixel position of one tracked element in every frame, by
// matching the element's look at rest (a template cut from its last frame) against each earlier frame.
// A pure function of decoded gray frames; the blob tracker only supplies the first guess (about 1 px
// off), this pass gets it to a fraction of a pixel, which is what a landing frame is read from.

const bilinear = (g, w, x, y) => {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i = y0 * w + x0;
  return g[i] * (1 - fx) * (1 - fy) + g[i + 1] * fx * (1 - fy) + g[i + w] * (1 - fx) * fy + g[i + w + 1] * fx * fy;
};

function makeTemplate(g, w, h, cx, cy, bw, bh) {
  const tw = Math.min(90, Math.round(bw) + 4), th = Math.min(90, Math.round(bh) + 4);
  const ox = Math.round(cx - tw / 2), oy = Math.round(cy - th / 2);
  if (ox < 2 || oy < 2 || ox + tw > w - 3 || oy + th > h - 3) return null;
  const pix = [];
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) pix.push({ x: ox + x, y: oy + y, v: g[(oy + y) * w + ox + x] });
  const sorted = pix.map((p) => p.v).sort((a, b) => a - b), med = sorted[sorted.length >> 1];
  const contrast = pix.reduce((s, p) => s + Math.abs(p.v - med), 0) / pix.length;
  return { pix, ex: cx, ey: cy, contrast };
}

// Offset (dx, dy) of the template in frame g near (gx, gy), and how well it matches (0 perfect, 1 no match).
function locate(T, g, w, h, gx, gy) {
  const sad = (dx, dy) => {
    let s = 0;
    for (let k = 0; k < T.pix.length; k += 2) {
      const p = T.pix[k], x = p.x + dx, y = p.y + dy;
      if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return Infinity;
      s += Math.abs(bilinear(g, w, x, y) - p.v);
    }
    return s / (T.pix.length / 2);
  };
  let best = { dx: gx - T.ex, dy: gy - T.ey, v: Infinity };
  for (const [step, span] of [[1, 5], [0.25, 1], [0.0625, 0.25]]) {
    const b0 = { ...best };
    for (let dy = b0.dy - span; dy <= b0.dy + span + 1e-9; dy += step) for (let dx = b0.dx - span; dx <= b0.dx + span + 1e-9; dx += step) {
      const v = sad(dx, dy);
      if (v < best.v) best = { dx, dy, v };
    }
  }
  return { x: T.ex + best.dx, y: T.ey + best.dy, miss: best.v / Math.max(1, T.contrast) };
}

/**
 * V: { w, h, frame(i) -> gray }. pts: tracked points { f, x, y, w, h } in grid px. Returns { pts, before }:
 * pts with x/y replaced by the sub-pixel match (a point that matches badly keeps its tracked value), and
 * before = the position one frame ahead of pts[0], or null. Returns null when the element is too near an edge.
 */
export function refineTrack(V, pts) {
  const last = pts[pts.length - 1];
  const T = makeTemplate(V.frame(last.f), V.w, V.h, last.x, last.y, last.w, last.h);
  if (!T) return null;
  const at = (f, gx, gy) => locate(T, V.frame(f), V.w, V.h, gx, gy);
  const out = pts.map((p) => {
    if (p === last) return p;
    const m = at(p.f, p.x, p.y);
    return m.miss < 0.6 ? { ...p, x: m.x, y: m.y } : p;
  });
  const first = pts[0];
  const prev = first.f > 0 ? at(first.f - 1, first.x - first.vx, first.y - first.vy) : null;
  return { pts: out, before: prev && prev.miss < 0.6 ? { x: prev.x, y: prev.y } : null };
}
