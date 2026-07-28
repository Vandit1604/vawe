// backgrounds.js — animated background library for premium motion graphics. Everything draws to a
// <canvas> deterministically from the time input t (seconds) → PURE in n (no Math.random per call;
// particle seeds come from the seeded random() in motion.js). Composed per scene so no two scenes
// share a background (the variety rule). Techniques + parameter ranges are from motion-design refs:
// dot-matrix wave/ripple, particle field, constellation, aurora blobs, spotlight sweep, grain.
import { random, clamp01 } from './motion.js';

// ---- base fill: a tinted-neutral gradient (never pure #000/#fff). radial = spotlit, linear = flat.
export function paintBase(ctx, w, h, { kind = 'radial', from = '#0b0e26', to = '#05061a', cx = 0.6, cy = 0.4, color } = {}) {
  if (kind === 'solid') { ctx.fillStyle = color || from; ctx.fillRect(0, 0, w, h); return; }
  let g;
  if (kind === 'linear') { g = ctx.createLinearGradient(0, 0, 0, h); }
  else { g = ctx.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, Math.hypot(w, h) * 0.7); }
  g.addColorStop(0, from); g.addColorStop(1, to);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

// ---- geometric shapes: big soft rings / circles / pills drifting slowly. Reads editorial/premium
// on a plain base. Deterministic (seeded), colours from the brand palette only.
export function shapes(ctx, w, h, t, o = {}) {
  const c1 = o.color || '225,80,15', c2 = o.color2 || c1, dark = o.dark;
  const a = o.alpha ?? (dark ? 0.14 : 0.10), lw = o.lineWidth ?? 3, seed = o.seed ?? 4;
  const defs = o.items || [
    { k: 'ring', x: 0.16, y: 0.24, r: 210, c: c1, sp: 17, amp: 26 },
    { k: 'ring', x: 0.86, y: 0.7, r: 300, c: c2, sp: 21, amp: 34 },
    { k: 'disc', x: 0.78, y: 0.2, r: 120, c: c2, sp: 15, amp: 22 },
    { k: 'disc', x: 0.22, y: 0.82, r: 90, c: c1, sp: 19, amp: 18 },
    { k: 'ring', x: 0.5, y: 0.5, r: 460, c: c1, sp: 25, amp: 20 },
  ];
  defs.forEach((d, i) => {
    const dx = Math.sin(t * (2 * Math.PI / d.sp) + i) * d.amp, dy = Math.cos(t * (2 * Math.PI / (d.sp * 1.3)) + i) * d.amp;
    const x = d.x * w + dx, y = d.y * h + dy;
    ctx.beginPath(); ctx.arc(x, y, d.r, 0, Math.PI * 2);
    if (d.k === 'disc') { ctx.fillStyle = `rgba(${d.c},${(a * 0.7).toFixed(3)})`; ctx.fill(); }
    else { ctx.lineWidth = lw; ctx.strokeStyle = `rgba(${d.c},${a.toFixed(3)})`; ctx.stroke(); }
  });
}

// ---- dot matrix. mode: 'pulse' (uniform breathe) | 'wave' (diagonal sweep) | 'ripple' (radial rings).
// Per-dot value ∈[0,1] drives radius + alpha. spacing 40–72, r 1.5–3 → peak 4–6. Premium = sparse + low alpha.
export function dotGrid(ctx, w, h, t, o = {}) {
  const spacing = o.spacing ?? 56, rBase = o.r ?? 2, rPeak = o.rPeak ?? 5;
  const color = o.color ?? '169,180,255', baseA = o.baseAlpha ?? 0.10, peakA = o.peakAlpha ?? 0.55;
  const period = o.period ?? 4.5, w2 = (2 * Math.PI) / period, k = o.k ?? 0.03;
  const mode = o.mode ?? 'wave', cx = (o.cx ?? 0.5) * w, cy = (o.cy ?? 0.5) * h;
  const dx = (o.driftX ?? 0) * t, dy = (o.driftY ?? 0) * t;
  // seed shifts the grid registration + wave phase so the SAME dot preset differs per video
  const so = o.seed ?? 0, gx = (((so * 29) % spacing) + spacing) % spacing, gy = (((so * 53) % spacing) + spacing) % spacing, ph0 = (so % 100) * 0.0628;
  for (let y = -spacing; y < h + spacing; y += spacing) {
    for (let x = -spacing; x < w + spacing; x += spacing) {
      const px = x + (dx % spacing) + gx, py = y + (dy % spacing) + gy;
      let phase;
      if (mode === 'pulse') phase = 0;
      else if (mode === 'ripple') phase = Math.hypot(px - cx, py - cy) * k;
      else phase = (px + py) * k;
      const v = 0.5 + 0.5 * Math.sin(t * w2 - phase + ph0);
      ctx.beginPath();
      ctx.arc(px, py, rBase + (rPeak - rBase) * v, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${(baseA + (peakA - baseA) * v).toFixed(3)})`;
      ctx.fill();
    }
  }
}

// deterministic particle set: positions/velocities seeded by index → same every render.
function makeParticles(count, w, h, seed = 1) {
  const ps = [];
  for (let i = 0; i < count; i++) {
    const s = `${seed}:${i}`;
    ps.push({
      x: random(`${s}:x`) * w, y: random(`${s}:y`) * h,
      vx: (random(`${s}:vx`) - 0.5) * 2, vy: (random(`${s}:vy`) - 0.5) * 2,
      r: 1 + random(`${s}:r`) * 3, a: 0.12 + random(`${s}:a`) * 0.3,
    });
  }
  return ps;
}
const _pcache = {};
function particlesFor(count, w, h, seed) { const key = `${count}:${w}:${h}:${seed}`; return _pcache[key] || (_pcache[key] = makeParticles(count, w, h, seed)); }

// ---- floating particle field (+ optional constellation lines between near particles).
export function particles(ctx, w, h, t, o = {}) {
  const count = o.count ?? 70, color = o.color ?? '169,180,255', speed = o.speed ?? 10, seed = o.seed ?? 1;
  const connect = o.connect ?? false, cd = o.connectDist ?? 140;
  const ps = particlesFor(count, w, h, seed);
  const pos = ps.map((p) => ({ x: ((p.x + p.vx * speed * t) % w + w) % w, y: ((p.y + p.vy * speed * t) % h + h) % h, r: p.r, a: p.a }));
  if (connect) {
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
      if (d < cd) { ctx.strokeStyle = `rgba(${color},${(0.14 * (1 - d / cd)).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(pos[j].x, pos[j].y); ctx.stroke(); }
    }
  }
  for (const p of pos) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(${color},${p.a})`; ctx.fill(); }
}

// ---- aurora: 2–4 large soft radial blobs drifting on slow independent sine paths ('lighter' glow).
export function aurora(ctx, w, h, t, o = {}) {
  const blobs = o.blobs || [
    { color: '31,59,255', x: 0.3, y: 0.4, r: 620, ax: 120, ay: 90, px: 16, py: 20, ph: 0 },
    { color: '106,31,255', x: 0.7, y: 0.55, r: 560, ax: 150, ay: 110, px: 19, py: 14, ph: 2 },
    { color: '31,182,255', x: 0.55, y: 0.3, r: 480, ax: 100, ay: 80, px: 13, py: 22, ph: 4 },
  ];
  ctx.globalCompositeOperation = 'lighter';
  const so = o.seed ?? 0; // seed jitters blob positions + phase so the SAME preset differs per video
  blobs.forEach((b, i) => {
    const jx = Math.sin(so * 7.3 + i * 2.1) * 0.12, jy = Math.cos(so * 5.7 + i * 1.7) * 0.12, jp = so * 0.9 + i;
    const cx = (b.x + jx) * w + Math.sin(t * (2 * Math.PI / b.px) + b.ph + jp) * b.ax;
    const cy = (b.y + jy) * h + Math.cos(t * (2 * Math.PI / b.py) + b.ph + jp) * b.ay;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
    g.addColorStop(0, `rgba(${b.color},${o.intensity ?? 0.5})`);
    g.addColorStop(1, `rgba(${b.color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
}

// ---- softwash: big soft colour blobs that TINT the base (source-over, moderate alpha) into a smooth
// gradient WASH — orange-into-white / green-into-white, the "mesh gradient" look. Blobs drift on slow
// sine paths (pure in t). Unlike aurora it does NOT use 'lighter', so on a LIGHT base it reads as colour
// pooling into white (not blowing out). `grid` overlays a faint technical line grid (the blueprint look).
// A pool needs a CORE and a TAIL. A single 0→transparent stop spreads the colour evenly over the whole
// radius, and three of those on one frame average out into flat haze — which is exactly how the first cut
// of gradientWash/blobs rendered: pale, and near-indistinguishable from each other. Holding most of the
// alpha inside the first third gives each pool a readable centre, and the long tail still blends.
const WASH_CORE = 0.34;
export function softwash(ctx, w, h, t, o = {}) {
  // Sizes and drifts are FRACTIONS of the frame diagonal, not pixels. Absolute radii meant a preset that
  // composed on 1920x1080 turned to mush on 1080x1920 (the same 800px pool covers a very different share
  // of the frame), so the backdrop silently changed character with the aspect.
  const d = Math.hypot(w, h);
  const blobs = o.blobs || [
    { color: o.color || '46,224,160', x: 0.17, y: 0.24, rf: 0.30, ax: 0.04, ay: 0.035, px: 22, py: 27, ph: 0, a: 0.62 },
    { color: o.color2 || o.color || '46,224,160', x: 0.85, y: 0.76, rf: 0.34, ax: 0.05, ay: 0.04, px: 26, py: 20, ph: 2, a: 0.54 },
    { color: o.color3 || o.color || '46,224,160', x: 0.6, y: 0.1, rf: 0.21, ax: 0.032, ay: 0.03, px: 18, py: 24, ph: 4, a: 0.4 },
  ];
  const so = o.seed ?? 0;
  blobs.forEach((b, i) => {
    const jx = Math.sin(so * 6.1 + i * 2.3) * 0.08, jy = Math.cos(so * 4.9 + i * 1.9) * 0.08;
    const r = b.rf != null ? b.rf * d : b.r;                       // `r` (px) still honoured if given
    const ax = b.ax <= 1 ? b.ax * d : b.ax, ay = b.ay <= 1 ? b.ay * d : b.ay;
    const cx = (b.x + jx) * w + Math.sin(t * (2 * Math.PI / b.px) + b.ph) * ax;
    const cy = (b.y + jy) * h + Math.cos(t * (2 * Math.PI / b.py) + b.ph) * ay;
    const a = (b.a ?? 0.45) * (o.intensity ?? 1);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${b.color},${a.toFixed(3)})`);
    g.addColorStop(WASH_CORE, `rgba(${b.color},${(a * 0.58).toFixed(3)})`);
    g.addColorStop(1, `rgba(${b.color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  });
  if (o.grid) { // a technical line grid drifting slowly under the wash (the blueprint feel)
    const sp = o.gridSpacing ?? 96, gc = o.gridColor || o.color || '46,224,160', ga = o.gridAlpha ?? 0.10;
    const ox = (Math.sin(t * 0.12) * 10) % sp, oy = (Math.cos(t * 0.1) * 8) % sp;
    // A 1px hairline at low alpha is below the noise floor of the wash under it — the grid was there and
    // you could not see it. Scale the line with the frame so it survives both the wash and the encoder.
    ctx.strokeStyle = `rgba(${gc},${ga})`; ctx.lineWidth = Math.max(1, Math.round(d / 1400)); ctx.beginPath();
    for (let x = ox; x < w; x += sp) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = oy; y < h; y += sp) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }
}

// ---- spotlight sweep: a soft highlight travelling across the frame (focuses the eye mid-scene).
export function spotlight(ctx, w, h, t, o = {}) {
  const period = o.period ?? 7, color = o.color ?? '255,255,255';
  const cx = (0.5 + 0.32 * Math.sin(t * (2 * Math.PI / period))) * w;
  const cy = (o.y ?? 0.42) * h;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.r ?? 720);
  g.addColorStop(0, `rgba(${color},${o.intensity ?? 0.10})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

// ---- metallic: a curtain of vertical light RODS with a travelling SHIMMER — a bright band sweeps
// horizontally across the bars (a sine wave in the per-bar brightness, advanced by t). Reads as brushed
// metal / a lit equaliser. Deterministic (pure in t). Colour from the brand accent; a soft glow pools at
// the light source (default lower-centre) so the top falls to black, like the reference. `speed` = shimmer
// travel, `waves` = how many bright bands are on screen at once, `count` = number of rods.
export function metallic(ctx, w, h, t, o = {}) {
  const col = o.color || '46,224,160';
  const count = o.count ?? 70, bw = w / count;
  const speed = o.speed ?? 0.9, waves = o.waves ?? 2.2;
  const gx = (o.gx ?? 0.5) * w, gy = (o.gy ?? 0.78) * h, gI = o.glow ?? 0.5;
  // 1. glow pool: a soft radial brightening at the light source; the frame falls to black away from it.
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.95);
  glow.addColorStop(0, `rgba(${col},${gI.toFixed(3)})`);
  glow.addColorStop(0.5, `rgba(${col},${(gI * 0.3).toFixed(3)})`);
  glow.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  // 2. vertical rods, brightness modulated by a travelling sine → a shimmer sweeps across. 'lighter' so
  // the bright bands add to the glow (metallic pop); a thin white core sells the sheen on the hottest rods.
  ctx.globalCompositeOperation = 'lighter';
  const alpha = o.alpha ?? 0.20;
  for (let i = 0; i < count; i++) {
    const x = i * bw;
    const sheen = 0.5 + 0.5 * Math.sin((i / count) * Math.PI * 2 * waves - t * speed); // 0..1, travels
    const a = alpha * (0.12 + 0.88 * sheen);
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.5, `rgba(${col},${a.toFixed(3)})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x, 0, bw + 0.5, h);
    if (sheen > 0.82) { // a bright white sheen line down the hottest rods
      ctx.fillStyle = `rgba(255,255,255,${((sheen - 0.82) * 0.9).toFixed(3)})`;
      ctx.fillRect(x + bw * 0.44, 0, bw * 0.12, h);
    }
  }
  // 3. optional DIAGONAL light sweep raking across (image-2 look): a soft bright band travelling corner
  //    to corner, wrapping. `sweep` is true or an alpha (0..1); `sweepSpeed` sets its travel.
  if (o.sweep) {
    const p = ((t * (o.sweepSpeed ?? 0.11)) % 1.5) - 0.25; // -0.25..1.25, wraps
    const cx = p * w, band = w * 0.34, sa = o.sweep === true ? 0.14 : +o.sweep;
    const g = ctx.createLinearGradient(cx - band, 0, cx + band, h);
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.5, `rgba(255,255,255,${sa})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---- liquid: a domain-warped colour field — smooth folds of a single hue against pure black, the
// "liquid light" / blurred-mesh look. What separates it from `aurora` and `softwash` is the RAMP:
// overlapping soft blobs average into haze, whereas pushing one warped field through two smoothsteps
// keeps the valleys at true black and the peaks saturated, so the folds read as folds.
//
// It renders into a small offscreen buffer and is drawn up to full size with smoothing on. That is the
// blur: an honest bilinear upscale of a low-res field, not a filter pass over a big one. 160x90 costs
// ~14k pixels a frame instead of 2M, so a per-pixel field is affordable at all, and the interpolation
// gives exactly the soft gradient the look needs. Pure in t (no state, no randomness) — the buffer is
// cached on the ctx only to avoid reallocating it every frame.
export function liquid(ctx, w, h, t, o = {}) {
  const [lr, lg, lb] = rgbTriple(o.color || '200,255,30');
  const [hr, hg, hb] = rgbTriple(o.highlight || '235,255,150');
  const res = Math.max(24, Math.min(320, o.res ?? 150));
  const bh = Math.max(1, Math.round(res * (h / w)));
  const buf = (ctx.__liquidBuf && ctx.__liquidBuf.width === res && ctx.__liquidBuf.height === bh)
    ? ctx.__liquidBuf
    : (ctx.__liquidBuf = Object.assign(document.createElement('canvas'), { width: res, height: bh }));
  const bctx = buf.getContext('2d');
  const img = bctx.createImageData(res, bh);
  const d = img.data;
  const sp = (o.speed ?? 0.42) * t, sc = o.scale ?? 1.25, wrp = o.warp ?? 0.7;
  const lo = o.edge0 ?? 0.52, hi = o.edge1 ?? 0.93, gl = o.gloss ?? 0.99;
  const sd = (o.seed ?? 0) * 0.37;
  const ar = w / h;
  for (let y = 0; y < bh; y++) {
    const v = (y / bh) * sc;
    for (let x = 0; x < res; x++) {
      const u = (x / res) * sc * ar;
      // two warp passes: the field is displaced by a field, which is what folds a smooth gradient into
      // ribbons. One pass alone only ripples it.
      const qx = u + wrp * Math.sin(v * 1.9 + sp * 0.51 + sd) + wrp * 0.7 * Math.cos(v * 0.9 - sp * 0.23);
      const qy = v + wrp * Math.cos(u * 1.6 - sp * 0.43 + sd) + wrp * 0.7 * Math.sin(u * 1.1 + sp * 0.19);
      const rx = qx + 0.52 * Math.sin(qy * 2.3 - sp * 0.37);
      const ry = qy + 0.52 * Math.cos(qx * 1.8 + sp * 0.29);
      // Two crossed waves, not one. A single sin(ax+by) is a plane wave, so every fold runs the same
      // diagonal and the field reads as ribbons; crossing two axes puts the crests at intersections and
      // the folds come out as rounded lobes, which is what a real fluid gradient looks like.
      const g1 = Math.sin(rx * 1.42 + sp * 0.31), g2 = Math.cos(ry * 1.18 - sp * 0.24);
      const f = 0.5 + 0.5 * (0.58 * g1 + 0.58 * g2 + 0.34 * g1 * g2);
      const k = smoothstep(lo, hi, f);          // black → colour
      const s = smoothstep(gl, 1, f);           // colour → highlight (the bright crest of a fold)
      const i = (y * res + x) * 4;
      d[i] = (lr * k + (hr - lr) * s) | 0;
      d[i + 1] = (lg * k + (hg - lg) * s) | 0;
      d[i + 2] = (lb * k + (hb - lb) * s) | 0;
      d[i + 3] = 255;
    }
  }
  bctx.putImageData(img, 0, 0);
  const sm = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(buf, 0, 0, w, h);
  ctx.imageSmoothingEnabled = sm;
}
function smoothstep(a, b, x) { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
function rgbTriple(c) { return String(c).split(',').map((n) => +n); }

// ---- deterministic grain: sparse tinted specks seeded per (frame,index). Kills banding, filmic feel.
export function grain(ctx, w, h, t, o = {}) {
  // hold each grain pattern for `every` frames (default 2) instead of reseeding every frame: full
  // per-frame grain crawls over static text edges and reads as the type "shaking". Still pure in n
  // (frame derives from t) and still moves — just at half the rate. `every:1` restores per-frame.
  const n = o.count ?? 1400, a = o.alpha ?? 0.05, every = o.every ?? 2;
  const frame = Math.round(t * (o.fps ?? 30) / every) * every;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  for (let i = 0; i < n; i++) {
    const x = random(`g${frame}:${i}:x`) * w, y = random(`g${frame}:${i}:y`) * h;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
}

// ---- named presets, now PALETTE-DRIVEN so one colors-pack reskins every background (the universal
// brand rule: use ONLY the site's colours). A palette supplies rgb accents + base hex pairs; pass the
// brand's palette and every preset (aurora/dots/shapes/plain/glow…) recolours. Dot/shape fields DRIFT.
// accent/tint/tint2/dotLight = "r,g,b" strings; dark/darkMesh/light/ink/paper = [fromHex, toHex].
// PAL_PLINTH — the REAL plinthai.xyz palette (from CSS tokens). WHITE-dominant: paper #fff /
// surface #f4f4f1 · ink #181815 · accent #1f3bff · accentSoft #ebedff · border #e6e6e1 · muted #6e6e68.
export const PAL_PLINTH = {
  accent: '31,59,255', tint: '110,110,104', tint2: '31,59,255', dotLight: '150,150,142',
  // light-first bases (paper): the MAIN look
  paperBase: ['#ffffff', '#f4f4f1'], softBase: ['#eef0ff', '#e6e9ff'], accentBase: ['#2946ff', '#1631d6'],
  inkBase: ['#232320', '#161613'], border: '#e6e6e1',
  // legacy dark bases (kept for the dark presets / other brands)
  dark: ['#3b43a6', '#262c72'], darkMesh: ['#3f47a2', '#2a3070'], deep: ['#333a80', '#242a63'],
  light: ['#ffffff', '#f4f4f1'], ink: ['#2f37a8', '#242a72'], paper: '#ffffff',
};
export const PAL = PAL_PLINTH; // back-compat
// BG_NAMES — the background presets bgPreset() understands. Keep in sync with the switch below (there's
// no way to enumerate a switch); the EFFECTS.md catalog + coverage derive the vocabulary from this so the
// list lives in one place. Moving ones (aurora/constellation/mesh/spotlight/…) animate via renderBg(…,t).
export const BG_NAMES = ['plain', 'paper', 'paperDots', 'paperShapes', 'soft', 'accent', 'accentPlain',
  'shapes', 'dotmatrix', 'aurora', 'mesh', 'constellation', 'brandglow', 'spotlight', 'dark', 'deep', 'ink',
  'metallic', 'metallicSheen', 'gradientWash', 'blobs', 'liquid'];
export function bgPreset(name, value, P = PAL_PLINTH) {
  const dark = value === 'dark' || value === 'ink';
  const grain = { type: 'grain', alpha: dark ? 0.035 : 0.02, fps: 30 };
  switch (name) {
    // ---- LIGHT-FIRST presets (for white/editorial brands: paper bg + accent on top) ----
    case 'paper': return { base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [grain] };
    case 'paperShapes': return { base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'shapes', color: P.accent, color2: P.accent, dark: false, alpha: 0.07, seed: 4 }, grain ] };
    case 'paperDots': return { base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'dots', mode: 'wave', color: P.dotLight, baseAlpha: 0.14, peakAlpha: 0.34, spacing: 54, r: 1.5, rPeak: 4, k: 0.03, period: 5, driftX: 11, driftY: 6 }, grain ] };
    case 'soft': return { base: { kind: 'radial', from: P.softBase[0], to: P.softBase[1], cx: 0.5, cy: 0.44 }, fx: [
      { type: 'shapes', color: P.accent, color2: P.accent, dark: false, alpha: 0.07, seed: 6 }, grain ] };
    case 'accent': return { base: { kind: 'radial', from: P.accentBase[0], to: P.accentBase[1], cx: 0.5, cy: 0.42 }, fx: [
      { type: 'dots', mode: 'ripple', color: '255,255,255', baseAlpha: 0.05, peakAlpha: 0.22, spacing: 60, cx: 0.5, cy: 0.42, k: 0.024, period: 4, driftX: 6, driftY: -6 }, { type: 'spotlight', intensity: 0.08, period: 7, y: 0.42 }, grain ] };
    case 'ink': return { base: { kind: 'radial', from: P.inkBase[0], to: P.inkBase[1], cx: 0.5, cy: 0.44 }, fx: [
      { type: 'dots', mode: 'pulse', color: P.accent, baseAlpha: 0.06, peakAlpha: 0.2, spacing: 64, period: 5, driftX: 8, driftY: 5 }, grain ] };
    case 'plain': return { base: dark ? { kind: 'solid', color: P.inkBase[1] } : { kind: 'solid', color: P.paperBase[0] }, fx: [grain] };
    // accentPlain — the brand's accent colour as a clean full-bleed field (grain only, no dots/spotlight).
    // For PLAIN sites whose hero is a flat/gradient colour, not a textured one: match plain with plain.
    case 'accentPlain': return { base: { kind: 'radial', from: P.accentBase[0], to: P.accentBase[1], cx: 0.5, cy: 0.4 }, fx: [grain] };
    // clean dark radial gradients (NO dots) — what you reach for when you want a plain deep backdrop
    case 'deep': return { base: { kind: 'radial', from: P.deep[0], to: P.deep[1], cx: 0.5, cy: 0.42 }, fx: [grain] };
    case 'dark': return { base: { kind: 'radial', from: P.dark[0], to: P.dark[1], cx: 0.5, cy: 0.44 }, fx: [grain] };
    case 'shapes': return { base: dark ? { kind: 'radial', from: P.dark[0], to: P.dark[1], cx: 0.5, cy: 0.45 } : { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'shapes', color: P.accent, color2: P.tint, dark, alpha: dark ? 0.14 : 0.08, seed: 4 }, grain ] };
    case 'dotmatrix': return { base: { kind: 'linear', from: P.light[0], to: P.light[1] }, fx: [
      { type: 'dots', mode: 'wave', color: P.dotLight, baseAlpha: 0.06, peakAlpha: 0.24, spacing: 52, r: 1.6, rPeak: 4.5, k: 0.03, period: 5, driftX: 12, driftY: 6 }, grain ] };
    case 'constellation': return { base: { kind: 'radial', from: P.deep[0], to: P.deep[1], cx: 0.5, cy: 0.46 }, fx: [
      { type: 'particles', count: 78, connect: true, color: P.tint2, speed: 9, connectDist: 150, seed: 7 }, grain ] };
    case 'brandglow': return { base: { kind: 'radial', from: P.ink[0], to: P.ink[1], cx: 0.5, cy: 0.42 }, fx: [
      { type: 'aurora', intensity: 0.5, blobs: [ { color: P.accent, x: 0.5, y: 0.42, r: 820, ax: 70, ay: 46, px: 13, py: 17, ph: 1 }, { color: P.tint, x: 0.32, y: 0.6, r: 560, ax: 100, ay: 66, px: 16, py: 12, ph: 3 } ] },
      { type: 'dots', mode: 'ripple', color: P.tint2, baseAlpha: 0.06, peakAlpha: 0.32, spacing: 60, cx: 0.5, cy: 0.42, k: 0.024, period: 4, driftX: 6, driftY: -6 }, grain ] };
    case 'spotlight': return { base: { kind: 'radial', from: P.deep[0], to: P.deep[1], cx: 0.5, cy: 0.4 }, fx: [
      { type: 'dots', mode: 'pulse', color: P.tint2, baseAlpha: 0.06, peakAlpha: 0.22, spacing: 64, period: 5, driftX: 9, driftY: 5 }, { type: 'spotlight', intensity: 0.12, period: 8 }, grain ] };
    case 'mesh': return { base: { kind: 'radial', from: P.darkMesh[0], to: P.darkMesh[1], cx: 0.4, cy: 0.5 }, fx: [
      { type: 'aurora', intensity: 0.42, blobs: [ { color: P.tint, x: 0.3, y: 0.4, r: 680, ax: 140, ay: 96, px: 14, py: 19, ph: 0 }, { color: P.accent, x: 0.72, y: 0.55, r: 600, ax: 160, ay: 116, px: 18, py: 13, ph: 2 }, { color: P.tint2, x: 0.55, y: 0.3, r: 500, ax: 110, ay: 76, px: 12, py: 21, ph: 4 } ] }, grain ] };
    case 'metallic': return { base: { kind: 'solid', color: '#05070a' }, fx: [
      { type: 'metallic', color: P.accent, count: 70, speed: 0.9, waves: 2.2, glow: 0.5, alpha: 0.2, gx: 0.5, gy: 0.78 }, { type: 'grain', alpha: 0.04 } ] };
    case 'metallicSheen': return { base: { kind: 'solid', color: '#040806' }, fx: [
      { type: 'metallic', color: P.accent, count: 58, speed: 0.7, waves: 1.8, glow: 0.42, alpha: 0.16, gx: 0.78, gy: 0.6, sweep: 0.16, sweepSpeed: 0.1 }, { type: 'grain', alpha: 0.07 } ] };
    // gradientWash — one big saturated pool bleeding off a corner into white. A MESH GRADIENT, so the
    // colour has somewhere to come from and somewhere to go; three even pools just average to haze.
    case 'gradientWash': return { base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'softwash', intensity: 1, blobs: [
        { color: P.accent, x: 0.14, y: 0.82, rf: 0.46, ax: 0.035, ay: 0.03, px: 24, py: 29, ph: 0, a: 0.78 },
        { color: P.tint2, x: 0.72, y: 0.16, rf: 0.32, ax: 0.045, ay: 0.038, px: 19, py: 23, ph: 2, a: 0.5 },
        { color: P.accent, x: 0.94, y: 0.62, rf: 0.2, ax: 0.03, ay: 0.026, px: 27, py: 17, ph: 4, a: 0.34 } ] },
      { type: 'grain', alpha: 0.03 } ] };
    // blobs — the OTHER light look: airier and more open, with the technical grid as the actual motif.
    // Smaller, better-separated pools leave white space for the grid to read through.
    case 'blobs': return { base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'softwash', intensity: 1, grid: true, gridColor: P.accent, gridAlpha: 0.16, gridSpacing: 104, blobs: [
        { color: P.accent, x: 0.2, y: 0.26, rf: 0.24, ax: 0.04, ay: 0.034, px: 21, py: 26, ph: 0, a: 0.5 },
        { color: P.tint2, x: 0.8, y: 0.72, rf: 0.26, ax: 0.045, ay: 0.038, px: 25, py: 19, ph: 2.4, a: 0.44 },
        { color: P.accent, x: 0.52, y: 0.9, rf: 0.18, ax: 0.03, ay: 0.028, px: 17, py: 23, ph: 4.2, a: 0.3 } ] },
      { type: 'grain', alpha: 0.03 } ] };
    // liquid — folds of the brand hue against true black (the "liquid light" backdrop). Dramatic and
    // full-bleed by design: it OWNS the frame, so put quiet type on it, nothing else.
    case 'liquid': return { base: { kind: 'solid', color: '#000000' }, fx: [
      { type: 'liquid', color: P.accent }, { type: 'grain', alpha: 0.03 } ] };
    case 'aurora': default: return { base: { kind: 'radial', from: P.dark[0], to: P.dark[1], cx: 0.6, cy: 0.42 }, fx: [
      { type: 'aurora', intensity: 0.46, blobs: [ { color: P.accent, x: 0.34, y: 0.42, r: 720, ax: 130, ay: 98, px: 15, py: 19, ph: 0 }, { color: P.tint, x: 0.72, y: 0.55, r: 620, ax: 160, ay: 118, px: 18, py: 13, ph: 2 }, { color: P.tint2, x: 0.5, y: 0.28, r: 500, ax: 100, ay: 78, px: 12, py: 21, ph: 4 } ] }, grain ] };
  }
}

// ---------- bg `opts`: what a window may actually tune ----------
// The fx implementations above are the ONLY authority on which knobs exist, so the accepted-key list is
// READ OUT OF THEM rather than restated here. A hand-kept list is the bug it is trying to prevent: it
// goes stale the moment an fx grows a parameter, and the stale half fails silently (docs/MISTAKES.md
// #159). Each fx takes its options as its LAST parameter and reads them as `bag.<key>`, so the keys are
// exactly the property reads on that parameter.
const FX_IMPL = { shapes, dots: dotGrid, particles, aurora, softwash, spotlight, metallic, liquid, grain };
function paramsOf(fn) {
  const src = String(fn);
  const sig = src.slice(src.indexOf('(') + 1, src.indexOf(')'));
  const bag = sig.split(',').pop().split('=')[0].trim();
  const keys = new Set();
  for (const m of src.matchAll(new RegExp(`\\b${bag}\\.([A-Za-z_$][\\w$]*)`, 'g'))) keys.add(m[1]);
  return keys;
}
export const FX_PARAMS = Object.fromEntries(Object.entries(FX_IMPL).map(([k, fn]) => [k, [...paramsOf(fn)].sort()]));
// If the derivation ever stops working (a bundler rewrote the source, an fx changed shape) it must say
// so at load, not quietly accept nothing: an empty key set would reject every legal opt.
for (const [k, v] of Object.entries(FX_PARAMS))
  if (v.length < 2) throw new Error(`backgrounds.js: cannot derive the option keys of fx "${k}" from its implementation (got ${v.length}). The bg \`opts\` contract is read from the fx source; fix paramsOf() rather than hand-listing keys.`);

// META knobs are NOT fx parameters: they scale/derive what the preset baked in, across whichever fx are
// present. Each maps to the fx types it can act on; a window naming one with no such fx is an error, the
// same as naming a knob that does not exist.
const META = {
  intensity: ['dots', 'aurora', 'spotlight', 'shapes', 'softwash'],
  dotAlpha: ['dots'], drift: ['dots'], grain: ['grain'],
};

// bgOptKeys(spec) → every key THIS window's fx set accepts, sorted. The vocabulary is per-preset: a
// `liquid` window takes scale/speed/warp/edge0…, a `paperDots` window takes spacing/period/driftX…
export function bgOptKeys(spec) {
  const types = new Set((spec?.fx || []).map((f) => f.type));
  const keys = new Set();
  for (const t of types) for (const k of FX_PARAMS[t] || []) keys.add(k);
  for (const [k, on] of Object.entries(META)) if (on.some((t) => types.has(t))) keys.add(k);
  return [...keys].sort();
}

// bgOverErrors(spec, over, at) → one message per key this window cannot act on, naming the ones it can.
// Shared by core/validate.mjs (pre-render, with a `bg[i]` label) and applyBgOver below (the backstop).
export function bgOverErrors(spec, over, at = 'bg opts') {
  if (!over || !spec) return [];
  const ok = bgOptKeys(spec);
  const types = (spec.fx || []).map((f) => f.type).join(' + ') || 'none';
  return Object.keys(over).filter((k) => !ok.includes(k)).map((k) =>
    `${at}: \`${k}\` is not a knob this background has, so it would be read by nothing. This window's fx are ${types}; it accepts ${ok.join(', ')}.`);
}

// applyBgOver(spec, over): per-video tuning of a preset's baked numbers (the palette still owns colour
// by default, though `color` is a real fx parameter and may be overridden deliberately).
//   • META keys (intensity · dotAlpha · drift · grain) SCALE the preset's baked values.
//   • every other key is written straight through to each fx in this window that reads it, so the
//     documented fx parameters (scale, speed, warp, edge0/edge1, gloss, res, count, waves, glow,
//     sweep, spacing, period, …) work by name instead of being accepted and dropped.
// A key no fx here reads THROWS: it was accepted and ignored before, which is how a `liquid` window
// carrying scale/speed/edge0 rendered completely unchanged with nothing said (docs/MISTAKES.md #157).
// Mutates the freshly-built spec (each bg window builds its own), so no shared state. over falsy = no-op.
export function applyBgOver(spec, over) {
  if (!over || !spec) return spec;
  const bad = bgOverErrors(spec, over);
  if (bad.length) throw new Error(bad.join('\n'));
  for (const fx of spec.fx || []) {
    if (fx.type === 'dots') {
      if (over.dotAlpha != null) { fx.peakAlpha = over.dotAlpha; fx.baseAlpha = +(over.dotAlpha * 0.3).toFixed(3); }
      else if (over.intensity != null) fx.peakAlpha = +((fx.peakAlpha ?? 0.2) * over.intensity).toFixed(3);
      if (over.drift != null) { fx.driftX = (fx.driftX ?? 0) * over.drift; fx.driftY = (fx.driftY ?? 0) * over.drift; }
    } else if (fx.type === 'aurora' || fx.type === 'spotlight' || fx.type === 'softwash') {
      if (over.intensity != null) fx.intensity = +((fx.intensity ?? (fx.type === 'softwash' ? 1 : 0.5)) * over.intensity).toFixed(3);
    } else if (fx.type === 'shapes') {
      if (over.intensity != null) fx.alpha = +((fx.alpha ?? 0.1) * over.intensity).toFixed(3);
    } else if (fx.type === 'grain') {
      if (over.grain != null) fx.alpha = over.grain;
    }
    // pass-through: the real fx parameters, by their own names.
    for (const [k, v] of Object.entries(over)) if (!(k in META) && (FX_PARAMS[fx.type] || []).includes(k)) fx[k] = v;
  }
  return spec;
}

// renderBg(canvas, t, spec): paint a full scene background from a spec (base + ordered fx list).
// spec = { base:{...}, fx:[{type:'aurora'|'dots'|'particles'|'spotlight'|'grain', ...opts}] }
export function renderBg(ctx, w, h, t, spec) {
  ctx.clearRect(0, 0, w, h);
  if (spec.base) paintBase(ctx, w, h, spec.base);
  for (const fx of spec.fx || []) {
    if (fx.type === 'aurora') aurora(ctx, w, h, t, fx);
    else if (fx.type === 'dots') dotGrid(ctx, w, h, t, fx);
    else if (fx.type === 'particles') particles(ctx, w, h, t, fx);
    else if (fx.type === 'spotlight') spotlight(ctx, w, h, t, fx);
    else if (fx.type === 'shapes') shapes(ctx, w, h, t, fx);
    else if (fx.type === 'metallic') metallic(ctx, w, h, t, fx);
    else if (fx.type === 'softwash') softwash(ctx, w, h, t, fx);
    else if (fx.type === 'liquid') liquid(ctx, w, h, t, fx);
    else if (fx.type === 'grain') grain(ctx, w, h, t, fx);
  }
}
