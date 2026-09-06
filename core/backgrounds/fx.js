// core/backgrounds/fx.js: THE PAINTERS. One pure canvas-drawing function per moving/static technique
// (dot-matrix wave/ripple, particle field, aurora blobs, soft-wash mesh, spotlight sweep, metallic
// rods, liquid warp field, grain, gradient fill), plus the shared `paintBase` fill. Everything draws
// deterministically from t (seconds) → PURE in n; particle seeds come from the seeded random() in
// motion.js, never Math.random. These are the shared contract a PRESET (core/backgrounds/presets.js)
// composes into a `{ base, fx:[...] }` spec; core/backgrounds/index.js is the generic runner that
// dispatches `fx.type` to the function here with the matching name.
import { random, parseColor } from '../motion.js';
import { GRADIENT_RECIPE_REGISTRY } from './gradient-recipes.js';

// ---- base fill: a tinted-neutral gradient (never pure #000/#fff). radial = spotlit, linear = flat,
// conic = a colour wheel swept from `angle` around (cx,cy).
export function paintBase(ctx, w, h, { kind = 'radial', from = '#0b0e26', to = '#05061a', cx = 0.6, cy = 0.4, angle = 0, color } = {}) {
  if (kind === 'solid') { ctx.fillStyle = color || from; ctx.fillRect(0, 0, w, h); return; }
  let g;
  if (kind === 'linear') { g = ctx.createLinearGradient(0, 0, 0, h); }
  else if (kind === 'conic') { g = ctx.createConicGradient((angle * Math.PI) / 180, w * cx, h * cy); }
  else { g = ctx.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, Math.hypot(w, h) * 0.7); }
  g.addColorStop(0, from); g.addColorStop(1, to);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
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
  // motionScale: ONE knob for how alive this field is. It widens the drift AND shortens the period
  // together, because raising amplitude alone makes a field slosh rather than move (docs/MISTAKES.md
  // #155, logged for `liquid` and true here for the same reason).
  const ms = o.motionScale ?? 1;
  blobs.forEach((b, i) => {
    const jx = Math.sin(so * 7.3 + i * 2.1) * 0.12, jy = Math.cos(so * 5.7 + i * 1.7) * 0.12, jp = so * 0.9 + i;
    const cx = (b.x + jx) * w + Math.sin(t * (2 * Math.PI / (b.px / ms)) + b.ph + jp) * b.ax * ms;
    const cy = (b.y + jy) * h + Math.cos(t * (2 * Math.PI / (b.py / ms)) + b.ph + jp) * b.ay * ms;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
    g.addColorStop(0, `rgba(${b.color},${o.intensity ?? 0.5})`);
    g.addColorStop(1, `rgba(${b.color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
}

// ---- softwash: big soft colour blobs that TINT the base (source-over, moderate alpha) into a smooth
// gradient WASH, orange-into-white / green-into-white, the "mesh gradient" look. Blobs drift on slow
// sine paths (pure in t). Unlike aurora it does NOT use 'lighter', so on a LIGHT base it reads as colour
// pooling into white (not blowing out). `grid` overlays a faint technical line grid (the blueprint look).
// A pool needs a CORE and a TAIL: holding most of the alpha inside the first third gives each pool a
// readable centre, and the long tail still blends.
const WASH_CORE = 0.34;
export function softwash(ctx, w, h, t, o = {}) {
  // Sizes and drifts are FRACTIONS of the frame diagonal, not pixels, so a preset composed on 1920x1080
  // does not turn to mush on 1080x1920.
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
    const ms = o.motionScale ?? 1;                                 // see aurora: widen the drift and
    const ax = (b.ax <= 1 ? b.ax * d : b.ax) * ms;                 // shorten the period together
    const ay = (b.ay <= 1 ? b.ay * d : b.ay) * ms;
    const cx = (b.x + jx) * w + Math.sin(t * (2 * Math.PI / (b.px / ms)) + b.ph) * ax;
    const cy = (b.y + jy) * h + Math.cos(t * (2 * Math.PI / (b.py / ms)) + b.ph) * ay;
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
    // A 1px hairline at low alpha is below the noise floor of the wash under it, so scale the line with
    // the frame so it survives both the wash and the encoder.
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

// ---- metallic: a curtain of vertical light RODS with a travelling SHIMMER, a bright band sweeps
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

// ---- liquid: a domain-warped colour field, smooth folds of a single hue against pure black, the
// "liquid light" / blurred-mesh look. What separates it from `aurora` and `softwash` is the RAMP:
// overlapping soft blobs average into haze, whereas pushing one warped field through two smoothsteps
// keeps the valleys at true black and the peaks saturated, so the folds read as folds.
//
// It renders into a small offscreen buffer and is drawn up to full size with smoothing on. That is the
// blur: an honest bilinear upscale of a low-res field, not a filter pass over a big one. 160x90 costs
// ~14k pixels a frame instead of 2M, so a per-pixel field is affordable at all, and the interpolation
// gives exactly the soft gradient the look needs. Pure in t (no state, no randomness), the buffer is
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
  // speed and scale are NOT independent knobs to tune in one step: bigger folds (lower `scale`) already
  // read as slower, so cutting both at once double-reduces the apparent motion (docs/MISTAKES.md #155).
  const sp = (o.speed ?? 1.2) * t, sc = o.scale ?? 1.25, wrp = o.warp ?? 0.7;
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
      // Two crossed waves, not one, so the crests land at intersections and the folds come out as
      // rounded lobes instead of one repeating diagonal.
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
  // (frame derives from t) and still moves, just at half the rate. `every:1` restores per-frame.
  const n = o.count ?? 1400, a = o.alpha ?? 0.05, every = o.every ?? 2;
  const frame = Math.round(t * (o.fps ?? 30) / every) * every;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  for (let i = 0; i < n; i++) {
    const x = random(`g${frame}:${i}:x`) * w, y = random(`g${frame}:${i}:y`) * h;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
}

// ---- gradientFill: an AUTHORED gradient, the one fx an agent parameterizes directly. colours/kind/
// angle/stops/cx/cy come straight from opts. `kind` names the shape rather than `type`, because `type`
// is the reserved field every fx spec in a `bg.fx` array is dispatched on. `recipe` names a curated
// combo in gradient-recipes.js; author-supplied colors/kind/angle/stops override it field by field.
// kind:"mesh" is not a raster gradient at all: it hands the same colours to `softwash` so the field
// MOVES, because CSS gradients cannot animate here and a flat linear/radial/conic fill is otherwise static.
const MESH_LAYOUT = [
  { x: 0.18, y: 0.24, rf: 0.32, ax: 0.04, ay: 0.035, px: 22, py: 27, ph: 0, a: 0.62 },
  { x: 0.85, y: 0.78, rf: 0.34, ax: 0.05, ay: 0.04, px: 26, py: 20, ph: 2, a: 0.54 },
  { x: 0.55, y: 0.1, rf: 0.24, ax: 0.032, ay: 0.03, px: 18, py: 24, ph: 4, a: 0.42 },
  { x: 0.08, y: 0.86, rf: 0.2, ax: 0.03, ay: 0.028, px: 20, py: 18, ph: 5.3, a: 0.36 },
];
// Mesh gradients hand numeric colours to softwash; parseColor returns null for a CSS name it cannot
// read, which would crash the blob build, so refuse it by name here.
function meshBlobs(colors) {
  return colors.slice(0, 4).map((c, i) => {
    const rgb = parseColor(c);
    if (!rgb) throw new Error(`gradient: mesh colour ${JSON.stringify(c)} is not hex or rgb(). A mesh gradient needs numeric colours; a CSS name like "coral" works for kind linear/radial/conic but not mesh.`);
    return { ...MESH_LAYOUT[i % MESH_LAYOUT.length], color: rgb.join(',') };
  });
}
// The flat ramp for linear/radial/conic. Linear rotates the ramp about the frame centre by `angle`.
function gradientRamp(ctx, w, h, { kind, cx, cy, angle }) {
  if (kind === 'radial') return ctx.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, Math.hypot(w, h) * 0.7);
  if (kind === 'conic') return ctx.createConicGradient((angle * Math.PI) / 180, w * cx, h * cy);
  const rad = (angle * Math.PI) / 180, len = Math.hypot(w, h) / 2, mx = w / 2, my = h / 2;
  return ctx.createLinearGradient(mx - Math.cos(rad) * len, my - Math.sin(rad) * len, mx + Math.cos(rad) * len, my + Math.sin(rad) * len);
}
export function gradientFill(ctx, w, h, t, o = {}) {
  const rec = o.recipe ? GRADIENT_RECIPE_REGISTRY.pick(o.recipe) : {};
  const kind = o.kind ?? rec.kind ?? 'linear';
  const colors = o.colors ?? rec.colors ?? ['#ff9966', '#ff5e62'];
  const angle = o.angle ?? rec.angle ?? 45;
  const stops = o.stops ?? rec.stops ?? null;
  const cx = o.cx ?? rec.cx ?? 0.5, cy = o.cy ?? rec.cy ?? 0.5;
  if (kind === 'mesh') {
    softwash(ctx, w, h, t, { blobs: meshBlobs(colors), seed: o.seed ?? 0, motionScale: o.motionScale ?? 1, intensity: o.intensity ?? 1 });
    return;
  }
  const g = gradientRamp(ctx, w, h, { kind, cx, cy, angle });
  const n = colors.length;
  // A partial or missing `stops` array falls back to even distribution for the entries it does not
  // cover, rather than handing addColorStop an undefined offset (which throws a raw canvas error).
  colors.forEach((c, i) => {
    const at = stops && stops[i] != null ? stops[i] : (n === 1 ? 0 : i / (n - 1));
    g.addColorStop(at, c);
  });
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
