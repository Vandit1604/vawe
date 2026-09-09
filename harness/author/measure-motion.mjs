// measure-motion.mjs: MEASURE a transition's real motion from a video, and name it in OUR vocabulary.
//
// Eyeballing frames tells you "a slide with some easing". This measures it: per-frame it tracks the
// moving element (centroid / bounding box / area / luminance) and fits the normalised progress curve
// against the engine's OWN easing library (core/motion.js EASINGS + core/cuts.js TIMINGS), reporting the
// nearest preset + its residual. So it answers two questions with numbers, not vibes:
//   • reference video  → "what transition is this, and which of OUR presets reproduces it?"
//   • OUR render       → "did the transition I authored actually come out as the curve I asked for?"
//
// Dependency-free on purpose: ffmpeg (already required) extracts raw grey frames; the tracking + curve
// fit are plain JS against the same easing functions the renderer uses. No OpenCV/numpy. It tracks a
// single element over a flat-ish background (the common case for a title/card beat); multi-element
// optical-flow (affine) is a documented future upgrade (needs OpenCV). See docs/CRAFT/MEASURE.md.
//
//   make measure VIDEO=twitter.mp4 FROM=47.4 TO=48.7          # what is the "Send" transition?
//   make measure VIDEO=out/brew.mp4 FROM=9.7 TO=10.3 EXPECT=snappy   # did my cut render as snappy?
//   node harness/author/measure-motion.mjs <video> <from_s> <to_s> [expectPreset]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { EASINGS } from '../../core/motion/motion.js';
import { TIMINGS } from '../../core/cuts/index.js';

const argv = process.argv.slice(2);
const VIDEO = process.env.VIDEO || argv[0];
const FROM = parseFloat(process.env.FROM ?? argv[1]);
const TO = parseFloat(process.env.TO ?? argv[2]);
const EXPECT = process.env.EXPECT || argv[3] || null;
if (!VIDEO || !isFinite(FROM) || !isFinite(TO) || TO <= FROM) {
  console.error('usage: make measure VIDEO=<file> FROM=<s> TO=<s> [EXPECT=<preset>]');
  process.exit(2);
}
const tmp = path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : '/tmp', 'measure');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });

// ---- probe source dimensions + fps ----
const probe = (args) => spawnSync('ffprobe', ['-v', 'error', ...args], { encoding: 'utf8' }).stdout.trim();
const dims = probe(['-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'csv=p=0', VIDEO]).split(',');
const SRCW = +dims[0], SRCH = +dims[1];
const fr = (dims[2] || '30/1').split('/'); const FPS = +fr[0] / (+fr[1] || 1);
if (!SRCW || !SRCH) { console.error(`✗ could not probe ${VIDEO}`); process.exit(1); }

// downscale to width 320 for speed; grey rawvideo so tracking is one byte/pixel.
const W = 320, H = Math.round((320 * SRCH) / SRCW / 2) * 2;
const raw = path.join(tmp, 'frames.gray');
// accurate seek (-ss AFTER -i) so frame timing is exact, fast seek would start at a keyframe and
// corrupt the curve. -vsync 0 keeps every real frame (VFR sync would silently drop duplicates).
const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', VIDEO, '-ss', String(FROM), '-t', String(TO - FROM),
  '-vsync', '0', '-vf', `scale=${W}:${H}`, '-pix_fmt', 'gray', '-f', 'rawvideo', raw]);
if (ff.status !== 0) { console.error('✗ ffmpeg extract failed:', (ff.stderr || '').toString().slice(0, 300)); process.exit(1); }
const bytes = fs.readFileSync(raw);
const frameSize = W * H;
const N = Math.floor(bytes.length / frameSize);
if (N < 3) { console.error(`✗ only ${N} frames in [${FROM}, ${TO}]. Widen the window`); process.exit(1); }

// ---- per-frame tracking: centroid / bbox / area / mean-luma of the FOREGROUND ----
// foreground = pixels whose luma differs from the background by > delta. bg = median of the 4 corners
// (robust to either dark-on-light or light-on-dark, so no polarity flag needed).
const DELTA = +(process.env.THRESH ?? 38);
const series = { cx: [], cy: [], w: [], h: [], area: [], luma: [] };
for (let f = 0; f < N; f++) {
  const off = f * frameSize;
  const corner = (x, y) => bytes[off + y * W + x];
  const bgArr = [corner(2, 2), corner(W - 3, 2), corner(2, H - 3), corner(W - 3, H - 3)].sort((a, b) => a - b);
  const bg = (bgArr[1] + bgArr[2]) / 2;
  let sx = 0, sy = 0, n = 0, minX = W, minY = H, maxX = 0, maxY = 0, lsum = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = bytes[off + y * W + x];
    lsum += p;
    if (Math.abs(p - bg) > DELTA) { sx += x; sy += y; n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  series.cx.push(n ? sx / n : W / 2);
  series.cy.push(n ? sy / n : H / 2);
  series.w.push(n ? (maxX - minX) : 0);
  series.h.push(n ? (maxY - minY) : 0);
  series.area.push(n);
  series.luma.push(lsum / frameSize);
}

// ---- pick the dominant channel: the one that travels the most (normalised range) ----
const stat = (a) => { const mn = Math.min(...a), mx = Math.max(...a); return { mn, mx, range: mx - mn }; };
const CH = { cx: 'centroid-x (slide/whip →)', cy: 'centroid-y (slide/whip ↕)', area: 'area (scale/zoom)', luma: 'mean-luma (dissolve/flash/opacity)' };
const candidates = ['cx', 'cy', 'area', 'luma'].map((k) => {
  const s = stat(series[k]); const denom = k === 'luma' ? 255 : k === 'area' ? frameSize : (k === 'cx' ? W : H);
  // a rigid channel (cx/cy) that travels < ~2% of the frame is tracking noise, not a slide, a word
  // that blurs/types in place jitters the centroid a few px. Deprioritise it so a real channel wins.
  const noise = (k === 'cx' || k === 'cy') && s.range < W * 0.02;
  return { k, ...s, norm: noise ? s.range / denom * 0.01 : s.range / denom };
}).sort((a, b) => b.norm - a.norm);
const dom = candidates[0];
const rawSeries = series[dom.k];

// ---- trim to the active motion window: drop leading/trailing frames where nothing moves ----
const vel = rawSeries.map((v, i) => (i === 0 ? 0 : Math.abs(v - rawSeries[i - 1])));
const moveThresh = (dom.mx - dom.mn) * 0.02;
let a = 0, b = N - 1;
while (a < N - 1 && vel[a + 1] < moveThresh) a++;
while (b > a + 1 && vel[b] < moveThresh) b--;
const active = rawSeries.slice(a, b + 1);
const durS = (b - a) / FPS;

// ---- normalise progress 0→1 over the active window (start→final), then fit each preset ----
const y0 = active[0], yF = active[active.length - 1];
const span = yF - y0 || 1e-6;
const yNorm = active.map((v) => (v - y0) / span);
const M = yNorm.length;
const ALL = { ...EASINGS, ...TIMINGS }; // engine's full easing vocabulary
const rms = (name) => {
  const fn = ALL[name]; let s = 0;
  for (let i = 0; i < M; i++) { const t = i / (M - 1); const e = fn(t); s += (e - yNorm[i]) ** 2; }
  return Math.sqrt(s / M);
};
const ranked = Object.keys(ALL).map((name) => ({ name, rms: rms(name) })).sort((a, b) => a.rms - b.rms);
const best = ranked[0];
const overshoot = Math.max(...yNorm) > 1.03 ? +(Math.max(...yNorm)).toFixed(2) : null;

// ---- a small ASCII sparkline of the measured curve vs the best-fit preset ----
const spark = (vals) => { const g = '▁▂▃▄▅▆▇█'; return vals.map((v) => g[Math.max(0, Math.min(7, Math.round(v * 7)))]).join(''); };
const bestCurve = Array.from({ length: M }, (_, i) => ALL[best.name](i / (M - 1)));

// ---- filmstrip for the eyeball cross-check ----
const strip = path.join(tmp, 'strip.png');
spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', VIDEO, '-ss', String(FROM), '-t', String(TO - FROM),
  '-vf', `fps=12,scale=220:-1,tile=8x2:margin=3:padding=3`, '-frames:v', '1', strip]);

// ---- report ----
console.log(`\n  MOTION MEASUREMENT · ${VIDEO} · [${FROM}s → ${TO}s] · ${FPS.toFixed(0)}fps · ${N} frames\n`);
console.log(`  dominant channel : ${dom.k}, ${CH[dom.k]}`);
console.log(`  active window    : frames ${a}–${b}  →  measured duration ${durS.toFixed(2)}s (${b - a} frames)`);
const px = (v, k) => k === 'luma' ? `${v.toFixed(1)}/255` : k === 'area' ? `${(100 * v / frameSize).toFixed(1)}% coverage` : `${v.toFixed(0)}px @${W}w`;
console.log(`  delta            : ${px(y0, dom.k)} → ${px(yF, dom.k)}  (span ${span.toFixed(1)})`);
if (dom.k === 'cx' || dom.k === 'cy') console.log(`  in source px     : ${(span * SRCW / W).toFixed(0)}px of ${dom.k === 'cx' ? SRCW : SRCH}  (${(100 * Math.abs(span) / W).toFixed(0)}% of frame)`);
console.log(`\n  measured curve   : ${spark(yNorm)}`);
console.log(`  best-fit preset  : ${spark(bestCurve)}   ← ${best.name}`);
console.log(`\n  ▶ nearest engine easing: "${best.name}"  (residual ${best.rms.toFixed(3)} ${best.rms < 0.03 ? ', tight' : best.rms < 0.07 ? ', close' : ', loose, see note'})`);
console.log(`    runners-up: ${ranked.slice(1, 4).map((r) => `${r.name} ${r.rms.toFixed(3)}`).join(' · ')}`);
if (overshoot) console.log(`    ⤴ overshoot to ${overshoot} → an anticipation/back/elastic ease (pop / easeOutBack / spring-bouncy)`);
if (best.rms > 0.07) console.log(`    ~ loose fit: likely TWO stacked tweens (e.g. position + scale), a mid-hold, or a mask/dissolve the single-channel tracker can't split, confirm on the filmstrip.`);
if (EXPECT) {
  const er = ALL[EXPECT] ? rms(EXPECT) : null;
  if (er == null) console.log(`\n  EXPECT "${EXPECT}" is not a known preset. One of: ${Object.keys(ALL).slice(0, 12).join(', ')}…`);
  else console.log(`\n  ✓ EXPECT check: authored "${EXPECT}" → residual ${er.toFixed(3)} ${er < 0.05 ? '(matches. The render is faithful to the intent)' : `(does NOT match; measured curve is closer to "${best.name}")`}`);
}
console.log(`\n  filmstrip: ${strip}   ·   what this CAN'T see: masks vs clip-path, blend modes, true 3D depth, shader distortion (docs/CRAFT/MEASURE.md).\n`);

// machine-readable sidecar for downstream use / self-verification gates
const out = { video: VIDEO, from: FROM, to: TO, fps: FPS, frames: N, dominant: dom.k, durationS: +durS.toFixed(3),
  delta: { from: +y0.toFixed(2), to: +yF.toFixed(2), span: +span.toFixed(2) }, overshoot,
  best: best.name, residual: +best.rms.toFixed(4), rankedTop: ranked.slice(0, 5).map((r) => ({ name: r.name, rms: +r.rms.toFixed(4) })),
  expect: EXPECT ? { preset: EXPECT, residual: ALL[EXPECT] ? +rms(EXPECT).toFixed(4) : null } : null };
const jsonPath = path.join(tmp, 'measure.json');
fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));
console.log(`  data → ${jsonPath}`);
