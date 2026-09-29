#!/usr/bin/env node
// harness/media/ref-spec.mjs: reference video -> SPEC.md + spec.json, the measured numbers an agent
// rebuilds a film from. `make spec REF=<mp4>`. ffmpeg only (tesseract only with --ocr).
//
//   node harness/media/ref-spec.mjs <ref.mp4> [--out dir] [--fps 29.97] [--elements 6] [--ocr] [--no-audio]
//
// Reuses: ref-measure/transition.mjs (cuts and how each one changes the picture), core/beats/detect.js (audio onsets, tempo, beat grid),
// core/motion/springs.js approach()/spring() (the curves an arrival is fitted to), see.mjs ocrWords.
// Every frame is decoded at 320px wide; positions and sizes are reported in reference pixels.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { probeSize } from '../lib/frame-forensics.mjs';
import { scratch, ffmpegOrDie } from '../lib/scratch.mjs';
import { readWav } from './wav-read.mjs';
import { onsetEnvelope, estimateTempo, estimatePhase, beatGrid } from '../../core/beats/detect.js';
import { r1, r3, median, mode, summariseMove } from '../lib/move-fit.mjs';
import { refineTrack } from '../lib/ref-measure/subpixel.mjs';
import { findTransitions } from '../lib/ref-measure/transition.mjs';

const GRID_W = 320;
const DIFF_THR = 6;
const MAX_FRAMES = 2400;
const die = (m) => { console.error(`✗ ${m}`); process.exit(2); };
const hex = (rgb) => `#${[rgb >> 16, (rgb >> 8) & 255, rgb & 255].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

function probeRate(video) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=avg_frame_rate',
    '-of', 'default=noprint_wrappers=1:nokey=1', video], { encoding: 'utf8' });
  const m = /^(\d+)(?:\/(\d+))?/.exec(String(r.stdout).trim());
  return m ? +m[1] / (m[2] ? +m[2] : 1) : 30;
}

function decode(video, fps, dir, W, H) {
  const w = GRID_W, h = 2 * Math.round((GRID_W * H) / W / 2);
  const raw = path.join(dir, 'frames.rgb');
  ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-an', '-vf', `fps=${fps},scale=${w}:${h}`,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw], raw, 'frame decode');
  const buf = fs.readFileSync(raw);
  fs.rmSync(raw, { force: true });
  const n = Math.floor(buf.length / (w * h * 3));
  if (n < 2) die('fewer than 2 frames decoded');
  if (n > MAX_FRAMES) die(`${n} frames at ${fps} fps is too long for a per-frame spec (max ${MAX_FRAMES}). Pass --fps lower, or cut the reference.`);
  const gray = new Uint8Array(n * w * h);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 3;
    gray[i] = (buf[o] * 77 + buf[o + 1] * 150 + buf[o + 2] * 29) >> 8;
  }
  return { w, h, n, rgb: buf, gray, frame: (i) => gray.subarray(i * w * h, (i + 1) * w * h) };
}

// ── cuts: every shot change, classified, in ref-measure/transition.mjs ─────────────────────────────
function findCuts(V, fps) {
  return findTransitions(V).map((t) => ({ frame: t.endFrame, t: r3(t.endFrame / fps), spike: t.spike, transition: { ...t, startT: r3(t.startFrame / fps) } }));
}

// ── camera: global zoom + pan between two frames ─────────────────────────────────────────────────
const halfRes = (g, w, h) => {
  const w2 = w >> 1, h2 = h >> 1, out = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const i = 2 * y * w + 2 * x;
    out[y * w2 + x] = (g[i] + g[i + 1] + g[i + w] + g[i + w + 1]) / 4;
  }
  return out;
};

// B(x) = A(c + (x - c)/s - d): trimmed mean error (lowest 60%), so moving elements do not vote.
function camCost(A, B, w, h, s, dx, dy, hist) {
  hist.fill(0);
  let n = 0;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let y = 6; y < h - 6; y += 2) for (let x = 6; x < w - 6; x += 2) {
    const sx = cx + (x - cx) / s - dx, sy = cy + (y - cy) / s - dy;
    if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) continue;
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, i = y0 * w + x0;
    const a = A[i] * (1 - fx) * (1 - fy) + A[i + 1] * fx * (1 - fy) + A[i + w] * (1 - fx) * fy + A[i + w + 1] * fx * fy;
    hist[Math.min(255, Math.round(Math.abs(B[y * w + x] - a)))]++;
    n++;
  }
  let keep = Math.floor(n * 0.6);
  const want = keep || 1;
  let sum = 0;
  for (let b = 0; b < 256 && keep > 0; b++) { const c = Math.min(hist[b], keep); sum += c * b; keep -= c; }
  return n ? sum / want : Infinity;
}

function estimateCamera(A, B, w, h) {
  const hist = new Uint32Array(256);
  const cost = (s, dx, dy) => camCost(A, B, w, h, s, dx, dy, hist) + 1e-3 * (Math.abs(dx) + Math.abs(dy) + Math.abs(s - 1) * 100);
  const c0 = cost(1, 0, 0);
  const still = { s: 1, dx: 0, dy: 0 };
  if (c0 < 0.4) return still;
  let best = { ...still, cost: c0 };
  const tryc = (s, dx, dy) => { const v = cost(s, dx, dy); if (v < best.cost) best = { s, dx, dy, cost: v }; };
  for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) tryc(1, dx, dy);
  for (let s = 0.9; s <= 1.101; s += 0.02) tryc(s, 0, 0);
  for (const step of [1, 1, 0.5, 0.5, 0.25]) {
    const b = { ...best };
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) tryc(b.s, b.dx + i * step, b.dy + j * step);
    const b2 = { ...best };
    for (const k of [-2, -1, 1, 2]) tryc(b2.s + k * step * 0.01, b2.dx, b2.dy);
  }
  return best.cost > c0 * 0.97 ? still : { s: best.s, dx: best.dx, dy: best.dy };
}

function warp(A, B, w, h, cam) {
  const out = new Uint8Array(A.length), cx = (w - 1) / 2, cy = (h - 1) / 2, tx = cam.dx * 2, ty = cam.dy * 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = cx + (x - cx) / cam.s - tx, sy = cy + (y - cy) / cam.s - ty;
    const o = y * w + x;
    if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) { out[o] = B[o]; continue; }
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, i = y0 * w + x0;
    out[o] = A[i] * (1 - fx) * (1 - fy) + A[i + 1] * fx * (1 - fy) + A[i + w] * (1 - fx) * fy + A[i + w + 1] * fx * fy;
  }
  return out;
}

// ── moving elements: connected components of the camera-compensated difference ───────────────────

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
function findBlobs(A, B, w, h) {
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
function blobShift(A, B, w, h, blob) {
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

function edgeEnergy(g, w, h, cx, cy, bw, bh) {
  const x0 = Math.max(1, Math.round(cx - bw / 2 - 2)), x1 = Math.min(w - 2, Math.round(cx + bw / 2 + 2));
  const y0 = Math.max(1, Math.round(cy - bh / 2 - 2)), y1 = Math.min(h - 2, Math.round(cy + bh / 2 + 2));
  let ex = 0, ey = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    ex += Math.abs(g[y * w + x + 1] - g[y * w + x - 1]);
    ey += Math.abs(g[(y + 1) * w + x] - g[(y - 1) * w + x]);
    n++;
  }
  return n ? { ex: ex / n, ey: ey / n } : { ex: 0, ey: 0 };
}

function trackShot(V, f0, f1, cams, maxTracks) {
  const { w, h } = V;
  const tracks = [];
  for (let f = f0 + 1; f < f1; f++) {
    const cam = cams[f];
    const still = cam.s === 1 && cam.dx === 0 && cam.dy === 0;
    const B = V.frame(f);
    const A = still ? V.frame(f - 1) : warp(V.frame(f - 1), B, w, h, cam);
    const pairs = [], cands = [];
    for (const b of findBlobs(A, B, w, h)) {
      const { vx, vy } = blobShift(A, B, w, h, b);
      const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
      const mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
      // Overlapping old and new boxes make one blob (union of both); a jump longer than the box makes two blobs, the new one at its own centre.
      const union = { f, x: mx + vx / 2, y: my + vy / 2, vx, vy, w: Math.max(2, bw - Math.abs(vx)), h: Math.max(2, bh - Math.abs(vy)), area: b.area };
      const whole = { f, x: mx, y: my, vx, vy, w: bw, h: bh, area: b.area };
      const ci = cands.push(union.w >= 3 && union.h >= 3 ? union : whole) - 1;
      for (const t of tracks) {
        const last = t.pts[t.pts.length - 1];
        if (last.f !== f - 1) continue;
        for (const pt of [union, whole]) {
          const d = Math.hypot(pt.x - (last.x + last.vx), pt.y - (last.y + last.vy));
          const dw = Math.abs(pt.w - last.w) + Math.abs(pt.h - last.h);
          if (d < Math.max(12, 1.2 * Math.max(bw, bh)) && dw <= 0.35 * (last.w + last.h)) pairs.push({ t, ci, pt, score: d + 1.5 * dw });
        }
      }
    }
    const usedTrack = new Set(), usedBlob = new Set();
    for (const p of pairs.sort((a, b) => a.score - b.score)) {
      if (usedTrack.has(p.t) || usedBlob.has(p.ci)) continue;
      p.t.pts.push(p.pt);
      usedTrack.add(p.t); usedBlob.add(p.ci);
    }
    cands.forEach((pt, ci) => { if (!usedBlob.has(ci)) tracks.push({ pts: [pt] }); });
  }
  const scored = tracks.filter((t) => t.pts.length >= 3).map((t) => {
    const travel = t.pts.reduce((s, p) => s + Math.hypot(p.vx, p.vy), 0);
    const area = t.pts.reduce((s, p) => s + p.area, 0) / t.pts.length;
    return { t, score: travel + 0.05 * area * t.pts.length };
  }).sort((a, b) => b.score - a.score).slice(0, maxTracks);
  return scored.map((s) => s.t).sort((a, b) => a.pts[0].f - b.pts[0].f);
}

// ── one element's move: overshoot, arrival curve, blur ───────────────────────────────────────────
// The colour most pixels in the middle of the element's box share: its fill, not its edges or text.
function modalColor(V, f, cx, cy, bw, bh) {
  const x0 = Math.max(0, Math.round(cx - bw * 0.3)), x1 = Math.min(V.w - 1, Math.round(cx + bw * 0.3));
  const y0 = Math.max(0, Math.round(cy - bh * 0.3)), y1 = Math.min(V.h - 1, Math.round(cy + bh * 0.3));
  const count = new Map();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const o = (f * V.w * V.h + y * V.w + x) * 3;
    const key = (V.rgb[o] << 16) | (V.rgb[o + 1] << 8) | V.rgb[o + 2];
    count.set(key, (count.get(key) || 0) + 1);
  }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? hex(top[0]) : null;
}

function analyseTrack(track, V, fps, sc, cameraStill) {
  const refined = cameraStill ? refineTrack(V, track.pts) : null;
  const pts = refined ? refined.pts : track.pts;
  const dx = pts[pts.length - 1].x - (pts[0].x - pts[0].vx), dy = pts[pts.length - 1].y - (pts[0].y - pts[0].vy);
  const axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  const v = (p) => (axis === 'x' ? p.vx : p.vy);
  const pos = pts.map((p) => p[axis]);
  const p0 = refined && refined.before ? refined.before[axis] : pos[0] - v(pts[0]), p1 = pos[pos.length - 1], D = p1 - p0;
  const speeds = pts.map((p) => Math.hypot(p.vx, p.vy) * sc);
  const peak = Math.max(...speeds);
  const moving = speeds.filter((s) => s >= 0.05 * peak).length;
  const out = { f0: pts[0].f, f1: pts[pts.length - 1].f, axis, frames: pts.length, movingFrames: moving,
    from: [r1(pts[0].x * sc), r1(pts[0].y * sc)], to: [r1(pts[pts.length - 1].x * sc), r1(pts[pts.length - 1].y * sc)],
    size: [r1(median(pts.map((p) => p.w)) * sc), r1(median(pts.map((p) => p.h)) * sc)], peakSpeed: r1(peak), overshoot: null, fit: null };
  Object.assign(out, summariseMove(pos, p0, p1, fps, sc, { f0: pts[0].f }));
  const last = pts[pts.length - 1];
  out.color = modalColor(V, last.f, last.x, last.y, last.w, last.h);
  const travel = Math.abs(D) * sc;
  out.confidence = pts.length >= 5 && (!out.fit || out.fit.rmsePx <= 0.08 * travel) ? 'high' : 'low';
  const energies = pts.map((p) => edgeEnergy(V.frame(p.f), V.w, V.h, p.x, p.y, p.w, p.h));
  const mx = Math.max(...energies.map((e) => e.ex), 1e-6), my = Math.max(...energies.map((e) => e.ey), 1e-6);
  out.rows = pts.map((p, i) => {
    const rx = energies[i].ex / mx, ry = energies[i].ey / my, sharp = (rx + ry) / 2;
    const dir = rx < ry - 0.12 ? 'h' : ry < rx - 0.12 ? 'v' : '';
    return { f: p.f, x: r1(p.x * sc), y: r1(p.y * sc), w: r1(p.w * sc), h: r1(p.h * sc), vx: r1(p.vx * sc), vy: r1(p.vy * sc),
      sharp: r3(sharp), blurDir: sharp < 0.75 ? dir || 'radial' : '' };
  });
  const blurred = out.rows.filter((r) => r.blurDir);
  out.blur = blurred.length ? { f0: blurred[0].f, f1: blurred[blurred.length - 1].f, frames: blurred.length,
    minSharp: Math.min(...blurred.map((r) => r.sharp)), dir: mode(blurred.map((r) => r.blurDir)) } : null;
  return out;
}

// ── palette: k-means, deterministic (farthest-point start), reported as the exact modal pixel per cluster ──
function palette(V, f0, f1, k = 5) {
  const pick = Math.min(10, f1 - f0), pts = [];
  for (let j = 0; j < pick; j++) {
    const f = f0 + Math.floor(((j + 0.5) * (f1 - f0)) / pick), base = f * V.w * V.h * 3;
    for (let y = 0; y < V.h; y += 2) for (let x = 0; x < V.w; x += 2) {
      const o = base + (y * V.w + x) * 3;
      pts.push([V.rgb[o], V.rgb[o + 1], V.rgb[o + 2]]);
    }
  }
  const cent = [pts[Math.floor(pts.length / 2)]];
  while (cent.length < k) {
    let far = pts[0], farD = -1;
    for (const p of pts) {
      const d = Math.min(...cent.map((c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2));
      if (d > farD) { farD = d; far = p; }
    }
    if (farD < 60) break;
    cent.push(far);
  }
  const assign = new Int32Array(pts.length);
  for (let it = 0; it < 8; it++) {
    const sum = cent.map(() => [0, 0, 0, 0]);
    pts.forEach((p, i) => {
      let b = 0, bd = Infinity;
      cent.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; b = j; } });
      assign[i] = b; sum[b][0] += p[0]; sum[b][1] += p[1]; sum[b][2] += p[2]; sum[b][3]++;
    });
    sum.forEach((s, j) => { if (s[3]) cent[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return cent.map((_, j) => {
    const count = new Map();
    let n = 0;
    pts.forEach((p, i) => { if (assign[i] === j) { const key = (p[0] << 16) | (p[1] << 8) | p[2]; count.set(key, (count.get(key) || 0) + 1); n++; } });
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? { hex: hex(top[0]), share: r3(n / pts.length) } : null;
  }).filter(Boolean).sort((a, b) => b.share - a.share);
}

// ── audio ────────────────────────────────────────────────────────────────────────────────────────
function analyseAudio(video, dir, fps, dur) {
  const wav = path.join(dir, 'audio.wav');
  try { ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-vn', '-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le', wav], wav, 'audio extract'); }
  catch { return null; }
  const { mono, sampleRate } = readWav(wav);
  fs.rmSync(wav, { force: true });
  const hop = 256, win = 512;
  const { env, hopSeconds } = onsetEnvelope(mono, sampleRate, hop, win);
  if (!env.length) return null;
  const mean = env.reduce((a, b) => a + b, 0) / env.length;
  const sd = Math.sqrt(env.reduce((a, b) => a + (b - mean) ** 2, 0) / env.length);
  const max = Math.max(...env, 1e-9), thr = mean + 1.2 * sd, hits = [];
  for (let i = 3; i < env.length - 3; i++) {
    if (env[i] < thr) continue;
    let isMax = true;
    for (let k = -3; k <= 3; k++) if (env[i + k] > env[i]) { isMax = false; break; }
    const t = (i * hop + win / 2) / sampleRate;
    if (isMax && (!hits.length || t - hits[hits.length - 1].t >= 0.06)) hits.push({ t: r3(t), frame: Math.round(t * fps), strength: r3(env[i] / max) });
  }
  const tempo = estimateTempo(env, hopSeconds), phase = estimatePhase(env, tempo.periodFrames);
  const beats = beatGrid(tempo.periodFrames, phase, hopSeconds, dur);
  return { hits, bpm: r1(tempo.bpm), confidence: r1(tempo.confidence), framesPerBeat: tempo.bpm ? r1((60 / tempo.bpm) * fps) : 0, beats,
    beatFrames: beats.map((b) => Math.round(b * fps)) };
}

function cutLeads(cuts, audio, fps) {
  return cuts.map((c) => {
    const near = (arr, get) => arr.reduce((b, x) => (b == null || Math.abs(get(x) - c.t) < Math.abs(get(b) - c.t) ? x : b), null);
    const hit = audio && near(audio.hits.filter((h) => h.strength >= 0.25), (h) => h.t);
    const beat = audio && near(audio.beats, (b) => b);
    const frames = (t) => Math.round((c.t - t) * fps);
    return { hitLead: hit && Math.abs(hit.t - c.t) <= 0.3 ? frames(hit.t) : null, beatLead: beat != null && Math.abs(beat - c.t) <= 0.3 ? frames(beat) : null };
  });
}

// ── text (optional) ──────────────────────────────────────────────────────────────────────────────
async function analyseText(video, dir, W, H, fps) {
  const { ocrWords } = await import('./see.mjs');
  return ocrWords(video, dir, 4, 60, 3).map((w) => ({ text: w.text, f0: Math.round(w.tIn * fps), f1: Math.round(w.tOut * fps),
    boxHeightPx: r1(w.box.hFrac * H), fontPxApprox: r1((w.box.hFrac * H) / 0.8), cxPx: r1(w.box.cxFrac * W), cyPx: r1(w.box.cyFrac * H) }));
}

// ── SPEC.md ──────────────────────────────────────────────────────────────────────────────────────
const KEEP_CHANGE = `## KEEP / CHANGE (edit this before rebuilding)

KEEP (copy from the numbers below, frame for frame): timing, cuts, camera, easing, positions, blur, transitions.
CHANGE (make your own): brand, logo, colours, fonts, copy, product screens, faces, platform UI.

Add or remove items per film. A KEEP item is checked with \`make study REF=<ref.mp4> D=<page render.mp4> MATCH=1\`.
`;

const tableRows = (rows, cols, cap = 30) => {
  const head = `| ${cols.map((c) => c[0]).join(' | ')} |\n|${cols.map(() => '---').join('|')}|`;
  const body = rows.slice(0, cap).map((r) => `| ${cols.map((c) => r[c[1]] ?? '').join(' | ')} |`).join('\n');
  return `${head}\n${body}${rows.length > cap ? `\n| ... ${rows.length - cap} more rows in spec.json |` : ''}`;
};

function shotSection(s, fps) {
  const L = [`## Shot ${s.index}: frames ${s.f0}-${s.f1 - 1} (${s.frames} f, ${r1(s.frames / fps * 100) / 100} s)`, ''];
  L.push(`palette: ${s.palette.map((p) => `${p.hex} ${Math.round(p.share * 100)}%`).join(', ')}`);
  const c = s.camera;
  L.push(`camera: zoom x${c.zoomTotal} (peak ${c.peakZoomPerFrame}/f), pan ${c.panTotalPx[0]},${c.panTotalPx[1]} px (peak ${c.peakPanPxPerFrame} px/f)${c.big ? '' : ' (static, no table)'}`);
  if (c.big) L.push('', tableRows(c.rows, [['f', 'f'], ['zoom cum', 'zoomCum'], ['dzoom', 'dz'], ['pan x px', 'panX'], ['pan y px', 'panY'], ['dx', 'dx'], ['dy', 'dy']], 40));
  if (!s.elements.length) L.push('elements: none tracked');
  for (const e of s.elements) {
    const fit = e.fit ? `; ${e.fit.kind} k=${e.fit.k}${e.fit.d ? ` d=${e.fit.d}` : ''} (rmse ${e.fit.rmsePx} px, other ${e.fit.otherRmsePx})` : '';
    const over = e.overshoot != null ? `; overshoot x${e.overshoot}` : '';
    const blur = e.blur ? `; blur f${e.blur.f0}-${e.blur.f1} dir ${e.blur.dir} min sharp ${e.blur.minSharp}` : '';
    L.push('', `### E${e.id}: f${e.f0}-${e.f1}, (${e.from}) -> (${e.to}) px, size ${e.size[0]}x${e.size[1]}, ${e.movingFrames} moving f, peak ${e.peakSpeed} px/f${over}${fit}${blur}`);
    if (e.big) L.push('', tableRows(e.rows, [['f', 'f'], ['x', 'x'], ['y', 'y'], ['w', 'w'], ['h', 'h'], ['vx', 'vx'], ['vy', 'vy'], ['sharp', 'sharp'], ['blur', 'blurDir']]));
  }
  if (s.text.length) L.push('', 'text: ' + s.text.map((t) => `"${t.text}" f${t.f0}-${t.f1} box ${t.boxHeightPx} px (font ~${t.fontPxApprox} px)`).join('; '));
  if (s.hits.length) L.push('', `audio hits (frame:strength): ${s.hits.map((h) => `${h.frame}:${h.strength}`).join(' ')}`);
  return L.join('\n');
}

function renderSpec(spec) {
  const m = spec.media;
  const L = [`# SPEC: ${path.basename(m.file)}`, '',
    `${m.width}x${m.height} · ${m.nativeFps} fps native, analysed at ${spec.fps} fps · ${spec.frames} frames · ${r1(spec.duration * 100) / 100} s · ${spec.shots.length} shots`,
    'Measured by harness/media/ref-spec.mjs. Frames are 0-based. Positions are element centres in reference px. `x`/`y` and sizes are measured, never eyeballed;',
    'camera pan is how far the content moves (positive = right/down), zoom above 1 = push in. Element numbers are the change region between frames, tracked after camera compensation.', '',
    KEEP_CHANGE, '## Cuts', '',
    tableRows(spec.cuts.map((c, i) => ({ n: i + 1, frame: c.frame, t: c.t, spike: c.spike, hit: c.hitLead ?? '', beat: c.beatLead ?? '' })),
      [['#', 'n'], ['frame', 'frame'], ['t s', 't'], ['diff spike x median', 'spike'], ['audio hit lead f', 'hit'], ['beat lead f', 'beat']], 80), '',
    'lead = frames the sound comes before the cut (positive), within 0.3 s.', ''];
  if (spec.audio) {
    const a = spec.audio;
    L.push('## Audio', '', `${a.bpm} BPM (confidence ${a.confidence}; below 1.6 is weak), ${a.framesPerBeat} frames per beat, ${a.hits.length} hits, times accurate to about 12 ms.`, '',
      `beat frames: ${a.beatFrames.slice(0, 48).join(' ')}${a.beatFrames.length > 48 ? ' ...' : ''}`, '',
      tableRows(a.hits, [['t s', 't'], ['frame', 'frame'], ['strength', 'strength']], 60), '');
  } else L.push('## Audio', '', 'no audio stream.', '');
  for (const s of spec.shots) L.push(shotSection(s, spec.fps), '');
  return L.join('\n');
}

// ── main ─────────────────────────────────────────────────────────────────────────────────────────
export async function refSpec({ video, outDir, fps, maxElements = 6, ocr = false, audio = true }) {
  const { width: W, height: H, duration } = probeSize(video);
  if (!W || !H) die(`${video} has no readable video stream`);
  const nativeFps = probeRate(video);
  fps = fps || Math.round(nativeFps * 100) / 100;
  const dir = scratch('ref-spec', path.basename(video, path.extname(video)));
  fs.mkdirSync(dir, { recursive: true });
  console.error(`ref-spec: decoding ${path.basename(video)} at ${fps} fps`);
  const V = decode(video, fps, dir, W, H);
  const sc = W / V.w;
  const cuts = findCuts(V, fps);
  const spans = cuts.reduce((acc, c, i) => { acc[i].f1 = c.transition.startFrame; acc.push({ f0: c.frame, f1: V.n }); return acc; }, [{ f0: 0, f1: V.n }]);

  const cams = [{ s: 1, dx: 0, dy: 0 }];
  let prev = halfRes(V.frame(0), V.w, V.h);
  const inCut = (f) => cuts.some((c) => f >= c.transition.startFrame && f <= c.frame);
  for (let f = 1; f < V.n; f++) {
    const cur = halfRes(V.frame(f), V.w, V.h);
    cams.push(inCut(f) ? { s: 1, dx: 0, dy: 0 } : estimateCamera(prev, cur, V.w >> 1, V.h >> 1));
    prev = cur;
    if (f % 200 === 0) console.error(`  camera ${f}/${V.n}`);
  }

  const aud = audio ? analyseAudio(video, dir, fps, V.n / fps) : null;
  const leads = cutLeads(cuts, aud, fps);
  cuts.forEach((c, i) => Object.assign(c, leads[i]));
  const text = ocr ? await analyseText(video, dir, W, H, fps) : [];

  const shots = [];
  for (let i = 0; i < spans.length; i++) {
    const { f0, f1 } = spans[i];
    if (f1 - f0 < 1) continue;
    console.error(`  shot ${i + 1}: frames ${f0}-${f1 - 1}`);
    const tracks = trackShot(V, f0, f1, cams, maxElements);
    const elements = tracks.map((t, j) => {
      const e = analyseTrack(t, V, fps, sc, cams.slice(f0 + 1, f1).every((c) => c.s === 1 && c.dx === 0 && c.dy === 0));
      const travel = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]);
      return { id: `${i + 1}.${j + 1}`, ...e, big: travel >= 0.03 * W || e.blur != null };
    });
    let zc = 1, px = 0, py = 0;
    const camRows = [];
    for (let f = f0 + 1; f < f1; f++) {
      const c = cams[f];
      zc *= c.s; px += c.dx * 2 * sc; py += c.dy * 2 * sc;
      camRows.push({ f, zoomCum: r3(zc), dz: r3(c.s - 1), panX: r1(px), panY: r1(py), dx: r1(c.dx * 2 * sc), dy: r1(c.dy * 2 * sc) });
    }
    const peakZ = Math.max(0, ...camRows.map((r) => Math.abs(r.dz))), peakP = Math.max(0, ...camRows.map((r) => Math.hypot(r.dx, r.dy)));
    const big = Math.abs(zc - 1) > 0.02 || Math.hypot(px, py) > 0.02 * W;
    shots.push({ index: i + 1, f0, f1, frames: f1 - f0, t0: r3(f0 / fps), t1: r3(f1 / fps),
      palette: palette(V, f0, f1),
      camera: { zoomTotal: r3(zc), panTotalPx: [r1(px), r1(py)], peakZoomPerFrame: r3(peakZ), peakPanPxPerFrame: r1(peakP), big,
        rows: camRows.filter((r) => Math.abs(r.dz) > 0.0015 || Math.hypot(r.dx, r.dy) > 0.5) },
      elements, text: text.filter((t) => t.f0 >= f0 && t.f0 < f1),
      hits: aud ? aud.hits.filter((h) => h.frame >= f0 && h.frame < f1) : [] });
  }
  const spec = { media: { file: video, width: W, height: H, nativeFps: r1(nativeFps) }, fps, frames: V.n, duration: duration || V.n / fps,
    cuts, audio: aud, shots, ocr };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'spec.json'), `${JSON.stringify(spec, null, 1)}\n`);
  fs.writeFileSync(path.join(outDir, 'SPEC.md'), `${renderSpec(spec)}\n`);
  fs.rmSync(dir, { recursive: true, force: true });
  return spec;
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const video = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').match(/^--(out|fps|elements)$/));
  if (!video) die('usage: node harness/media/ref-spec.mjs <ref.mp4> [--out dir] [--fps 29.97] [--elements 6] [--ocr] [--no-audio]');
  if (!fs.existsSync(video)) die(`no such file: ${video}`);
  const outDir = path.resolve(flag('--out', path.dirname(path.resolve(video))));
  const spec = await refSpec({ video: path.resolve(video), outDir, fps: Number(flag('--fps', 0)) || 0, maxElements: Number(flag('--elements', 6)),
    ocr: argv.includes('--ocr'), audio: !argv.includes('--no-audio') });
  console.log(`✓ ref-spec: ${spec.shots.length} shot(s), ${spec.cuts.length} cut(s) -> ${path.join(outDir, 'SPEC.md')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
