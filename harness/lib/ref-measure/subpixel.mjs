// harness/lib/ref-measure/subpixel.mjs: sub-pixel position of one tracked element in every frame, by
// matching the element's look at rest (a template cut from its last frame) against each earlier frame.
// A pure function of decoded gray frames; the blob tracker only supplies the first guess (about 1 px
// off), this pass gets it to a fraction of a pixel, which is what a landing frame is read from.

const MISS = 0.6;
const REST_SEARCH = 40;
const REST_STEP = 0.12;

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

// Follow the element frame by frame away from `from` (dir -1 back, +1 forward) until it stops moving:
// the rest position before or after the tracked move, where a slow ease leaves the blob tracker blind.
function walkToRest(at, from, dir, span, guess) {
  const out = [];
  let prev = guess, still = 0;
  for (let f = from + dir; f >= span.f0 && f < span.f1 && out.length < REST_SEARCH; f += dir) {
    const m = at(f, prev.x, prev.y);
    if (m.miss >= MISS) break;
    still = Math.hypot(m.x - prev.x, m.y - prev.y) < REST_STEP ? still + 1 : 0;
    out.push({ f, x: m.x, y: m.y });
    prev = m;
    if (still >= 2) break;
  }
  return out;
}

// The latest point whose size is the track's usual size and which is nearly still: a clean look at the element.
function restingLook(pts) {
  const med = (k) => [...pts.map((p) => p[k])].sort((a, b) => a - b)[pts.length >> 1];
  const mw = med('w'), mh = med('h');
  const clean = (p) => Math.abs(p.w - mw) <= 0.2 * mw && Math.abs(p.h - mh) <= 0.2 * mh && Math.hypot(p.vx, p.vy) < 3;
  return [...pts].reverse().find(clean) || pts[pts.length - 1];
}

/**
 * V: { w, h, frame(i) -> gray }. pts: tracked points { f, x, y, w, h } in grid px. span: { f0, f1 } the shot's
 * frames. Returns { pts, lead, tail } or null when the element is too near the frame edge to match.
 * pts: the tracked points with x/y replaced by the sub-pixel match (a poor match keeps its tracked value).
 * lead: positions in the frames before pts[0], oldest first, ending where the element sat still.
 * tail: positions in the frames after the last point, ending where it came to rest.
 */
export function refineTrack(V, pts, span) {
  const last = pts[pts.length - 1], first = pts[0];
  const anchor = restingLook(pts);
  const T = makeTemplate(V.frame(anchor.f), V.w, V.h, anchor.x, anchor.y, anchor.w, anchor.h);
  if (!T) return null;
  const at = (f, gx, gy) => locate(T, V.frame(f), V.w, V.h, gx, gy);
  const out = [];
  for (const p of pts) {
    if (p === anchor) { out.push(p); continue; }
    const prev = out[out.length - 1], before = out[out.length - 2];
    const guesses = [{ x: p.x, y: p.y }];
    if (prev) guesses.push({ x: prev.x + (before ? prev.x - before.x : 0), y: prev.y + (before ? prev.y - before.y : 0) });
    const m = guesses.map((g) => at(p.f, g.x, g.y)).reduce((a, b) => (b.miss < a.miss ? b : a));
    out.push(m.miss < MISS ? { ...p, x: m.x, y: m.y } : p);
  }
  const lead = walkToRest(at, first.f, -1, span, { x: first.x - first.vx, y: first.y - first.vy }).reverse();
  const end = out[out.length - 1];
  const tail = walkToRest(at, last.f, 1, span, { x: end.x, y: end.y });
  return { pts: out, lead, tail };
}
