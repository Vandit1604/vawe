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
    case 'aurora': default: return { base: { kind: 'radial', from: P.dark[0], to: P.dark[1], cx: 0.6, cy: 0.42 }, fx: [
      { type: 'aurora', intensity: 0.46, blobs: [ { color: P.accent, x: 0.34, y: 0.42, r: 720, ax: 130, ay: 98, px: 15, py: 19, ph: 0 }, { color: P.tint, x: 0.72, y: 0.55, r: 620, ax: 160, ay: 118, px: 18, py: 13, ph: 2 }, { color: P.tint2, x: 0.5, y: 0.28, r: 500, ax: 100, ay: 78, px: 12, py: 21, ph: 4 } ] }, grain ] };
  }
}

// applyBgOver(spec, over): per-video tuning of a preset's baked numbers (the palette still owns colour).
// over = { intensity, dotAlpha, spacing, drift, grain } — scales/overrides the matching fx params.
// Mutates the freshly-built spec (each bg window builds its own), so no shared state. over falsy = no-op.
export function applyBgOver(spec, over) {
  if (!over || !spec) return spec;
  for (const fx of spec.fx || []) {
    if (fx.type === 'dots') {
      if (over.spacing != null) fx.spacing = over.spacing;
      if (over.dotAlpha != null) { fx.peakAlpha = over.dotAlpha; fx.baseAlpha = +(over.dotAlpha * 0.3).toFixed(3); }
      else if (over.intensity != null) fx.peakAlpha = +((fx.peakAlpha ?? 0.2) * over.intensity).toFixed(3);
      if (over.drift != null) { fx.driftX = (fx.driftX ?? 0) * over.drift; fx.driftY = (fx.driftY ?? 0) * over.drift; }
    } else if (fx.type === 'aurora' || fx.type === 'spotlight') {
      if (over.intensity != null) fx.intensity = +((fx.intensity ?? 0.5) * over.intensity).toFixed(3);
    } else if (fx.type === 'shapes') {
      if (over.intensity != null) fx.alpha = +((fx.alpha ?? 0.1) * over.intensity).toFixed(3);
    } else if (fx.type === 'grain') {
      if (over.grain != null) fx.alpha = over.grain;
    }
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
    else if (fx.type === 'grain') grain(ctx, w, h, t, fx);
  }
}
