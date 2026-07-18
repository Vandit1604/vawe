// core/canvas-fx.js — Tier 2 Canvas-2D per-pixel image passes (halftone, dither, mosaic, …).
//
// DETERMINISM: these are BAKED ONCE at build (boot.js, inside the awaited image-preload phase) into a
// static PNG data-URL that replaces the <img> src. The source bitmap is static and each pass is a PURE
// function of (pixels, opts, seed), so after the bake every renderFrame(n) returns identical bytes —
// no wall clock, no per-frame canvas, no state. This is why Tier 2 is safe: static source, one-shot
// transform (unlike Tier 5 sim/audio). `make probe`/`make snap` are the judges.
//
// A pass is `(srcCtx, dstCtx, W, H, opts, seed) => void` — read the source, draw the result on dst.
// Pure numeric helpers (luma, Bayer, cell average) are exported for node lib-tests (no DOM needed).

// ---- pure helpers (node-testable) ----------------------------------------------------------------
export const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// 4x4 ordered Bayer matrix, normalised to (0,1) thresholds. Classic newsprint dither.
export const BAYER4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));
export const bayerAt = (x, y) => BAYER4[y & 3][x & 3];

// average RGB of a cell [x0,y0,x0+cw,y0+ch) in an ImageData-like {data,width}
export function cellAverage(data, width, x0, y0, cw, ch, imgH) {
  let r = 0, g = 0, b = 0, count = 0;
  const x1 = x0 + cw, y1 = Math.min(y0 + ch, imgH);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
    }
  }
  return count ? [r / count, g / count, b / count] : [0, 0, 0];
}

// a deterministic seeded hash in [0,1) (for stipple jitter etc.) — pure, no Math.random
export function hash01(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---- the pass registry (DOM) ---------------------------------------------------------------------
// Each reads srcCtx and paints dstCtx. All are pure in (pixels, opts, seed).
export const CANVAS_FX = {
  // mosaic / pixelate: fill each cell with its average colour
  mosaic(srcCtx, dstCtx, W, H, o) {
    const cell = Math.max(2, Math.round(o.cell ?? 16));
    const { data } = srcCtx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const [r, g, b] = cellAverage(data, W, x, y, cell, cell, H);
        dstCtx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        dstCtx.fillRect(x, y, cell, cell);
      }
    }
  },
  // Bayer ordered dither: per-pixel luma thresholded against the 4x4 matrix → 2-tone (ink on paper)
  dither(srcCtx, dstCtx, W, H, o) {
    const paper = o.paper || '#ffffff', ink = o.ink || '#111111';
    dstCtx.fillStyle = paper; dstCtx.fillRect(0, 0, W, H);
    const { data } = srcCtx.getImageData(0, 0, W, H);
    dstCtx.fillStyle = ink;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const l = luma(data[i], data[i + 1], data[i + 2]) / 255;
        if (l < bayerAt(x, y)) dstCtx.fillRect(x, y, 1, 1);
      }
    }
  },
  // halftone: on a paper ground, one ink dot per cell, radius ∝ darkness
  halftone(srcCtx, dstCtx, W, H, o) {
    const cell = Math.max(3, Math.round(o.cell ?? 8));
    const paper = o.paper || '#ffffff', ink = o.ink || '#111111';
    dstCtx.fillStyle = paper; dstCtx.fillRect(0, 0, W, H);
    dstCtx.fillStyle = ink;
    const { data } = srcCtx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const [r, g, b] = cellAverage(data, W, x, y, cell, cell, H);
        const dark = 1 - luma(r, g, b) / 255;
        const rad = dark * cell * 0.62;
        if (rad > 0.3) { dstCtx.beginPath(); dstCtx.arc(x + cell / 2, y + cell / 2, rad, 0, 6.2831853); dstCtx.fill(); }
      }
    }
  },
};

// bakeCanvasFx(img, spec) → PNG data-URL, or null. spec is a name string or { fx, cell, ink, paper, seed }.
// Runs at build (boot) on an already-decoded image. Caps the working width so huge photos stay cheap.
export function bakeCanvasFx(img, spec) {
  const o = typeof spec === 'string' ? { fx: spec } : { ...spec };
  const pass = CANVAS_FX[o.fx];
  if (!pass || typeof document === 'undefined') return null;
  const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
  if (!nw || !nh) return null;
  const W = Math.min(nw, 1600), H = Math.round(nh * (W / nw));
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, W, H);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const dctx = out.getContext('2d');
  try { pass(sctx, dctx, W, H, o, (o.seed | 0) || 0); } catch (e) { return null; } // tainted/cross-origin → skip, don't crash
  return out.toDataURL('image/png');
}

// stable key so boot's bake and image.js's lookup agree
export const canvasFxKey = (src, spec) => JSON.stringify([src, typeof spec === 'string' ? { fx: spec } : spec]);

export const CANVAS_FX_NAMES = Object.keys(CANVAS_FX);
