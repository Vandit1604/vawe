// How far the fastest visible edge of an animated element moves between two samples. A box row is
// [x, y, w, h, angleDeg, clipTop, clipRight, clipBottom, clipLeft] in screen px (box-track 'animated').

/** Runs inside the page: the element's own turn and its inset() clip in screen px, for a box of r. */
export function turnAndClip(el, r) {
  const cs = getComputedStyle(el);
  const m = cs.transform && cs.transform !== 'none' ? new DOMMatrix(cs.transform) : null;
  const own = Number((String(cs.rotate).match(/(-?[\d.]+)deg/) || [])[1]) || 0;
  const angle = own + (m ? (Math.atan2(m.b, m.a) * 180) / Math.PI : 0);
  const inset = String(cs.clipPath).match(/^inset\(([^)]*?)(?:\s+round\b[^)]*)?\)$/);
  if (!inset) return [angle, 0, 0, 0, 0];
  const lw = el.offsetWidth || r.width, lh = el.offsetHeight || r.height;
  const sx = lw ? r.width / lw : 1, sy = lh ? r.height / lh : 1;
  const v = inset[1].trim().split(/\s+/);
  const [t, rt, b, l] = [v[0], v[1] ?? v[0], v[2] ?? v[0], v[3] ?? v[1] ?? v[0]];
  const px = (s, size) => (s.endsWith('%') ? (parseFloat(s) / 100) * size : parseFloat(s) || 0);
  return [angle, px(t, lh) * sy, px(rt, lw) * sx, px(b, lh) * sy, px(l, lw) * sx];
}

const corners = ([x, y, w, h, , t = 0, r = 0, b = 0, l = 0]) => {
  const L = x + l, T = y + t, R = x + w - r, B = y + h - b;
  return [[L, T], [R, T], [L, B], [R, B]];
};

const turned = (a, b) => Math.abs(((((b - a) % 360) + 540) % 360) - 180);

/** The largest corner move of the clipped box, or the arc its corner sweeps when it turns. Pure. */
export function edgeTravel(a, b) {
  const ca = corners(a), cb = corners(b);
  const slide = Math.max(...cb.map(([x, y], i) => Math.hypot(x - ca[i][0], y - ca[i][1])));
  const halfDiagonal = Math.hypot(cb[3][0] - cb[0][0], cb[3][1] - cb[0][1]) / 2;
  const sweep = ((turned(a[4] || 0, b[4] || 0) * Math.PI) / 180) * halfDiagonal;
  return Math.max(slide, sweep);
}

/** Per step, the largest edge travel of any element between two samples, in CSS px. Pure. */
export function edgeTravelDeltas(tracks) {
  const steps = Math.max(0, ...tracks.map((t) => t.length)) - 1;
  const out = [];
  for (let k = 1; k <= steps; k++) {
    let d = 0;
    for (const t of tracks) if (t[k] && t[k - 1]) d = Math.max(d, edgeTravel(t[k - 1], t[k]));
    out.push(d);
  }
  return out;
}
