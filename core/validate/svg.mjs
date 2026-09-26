// core/validate/svg.mjs: a DEGENERATE `svg` layer path (`"d": "M0 0"`, zero length: a lone moveto, or
// every command landing on the same point) validates clean today and renders an invisible mark, since
// `getTotalLength()` on it is 0 and the draw/stroke has nothing to reveal. Caught here, at write time,
// same as every other silently-empty layer this file already refuses (a `text` layer with no `text`,
// an `html` layer with neither `html` nor `src`).
//
// PURE, no DOM: `pathIsDegenerate` walks the `d` string's own command endpoints (never a control
// point) into a bounding box. A curve that leaves and returns to the same point without moving its box
// (a perfect circle traced with a bulge that starts and ends at one pixel, say) would slip past this,
// same approximation trade `path-morph.js`'s own resamplePath makes by sampling a fixed point count
// rather than integrating true arc length: cheap and right for the case this exists to catch, a path
// nobody meant to draw.
import { isObj } from './util.mjs';

const CMD_RE = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
const NUM_RE = /-?\d*\.?\d+(?:e-?\d+)?/gi;

// One walker per command LETTER, each reading its own fixed-size group of numbers off `n` and calling
// `to(nx, ny)` (or the single-axis H/V/Z forms) once per point. Table-driven so `pathPoints` itself is
// one small loop, not one long if/else chain over eight command shapes.
const STEP = { L: 2, C: 6, S: 4, Q: 4, T: 2, A: 7 };
const ENDPOINT_AT = { C: 4, S: 2, Q: 2, T: 0, A: 5 };

function walkGroup(cmd, n, to) {
  const step = STEP[cmd], at = ENDPOINT_AT[cmd] ?? 0;
  let i = 0;
  while (i + at + 1 < n.length) { to(n[i + at], n[i + at + 1]); i += step; }
}

/** pathPoints(d) -> [[x,y], ...] every command's own ENDPOINT (never a bezier control point), in the
 *  order the path draws them. Good enough for a bounding box, not a renderer: no arc flattening, no
 *  curve subdivision. */
export function pathPoints(d) {
  const pts = [];
  let x = 0, y = 0, startX = 0, startY = 0;
  let m;
  CMD_RE.lastIndex = 0;
  while ((m = CMD_RE.exec(d))) {
    const cmd = m[1], rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const n = (m[2].match(NUM_RE) || []).map(Number);
    const to = (nx, ny) => { x = rel ? x + nx : nx; y = rel ? y + ny : ny; pts.push([x, y]); };
    if (C === 'M') { to(n[0], n[1]); startX = x; startY = y; walkGroup('L', n.slice(2), to); }
    else if (C === 'H') for (const v of n) { x = rel ? x + v : v; pts.push([x, y]); }
    else if (C === 'V') for (const v of n) { y = rel ? y + v : v; pts.push([x, y]); }
    else if (C === 'Z') { pts.push([startX, startY]); x = startX; y = startY; }
    else walkGroup(C, n, to);
  }
  return pts;
}

/** pathIsDegenerate(d) -> true when the path has fewer than two distinct points, so a renderer draws
 *  nothing: a blank string, a lone moveto ("M0 0"), or every command landing on the same pixel. */
export function pathIsDegenerate(d) {
  if (typeof d !== 'string' || !d.trim()) return true;
  const pts = pathPoints(d);
  if (pts.length < 2) return true;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  return (maxX - minX) < 1e-6 && (maxY - minY) < 1e-6;
}

export function svgLayerErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    if (L.type !== 'svg') return;
    if (pathIsDegenerate(L.d)) {
      out.push(`${at} (svg) has a degenerate \`d\` (${JSON.stringify(L.d ?? null)}): zero length, so the mark draws and morphs `
        + 'nothing and the layer renders invisible. Give it a real path, at least two distinct points.');
    }
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layer[${i}]`));
  return out;
}
