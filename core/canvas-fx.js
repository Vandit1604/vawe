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
  // stipple: seeded dots on paper, denser where the source is dark (deterministic via hash01)
  stipple(srcCtx, dstCtx, W, H, o, seed) {
    const cell = Math.max(3, Math.round(o.cell ?? 5));
    dstCtx.fillStyle = o.paper || '#ffffff'; dstCtx.fillRect(0, 0, W, H);
    dstCtx.fillStyle = o.ink || '#141414';
    const { data } = srcCtx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const [r, g, b] = cellAverage(data, W, x, y, cell, cell, H);
        const dark = 1 - luma(r, g, b) / 255;
        // more darkness → higher chance a dot lands; jitter its position deterministically
        if (hash01(x, y, seed) < dark) {
          const jx = x + hash01(x + 1, y, seed) * cell, jy = y + hash01(x, y + 1, seed) * cell;
          dstCtx.beginPath(); dstCtx.arc(jx, jy, 0.5 + dark * (cell * 0.18), 0, 6.2831853); dstCtx.fill();
        }
      }
    }
  },
  // ascii: one glyph per cell chosen by darkness from a ramp (light→dark), monospaced ink on paper
  ascii(srcCtx, dstCtx, W, H, o) {
    const cell = Math.max(6, Math.round(o.cell ?? 10));
    const ramp = o.ramp || ' .:-=+*#%@';
    dstCtx.fillStyle = o.paper || '#0b0b0b'; dstCtx.fillRect(0, 0, W, H);
    dstCtx.fillStyle = o.ink || '#d8ffd0';
    dstCtx.font = `${cell}px monospace`; dstCtx.textBaseline = 'top';
    const { data } = srcCtx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const [r, g, b] = cellAverage(data, W, x, y, cell, cell, H);
        const dark = 1 - luma(r, g, b) / 255;
        const ch = ramp[Math.min(ramp.length - 1, Math.floor(dark * ramp.length))];
        if (ch !== ' ') dstCtx.fillText(ch, x, y);
      }
    }
  },
  // edgeDetect: Sobel magnitude → bright edges on a dark ground (feeds blueprint/sketch looks)
  edgeDetect(srcCtx, dstCtx, W, H, o) {
    const { data } = srcCtx.getImageData(0, 0, W, H);
    const g = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    const out = dstCtx.createImageData(W, H);
    const line = o.line || [220, 235, 255], bg = o.bg || [8, 12, 24];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const gx = (x > 0 && x < W - 1 && y > 0 && y < H - 1);
        let mag = 0;
        if (gx) {
          const p = (xx, yy) => g[yy * W + xx];
          const sx = -p(x - 1, y - 1) - 2 * p(x - 1, y) - p(x - 1, y + 1) + p(x + 1, y - 1) + 2 * p(x + 1, y) + p(x + 1, y + 1);
          const sy = -p(x - 1, y - 1) - 2 * p(x, y - 1) - p(x + 1, y - 1) + p(x - 1, y + 1) + 2 * p(x, y + 1) + p(x + 1, y + 1);
          mag = Math.min(1, Math.sqrt(sx * sx + sy * sy) / (o.thresh ? o.thresh * 255 : 255));
        }
        const i = (y * W + x) * 4;
        out.data[i] = bg[0] + (line[0] - bg[0]) * mag;
        out.data[i + 1] = bg[1] + (line[1] - bg[1]) * mag;
        out.data[i + 2] = bg[2] + (line[2] - bg[2]) * mag;
        out.data[i + 3] = 255;
      }
    }
    dstCtx.putImageData(out, 0, 0);
  },
  // pixelSort: within each scan line, sort contiguous bright spans by luma → signature glitch smear.
  // Pure/deterministic: a span is bounded by a luma threshold, then reordered in place (no randomness).
  pixelSort(srcCtx, dstCtx, W, H, o) {
    const vertical = !!o.vertical;
    const thr = (o.thresh ?? 0.55) * 255;               // luma cutoff that bounds a sortable span
    const img = srcCtx.getImageData(0, 0, W, H);
    const d = img.data;
    const at = (x, y) => (y * W + x) * 4;
    const lum = (x, y) => { const i = at(x, y); return luma(d[i], d[i + 1], d[i + 2]); };
    const sortLine = (coords) => {
      const n = coords.length;
      let s = 0;
      while (s < n) {
        while (s < n && lum(coords[s][0], coords[s][1]) <= thr) s++;   // skip to a bright span start
        let e = s;
        while (e < n && lum(coords[e][0], coords[e][1]) > thr) e++;    // extend over the bright run
        if (e - s > 1) {
          const seg = [];
          for (let k = s; k < e; k++) { const i = at(coords[k][0], coords[k][1]); seg.push([d[i], d[i + 1], d[i + 2], d[i + 3]]); }
          seg.sort((a, b) => luma(a[0], a[1], a[2]) - luma(b[0], b[1], b[2]));
          for (let k = s; k < e; k++) { const i = at(coords[k][0], coords[k][1]); const p = seg[k - s]; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = p[3]; }
        }
        s = e;
      }
    };
    if (vertical) {
      for (let x = 0; x < W; x++) { const col = []; for (let y = 0; y < H; y++) col.push([x, y]); sortLine(col); }
    } else {
      for (let y = 0; y < H; y++) { const row = []; for (let x = 0; x < W; x++) row.push([x, y]); sortLine(row); }
    }
    dstCtx.putImageData(img, 0, 0);
  },
  // crosshatch: diagonal strokes whose density steps with darkness (pencil/engraving)
  crosshatch(srcCtx, dstCtx, W, H, o) {
    const cell = Math.max(4, Math.round(o.cell ?? 6));
    dstCtx.fillStyle = o.paper || '#f4f1e8'; dstCtx.fillRect(0, 0, W, H);
    dstCtx.strokeStyle = o.ink || '#20242c'; dstCtx.lineWidth = 1;
    const { data } = srcCtx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const [r, g, b] = cellAverage(data, W, x, y, cell, cell, H);
        const dark = 1 - luma(r, g, b) / 255;
        dstCtx.beginPath();
        if (dark > 0.2) { dstCtx.moveTo(x, y + cell); dstCtx.lineTo(x + cell, y); }        // first hatch
        if (dark > 0.5) { dstCtx.moveTo(x, y); dstCtx.lineTo(x + cell, y + cell); }         // cross at mid-dark
        if (dark > 0.75) { dstCtx.moveTo(x + cell / 2, y); dstCtx.lineTo(x + cell / 2, y + cell); } // vertical when darkest
        dstCtx.stroke();
      }
    }
  },
};

// Tier-C stylized presets: a base pass + tuned colours. `canvasFx:"blueprint"` expands to these, so
// the recognisable looks live in the same per-pixel system (not awkwardly split across two mechanisms).
// Author overrides still win (e.g. `{ fx:"blueprint", line:"#fff" }`).
export const CANVAS_FX_PRESETS = {
  blueprint: { fx: 'edgeDetect', line: [205, 226, 255], bg: [10, 38, 92] },
  comic: { fx: 'halftone', cell: 7, ink: '#141019', paper: '#fef7e6' },
  risograph: { fx: 'halftone', cell: 8, ink: '#ff3b6b', paper: '#f3ecdb' },
  sketch: { fx: 'crosshatch', cell: 6, ink: '#20242c', paper: '#f4f1e8' },
  matrix: { fx: 'ascii', cell: 11, ink: '#3dff8c', paper: '#020806' },
  newsprint: { fx: 'dither', ink: '#141210', paper: '#efe8d8' },
};

// resolveFxSpec("blueprint") → { fx:'edgeDetect', line, bg }; a base name or object passes through.
export function resolveFxSpec(spec) {
  const o = typeof spec === 'string' ? { fx: spec } : { ...spec };
  const p = CANVAS_FX_PRESETS[o.fx];
  return p ? { ...p, ...o, fx: p.fx } : o;
}

// bakeCanvasFx(img, spec) → PNG data-URL, or null. spec is a name string or { fx, cell, ink, paper, seed }.
// Runs at build (boot) on an already-decoded image. Caps the working width so huge photos stay cheap.
export function bakeCanvasFx(img, spec) {
  const o = resolveFxSpec(spec);
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
