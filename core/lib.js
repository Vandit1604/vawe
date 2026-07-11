// lib.js — shared pure helpers for HTML scenes. No layout math (CSS owns that);
// just time->data transforms + the scene boot.

// relative specifier resolves in BOTH the browser (/core/lib.js → /scripts/validate.mjs) and node.
import { validateAll } from '../scripts/validate.mjs';

export const FPS = 30;

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rangeT = (f, s, e) => clamp01((f - s) / (e - s));

// icon(value): an image path (assets/.../x.svg|png, /…, http…) -> <img>; otherwise the
// raw value (emoji / monogram text). Lets formats use real logos/flags or fall back cleanly.
export const icon = (v, fallback = '') => {
  if (!v) return fallback;
  const isImg = /\.(svg|png|jpe?g|webp|gif)$/i.test(v) || /^(assets\/|\/|https?:)/.test(v);
  if (!isImg) return v;
  // If the image fails to load (missing file / 404), swap to the fallback (emoji/monogram)
  // instead of the browser's broken-image placeholder. Empty fallback → the img just disappears.
  const fb = String(fallback).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  return `<img class="icon-img" src="${v}" alt="" onerror="this.outerHTML='${fb}'" />`;
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const punch = (t, amt = 0.14) => 1 + amt * Math.sin(clamp01(t) * Math.PI);
export const easeInCubic = (t) => t * t * t;
export const easeOutElastic = (t) => { if (t <= 0) return 0; if (t >= 1) return 1; const p = 0.3; return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1; };
export const easeInQuart = (t) => t * t * t * t;
export const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)));
export const easeInOutExpo = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : 1 - Math.pow(2, -20 * t + 10) / 2);

// ---------- velocity ramping ----------
// accel/decel: pure power curves — k is the acceleration exponent (k=1 linear, k=3 hard launch/brake).
export const accel = (t, k = 2.4) => Math.pow(clamp01(t), k);
export const decel = (t, k = 2.4) => 1 - Math.pow(1 - clamp01(t), k);
// speedRamp(t, {peak, sharp}) — the editor's speed ramp: velocity is LOW at both ends and peaks at
// `peak` (0..1); `sharp` is how violent the acceleration is. Use to remap any progress before it
// hits a transform: slow-out → rush → slow-in reads as intentional camera work, not a lerp.
export function speedRamp(t, { peak = 0.5, sharp = 2.4 } = {}) {
  t = clamp01(t);
  if (peak <= 0) return decel(t, sharp);
  if (peak >= 1) return accel(t, sharp);
  return t < peak ? peak * Math.pow(t / peak, sharp) : 1 - (1 - peak) * Math.pow((1 - t) / (1 - peak), sharp);
}

// easing registry — lets a theme name its easing as a string (motion.easing) that the scene
// resolves to a function. resolveEasing() also accepts a function (passthrough).
export const EASINGS = {
  linear: (t) => t, easeInCubic, easeOutCubic, easeInOutCubic,
  easeOutQuart, easeOutExpo, easeOutBack, easeOutElastic,
  easeInQuart, easeInExpo, easeInOutExpo,
  // velocity-ramp aliases: rush = accelerate away, brake = decelerate in, ramp = slow-fast-slow
  rush: (t) => accel(t), brake: (t) => decel(t), ramp: (t) => speedRamp(t),
};
export const resolveEasing = (e) => (typeof e === 'function' ? e : EASINGS[e] || easeOutCubic);

// ---------- motion primitives — all PURE in their input (no state); safe for the purity probe ----------

// interpolate(t, inRange, outRange, {easing, clamp}) — multi-stop value mapping. Replaces the
// repeated `lerp(a, b, clamp01((f - s) / (e - s)))` pattern. easing is applied within each segment.
export function interpolate(t, inR, outR, { easing = (x) => x, clamp = true } = {}) {
  const n = inR.length;
  if (n < 2 || n !== outR.length) return outR[0];
  if (clamp) { if (t <= inR[0]) return outR[0]; if (t >= inR[n - 1]) return outR[n - 1]; }
  let i = 1; while (i < n - 1 && t > inR[i]) i++;
  const a = inR[i - 1], b = inR[i];
  return lerp(outR[i - 1], outR[i], easing(clamp01(b === a ? 0 : (t - a) / (b - a))));
}

// spring(t, {bounce, settle}) — analytic underdamped step response (closed-form, PURE in t-seconds).
// Returns 0 → ~1 with natural overshoot. bounce∈[0,1): 0 = no overshoot, higher = bouncier.
export function spring(t, { bounce = 0.3, settle = 0.6 } = {}) {
  if (t <= 0) return 0;
  const omega = (Math.PI * 2) / settle, zeta = Math.min(0.999, Math.max(0.0001, 1 - bounce));
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta), env = Math.exp(-zeta * omega * t);
  return 1 - env * (Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t));
}
// springSettle(opts) — seconds for the spring's envelope to decay below eps (size your holds with this).
export function springSettle({ bounce = 0.3, settle = 0.6, eps = 0.02 } = {}) {
  const omega = (Math.PI * 2) / settle, zeta = Math.min(0.999, Math.max(0.0001, 1 - bounce));
  return -Math.log(eps) / (zeta * omega);
}

// track(n, fps, beats) — given [{name, dur(seconds)}], return the active beat + its progress.
// Replaces hand-rolled PER/FLIP/ENTER/EXIT window math. t01 = normalized [0..1] within the beat.
export function track(n, fps, beats) {
  const t = n / fps; let acc = 0;
  for (let i = 0; i < beats.length; i++) {
    const d = beats[i].dur, end = acc + d;
    if (t < end || i === beats.length - 1) {
      return { name: beats[i].name, index: i, t01: d > 0 ? clamp01((t - acc) / d) : 1, localT: t - acc, elapsed: t, start: acc, dur: d };
    }
    acc = end;
  }
  return { name: null, index: -1, t01: 0, localT: 0, elapsed: t, start: 0, dur: 0 };
}

// transition helpers → {opacity, transform} (compositor-friendly only). Object.assign onto el.style.
export const rise = (t, dist = 48) => ({ opacity: clamp01(t), transform: `translateY(${(1 - easeOutCubic(clamp01(t))) * dist}px)` });
export const fade = (t) => ({ opacity: clamp01(t), transform: 'none' });
export const pop = (t, from = 0.86) => ({ opacity: clamp01(t * 3), transform: `scale(${from + (1 - from) * easeOutBack(clamp01(t))})` });
export const slide = (t, dir = 'left', dist = 60) => {
  const k = 1 - easeOutCubic(clamp01(t));
  const x = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * k * dist;
  const y = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * k * dist;
  return { opacity: clamp01(t), transform: `translate(${x}px, ${y}px)` };
};
export const applyT = (el, styles) => { if (el) Object.assign(el.style, styles); };

// ---------- seeded, deterministic randomness (another engine `random()` parity — safe for purity) ----------
// hashSeed: number|string -> uint32. random(seed) -> [0,1). Same seed always yields the same value,
// so per-item jitter/scatter stays byte-identical across render order.
export function hashSeed(seed) {
  if (typeof seed === 'number') {
    let s = (seed >>> 0) || 1;
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s >>> 0;
  }
  return seedFrom(String(seed)); // FNV-1a for strings (defined below, hoisted)
}
export const random = (seed) => hashSeed(seed) / 4294967296;
// value noise in 1D: smooth deterministic wander in [0,1) — good for organic drift/parallax.
export function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = random(`${seed}:${i}`), b = random(`${seed}:${i + 1}`);
  return a + (b - a) * (f * f * (3 - 2 * f)); // smoothstep interpolation
}
// stagger(i, step): delay in seconds for item i (step defaults to a gentle 60ms).
export const stagger = (i, step = 0.06) => i * step;

// shake(t, {amp, freq, decay, seed}) — deterministic camera/impact shake: two incommensurate
// noise() channels, exponentially decaying from t=0. Returns {x, y} px offsets. Apply on impact
// beats: `translate(${s.x}px, ${s.y}px)` where s = shake(t - hitT, {...}) (zero before the hit).
export function shake(t, { amp = 14, freq = 11, decay = 3.2, seed = 0 } = {}) {
  if (t <= 0) return { x: 0, y: 0 };
  const env = amp * Math.exp(-decay * t);
  return {
    x: (noise(t * freq, seed + 1) * 2 - 1) * env,
    y: (noise(t * freq * 1.37, seed + 2) * 2 - 1) * env,
  };
}
// pulse(t, {period, amt}) — continuous breathing scale for idle chrome (logos, badges, CTAs).
export const pulse = (t, { period = 2.4, amt = 0.03 } = {}) => 1 + amt * Math.sin((t / period) * Math.PI * 2);

// trackingFor(px) — optical letter-spacing: display type tightens as it grows (measured off
// linear.app's real ramp: −0.008em body → −0.022em hero). Themes opt in via type.optical.
export const trackingFor = (px) => interpolate(px, [14, 32, 64, 120], [-0.008, -0.012, -0.017, -0.022]).toFixed(4) + 'em';

// kenBurns(t, dur, {from, to, fx, fy, easing}) — the tasteful photo/image zoom: a slow continuous
// scale from → to over the layer's window, anchored at focus point (fx, fy in 0..1). Rules that
// keep it tasteful: total travel ≤ 8% (from 1.0, to ≤ 1.08), NEVER reverses mid-window, eased
// inOut so velocity is invisible at both ends. Returns {transform, transformOrigin}.
export function kenBurns(t, dur, { from = 1.0, to = 1.07, fx = 0.5, fy = 0.42, easing = easeInOutCubic } = {}) {
  const p = easing(clamp01(dur > 0 ? t / dur : 1));
  return { transform: `scale(${lerp(from, to, p).toFixed(4)})`, transformOrigin: `${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%` };
}

// ---------- text measuring (another engine measureText/fitText parity — browser only) ----------
// measureText: pixel width of `text` in CSS `font` shorthand. fitText: largest px size (stepping
// down) whose rendered width fits maxWidth. Call at build time (fonts already loaded in boot).
let _measureCtx;
export function measureText(text, font) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = font;
  return _measureCtx.measureText(text).width;
}
export function fitText(text, maxWidth, { font = (px) => `800 ${px}px Inter`, max = 168, min = 24, step = 2 } = {}) {
  let px = max;
  while (px > min && measureText(text, font(px)) > maxWidth) px -= step;
  return px;
}

// ---------- sequencing (another engine Sequence/TransitionSeries parity) — pure in n ----------
// sequence(n, fps, segments): like track() but with cross-segment transition windows. Each segment
// = { name, dur, transition? }. Returns the active segment plus `enter` (0→1 over the leading
// transition) and `exit` (0→1 over the trailing transition), so a scene can drive an in/out
// transition on each segment. `active` = combined visibility (enter × (1 − exit)).
// holdLast (default true): the LAST segment never exits — there is no next scene to hand off to,
// so the ending (usually the CTA) holds at full visibility through the final frame.
// Pass { holdLast: false } for looping content that should fade back out.
// ---------- color contrast (WCAG) ----------
// parseColor: #rgb/#rrggbb/rgb()/rgba() -> [r,g,b] (0-255). contrastRatio >= 1 (21 = black/white).
// ensureContrast: keep fg if it clears min against bg, else return whichever of light/dark reads.
export function parseColor(c) {
  if (Array.isArray(c)) return c;
  const s = String(c || '').trim();
  let m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) return [...m[1]].map((h) => parseInt(h + h, 16));
  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = s.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
const relLum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export function contrastRatio(fg, bg) {
  const a = parseColor(fg), b = parseColor(bg);
  if (!a || !b) return 21;
  const [hi, lo] = relLum(a) > relLum(b) ? [relLum(a), relLum(b)] : [relLum(b), relLum(a)];
  return (hi + 0.05) / (lo + 0.05);
}
export function ensureContrast(fg, bg, { min = 3, light = '#ffffff', dark = '#141414' } = {}) {
  if (contrastRatio(fg, bg) >= min) return fg;
  return contrastRatio(light, bg) >= contrastRatio(dark, bg) ? light : dark;
}

export function sequence(n, fps, segments, { transition = 0.4, holdLast = true } = {}) {
  const cur = track(n, fps, segments);
  const trans = segments[cur.index]?.transition ?? transition;
  const isLast = cur.index === segments.length - 1;
  const enter = trans > 0 ? clamp01(cur.localT / trans) : 1;
  const exit = (trans > 0 && !(holdLast && isLast)) ? clamp01((cur.localT - (cur.dur - trans)) / trans) : 0;
  return { ...cur, enter, exit, active: enter * (1 - exit) };
}

// transition helpers → {clipPath, WebkitClipPath} (compositor-friendly; t: 0 hidden → 1 revealed).
// wipe: directional inset reveal. circleWipe: iris from a point. clockWipe: radial sweep from 12 o'clock.
export function wipe(t, dir = 'left') {
  const p = (1 - clamp01(t)) * 100;
  const m = { left: `inset(0 ${p}% 0 0)`, right: `inset(0 0 0 ${p}%)`, up: `inset(0 0 ${p}% 0)`, down: `inset(${p}% 0 0 0)` };
  const c = m[dir] || m.left;
  return { clipPath: c, WebkitClipPath: c };
}
export function circleWipe(t, cx = 50, cy = 50) {
  const c = `circle(${(clamp01(t) * 72).toFixed(1)}% at ${cx}% ${cy}%)`;
  return { clipPath: c, WebkitClipPath: c };
}
function boxEdge(aDeg) { // point on the 100×100 box perimeter at angle aDeg (0 = up, clockwise)
  const rad = (aDeg * Math.PI) / 180, dx = Math.sin(rad), dy = -Math.cos(rad);
  const tx = dx === 0 ? Infinity : (dx > 0 ? 50 / dx : -50 / dx);
  const ty = dy === 0 ? Infinity : (dy > 0 ? 50 / dy : -50 / dy);
  const t = Math.min(tx, ty);
  return [50 + t * dx, 50 + t * dy];
}
export function clockWipe(t) {
  const a = clamp01(t) * 360;
  const pts = [[50, 50], [50, 0]];
  for (const c of [45, 135, 225, 315]) if (c <= a) pts.push(boxEdge(c));
  if (a > 0 && a < 360) pts.push(boxEdge(a)); else if (a >= 360) pts.push([50, 0]);
  const poly = 'polygon(' + pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(', ') + ')';
  return { clipPath: poly, WebkitClipPath: poly };
}

export function formatNumber(n, { currency = false, decimals = 0, compact = false } = {}) {
  let s;
  if (compact) {
    const a = Math.abs(n);
    if (a >= 1e12) s = (n / 1e12).toFixed(decimals === 0 ? 2 : decimals) + 'T';
    else if (a >= 1e9) s = (n / 1e9).toFixed(decimals === 0 ? 1 : decimals) + 'B';
    else if (a >= 1e6) s = (n / 1e6).toFixed(decimals === 0 ? 1 : decimals) + 'M';
    else if (a >= 1e3) s = (n / 1e3).toFixed(decimals === 0 ? 1 : decimals) + 'K';
    else s = n.toFixed(decimals);
    s = s.replace(/\.0+([TBMK])$/, '$1'); // 40.0M -> 40M
  } else {
    s = Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return (currency ? '$' : '') + s;
}

// returns { num, unit } so the scene can style the unit smaller/dim
export function formatValue(n, unit) {
  if (unit === '$' || unit === 'USD') return { num: formatNumber(n, { currency: true, decimals: 0, compact: Math.abs(n) >= 1e6 }), unit: '' };
  if (unit && unit.length > 1 && unit[0] === '$') return { num: '$' + formatNumber(n, { decimals: 0 }), unit: unit.slice(1) };
  const compact = Math.abs(n) >= 1e6;
  return { num: formatNumber(n, { decimals: 0, compact }), unit: unit || '' };
}

// deterministic digit scramble (redacted cold-open bait).
// Large salted seed so frame 0 is already varied (never all-zeros / broken-looking).
function lcg01(seed) { const s = (Math.imul(seed >>> 0, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }
export function scrambleDigits(frame, sample) {
  let out = '';
  for (let i = 0; i < sample.length; i++) {
    const ch = sample[i];
    out += ch >= '0' && ch <= '9'
      ? String(Math.floor(lcg01(0x9e3779b1 + frame * 2654435761 + (i + 1) * 40503) * 10))
      : ch;
  }
  return out;
}

// deterministic per-data duration in [58,62]s so uploads vary but a given video is stable
export function seedFrom(str) {
  let h = 2166136261 >>> 0; const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function pickDuration(seed, min = 58.2, max = 61.8) {
  const steps = Math.round((max - min) / 0.1);
  return +(min + ((seed >>> 0) % (steps + 1)) * 0.1).toFixed(2);
}

// preloadImages: walk the data JSON for image-like strings (local paths, /…, or http(s)
// URLs — incl. user-supplied web image links) and fully load+decode them BEFORE the scene
// reports ready. Without this the Go renderer can screenshot a frame mid-download → a missing
// image on some frames. onerror also resolves so a dead link falls back (icon()) without hanging.
async function preloadImages(data) {
  const urls = new Set();
  // an image extension (any source) OR an http(s) URL (web logos can be extensionless).
  // NOT bare assets/ or / paths — those also match audio (assets/music.wav) and aren't images.
  const isImg = (v) => typeof v === 'string' &&
    (/\.(svg|png|jpe?g|webp|gif)$/i.test(v) || /^https?:\/\/\S+$/.test(v));
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
    else if (isImg(o)) urls.add(o);
  };
  walk(data);
  await Promise.all([...urls].map((src) => new Promise((res) => {
    const im = new Image();
    im.onload = () => (im.decode ? im.decode().then(res, res) : res());
    im.onerror = () => res();
    im.src = src;
  })));
}

// ---------- taste: swappable theme (palette + gradient + fonts + motion personality) ----------
// A theme is data. DEFAULT_THEME mirrors tokens.css EXACTLY so a scene with no `data.theme`
// renders byte-identical to today. Named themes (themes/<name>.json) are brand kits; an inline
// object on data.theme is the one-off escape hatch. Merge order: DEFAULT ← named ← inline.
// Applied once in boot() (pure — the CSS vars are identical on every frame).
export const DEFAULT_THEME = {
  palette: {
    bg: '#0a0a0c', bg2: '#0d0e11', surface: '#16181d', surface2: '#101216',
    line: 'rgba(244, 245, 242, 0.07)', lineStrong: 'rgba(244, 245, 242, 0.12)',
    text: '#f4f5f2', text2: '#b9bcc2', dim: '#6e7178',
    up: '#3fd07a', up2: '#6ff0a4', down: '#ff5a6e',
    accent: '#c2f23b', accentDim: 'rgba(194, 242, 59, 0.16)', accentGlow: 'rgba(194, 242, 59, 0.4)',
    accent2: '#4de3ff', grid: 'rgba(194, 242, 59, 0.2)', grid2: 'rgba(77, 227, 255, 0.26)',
    glass: 'rgba(21, 22, 26, 0.6)', highlight: 'rgba(244, 245, 242, 0.6)',
  },
  // gradient stops a scene may consume as --g0/--g1/--g2 (launch teaser uses these).
  gradient: [],
  type: { sans: 'Inter', num: 'Space Grotesk', serif: 'Instrument Serif', mono: 'Geist Mono' },
  // motion personality — primitives read these as defaults (see spring/rise theme-aware wrappers).
  motion: { easing: 'easeOutCubic', bounce: 0.3, settle: 0.6, enter: 48, durationScale: 1, stagger: 0.06 },
};

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
function deepMerge(base, over) {
  if (!isObj(over)) return over === undefined ? base : over;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(over)) out[k] = isObj(base?.[k]) ? deepMerge(base[k], over[k]) : over[k];
  return out;
}

// resolveTheme(spec): spec is undefined | "name" (→ fetch themes/name.json) | inline object.
export async function resolveTheme(spec) {
  let named = {};
  if (typeof spec === 'string' && spec) {
    try { named = await (await fetch(`/themes/${spec}.json`)).json(); }
    catch (e) { console.warn(`theme "${spec}" not found, using default`); }
  }
  const inline = isObj(spec) ? spec : {};
  return deepMerge(deepMerge(DEFAULT_THEME, named), inline);
}

// applyTheme(theme): write the palette/gradient/font vars onto :root. Fonts are only consumed by
// scenes that opt into var(--font-*); palette/gradient vars back the shared tokens.css names.
export function applyTheme(theme) {
  const root = document.documentElement.style;
  const set = (k, v) => { if (v != null) root.setProperty(k, v); };
  const P = theme.palette || {};
  set('--bg', P.bg); set('--bg-2', P.bg2); set('--surface', P.surface); set('--surface-2', P.surface2);
  set('--line', P.line); set('--line-strong', P.lineStrong);
  set('--text', P.text); set('--text-2', P.text2); set('--dim', P.dim);
  set('--up', P.up); set('--up-2', P.up2); set('--down', P.down);
  set('--accent', P.accent); set('--accent-dim', P.accentDim); set('--accent-glow', P.accentGlow);
  set('--accent-2', P.accent2); set('--grid', P.grid); set('--grid-2', P.grid2);
  set('--glass', P.glass); set('--highlight', P.highlight);
  (theme.gradient || []).forEach((c, i) => set(`--g${i}`, c));
  const T = theme.type || {};
  if (T.sans) set('--font-sans', `'${T.sans}'`);
  if (T.num) set('--font-num', `'${T.num}'`);
  if (T.serif) set('--font-serif', `'${T.serif}'`);
  if (T.mono) set('--font-mono', `'${T.mono}'`);
  // raw passthrough: theme.vars = { "--anything": "value" } for scene-local custom props.
  if (isObj(theme.vars)) for (const [k, v] of Object.entries(theme.vars)) set(k, v);
}

// motionDefaults(theme): the theme's motion personality with `easing` resolved to a function.
// Scenes pass these into primitives, e.g. interpolate(t, inR, outR, { easing: M.easing }),
// spring(t, M), or translateY(M.enter * (1 - eased)). durationScale lets a theme stretch/tighten
// pacing; stagger is the per-item delay step.
export function motionDefaults(theme) {
  const m = (theme && theme.motion) || DEFAULT_THEME.motion;
  return {
    easing: resolveEasing(m.easing),
    bounce: m.bounce ?? DEFAULT_THEME.motion.bounce,
    settle: m.settle ?? DEFAULT_THEME.motion.settle,
    enter: m.enter ?? DEFAULT_THEME.motion.enter,
    durationScale: m.durationScale ?? 1,
    stagger: m.stagger ?? DEFAULT_THEME.motion.stagger,
  };
}

// ---------- virtual clock: determinism is COERCED, not just required ----------
// Scene code (and any third-party lib it pulls in) sees time and randomness as pure functions of
// the current frame: Date.now / new Date() / performance.now return frame-time, rAF callbacks
// flush exactly once per rendered frame, timers fire when the virtual clock passes their due time,
// and Math.random is reseeded per frame (mulberry32) so stochastic code is byte-identical across
// runs and render orders. Installed once in boot(); __vt.set(n, fps) runs before every
// renderFrame(n). (The another engine VIRTUAL_TIME_SHIM idea, adapted to the boot() contract.)
export function installVirtualClock() {
  if (typeof window === 'undefined' || window.__vt) return window?.__vt;
  const vt = { ms: 0, frame: 0 };
  // the renderer needs REAL frame callbacks to await paint before screenshots — keep a handle
  // to the native rAF before we virtualize it for scene code.
  window.__realRaf = window.requestAnimationFrame.bind(window);
  const RealDate = Date;
  const rafQ = new Map(); let rafId = 0;
  const timers = new Map(); let timerId = 0;
  window.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(vt.ms); }
    static now() { return vt.ms; }
  };
  performance.now = () => vt.ms;
  window.requestAnimationFrame = (cb) => { rafQ.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => { rafQ.delete(id); };
  window.setTimeout = (cb, delay = 0, ...a) => { if (typeof cb !== 'function') return 0; timers.set(++timerId, { at: vt.ms + Number(delay || 0), cb, a }); return timerId; };
  window.setInterval = (cb, every = 1e9, ...a) => window.setTimeout(cb, every, ...a); // one-shot per pass — enough for chrome spinners
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  let rnd = 0;
  Math.random = () => { rnd = (rnd + 0x6d2b79f5) | 0; let t = Math.imul(rnd ^ (rnd >>> 15), 1 | rnd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__vt = {
    set(frame, fps) {
      vt.frame = frame; vt.ms = (frame / fps) * 1000;
      rnd = (frame * 2654435761) | 0; // reseed: same frame → same random sequence
      for (const [id, tm] of [...timers]) if (tm.at <= vt.ms) { timers.delete(id); tm.cb(...tm.a); }
      const q = [...rafQ.values()]; rafQ.clear(); for (const cb of q) cb(vt.ms);
    },
    now: () => vt.ms,
  };
  return window.__vt;
}

// boot a scene: load fonts, fetch the data param, build the scene, expose window.__engine.
//   build(data, fps, theme) -> { fps, duration, stings, sfx, renderFrame(n) }
// Film grain is applied as a post-process at encode time (ffmpeg), not here — the CSS/canvas
// approach never composited in headless Chrome, so it was removed.
export async function boot(build) {
  const params = new URLSearchParams(location.search);
  const dataUrl = params.get('data');
  const fps = Number(params.get('fps')) || FPS;
  try {
    try {
      await Promise.all([
        '400 100px Inter', '600 100px Inter', '700 100px Inter', '800 100px Inter',
        "500 100px 'Space Grotesk'", "700 100px 'Space Grotesk'",
        "400 100px 'Instrument Serif'", "italic 400 100px 'Instrument Serif'", "400 100px 'Geist Mono'",
        "800 100px 'Plus Jakarta Sans'", "700 100px 'JetBrains Mono'", "400 100px 'Caveat'",
      ].map((f) => document.fonts.load(f)));
      await document.fonts.ready;
    } catch (e) {}
    const data = await (await fetch(dataUrl)).json();
    // validate data + inline theme against the format's schema BEFORE building/rendering — a bad
    // JSON fails here with a readable message instead of a broken video (or a wasted render).
    if (data.module) {
      try {
        const schema = await (await fetch(`/formats/${data.module}/schema.json`)).json();
        const errors = validateAll(schema, data);
        if (errors.length) throw new Error(`invalid data for "${data.module}":\n  - ${errors.join('\n  - ')}`);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('invalid data')) throw e; // real validation error
        // schema missing/unparseable → skip validation (don't block on tooling gaps)
      }
    }
    // orientation: portrait (1080×1920) default, or landscape (1920×1080). Drives CSS via
    // [data-orient] AND the meta dims the Go renderer sizes its viewport + screenshot to.
    const landscape = data.orientation === 'landscape' || data.orient === 'landscape';
    document.documentElement.dataset.orient = landscape ? 'landscape' : 'portrait';
    if (params.get('alpha')) document.documentElement.classList.add('alpha'); // transparent overlay export
    const [width, height] = landscape ? [1920, 1080] : [1080, 1920];
    const theme = await resolveTheme(data.theme); // taste: palette/gradient/fonts/motion
    applyTheme(theme); // once, pre-first-frame — pure (identical every frame)
    await preloadImages(data); // web/local images ready before any frame is captured
    // preload captured components (real UI lifted off a site by scripts/capture-component.mjs) so a
    // `component` scene can inject real HTML synchronously. Any string like /…/components/x.json.
    window.__components = {};
    const compPaths = new Set();
    (function scan(o) { if (Array.isArray(o)) o.forEach(scan); else if (o && typeof o === 'object') Object.values(o).forEach(scan); else if (typeof o === 'string' && /\/(components|scenes)\/[^/]+\.json$/.test(o)) compPaths.add(o); })(data);
    for (const p of compPaths) { try { window.__components[p] = await (await fetch(p)).json(); } catch (e) {} }
    const vclock = installVirtualClock(); // before build(): scene closures see only virtual time
    const scene = build(data, fps, theme);
    const totalFrames = Math.round(scene.duration * fps);
    if (params.get('debug') === 'safe') document.querySelector('.stage')?.classList.add('debug-safe');
    window.__engine = {
      meta: { fps, duration: scene.duration, totalFrames, width, height, stings: scene.stings || [], sfx: scene.sfx || [], segments: scene.segments || [] },
      renderFrame: (n) => { vclock.set(n, fps); scene.renderFrame(n); },
    };
    // frameSig(n): cheap content signature for the renderer's static-frame dedup — covers every
    // per-frame write (inline styles/text/attrs via innerHTML) plus canvas pixels (downsampled
    // through a 24×14 probe; drawImage works for 2d AND webgl-with-preserveDrawingBuffer).
    // Unreadable canvases poison the hash with the frame number → those frames never dedup.
    {
      const probe = document.createElement('canvas'); probe.width = 24; probe.height = 14;
      const pctx = probe.getContext('2d', { willReadFrequently: true });
      const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
      window.__engine.frameSig = (n) => {
        window.__engine.renderFrame(n);
        let h = fnv(2166136261, document.body.innerHTML);
        for (const cv of document.querySelectorAll('canvas')) {
          if (!cv.width || cv.style.display === 'none') continue;
          // visible 2D canvases repaint time-varying fx (grain/drift) BELOW probe resolution —
          // proven by an anchor-verification failure. Never dedup frames where one is live.
          if (cv.getContext('2d')) { h = fnv(h, 'live2d:' + n); continue; }
          try { // webgl overlays (shader stings) are keyed draws — sampling them is sound
            pctx.clearRect(0, 0, 24, 14); pctx.drawImage(cv, 0, 0, 24, 14);
            const d = pctx.getImageData(0, 0, 24, 14).data;
            let acc = '';
            for (let i = 0; i < d.length; i += 8) acc += d[i] + ',' + d[i + 3] + ';';
            h = fnv(h, acc);
          } catch (e) { h = fnv(h, 'opaque-canvas:' + n); }
        }
        return h.toString(36);
      };
    }
    window.__engine.renderFrame(0);
    window.__engineReady = true;
  } catch (e) {
    window.__engineError = String(e && e.stack ? e.stack : e);
    document.title = 'ENGINE_ERROR';
  }
}
