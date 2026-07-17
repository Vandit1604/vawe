// core/filters.js — named colour-grade looks for any scene layer (`filter: "duotone"` instead of a
// hand-rolled CSS string). WHY: a grade is a creative decision, not plumbing — authors should say
// "duotone in brand colours", not paste matrix math into JSON. Raw CSS filter strings still pass
// through untouched (back-compat with the schema's "CSS filter" contract).
//
// WHY SVG filters: duotone/tritone/gradientMap/posterize need a luminance→ramp remap
// (feColorMatrix + feComponentTransfer tableValues) that plain CSS filter functions cannot express.
// The defs are injected once into a hidden 0×0 <svg> and referenced as url("#f-…").
//
// WHY vignette is NOT a filter: a filter transforms the layer's own pixels; a vignette is a
// darkening FIELD composited over the layer's box, independent of its content. Faking it with
// filters would be dishonest (and blurry at the edges), so it resolves to an inset radial-gradient
// overlay div (the ::after a stylesheet would use — but layers are built imperatively, so it is a
// real child) that inherits the layer's border-radius and ignores pointer/layout.
//
// DETERMINISM: everything here runs at BUILD time, once per layer, before frame 0. Theme colours
// are resolved from getComputedStyle(document.documentElement) exactly then (SVG tableValues need
// literal rgb components, not var()), params are static per scene, and renderFrame never calls into
// this file — so renderFrame(n) stays pure in n and frames can shard across tabs.
//
// SPEC SYNTAX (resolveFilter):
//   "duotone"                      → theme defaults (shadows → --ink, highlights → --accent)
//   "duotone:#141414,#7cffd4"      → explicit shadow,highlight
//   "tritone:#111,#5e6ad2,#fff"    → shadow,mid,highlight
//   "gradientMap:#111,#c33,#fc3,#fff" → 2+ stops, evenly spaced across luminance
//   "posterize" | "posterize:6"    → per-channel level count (default 4)
//   "sepia" | "sepia:0.6"          → plain CSS sepia(amount)
//   "vignette" | "vignette:0.6" | "vignette:#001a33,0.5" → strength 0..1 (+ optional colour)
//   anything else                  → passed through as a raw CSS filter string.

const LUMA = '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0';
const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFS_HOST_ID = 'hs-filter-defs';

// name → how the look resolves. `stops` = required colour count (0 = any ≥2).
export const FILTER_PRESETS = {
  sepia: { kind: 'css' },
  duotone: { kind: 'svg', mode: 'ramp', stops: 2 },
  tritone: { kind: 'svg', mode: 'ramp', stops: 3 },
  gradientMap: { kind: 'svg', mode: 'ramp', stops: 0 },
  posterize: { kind: 'svg', mode: 'posterize' },
  vignette: { kind: 'overlay' },
};

// ---- colour plumbing (pure) ----

// '#7cf' | '#7cffd4' | 'rgb(124,255,212)' → [r,g,b]; null if unparseable.
export function parseColor(s) {
  const str = String(s || '').trim();
  let m = /^#([0-9a-f]{3})$/i.exec(str);
  if (m) return m[1].split('').map((c) => parseInt(c + c, 16));
  m = /^#([0-9a-f]{6})$/i.exec(str);
  if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(str);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}

// Theme defaults, resolved ONCE at build (getComputedStyle cannot run per frame — it would still be
// deterministic, but the contract is: filters.js is build-only). Cached because the theme is static
// for the life of a scene (applyTheme runs before any layer is built).
let themeCache = null;
function themeColors() {
  if (themeCache) return themeCache;
  let ink = [20, 20, 20], accent = [255, 255, 255]; // honest fallbacks for DOM-less (node) use
  if (typeof document !== 'undefined' && typeof getComputedStyle !== 'undefined') {
    const cs = getComputedStyle(document.documentElement);
    ink = parseColor(cs.getPropertyValue('--ink')) || ink;
    accent = parseColor(cs.getPropertyValue('--accent')) || accent;
  }
  themeCache = { ink, accent };
  return themeCache;
}

// ---- spec parsing (pure) ----

function parseSpec(spec) {
  const i = spec.indexOf(':');
  const name = (i < 0 ? spec : spec.slice(0, i)).trim();
  const colors = [], nums = [];
  if (i >= 0) {
    for (const raw of spec.slice(i + 1).split(',')) {
      const tok = raw.trim();
      if (!tok) continue;
      const c = parseColor(tok);
      if (c) colors.push(c); else if (!isNaN(+tok)) nums.push(+tok);
    }
  }
  return { name, colors, nums };
}

function rampStops(name, colors) {
  const { ink, accent } = themeColors();
  if (colors.length >= 2) return colors;
  if (name === 'tritone') return [ink, accent, [255, 255, 255]];
  if (name === 'gradientMap') return [ink, accent, [255, 255, 255]];
  return [ink, accent]; // duotone
}

// Deterministic id from the resolved params — same look, same id, so injection is idempotent and
// two layers sharing a grade share one def.
function defId(name, stops, levels) {
  const parts = [name];
  if (stops) for (const [r, g, b] of stops) parts.push(r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0'));
  if (levels) parts.push('n' + levels);
  return 'f-' + parts.join('-');
}

// ---- SVG def injection (DOM; build time only) ----

function defsHost() {
  let host = document.getElementById(DEFS_HOST_ID);
  if (!host) {
    host = document.createElementNS(SVG_NS, 'svg');
    host.setAttribute('id', DEFS_HOST_ID);
    host.setAttribute('width', '0'); host.setAttribute('height', '0');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.appendChild(document.createElementNS(SVG_NS, 'defs'));
    document.body.appendChild(host);
  }
  return host.querySelector('defs');
}

function transferFunc(chan, type, values) {
  const fn = document.createElementNS(SVG_NS, 'feFunc' + chan);
  fn.setAttribute('type', type);
  fn.setAttribute('tableValues', values.map((v) => +v.toFixed(4)).join(' '));
  return fn;
}

// Idempotently inject the <filter> def for a named look; returns its id. `opts`:
//   { colors: [[r,g,b],…] }  ramp stops for duotone/tritone/gradientMap (default: theme ink→accent)
//   { levels: n }            posterize step count (default 4)
// Build-time only: called while layers are constructed, never from renderFrame.
export function ensureFilterDef(name, opts = {}) {
  const preset = FILTER_PRESETS[name];
  if (!preset || preset.kind !== 'svg') throw new Error(`ensureFilterDef: "${name}" is not an SVG-filter preset`);
  const stops = preset.mode === 'ramp' ? (opts.colors && opts.colors.length >= 2 ? opts.colors : rampStops(name, opts.colors || [])) : null;
  const levels = preset.mode === 'posterize' ? Math.max(2, Math.round(opts.levels || 4)) : null;
  const id = defId(name, stops, levels);
  if (typeof document === 'undefined') return id; // pure-id path for node tests; injection needs a browser
  if (document.getElementById(id)) return id;

  const f = document.createElementNS(SVG_NS, 'filter');
  f.setAttribute('id', id);
  f.setAttribute('color-interpolation-filters', 'sRGB'); // tableValues are authored in sRGB space
  const ct = document.createElementNS(SVG_NS, 'feComponentTransfer');
  if (preset.mode === 'ramp') {
    // luminance → per-channel ramp: type="table" linearly interpolates between the stops, which IS
    // a gradient map (duotone/tritone are just 2- and 3-stop gradient maps).
    const cm = document.createElementNS(SVG_NS, 'feColorMatrix');
    cm.setAttribute('type', 'matrix');
    cm.setAttribute('values', LUMA);
    f.appendChild(cm);
    ['R', 'G', 'B'].forEach((chan, i) => ct.appendChild(transferFunc(chan, 'table', stops.map((s) => s[i] / 255))));
  } else {
    // posterize keeps the original hues: discrete tables quantise each channel in place (no luma).
    const table = Array.from({ length: levels }, (_, i) => i / (levels - 1));
    for (const chan of ['R', 'G', 'B']) ct.appendChild(transferFunc(chan, 'discrete', table));
  }
  f.appendChild(ct);
  defsHost().appendChild(f);
  return id;
}

// ---- resolution ----

// spec (preset name, parameterised preset, or raw CSS filter) → { filter, overlay }.
//   filter:  CSS filter value for el.style.filter ('' when the look is overlay-only)
//   overlay: CSS background for an inset overlay div (vignette), or null
// Pure for css/overlay/passthrough kinds; svg kinds touch the DOM only to inject the def (build time).
export function resolveFilter(spec) {
  if (!spec || typeof spec !== 'string') return { filter: '', overlay: null };
  const { name, colors, nums } = parseSpec(spec);
  const preset = FILTER_PRESETS[name];
  if (!preset) return { filter: spec, overlay: null }; // raw CSS filter passthrough

  if (preset.kind === 'css') // sepia
    return { filter: `sepia(${Math.min(1, Math.max(0, nums[0] ?? 1))})`, overlay: null };

  if (preset.kind === 'overlay') { // vignette
    const s = Math.min(1, Math.max(0, nums[0] ?? 0.45));
    const [r, g, b] = colors[0] || [0, 0, 0];
    return { filter: '', overlay: `radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(${r},${g},${b},${s}) 100%)` };
  }

  const opts = preset.mode === 'posterize' ? { levels: nums[0] } : { colors };
  return { filter: `url("#${ensureFilterDef(name, opts)}")`, overlay: null };
}

// Apply a resolved look to a built layer element. Overwrites the raw spec scene.html already wrote
// to el.style.filter (passthrough specs write back the identical string). The vignette overlay is
// absolutely-inset, radius-inheriting, and layout/pointer-inert; guarded so re-application is a no-op.
export function applyLayerFilter(el, spec) {
  const { filter, overlay } = resolveFilter(spec);
  el.style.filter = filter;
  if (overlay && !el.querySelector(':scope > .hs-vignette')) {
    const v = document.createElement('div');
    v.className = 'hs-vignette';
    v.style.cssText = 'position:absolute;inset:0;pointer-events:none;border-radius:inherit;z-index:2';
    v.style.background = overlay;
    el.appendChild(v);
  }
}
