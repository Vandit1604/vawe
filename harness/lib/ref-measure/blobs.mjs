// The moving blobs between two gray frames and the shift of each: the per-frame work of `ref-spec` tracking, a pure function of (A, B).
const DIFF_THR = 6;

// A flat-coloured object that moves changes only at its leading and trailing edges; the interior
// is identical in both frames. A gap of flat, non-background colour between two changed pixels on
// one line is that interior, so it joins the mask and the two edges become one element.
const MAX_GAP = 90;
function fillFlatGaps(raw, B, w, h) {
  const hist = new Uint32Array(32);
  for (let i = 0; i < B.length; i++) hist[B[i] >> 3]++;
  const bg = hist.indexOf(Math.max(...hist)) * 8 + 4;
  const fill = (start, len, step) => {
    let last = -1;
    for (let k = 0; k < len; k++) {
      const i = start + k * step;
      if (!raw[i]) continue;
      if (last >= 0 && k - last > 1 && k - last <= MAX_GAP) {
        const ref = B[start + (last + 1) * step];
        let flat = Math.abs(ref - bg) > 12;
        for (let g = last + 1; g < k && flat; g++) if (Math.abs(B[start + g * step] - ref) > 8) flat = false;
        if (flat) for (let g = last + 1; g < k; g++) raw[start + g * step] = 1;
      }
      last = k;
    }
  };
  for (let y = 0; y < h; y++) fill(y * w, w, 1);
  for (let x = 0; x < w; x++) fill(x, h, w);
}
export function findBlobs(A, B, w, h) {
  const raw = new Uint8Array(w * h);
  for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
    const i = y * w + x;
    if (Math.abs(A[i] - B[i]) > DIFF_THR) raw[i] = 1;
  }
  fillFlatGaps(raw, B, w, h);
  const R = 2, tmp = new Uint8Array(w * h), dil = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (raw[y * w + x])
    for (let k = -R; k <= R; k++) if (x + k >= 0 && x + k < w) tmp[y * w + x + k] = 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (tmp[y * w + x])
    for (let k = -R; k <= R; k++) if (y + k >= 0 && y + k < h) dil[(y + k) * w + x] = 1;
  const seen = new Uint8Array(w * h), out = [];
  for (let s = 0; s < w * h; s++) {
    if (!dil[s] || seen[s]) continue;
    const stack = [s], px = [];
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      if (raw[i]) { px.push(i); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && dil[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
    }
    if (px.length < 12 || px.length > 0.4 * w * h) continue;
    out.push({ px, x0, y0, x1, y1, area: px.length });
  }
  return out.sort((a, b) => b.area - a.area).slice(0, 12);
}

// Shift v that best maps A onto B over the blob's own changed pixels: B(p) = A(p - v). Coarse then fine, parabola sub-pixel.
export function blobShift(A, B, w, h, blob) {
  const step = Math.max(1, Math.floor(blob.px.length / 600));
  const pts = blob.px.filter((_, i) => i % step === 0);
  const sad = (vx, vy, sub) => {
    let s = 0, n = 0;
    for (let k = 0; k < pts.length; k += sub) {
      const i = pts[k], x = (i % w) - vx, y = ((i / w) | 0) - vy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      s += Math.abs(B[i] - A[y * w + x]); n++;
    }
    return n > 4 ? s / n + 0.02 * (Math.abs(vx) + Math.abs(vy)) : Infinity;
  };
  let best = { vx: 0, vy: 0, c: sad(0, 0, 1) };
  const R = Math.min(72, Math.max(24, 1.6 * (blob.x1 - blob.x0), 1.6 * (blob.y1 - blob.y0)));
  for (let vy = -R; vy <= R; vy += 2) for (let vx = -R; vx <= R; vx += 2) {
    const c = sad(vx, vy, 2);
    if (c < best.c) best = { vx, vy, c };
  }
  const c0 = best;
  for (let vy = c0.vy - 1; vy <= c0.vy + 1; vy++) for (let vx = c0.vx - 1; vx <= c0.vx + 1; vx++) {
    const c = sad(vx, vy, 1);
    if (c < best.c) best = { vx, vy, c };
  }
  const para = (m, c, p) => (Number.isFinite(m) && Number.isFinite(p) && m + p - 2 * c > 1e-6 ? (m - p) / (2 * (m + p - 2 * c)) : 0);
  const sub = { x: para(sad(best.vx - 1, best.vy, 1), best.c, sad(best.vx + 1, best.vy, 1)),
    y: para(sad(best.vx, best.vy - 1, 1), best.c, sad(best.vx, best.vy + 1, 1)) };
  const vx = best.vx + Math.max(-0.5, Math.min(0.5, sub.x)), vy = best.vy + Math.max(-0.5, Math.min(0.5, sub.y));
  return Math.hypot(vx, vy) < 0.3 ? { vx: 0, vy: 0 } : { vx, vy };
}

/** The blobs of A to B with their box, area and shift: [{ x0, y0, x1, y1, area, vx, vy }]. */
export function blobMoves(A, B, w, h) {
  return findBlobs(A, B, w, h).map((b) => ({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, area: b.area, ...blobShift(A, B, w, h, b) }));
}

