// core/surfaces/lens.js: films a flat screen like a camera pointed at a physical monitor.
//
//   import { lens, canvasSource, htmlSource, PALETTES } from '/core/surfaces/lens.js';
//   const cam = lens(htmlSource(document.getElementById('screen')), {
//     aim: [960, 540], zoom: (t) => 1 + 0.4 * t, tiltY: 0.35,
//     dof: { blur: 0.6, focus: [1200, 400], blades: 6 }, palette: { stops: PALETTES.phosphor },
//     bloom: { strength: 1.2, radius: 60 }, grid: { layout: 'triad' },
//     aberration: { amount: (t) => 2 + 6 * lock(t) },
//     fit: { keep: [1200, 400], cover: true },
//   });
//   vawe.onFrame((t) => cam.draw(t));            // awaited by the seek: the source may decode
//   const at = cam.project(x, y, t);             // { x, y, scale, depth, visible } in CSS px
//
// The SOURCE is the screen pixels in source px (a page's 1920x1080 for example). The camera sees a plane
// at distance 1 with focal length `focal`. Light is linear from the first tap to the last pass:
//   1 scene pass: perspective ray -> aperture-shaped depth of field with chromatic aberration -> palette
//     -> LED/CRT panel mask (a soft dot per subpixel, projected with the plane) -> half-float target;
//   2 bloom: the target is thresholded with a soft knee, downsampled 6 levels (13-tap) and upsampled
//     (tent), the levels weighted by `bloom.radius`: a core plus a wide tail, energy normalised;
//   3 final pass: add bloom, exposure, vignette, tone map (overexposure turns white), sRGB, grain.
// Any option value may be a number, an array, or a function of the seek time t returning one.
// Pixel sizes are CSS px of the page, so a draft (half-size capture) and a final look the same.
// draw(t) paints once and starts no loop: time is the seek. Everything random is hashed from `seed` and
// floor(t * fps), so a frame is a pure function of t.
//
// The technique (one shader that rays onto a tilted plane, focuses by depth difference with golden-angle
// taps, maps brightness through a palette, adds bloom and an RGB subpixel mask) is learned from
// ff-tracking's lens shader (MIT); the bloom chain is the 2014 Call of Duty: Advanced Warfare filter
// (Jimenez). The code here is our own.
import { canvasSource, htmlSource } from './lens-source.js';

export { canvasSource, htmlSource };

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
export const PALETTES = {
  thermal: ['#000004', '#3b0f70', '#b73779', '#fc8961', '#fcfdbf'].map(hex),
  phosphor: ['#000800', '#04300c', '#10a030', '#58f070', '#d8ffe0'].map(hex),
  amber: ['#080300', '#3a1600', '#a85a00', '#ffb02e', '#fff0c8'].map(hex),
  navy: ['#02040c', '#0a1c4a', '#1f5fd0', '#7cb8ff', '#f2f8ff'].map(hex),
  paper: ['#1a1410', '#5a4a3a', '#a89478', '#e0d2b6', '#fbf5e6'].map(hex),
  mono: ['#000000', '#555555', '#aaaaaa', '#ffffff'].map(hex),
};

const LAYOUTS = { stripe: 0, triad: 1, dot: 2 };
// Share of a cell a subpixel lights, per layout: the mask gain is 1 / share so the average light is kept.
const LIT_SHARE = { stripe: 0.232, triad: 0.152, dot: 0.458 };

// The "filmed screen" look: every effect on at a measured strength. OFF flattens all of them (the
// identity camera) so a test or a page can turn on one effect at a time.
export const DEFAULTS = {
  seed: 1, fps: 30,
  aim: null, zoom: 1, tiltX: 0, tiltY: 0, roll: 0, focal: 1.7, outside: [0.012, 0.012, 0.016],
  edge: 'extend', // 'extend' repeats the screen's edge pixels past the border; 'black' shows `outside`
  fit: { keep: null, margin: 60, cover: false }, // keep: a source point or list the view must hold; cover: never show the border
  dof: { blur: 0.5, focus: null, max: 46, bokeh: 7, taps: 48, soft: 2.5, blades: 6, rotation: 0.3, roundness: 0.15, catEye: 0.5 },
  palette: null, // { stops: [[r,g,b] ...2 to 8], amount: 1, keepColor: 0 }
  bloom: { strength: 0.9, radius: 42, threshold: 0.3, knee: 0.3 },
  grid: { amount: 0.9, cell: 3, layout: 'stripe', softness: 0.08, brightness: 0.85 },
  aberration: { amount: 6 },
  tear: { amount: 0, prob: 0.07, band: 16 },
  grain: 0.05, vignette: 0.4, exposure: 1, lift: 0, fade: 0,
};
export const OFF = {
  dof: { blur: 0, soft: 0 }, palette: null, bloom: { strength: 0 }, grid: { amount: 0 },
  aberration: { amount: 0 }, tear: { amount: 0 }, grain: 0, vignette: 0, exposure: 1, lift: 0, fade: 0,
};

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) out[k] = isObject(v) && isObject(base[k]) ? merge(base[k], v) : v;
  return out;
}
const resolve = (v, t) => {
  if (typeof v === 'function') return v(t);
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, t)]));
  return v;
};

// The plane's axes in camera space: R = Rz(roll) * Ry(tiltY) * Rx(tiltX) applied to the unit axes.
// tiltY > 0 brings the right edge toward the camera, tiltX > 0 brings the top edge toward it.
function basis({ tiltX, tiltY, roll }) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(tiltX), Math.sin(tiltX), Math.cos(tiltY), Math.sin(tiltY), Math.cos(roll), Math.sin(roll)];
  const rot = (v) => {
    const [x1, y1, z1] = [v[0], v[1] * cx + v[2] * sx, -v[1] * sx + v[2] * cx];
    const [x2, y2, z2] = [x1 * cy + z1 * sy, y1, -x1 * sy + z1 * cy];
    return [x2 * cz - y2 * sz, x2 * sz + y2 * cz, z2];
  };
  return { eu: rot([1, 0, 0]), ev: rot([0, 1, 0]), n: rot([0, 0, 1]) };
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const aimOf = (p, src) => p.aim || [src[0] / 2, src[1] / 2];

function camera(p, src) {
  const { eu, ev, n } = basis(p);
  const aim = aimOf(p, src);
  const K = p.focal * src[1] / p.zoom;
  const zAt = (x, y) => 1 + eu[2] * ((x - aim[0]) / K) + ev[2] * ((y - aim[1]) / K);
  return { eu, ev, n, aim, K, zAt };
}

export function projectWith(p, src, view, x, y) {
  const c = camera(p, src);
  const lx = (x - c.aim[0]) / c.K;
  const ly = (y - c.aim[1]) / c.K;
  const P = [c.eu[0] * lx + c.ev[0] * ly, c.eu[1] * lx + c.ev[1] * ly, 1 + c.eu[2] * lx + c.ev[2] * ly];
  const depth = P[2];
  if (depth <= 1e-4) return { x: NaN, y: NaN, scale: 0, depth, visible: false };
  const sx = (P[0] / depth) * p.focal * view.h + view.w / 2;
  const sy = (P[1] / depth) * p.focal * view.h + view.h / 2;
  const scale = (p.zoom * view.h) / (src[1] * depth);
  const visible = sx >= 0 && sy >= 0 && sx <= view.w && sy <= view.h && x >= 0 && y >= 0 && x <= src[0] && y <= src[1];
  return { x: sx, y: sy, scale, depth, visible };
}

// The source point seen at view pixel (x, y), or null above the horizon of a plane tilted edge-on.
export function unprojectWith(p, src, view, x, y) {
  const c = camera(p, src);
  const d = [(x - view.w / 2) / view.h, (y - view.h / 2) / view.h, p.focal];
  const dn = dot(d, c.n);
  if (dn <= 1e-4) return null;
  const hit = d.map((v) => v * (c.n[2] / dn));
  const rel = [hit[0], hit[1], hit[2] - 1];
  return [c.aim[0] + dot(rel, c.eu) * c.K, c.aim[1] + dot(rel, c.ev) * c.K];
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Pan, then zoom out, until every `keep` point sits inside the view margin; then (cover) until the
// four corners of the view see only screen. Pure: returns new params.
export function fitCamera(p, src, view) {
  const { keep, margin, cover } = p.fit;
  let q = { ...p, aim: [...aimOf(p, src)] };
  const points = !keep ? [] : Array.isArray(keep[0]) ? keep : [keep];
  for (let i = 0; i < 16 && points.length; i++) {
    const at = points.map(([x, y]) => projectWith(q, src, view, x, y));
    if (at.some((a) => !(a.depth > 1e-4))) { q = { ...q, zoom: q.zoom * 0.85 }; continue; }
    const xs = at.map((a) => a.x), ys = at.map((a) => a.y);
    if (Math.max(...xs) - Math.min(...xs) > view.w - 2 * margin || Math.max(...ys) - Math.min(...ys) > view.h - 2 * margin) { q = { ...q, zoom: q.zoom * 0.9 }; continue; }
    const ex = Math.min(0, Math.min(...xs) - margin) + Math.max(0, Math.max(...xs) - (view.w - margin));
    const ey = Math.min(0, Math.min(...ys) - margin) + Math.max(0, Math.max(...ys) - (view.h - margin));
    if (Math.abs(ex) < 0.5 && Math.abs(ey) < 0.5) break;
    const scale = at[0].scale;
    q = { ...q, aim: [q.aim[0] + ex / scale, q.aim[1] + ey / scale] };
  }
  for (let i = 0; i < 24 && cover; i++) {
    const seen = [[0, 0], [view.w, 0], [0, view.h], [view.w, view.h], [view.w / 2, 0], [view.w / 2, view.h], [0, view.h / 2], [view.w, view.h / 2]].map(([x, y]) => unprojectWith(q, src, view, x, y));
    if (seen.some((s) => !s)) break;
    const [x0, x1, y0, y1] = [Math.min(...seen.map((s) => s[0])), Math.max(...seen.map((s) => s[0])), Math.min(...seen.map((s) => s[1])), Math.max(...seen.map((s) => s[1]))];
    if (x1 - x0 > src[0] || y1 - y0 > src[1]) { q = { ...q, zoom: q.zoom * Math.max((x1 - x0) / src[0], (y1 - y0) / src[1]) * 1.02 }; continue; }
    const dx = Math.max(0, -x0) - Math.max(0, x1 - src[0]);
    const dy = Math.max(0, -y0) - Math.max(0, y1 - src[1]);
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) break;
    q = { ...q, aim: [q.aim[0] + dx, q.aim[1] + dy] };
  }
  return q;
}

const VERTEX = `#version 300 es
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
out vec4 o;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
vec3 toDisplay(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 toLinear(vec3 c) { c = max(c, 0.0); return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
float toDisplay1(float x) { return toDisplay(vec3(x)).x; }
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float hash(vec3 p) {
  uvec3 q = uvec3(ivec3(floor(abs(p))));
  return float(pcg(q.x ^ pcg(q.y ^ pcg(q.z)))) / 4294967296.0;
}
`;

const SCENE = `${HEAD}
uniform sampler2D u_tex;   // the source, sRGB8: sampled in linear light
uniform vec2 u_res, u_src, u_aim;
uniform float u_texScale, u_zoom, u_focal, u_zf, u_edge;
uniform vec3 u_eu, u_ev, u_n, u_outside;
uniform float u_cocK, u_cocMax, u_bokeh, u_soft, u_blades, u_rot, u_round, u_cat;
uniform int u_taps;
uniform vec3 u_pal[8];
uniform float u_palN, u_palAmt, u_keep;
uniform float u_gridAmt, u_cell, u_gridSoft, u_gridGain;
uniform int u_layout;
uniform float u_ca, u_tear, u_tearProb, u_tearBand, u_seed, u_frame;

const int MAXT = 64;

vec3 pal(float x) {
  float t = clamp(x, 0.0, 1.0) * (u_palN - 1.0);
  vec3 c = u_pal[0];
  for (int i = 1; i < 8; i++) c = mix(c, u_pal[i], clamp(t - float(i - 1), 0.0, 1.0));
  return c;
}

vec3 mapPal(vec3 r, vec3 g, vec3 b) {
  vec3 raw = vec3(r.r, g.g, b.b);
  if (u_palAmt <= 0.0) return raw;
  vec3 m = toLinear(vec3(pal(toDisplay1(dot(r, LUMA))).r, pal(toDisplay1(dot(g, LUMA))).g, pal(toDisplay1(dot(b, LUMA))).b));
  float sat = max(g.r, max(g.g, g.b)) - min(g.r, min(g.g, g.b));
  return mix(raw, m, u_palAmt * (1.0 - u_keep * clamp(sat * 1.4, 0.0, 1.0)));
}

vec3 samp(vec2 q, float lod) {
  vec2 uv = q / u_src;
  float inside = mix(step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0), 1.0, u_edge);
  return textureLod(u_tex, uv, lod).rgb * inside;
}

// Distance to a rounded box: negative inside.
float rbox(vec2 p, vec2 hb, float r) { vec2 q = abs(p) - hb + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

// One soft dot per subpixel, the same shape shifted per channel, so every channel lights the same area.
vec3 panel(vec2 c) {
  float s = u_gridSoft;
  vec3 m;
  if (u_layout == 0) {
    for (int k = 0; k < 3; k++) {
      vec2 d = fract(c - vec2((0.5 + float(k)) / 3.0, 0.5) + 0.5) - 0.5;
      m[k] = 1.0 - smoothstep(-s, s, rbox(d, vec2(0.15, 0.40), 0.12));
    }
  } else if (u_layout == 1) {
    vec2 ctr[3] = vec2[3](vec2(0.25, 0.28), vec2(0.75, 0.28), vec2(0.5, 0.74));
    for (int k = 0; k < 3; k++) m[k] = 1.0 - smoothstep(-s, s, rbox(fract(c - ctr[k] + 0.5) - 0.5, vec2(0.22), 0.22));
  } else {
    float v = 1.0 - smoothstep(-s, s, rbox(fract(c) - 0.5, vec2(0.38), 0.38));
    m = vec3(v);
  }
  return m;
}

float polygon(float a) {
  if (u_blades < 3.0) return 1.0;
  float seg = 6.2831853 / u_blades;
  float phi = mod(a - u_rot, seg) - 0.5 * seg;
  return mix(cos(3.14159265 / u_blades) / cos(phi), 1.0, u_round);
}

void main() {
  vec2 fp = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  vec2 frame2 = vec2(u_seed, u_frame);

  if (u_tear > 0.0) {
    float band = floor(fp.y / u_tearBand);
    float hit = step(1.0 - u_tearProb, hash(vec3(band, frame2)));
    fp.x += hit * (hash(vec3(band + 7.0, frame2)) - 0.5) * 2.0 * u_tear;
  }

  vec2 s = (fp - 0.5 * u_res) / u_res.y;
  vec3 d = vec3(s, u_focal);
  float dn = dot(d, u_n);
  if (dn <= 1e-4) { o = vec4(toLinear(u_outside), 1.0); return; }
  vec3 hit3 = d * (u_n.z / dn);
  vec3 rel = hit3 - vec3(0.0, 0.0, 1.0);
  float K = u_focal * u_src.y / u_zoom;
  vec2 base = u_aim + vec2(dot(rel, u_eu), dot(rel, u_ev)) * K;
  float z = hit3.z;
  float logPerPx = u_src.y / (u_zoom * u_res.y) * z;
  float lod0 = max(0.0, log2(logPerPx * u_texScale));

  float coc = max(clamp(u_cocK * abs(1.0 - u_zf / z), 0.0, u_cocMax), u_soft);
  float rLog = max(coc, 0.7) * logPerPx;
  int taps = coc < 0.7 ? 3 : min(u_taps, max(8, int(coc * 2.0)));
  float lodT = max(lod0, log2(max(1.0, rLog * sqrt(3.14159 / float(taps)) * u_texScale)) - 1.0);
  float spin = hash(vec3(fp, u_frame + u_seed)) * 6.2831853;
  float rho = clamp(length(s) / 0.9, 0.0, 1.0);
  vec2 radial = length(s) > 1e-4 ? normalize(s) : vec2(1.0, 0.0);

  vec2 ca = (fp - 0.5 * u_res) / (0.5 * u_res.y) * u_ca * logPerPx;
  vec3 accG = vec3(0.0), accR = vec3(0.0), accB = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < MAXT; i++) {
    if (i >= taps) break;
    float fi = float(i);
    float a = fi * 2.39996323 + spin;
    float R = polygon(a);
    vec2 off = vec2(cos(a), sin(a)) * sqrt((fi + 0.5) / float(taps)) * R * rLog;
    off -= radial * dot(off, radial) * u_cat * rho * rho * 0.6;
    vec2 q = base + off;
    vec3 g = samp(q, lodT);
    float w = (1.0 + u_bokeh * pow(dot(g, LUMA), 2.0)) * R * R;
    accG += g * w;
    if (u_ca > 0.0) { accR += samp(q + ca, lodT) * w; accB += samp(q - ca, lodT) * w; }
    wsum += w;
  }
  accG /= wsum;
  if (u_ca > 0.0) { accR /= wsum; accB /= wsum; } else { accR = accG; accB = accG; }
  vec3 col = mapPal(accR, accG, accB);

  if (u_gridAmt > 0.0) {
    float cellPx = u_cell / logPerPx;
    float amt = (1.0 - smoothstep(0.8, 3.5, rLog / u_cell)) * smoothstep(2.2, 4.5, cellPx) * u_gridAmt;
    col *= mix(vec3(1.0), panel(fract(base / u_cell)) * u_gridGain, amt);
  }
  float beyond = (1.0 - step(0.0, base.x) * step(0.0, base.y) * step(base.x, u_src.x) * step(base.y, u_src.y)) * (1.0 - u_edge);
  o = vec4(mix(col, toLinear(u_outside), beyond), 1.0);
}`;

const DOWN = `${HEAD}
uniform sampler2D u_in;
uniform vec2 u_texel;
uniform float u_first, u_thr, u_knee;
vec3 prefilter(vec3 c) {
  if (u_first < 0.5) return c;
  float l = max(c.r, max(c.g, c.b));
  float soft = clamp(l - u_thr + u_knee, 0.0, 2.0 * u_knee);
  soft = soft * soft / (4.0 * u_knee + 1e-4);
  return c * (max(soft, l - u_thr) / max(l, 1e-4));
}
vec3 t(vec2 uv, vec2 k) { return prefilter(texture(u_in, uv + k * u_texel).rgb); }
void main() {
  vec2 uv = gl_FragCoord.xy * 2.0 * u_texel;
  vec3 a = t(uv, vec2(-2, 2)), b = t(uv, vec2(0, 2)), c = t(uv, vec2(2, 2));
  vec3 d = t(uv, vec2(-2, 0)), e = t(uv, vec2(0, 0)), f = t(uv, vec2(2, 0));
  vec3 g = t(uv, vec2(-2, -2)), h = t(uv, vec2(0, -2)), i = t(uv, vec2(2, -2));
  vec3 j = t(uv, vec2(-1, 1)), k = t(uv, vec2(1, 1)), l = t(uv, vec2(-1, -1)), m = t(uv, vec2(1, -1));
  o = vec4(e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125, 1.0);
}`;

const UP = `${HEAD}
uniform sampler2D u_low, u_level;
uniform float u_has, u_gain;
void main() {
  vec2 uv = gl_FragCoord.xy / vec2(textureSize(u_level, 0));
  vec3 acc = texture(u_level, uv).rgb * u_gain;
  if (u_has > 0.5) {
    vec2 k = 1.0 / vec2(textureSize(u_low, 0));
    vec3 tent = texture(u_low, uv + k * vec2(-1, 1)).rgb + 2.0 * texture(u_low, uv + k * vec2(0, 1)).rgb + texture(u_low, uv + k * vec2(1, 1)).rgb
      + 2.0 * texture(u_low, uv + k * vec2(-1, 0)).rgb + 4.0 * texture(u_low, uv).rgb + 2.0 * texture(u_low, uv + k * vec2(1, 0)).rgb
      + texture(u_low, uv + k * vec2(-1, -1)).rgb + 2.0 * texture(u_low, uv + k * vec2(0, -1)).rgb + texture(u_low, uv + k * vec2(1, -1)).rgb;
    acc += tent / 16.0;
  }
  o = vec4(acc, 1.0);
}`;

const FINAL = `${HEAD}
uniform sampler2D u_scene, u_bloomTex;
uniform vec2 u_res;
uniform float u_bloom, u_exp, u_lift, u_vig, u_grain, u_fade, u_seed, u_frame;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 col = texture(u_scene, uv).rgb;
  if (u_bloom > 0.0) col += texture(u_bloomTex, uv).rgb * u_bloom;
  col = col * u_exp + u_lift;
  vec2 s = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 v = s * vec2(0.85, 1.15);
  col *= 1.0 - u_vig * dot(v, v);
  vec3 ex = max(col - 1.0, 0.0);
  col = min(col, 1.0) + (ex.r + ex.g + ex.b) * 0.5 * (1.0 - min(col, 1.0));
  col = toDisplay(col);
  col += (hash(vec3(gl_FragCoord.xy, u_frame + u_seed * 31.0)) - 0.5) * u_grain;
  col *= 1.0 - u_fade;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`lens: ${gl.getShaderInfoLog(shader)}`);
  return shader;
}

function program(gl, fragment) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`lens: ${gl.getProgramInfoLog(p)}`);
  const cache = {};
  return { p, loc: (name) => (name in cache ? cache[name] : (cache[name] = gl.getUniformLocation(p, name))) };
}

const LEVELS = 6;

function target(gl, w, h, hdr) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fbo, w, h };
}

// Level i is 2^(i+1) times smaller than the canvas: its weight is 1 up to the level the glow radius
// reaches and fades over the next one, each level a little lighter than the one before.
export function bloomWeights(radiusPx) {
  const reach = Math.log2(Math.max(radiusPx, 2)) - 1;
  const w = Array.from({ length: LEVELS }, (_, i) => clamp(reach - i + 1, 0, 1) * 0.8 ** i);
  const sum = w.reduce((s, v) => s + v, 0) || 1;
  return w.map((v) => v / sum);
}

function createRig(gl, canvas) {
  const hdr = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  const srcTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, srcTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const down = Array.from({ length: LEVELS }, (_, i) => target(gl, Math.max(1, canvas.width >> (i + 1)), Math.max(1, canvas.height >> (i + 1)), hdr));
  return {
    gl, canvas, srcTex, down,
    programs: { scene: program(gl, SCENE), down: program(gl, DOWN), up: program(gl, UP), final: program(gl, FINAL) },
    sceneT: target(gl, canvas.width, canvas.height, hdr),
    up: down.map((d) => target(gl, d.w, d.h, hdr)),
    pxs: canvas.height / innerHeight,
  };
}

function begin(rig, prog, t) {
  rig.gl.useProgram(prog.p);
  rig.gl.bindFramebuffer(rig.gl.FRAMEBUFFER, t ? t.fbo : null);
  rig.gl.viewport(0, 0, t ? t.w : rig.canvas.width, t ? t.h : rig.canvas.height);
}
const bind = (gl, unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); };
const draw3 = (gl) => gl.drawArrays(gl.TRIANGLES, 0, 3);

function setPalette(gl, prog, p) {
  const stops = p.palette ? p.palette.stops : [[0, 0, 0], [1, 1, 1]];
  const flat = new Float32Array(24);
  for (let i = 0; i < 8; i++) flat.set(stops[Math.min(i, stops.length - 1)], i * 3);
  gl.uniform3fv(prog.loc('u_pal'), flat);
  gl.uniform1f(prog.loc('u_palN'), stops.length);
  gl.uniform1f(prog.loc('u_palAmt'), p.palette ? (p.palette.amount ?? 1) : 0);
  gl.uniform1f(prog.loc('u_keep'), p.palette ? (p.palette.keepColor ?? 0) : 0);
}

function setDepthOfField(gl, prog, p, rig) {
  const u1 = (name, v) => gl.uniform1f(prog.loc(name), v);
  const h = rig.canvas.height;
  u1('u_cocK', p.dof.blur * 190 * h / 1080); u1('u_cocMax', p.dof.max * h / 1080);
  u1('u_bokeh', p.dof.bokeh); u1('u_soft', p.dof.soft * rig.pxs);
  u1('u_blades', p.dof.blades); u1('u_rot', p.dof.rotation); u1('u_round', p.dof.roundness); u1('u_cat', p.dof.catEye);
  gl.uniform1i(prog.loc('u_taps'), Math.min(64, p.dof.taps | 0));
}

function scenePass(rig, p, t, src, tex) {
  const { gl, pxs } = rig;
  const { eu, ev, n } = basis(p);
  const aim = aimOf(p, src);
  const focus = p.dof.focus || aim;
  const prog = rig.programs.scene;
  begin(rig, prog, rig.sceneT);
  bind(gl, 0, rig.srcTex);
  const u1 = (name, v) => gl.uniform1f(prog.loc(name), v);
  gl.uniform1i(prog.loc('u_tex'), 0);
  gl.uniform2f(prog.loc('u_res'), rig.canvas.width, rig.canvas.height);
  gl.uniform2f(prog.loc('u_src'), src[0], src[1]);
  gl.uniform2f(prog.loc('u_aim'), aim[0], aim[1]);
  u1('u_texScale', tex.width / src[0]);
  u1('u_zoom', p.zoom); u1('u_focal', p.focal); u1('u_zf', camera(p, src).zAt(focus[0], focus[1]));
  u1('u_edge', p.edge === 'extend' ? 1 : 0);
  gl.uniform3fv(prog.loc('u_eu'), eu); gl.uniform3fv(prog.loc('u_ev'), ev); gl.uniform3fv(prog.loc('u_n'), n);
  gl.uniform3fv(prog.loc('u_outside'), p.outside);
  setDepthOfField(gl, prog, p, rig);
  setPalette(gl, prog, p);
  const layout = p.grid.layout in LAYOUTS ? p.grid.layout : 'stripe';
  u1('u_gridAmt', p.grid.amount); u1('u_cell', p.grid.cell); u1('u_gridSoft', p.grid.softness);
  u1('u_gridGain', p.grid.brightness / LIT_SHARE[layout]); gl.uniform1i(prog.loc('u_layout'), LAYOUTS[layout]);
  u1('u_ca', p.aberration.amount * pxs);
  u1('u_tear', p.tear.amount * pxs); u1('u_tearProb', p.tear.prob); u1('u_tearBand', p.tear.band * pxs);
  u1('u_seed', p.seed); u1('u_frame', Math.floor(t * p.fps));
  draw3(gl);
}

function bloomChain(rig, p) {
  const { gl, down, up } = rig;
  const weights = bloomWeights(p.bloom.radius * rig.pxs);
  const dn = rig.programs.down;
  for (let i = 0; i < LEVELS; i++) {
    const from = i === 0 ? rig.sceneT : down[i - 1];
    begin(rig, dn, down[i]);
    bind(gl, 0, from.tex);
    gl.uniform1i(dn.loc('u_in'), 0);
    gl.uniform2f(dn.loc('u_texel'), 1 / from.w, 1 / from.h);
    gl.uniform1f(dn.loc('u_first'), i === 0 ? 1 : 0);
    gl.uniform1f(dn.loc('u_thr'), p.bloom.threshold ** 2.2);
    gl.uniform1f(dn.loc('u_knee'), Math.max(1e-3, p.bloom.knee * Math.max(p.bloom.threshold, 0.05) ** 2.2));
    draw3(gl);
  }
  const upp = rig.programs.up;
  for (let i = LEVELS - 1; i >= 0; i--) {
    begin(rig, upp, up[i]);
    bind(gl, 0, down[i].tex);
    if (i < LEVELS - 1) bind(gl, 1, up[i + 1].tex);
    gl.uniform1i(upp.loc('u_level'), 0); gl.uniform1i(upp.loc('u_low'), 1);
    gl.uniform1f(upp.loc('u_has'), i < LEVELS - 1 ? 1 : 0);
    gl.uniform1f(upp.loc('u_gain'), weights[i]);
    draw3(gl);
  }
}

function finalPass(rig, p, t) {
  const { gl } = rig;
  const f = rig.programs.final;
  begin(rig, f, null);
  bind(gl, 0, rig.sceneT.tex); bind(gl, 1, rig.up[0].tex);
  gl.uniform1i(f.loc('u_scene'), 0); gl.uniform1i(f.loc('u_bloomTex'), 1);
  gl.uniform2f(f.loc('u_res'), rig.canvas.width, rig.canvas.height);
  const u1 = (name, v) => gl.uniform1f(f.loc(name), v);
  u1('u_bloom', p.bloom.strength > 0 ? p.bloom.strength : 0); u1('u_exp', p.exposure); u1('u_lift', p.lift); u1('u_vig', p.vignette);
  u1('u_grain', p.grain); u1('u_fade', p.fade); u1('u_seed', p.seed); u1('u_frame', Math.floor(t * p.fps));
  draw3(gl);
}

export function lens(source, options = {}) {
  const opts = merge(DEFAULTS, options);
  const pixelRatio = opts.pixelRatio || window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(innerWidth * pixelRatio);
  canvas.height = Math.round(innerHeight * pixelRatio);
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0';
  (opts.parent || document.body).prepend(canvas);
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
  if (!gl) throw new Error('lens: WebGL2 is not available');
  const rig = createRig(gl, canvas);
  const view = { w: innerWidth, h: innerHeight };
  const params = (t) => {
    const p = resolve(opts, t);
    return p.fit && (p.fit.keep || p.fit.cover) ? fitCamera(p, source.size, view) : p;
  };

  async function draw(t) {
    const p = params(t);
    bind(gl, 0, rig.srcTex);
    const tex = await source.upload(gl);
    scenePass(rig, p, t, source.size, tex);
    if (p.bloom.strength > 0) bloomChain(rig, p);
    finalPass(rig, p, t);
  }

  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
  return {
    canvas, gl, source, draw, params,
    project: (x, y, t) => projectWith(params(t), source.size, view, x, y),
    quad: (t) => corners.map(([u, v]) => projectWith(params(t), source.size, view, u * source.size[0], v * source.size[1])),
  };
}
