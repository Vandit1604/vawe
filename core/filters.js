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
  chromaGlow: { kind: 'css', mode: 'glow' },
  displace: { kind: 'svg', mode: 'displace' },
  bloom: { kind: 'svg', mode: 'bloom' },
  convolve: { kind: 'svg', mode: 'convolve' },     // arbitrary kernel: emboss, edge, sharpen
  morph: { kind: 'svg', mode: 'morph' },           // dilate / erode: fatten or thin the ink
  relief: { kind: 'svg', mode: 'relief' },         // 3D lighting off a luminance bump map
  vignette: { kind: 'overlay' },
};

// chromaGlow: the reference "chromatic glow" is a soft neon BLOOM in the layer's own shape — a clean
// white glow that warms in the mid halo and cools at the outer edge, with NO hard coloured border on
// the glyph. It is just a stack of CSS drop-shadows (each follows the glyph alpha), so it needs no SVG
// and no per-frame work: every pass is a 0-offset blur (radial, no directional fringe), from a tight
// white core out to a wide cool halo. `chromaGlow:size` scales the bloom (default 1). Pure in n.
export function chromaGlowFilter(size = 1) {
  const s = size > 0 ? size : 1;
  const r = (px) => (px * s).toFixed(1);
  return [
    `drop-shadow(0 0 ${r(3)}px rgba(255,255,255,0.95))`,  // tight white core bleed (softens the edge)
    `drop-shadow(0 0 ${r(8)}px rgba(255,255,255,0.9))`,   // white bloom
    `drop-shadow(0 0 ${r(18)}px rgba(255,246,225,0.75))`, // warm mid halo (diffuse, no edge)
    `drop-shadow(0 0 ${r(40)}px rgba(198,220,255,0.6))`,  // cool soft outer halo
  ].join(' ');
}

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

// A glow colour may arrive as a hex, an rgb(), or a theme token. feFlood's flood-color is a
// presentation attribute and does NOT resolve var(), so it has to be a literal by the time it is
// written. Resolve here, against the same theme the rest of the grade reads.
export function glowRGB(color) {
  const s = String(color || '').trim();
  if (/^var\(\s*--accent/.test(s)) return themeColors().accent;
  if (/^var\(\s*--ink/.test(s)) return themeColors().ink;
  return parseColor(s) || [255, 255, 255];
}

// bloom — the AFTER EFFECTS model, not the CSS one. `drop-shadow` blurs the ALPHA channel, so on an
// opaque photo it blurs a rectangle and paints a glowing box around the frame; the picture is never
// even consulted. A real glow thresholds LUMINANCE, so light comes out of the bright parts INSIDE the
// image and a dark edge emits nothing:
//   1. luma  = 0.2126R + 0.7152G + 0.0722B          → written into alpha
//   2. mask  = clamp((luma - T) / (1 - T), 0, 1)     → feFuncA linear, slope 1/(1-T)
//   3. bloom = Σ blur(mask · tint, σᵢ)               → two scales, natural falloff
//   4. out   = source + intensity · bloom            → feComposite arithmetic (additive)
// Pure in the frame number: no clock, no feedback, one static def shared by every layer using it.
function buildBloom(f, { rgb, threshold, radius, intensity, key }) {
  const el = (tag, attrs) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    return n;
  };
  // Room for the halo to develop. It is still clipped by any overflow:hidden ancestor, which is what
  // keeps the glow inside the picture rather than out on the page.
  for (const [k, v] of [['x', '-25%'], ['y', '-25%'], ['width', '150%'], ['height', '150%']]) f.setAttribute(k, v);

  // Highlight key → alpha: which pixels count as "lit" and get to bloom.
  //   • luma  = 0.2126R+0.7152G+0.0722B (perceptual). A saturated red is dim → under-glows. Right for
  //     photographic bloom (a bright sky blooms, a dark-but-vivid patch does not).
  //   • value = max(R,G,B) (HSV value). A pure red is fully "on" → glows at full strength, the way a
  //     neon tube emits its colour regardless of perceptual luminance. Used by neon/glitchGlow.
  if (key === 'value') {
    // isolate each channel into a grey image, then take the per-channel MAX via feBlend "lighten"
    // (lighten = component-wise max); the result's R channel is max(R,G,B) = value → move it to alpha.
    const chan = (m, result) => el('feColorMatrix', { in: 'SourceGraphic', type: 'matrix', values: m, result });
    f.appendChild(chan('1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1', 'cR'));
    f.appendChild(chan('0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 0 1', 'cG'));
    f.appendChild(chan('0 0 1 0 0  0 0 1 0 0  0 0 1 0 0  0 0 0 0 1', 'cB'));
    f.appendChild(el('feBlend', { in: 'cR', in2: 'cG', mode: 'lighten', result: 'cRG' }));
    f.appendChild(el('feBlend', { in: 'cRG', in2: 'cB', mode: 'lighten', result: 'val' }));
    f.appendChild(el('feColorMatrix', { in: 'val', type: 'matrix', result: 'key',
      values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0' })); // value (in R) → alpha
  } else {
    f.appendChild(el('feColorMatrix', { in: 'SourceGraphic', type: 'matrix', result: 'key',
      values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2126 0.7152 0.0722 0 0' })); // luminance → alpha
  }
  const ct = el('feComponentTransfer', { in: 'key', result: 'mask' });
  const slope = 1 / Math.max(0.001, 1 - threshold);
  ct.appendChild(el('feFuncA', { type: 'linear', slope: slope.toFixed(4), intercept: (-threshold * slope).toFixed(4) }));
  f.appendChild(ct);

  // the LIT highlights that will bloom. Two colour models:
  //   • rgb null (default) → keep the bright pixels' OWN colour: SourceGraphic masked by the highlight
  //     alpha, so a red neon sign bleeds red and a blue one blue — how a real bloom works.
  //   • rgb set → flood that single tint through the mask (a stylised, uniformly-coloured glow).
  if (rgb) {
    f.appendChild(el('feFlood', { 'flood-color': `rgb(${rgb.join(',')})`, result: 'tint' }));
    f.appendChild(el('feComposite', { in: 'tint', in2: 'mask', operator: 'in', result: 'lit' }));
  } else {
    f.appendChild(el('feComposite', { in: 'SourceGraphic', in2: 'mask', operator: 'in', result: 'lit' }));
  }
  f.appendChild(el('feGaussianBlur', { in: 'lit', stdDeviation: radius.toFixed(2), result: 'b1' }));
  f.appendChild(el('feGaussianBlur', { in: 'lit', stdDeviation: (radius * 2.6).toFixed(2), result: 'b2' }));
  // sum the two scales (arithmetic, not feMerge: merge composites OVER, and light adds)
  f.appendChild(el('feComposite', { in: 'b1', in2: 'b2', operator: 'arithmetic', k1: 0, k2: 0.6, k3: 0.5, k4: 0, result: 'glow' }));
  // additive back over the picture: out = intensity·glow + source
  f.appendChild(el('feComposite', {
    in: 'glow', in2: 'SourceGraphic', operator: 'arithmetic',
    k1: 0, k2: intensity.toFixed(3), k3: 1, k4: 0,
  }));
}

// bloomFilter — the CSS filter value for a luminance bloom. Injects the def on first use and returns
// `url(#id)`, so it drops straight into a filter list beside saturate()/contrast().
export function bloomFilter({ color, threshold, radius, intensity, key } = {}) {
  return `url(#${ensureFilterDef('bloom', { color, threshold, radius, intensity, key })})`;
}

// Named 3x3 kernels for feConvolveMatrix. A kernel is just "how much each neighbour contributes",
// so one primitive covers effects that look unrelated: EMBOSS is an opposing-corners gradient read as
// a light direction, EDGE is a centre-vs-neighbours difference (flat areas cancel to black, only
// boundaries survive), SHARPEN is the same difference added back to the original.
export const KERNELS = {
  emboss: { k: [-2, -1, 0, -1, 1, 1, 0, 1, 2], bias: 0.5 },
  edge: { k: [0, -1, 0, -1, 4, -1, 0, -1, 0], bias: 0 },
  sharpen: { k: [0, -1, 0, -1, 5, -1, 0, -1, 0], bias: 0 },
};

// convolveFilter / morphFilter / reliefFilter — CSS filter values for the three SVG primitives the
// engine had never used. Each injects its def on first use and returns `url(#id)`.
export function convolveFilter({ kernel = 'emboss', amount = 1 } = {}) {
  return `url(#${ensureFilterDef('convolve', { kernel, amount })})`;
}
export function morphFilter({ op = 'dilate', radius = 1 } = {}) {
  return `url(#${ensureFilterDef('morph', { op, radius })})`;
}
export function reliefFilter({ mode = 'diffuse', azimuth = 225, elevation = 55, surface = 2, color, exponent = 20, constant = 1 } = {}) {
  return `url(#${ensureFilterDef('relief', { mode, azimuth, elevation, surface, color, exponent, constant })})`;
}

// The three primitives above, built. Each is static: one def, injected once, no frame hook.
function buildPrimitive(f, { conv, morph, relief }) {
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    (parent || f).appendChild(n);
    return n;
  };

  if (conv) {
    const { k, bias } = KERNELS[conv.kernel];
    // How `amount` scales depends on what the kernel SUMS TO, and getting this wrong is silent.
    //   sum ~1 (sharpen, emboss): scale around the identity, so 0 is a no-op and 1 is the textbook
    //     kernel. The sum stays 1, so overall brightness is preserved.
    //   sum ~0 (edge): scale the whole matrix. The sum MUST stay 0 or flat areas no longer cancel —
    //     scaling around identity took the edge kernel to a sum of -0.3, a net negative that dragged
    //     the entire frame to black, edges included, and rendered `edgeGlow` as a black rectangle.
    const base = k.reduce((a, b) => a + b, 0);
    const scaled = Math.abs(base) < 0.001
      ? k.map((v) => v * conv.amount)
      : k.map((v, i) => (i === 4 ? 1 + (v - 1) * conv.amount : v * conv.amount));
    // preserveAlpha is required: without it the kernel convolves the alpha channel too, which frays
    // the edge of any clipped layer into a dirty fringe.
    el('feConvolveMatrix', {
      in: 'SourceGraphic', order: '3 3', kernelMatrix: scaled.map((v) => +v.toFixed(3)).join(' '),
      divisor: 1, bias, edgeMode: 'duplicate', preserveAlpha: 'true',
    });
    return;
  }

  if (morph) {
    // dilate spreads the brightest pixels outward and erode does the reverse: on type it fattens or
    // thins the stroke, on a photo it swells highlights into chunky blocks.
    el('feMorphology', { in: 'SourceGraphic', operator: morph.op, radius: morph.radius });
    return;
  }

  // relief: light a surface whose HEIGHT is the picture's own brightness. The lighting primitives read
  // their bump map from ALPHA, and a photo's alpha is a flat rectangle, so luminance has to be moved
  // into alpha first or the whole image lights as one featureless slab.
  el('feColorMatrix', {
    in: 'SourceGraphic', type: 'matrix', result: 'bump',
    values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2126 0.7152 0.0722 0 0',
  });
  const lightTag = relief.mode === 'specular' ? 'feSpecularLighting' : 'feDiffuseLighting';
  const lit = el(lightTag, relief.mode === 'specular'
    ? { in: 'bump', result: 'lit', surfaceScale: relief.surface, specularConstant: relief.constant, specularExponent: relief.exponent, 'lighting-color': `rgb(${relief.rgb.join(',')})` }
    : { in: 'bump', result: 'lit', surfaceScale: relief.surface, diffuseConstant: relief.constant, 'lighting-color': `rgb(${relief.rgb.join(',')})` });
  el('feDistantLight', { azimuth: relief.azimuth, elevation: relief.elevation }, lit);
  // diffuse light MULTIPLIES the picture (ink pressed into a lit surface); specular ADDS to it (a
  // highlight sitting on top of metal). Same primitive family, opposite composite, opposite look.
  el('feComposite', relief.mode === 'specular'
    ? { in: 'lit', in2: 'SourceGraphic', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0 }
    : { in: 'lit', in2: 'SourceGraphic', operator: 'arithmetic', k1: 1, k2: 0, k3: 0, k4: 0 });
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
  const disp = preset.mode === 'displace'
    ? { freq: +(opts.freq > 0 ? opts.freq : 0.012).toFixed(4), scale: +(opts.scale > 0 ? opts.scale : 16).toFixed(1) } : null;
  const bloom = preset.mode === 'bloom' ? {
    // no colour → the glow keeps the source's own colours (real neon); a colour → a uniform flood tint
    rgb: opts.color ? glowRGB(opts.color) : null,
    key: opts.key === 'value' ? 'value' : 'luma', // value = max(R,G,B): saturated colours glow fully
    threshold: Math.min(0.95, Math.max(0, opts.threshold ?? 0.62)),
    radius: +Math.max(0.5, opts.radius ?? 14).toFixed(2),
    intensity: Math.max(0, opts.intensity ?? 1),
  } : null;
  const conv = preset.mode === 'convolve' ? {
    kernel: KERNELS[opts.kernel] ? opts.kernel : 'emboss',
    amount: +Math.max(0.05, Math.min(3, opts.amount ?? 1)).toFixed(3),
  } : null;
  const morph = preset.mode === 'morph' ? {
    op: opts.op === 'erode' ? 'erode' : 'dilate',
    radius: +Math.max(0.1, Math.min(12, opts.radius ?? 1)).toFixed(2),
  } : null;
  const relief = preset.mode === 'relief' ? {
    mode: opts.mode === 'specular' ? 'specular' : 'diffuse',
    azimuth: Math.round(opts.azimuth ?? 225), elevation: Math.round(opts.elevation ?? 55),
    surface: +(+(opts.surface ?? 2)).toFixed(2), exponent: +(opts.exponent ?? 20).toFixed(1),
    constant: +(opts.constant ?? 1).toFixed(2), rgb: glowRGB(opts.color || '#ffffff'),
  } : null;
  const id = disp ? `f-displace-f${disp.freq}-s${disp.scale}`.replace(/\./g, '_')
    : conv ? `f-conv-${conv.kernel}-a${conv.amount}`.replace(/\./g, '_')
    : morph ? `f-morph-${morph.op}-r${morph.radius}`.replace(/\./g, '_')
    : relief ? `f-relief-${relief.mode}-${relief.azimuth}-${relief.elevation}-s${relief.surface}-e${relief.exponent}-c${relief.constant}-${relief.rgb.join('_')}`.replace(/\./g, '_')
    : bloom ? `f-bloom-${bloom.rgb ? bloom.rgb.join('_') : 'src'}${bloom.key === 'value' ? '-val' : ''}-t${bloom.threshold}-r${bloom.radius}-i${bloom.intensity}`.replace(/\./g, '_')
    : defId(name, stops, levels);
  if (typeof document === 'undefined') return id; // pure-id path for node tests; injection needs a browser
  if (document.getElementById(id)) return id;

  const f = document.createElementNS(SVG_NS, 'filter');
  f.setAttribute('id', id);
  f.setAttribute('color-interpolation-filters', 'sRGB'); // tableValues are authored in sRGB space

  if (conv || morph || relief) {
    buildPrimitive(f, { conv, morph, relief });
    defsHost().appendChild(f);
    return id;
  }

  if (bloom) {
    buildBloom(f, bloom);
    defsHost().appendChild(f);
    return id;
  }

  if (preset.mode === 'displace') {
    // static feTurbulence → feDisplacementMap: warps the layer's own pixels by a fixed noise field
    // (fixed seed → deterministic; no frame hook). Wide region so warped edges are not clipped.
    for (const [k, v] of [['x', '-30%'], ['y', '-30%'], ['width', '160%'], ['height', '160%']]) f.setAttribute(k, v);
    const turb = document.createElementNS(SVG_NS, 'feTurbulence');
    turb.setAttribute('type', 'fractalNoise'); turb.setAttribute('baseFrequency', String(disp.freq));
    turb.setAttribute('numOctaves', '2'); turb.setAttribute('seed', '1'); turb.setAttribute('result', 'n');
    const dm = document.createElementNS(SVG_NS, 'feDisplacementMap');
    dm.setAttribute('in', 'SourceGraphic'); dm.setAttribute('in2', 'n'); dm.setAttribute('scale', String(disp.scale));
    dm.setAttribute('xChannelSelector', 'R'); dm.setAttribute('yChannelSelector', 'G');
    f.appendChild(turb); f.appendChild(dm);
    defsHost().appendChild(f);
    return id;
  }

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

  if (preset.kind === 'css') {
    if (preset.mode === 'glow') return { filter: chromaGlowFilter(nums[0] ?? 1), overlay: null }; // chromaGlow
    return { filter: `sepia(${Math.min(1, Math.max(0, nums[0] ?? 1))})`, overlay: null }; // sepia
  }

  if (preset.kind === 'overlay') { // vignette
    const s = Math.min(1, Math.max(0, nums[0] ?? 0.45));
    const [r, g, b] = colors[0] || [0, 0, 0];
    return { filter: '', overlay: `radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(${r},${g},${b},${s}) 100%)` };
  }

  const opts = preset.mode === 'posterize' ? { levels: nums[0] }
    : preset.mode === 'displace' ? { freq: nums[0], scale: nums[1] } : { colors };
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
