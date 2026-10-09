// Pure parts of `vawe zoom`: the box, the scale and the brightest text edge. No I/O: harness/cli/verbs.mjs loads this file to check the arguments.

export const ZOOM_SCALE = 3;
export const FRAME_W = 1920;
export const FRAME_H = 1080;
export const AUTO_BOX = { w: 240, h: 135 };
const CELL = 48;
const EDGE_STEP = 80;
const BRIGHT = 180;
const MAX_OUT_W = 4000;

/** { x, y, w, h } from "x,y,w,h" in 1920x1080 coordinates, or null when it is not four numbers inside the frame. Pure. */
export function parseBox(text) {
  const p = String(text ?? '').split(',').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return null;
  const [x, y, w, h] = p.map(Math.round);
  if (x < 0 || y < 0 || w < 2 || h < 2 || x + w > FRAME_W || y + h > FRAME_H) return null;
  return { x, y, w, h };
}

/** The first problem in the arguments of zoom, or null. Pure. */
export function zoomProblem({ at, box, auto, scale, vs, atB }) {
  if (at === undefined) return 'missing --at <s> (the moment to look at)';
  if (!(Number.isFinite(Number(at)) && Number(at) >= 0)) return `--at is not a number of seconds: "${at}"`;
  if (atB !== undefined && !(Number.isFinite(Number(atB)) && Number(atB) >= 0)) return `--at-b is not a number of seconds: "${atB}"`;
  if (atB !== undefined && !vs) return '--at-b needs --vs <b>';
  if (box && auto) return 'give --box or --auto, not both';
  if (!box && !auto) return 'missing --box x,y,w,h (1920x1080 pixels) or --auto';
  const b = box ? parseBox(box) : AUTO_BOX;
  if (!b) return `--box is not x,y,w,h inside 1920x1080: "${box}"`;
  if (!(Number.isInteger(scale) && scale >= 1 && scale <= 16)) return '--scale must be a whole number from 1 to 16';
  if (b.w * scale * (vs ? 2 : 1) > MAX_OUT_W) return `the picture would be wider than ${MAX_OUT_W} px: use a smaller --box or --scale`;
  return null;
}

/** The box (AUTO_BOX size) around the densest cluster of bright edges in a 1920x1080 luma plane, or null when no bright edge exists. Pure. */
export function autoBox(luma, w = FRAME_W, h = FRAME_H) {
  const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
  const count = new Float64Array(cols * rows), sx = new Float64Array(cols * rows), sy = new Float64Array(cols * rows);
  let any = false;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (luma[i] < BRIGHT) continue;
      if (Math.abs(luma[i + 1] - luma[i - 1]) < EDGE_STEP && Math.abs(luma[i + w] - luma[i - w]) < EDGE_STEP) continue;
      const c = Math.floor(y / CELL) * cols + Math.floor(x / CELL);
      count[c]++; sx[c] += x; sy[c] += y; any = true;
    }
  }
  if (!any) return null;
  const near = (c) => {
    const cx = c % cols, cy = Math.floor(c / cols);
    let n = 0, x = 0, y = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const k = ny * cols + nx;
        n += count[k]; x += sx[k]; y += sy[k];
      }
    }
    return { n, x: x / n, y: y / n };
  };
  let best = null;
  for (let c = 0; c < count.length; c++) {
    if (!count[c]) continue;
    const s = near(c);
    if (!best || s.n > best.n) best = s;
  }
  const bx = Math.min(w - AUTO_BOX.w, Math.max(0, Math.round(best.x - AUTO_BOX.w / 2)));
  const by = Math.min(h - AUTO_BOX.h, Math.max(0, Math.round(best.y - AUTO_BOX.h / 2)));
  return { x: bx, y: by, w: AUTO_BOX.w, h: AUTO_BOX.h };
}
