// harness/lib/ref-measure/layout.mjs: the resting layout of one frame: element boxes as fractions of the
// frame, the alignment lines two or more boxes share, the margin the content leaves to each frame edge,
// and a column grid when the shared left edges are evenly spaced. A pure function of one decoded frame:
// frame = { w, h, rgb } (rgb 3 bytes a pixel). Every number is 0..1 of the frame width or height.
import { r3 } from '../move-fit.mjs';

const BG_DIST = 28;
const GRAD = 18;
const FLAT_SHARE = 0.4;
const JOIN = 3;
const MIN_RAW_PX = 20;
const MIN_AREA = 0.001;
const MAX_AREA = 0.8;
const CLUSTER = 0.008;

function modalColour(frame) {
  const hist = new Map();
  for (let i = 0; i < frame.rgb.length; i += 3) {
    const k = ((frame.rgb[i] >> 3) << 10) | ((frame.rgb[i + 1] >> 3) << 5) | (frame.rgb[i + 2] >> 3);
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  const [top, count] = [...hist.entries()].sort((a, b) => b[1] - a[1])[0];
  return { colour: [(top >> 10) << 3, ((top >> 5) & 31) << 3, (top & 31) << 3], share: count / (frame.rgb.length / 3) };
}

// Pixels that differ from the frame's ground colour; on a frame with no dominant ground (a gradient or photo), hard edges too.
function foregroundMask({ w, h, rgb }) {
  const { colour: bg, share } = modalColour({ rgb }), mask = new Uint8Array(w * h);
  const lum = (i) => rgb[i * 3] + rgb[i * 3 + 1] + rgb[i * 3 + 2];
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    const i = y * w + x;
    const far = Math.max(Math.abs(rgb[i * 3] - bg[0]), Math.abs(rgb[i * 3 + 1] - bg[1]), Math.abs(rgb[i * 3 + 2] - bg[2])) > BG_DIST;
    const edge = share < FLAT_SHARE && (Math.abs(lum(i + 1) - lum(i)) > GRAD * 3 || Math.abs(lum(i + w) - lum(i)) > GRAD * 3);
    mask[i] = far || edge ? 1 : 0;
  }
  return mask;
}

function dilate(mask, w, h, r) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x])
    for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) tmp[y * w + k] = 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (tmp[y * w + x])
    for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) out[k * w + x] = 1;
  return out;
}

function components(raw, joined, w, h) {
  const seen = new Uint8Array(w * h), boxes = [];
  for (let s = 0; s < w * h; s++) {
    if (!joined[s] || seen[s]) continue;
    const stack = [s];
    let x0 = w, y0 = h, x1 = -1, y1 = -1, px = 0;
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      if (raw[i]) { px++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && joined[j] && !seen[j] && Math.abs((j % w) - x) <= 1) { seen[j] = 1; stack.push(j); }
    }
    if (px >= MIN_RAW_PX) boxes.push({ x0, y0, x1: x1 + 1, y1: y1 + 1 });
  }
  return boxes;
}

function toBoxes(frame) {
  const { w, h } = frame, raw = foregroundMask(frame);
  return components(raw, dilate(raw, w, h, JOIN), w, h)
    .map((b) => ({ x: r3(b.x0 / w), y: r3(b.y0 / h), w: r3((b.x1 - b.x0) / w), h: r3((b.y1 - b.y0) / h) }))
    .filter((b) => b.w * b.h >= MIN_AREA && b.w * b.h <= MAX_AREA)
    .sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 24);
}

const EDGES = {
  left: (b) => b.x, centre: (b) => b.x + b.w / 2, right: (b) => b.x + b.w,
  top: (b) => b.y, middle: (b) => b.y + b.h / 2, bottom: (b) => b.y + b.h,
};

// Values within CLUSTER of each other, held by two or more boxes, are one line.
function alignmentLines(boxes) {
  const lines = [];
  for (const [edge, get] of Object.entries(EDGES)) {
    const vals = boxes.map((b, i) => ({ v: get(b), i })).sort((a, b) => a.v - b.v);
    let group = [];
    const flush = () => { if (group.length >= 2) lines.push({ edge, at: r3(group.reduce((s, g) => s + g.v, 0) / group.length), boxes: group.map((g) => g.i) }); group = []; };
    for (const v of vals) { if (group.length && v.v - group[group.length - 1].v > CLUSTER) flush(); group.push(v); }
    flush();
  }
  return lines;
}

function columnGrid(lines) {
  const xs = [...new Set(lines.filter((l) => l.edge === 'left').map((l) => l.at))].sort((a, b) => a - b);
  if (xs.length < 3) return null;
  const gaps = xs.slice(1).map((x, i) => x - xs[i]), mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const spread = Math.sqrt(gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length) / mean;
  return spread < 0.15 ? { columns: xs.length, pitch: r3(mean), lefts: xs } : null;
}

/** frame: { w, h, rgb }. Returns { boxes, lines, margins, grid }; boxes largest first, lines name the boxes by index. */
export function measureLayout(frame) {
  const boxes = toBoxes(frame);
  if (!boxes.length) return { boxes, lines: [], margins: null, grid: null };
  const lines = alignmentLines(boxes);
  const margins = { left: r3(Math.min(...boxes.map((b) => b.x))), right: r3(1 - Math.max(...boxes.map((b) => b.x + b.w))),
    top: r3(Math.min(...boxes.map((b) => b.y))), bottom: r3(1 - Math.max(...boxes.map((b) => b.y + b.h))) };
  return { boxes, lines, margins, grid: columnGrid(lines) };
}
