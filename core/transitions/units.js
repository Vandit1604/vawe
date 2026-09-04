// core/transitions/units.js: THE TRANSITION LIBRARY, one self-contained UNIT per seam transition.
//
// Each unit is a plug-in: a name, a family, a one-line blurb (required, core/registry.js refuses a
// blank one), its provenance (author/license/source), and a GLSL `transition(vec2 uv)` that returns the
// blended colour. The compositor (core/seams.js) is a generic RUNNER: it wraps each unit's GLSL with a
// shared preamble and compiles ONE program per unit, so units never collide on helper names or uniforms
// and "add a transition" means "add one file entry", not "edit a monolith".
//
// THE CONTRACT a unit's GLSL is compiled against (provided by the preamble in core/seams.js):
//   vec4 getFrom(vec2 uv) / getTo(vec2 uv)      the two baked beats (y-flipped for canvas rows)
//   getFromColor / getToColor                    ALIASES of the above, so gl-transitions source runs verbatim
//   progress            clamp(u_p,0,1)           0..1 across the seam (already shaped by the `timing` curve)
//   ratio               u_res.x/u_res.y          viewport aspect, the gl-transitions `ratio` uniform
//   intensity           u_intensity              the strength knob (opts.intensity, default 1)
//   direction           u_dir                    a unit vector for the 4 dirs (opts.dir)
//   u_seed              float                     opts.seed, for noise variation
//   PI, hash(vec2), vnoise(vec2), fbm(vec2)       shared helpers
// Every unit ends `return vec4(col.rgb, 1.0)` (seams are opaque; they fully cover the live stage).
//
// PROVENANCE. `source: 'vawe'` is ours. A `gl-transitions/<name>` source is copied VERBATIM from the
// canonical library (https://github.com/gl-transitions/gl-transitions), which is why the recipe is
// correct and not approximated; author + license travel with it and are listed in ./LICENSES.md. Only
// permissive (MIT / CC0 / public-domain) shaders are vendored.

// Wrap an existing vawe seam body (which used locals p/aspect/ax/sg + `col`) so it stays byte-identical.
const vawe = (body) => `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  vec2 aspect = vec2(u_res.x/u_res.y, 1.0);
  float ax = abs(u_dir.x) > 0.5 ? uv.x : uv.y;
  float sg = u_dir.x + u_dir.y;
  vec4 col;
${body}
  return vec4(col.rgb, 1.0);
}`;

import { HOUSE_UNITS } from './units-house.js';

const CORE_UNITS = [
  { name: 'fade', family: 'blend', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'flat cross-dissolve of both beats. The universal fallback every seam degrades to with no WebGL or a blank raster',
    glsl: vawe(`  col = mix(getFrom(uv), getTo(uv), p);`) },

  { name: 'dissolve', family: 'blend', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'grainy film dissolve, each pixel flipping as a noise front passes it, time/place change',
    glsl: vawe(`  float n = fbm(uv * 6.0 + u_seed);
  float m = smoothstep(p - 0.14, p + 0.14, n);
  col = mix(getTo(uv), getFrom(uv), m);`) },

  { name: 'slide', family: 'reveal', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'the arriving beat slides in over a held outgoing one (cover), dir-aware, the basic every tool has',
    glsl: vawe(`  vec2 tp = uv + (1.0 - p) * u_dir;
  float inr = step(0.0, tp.x) * step(tp.x, 1.0) * step(0.0, tp.y) * step(tp.y, 1.0);
  col = mix(getFrom(uv), getTo(tp), inr);`) },

  { name: 'push', family: 'reveal', author: 'Fernando Kuteken', license: 'MIT', source: 'gl-transitions/directional',
    blurb: 'both beats shove together toward dir, the arriving one following the leaving one off screen, dir-aware basic',
    glsl: vawe(`  vec2 pp = uv - p * u_dir;
  vec2 f = fract(pp);
  float inr = step(0.0, pp.x) * step(pp.x, 1.0) * step(0.0, pp.y) * step(pp.y, 1.0);
  col = mix(getTo(f), getFrom(f), inr);`) },

  { name: 'uncover', family: 'reveal', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'the leaving beat slides off toward dir and reveals a held arriving beat under it, dir-aware basic',
    glsl: vawe(`  vec2 fp = uv - p * u_dir;
  float inr = step(0.0, fp.x) * step(fp.x, 1.0) * step(0.0, fp.y) * step(fp.y, 1.0);
  col = mix(getTo(uv), getFrom(fp), inr);`) },

  { name: 'wipe', family: 'reveal', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'a soft-edged line sweeps toward dir, the arriving beat revealed behind it, playful, "notice the cut"',
    // Signed projection onto u_dir (any angle, not just the 4 cardinals): reduces to the old sg/ax
    // cardinal-snap formula exactly at those 4 vectors (algebraically identical, verified by hand).
    glsl: vawe(`  float coord = dot(uv - 0.5, u_dir) + 0.5;
  float soft = u_feather;
  float m = 1.0 - smoothstep(p - soft, p + soft, coord);
  col = mix(getFrom(uv), getTo(uv), m);`) },

  { name: 'crossWarp', family: 'warp', author: 'Eke Péter', license: 'MIT', source: 'gl-transitions/crosswarp',
    blurb: 'both beats drag toward the centre and swap through a soft noise front. A wipe with grit, for organic brands and dark scenes',
    glsl: vawe(`  float x = smoothstep(0.0, 1.0, p*2.0 + uv.x - 1.0);
  col = mix(getFrom((uv - 0.5)*(1.0 - x) + 0.5), getTo((uv - 0.5)*x + 0.5), x);`) },

  { name: 'whipPan', family: 'warp', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'momentum swipe between beats',
    glsl: vawe(`  vec2 d = normalize(u_dir + 1e-4) / aspect;
  float amt = 0.9 * u_intensity;
  // The smear spread is a CLAMPED read of intensity, so a subtle whip (low intensity, for travel
  // alone) doesn't also lose its smear down to nothing; amt above still tracks intensity directly.
  float smearK = clamp(u_intensity, 0.4, 2.0);
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int i = 0; i < 6; i++) {
    float k = float(i)/5.0;
    float sm = (k - 0.5) * 0.06 * smearK;
    vec2 fuv = uv + d * (p*amt + sm);
    vec2 tuv = uv + d * ((p - 1.0)*amt + sm);
    vec3 mixed = mix(getFrom(fuv).rgb, getTo(tuv).rgb, smoothstep(0.35, 0.65, p));
    float w = 1.0 - abs(k - 0.5);
    acc += mixed * w; wsum += w;
  }
  col = vec4(acc / wsum, 1.0);`) },

  { name: 'sdfIris', family: 'shaped', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'the arriving beat revealed through an expanding seeded polygon iris (star, hex, diamond or triangle) with a bright rim. Playful reveal, the shape is the personality',
    glsl: vawe(`  vec2 dd = (uv - 0.5) * aspect;
  float ang = atan(dd.y, dd.x);
  float k = floor(hash(vec2(u_seed, 11.0)) * 4.0);
  float n = k < 1.0 ? 5.0 : k < 2.0 ? 6.0 : k < 3.0 ? 4.0 : 3.0;
  float pinch = k < 1.0 ? 0.35 : 0.12;
  float rr = length(dd) * (1.0 + pinch * (0.5 + 0.5*cos(ang*n + u_seed)));
  float front = p * 0.95;
  float m = smoothstep(front + 0.03, front - 0.03, rr);
  float rim = smoothstep(0.04, 0.0, abs(rr - front));
  col = mix(getFrom(uv), getTo(uv), m);
  col.rgb += vec3(1.0) * rim * 0.35 * u_intensity;`) },

  { name: 'dispersion', family: 'warp', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'prism channel-split across the seam along a seeded axis, peaking mid-way, optical, techy pivots',
    glsl: vawe(`  float bell = sin(PI * p);
  vec2 dir = normalize(vec2(cos(u_seed*6.2831), sin(u_seed*6.2831)) + 1e-4) / aspect;
  float w = fbm(uv*4.0 + u_seed);
  float amt = (0.06 + 0.04*w) * bell * u_intensity;
  vec3 c;
  c.r = mix(getFrom(uv + dir*amt), getTo(uv + dir*amt), p).r;
  c.g = mix(getFrom(uv), getTo(uv), p).g;
  c.b = mix(getFrom(uv - dir*amt), getTo(uv - dir*amt), p).b;
  col = vec4(c, 1.0);`) },

  { name: 'lens', family: 'warp', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'one moving optical centre bends BOTH beats through a single lens, with a warm flare. Premium product glamour, dark scenes',
    glsl: vawe(`  float bell = sin(PI * p);
  vec2 c0 = vec2(0.5) + (vec2(hash(vec2(u_seed,1.0)), hash(vec2(u_seed,2.0))) - 0.5) * 0.4;
  vec2 dd = (uv - c0) * aspect;
  float r = length(dd);
  float bend = 1.0 - 0.35 * bell * u_intensity * exp(-r*r*4.0);
  vec2 buv = c0 + (uv - c0) * bend;
  float flare = smoothstep(0.25, 0.0, r) * bell * 0.4 * u_intensity;
  col = mix(getFrom(buv), getTo(buv), p);
  col.rgb += vec3(1.0, 0.95, 0.85) * flare;`) },

  { name: 'flashWhite', family: 'flash', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'white flash on an energy pivot',
    glsl: vawe(`  if (p < 0.5) {
    float k = smoothstep(0.0, 1.0, p * 2.0);
    col = mix(getFrom(uv), vec4(1.0), k);
  } else {
    float k = smoothstep(0.0, 1.0, (p - 0.5) * 2.0);
    col = mix(vec4(1.0), getTo(uv), k);
  }`) },

  { name: 'cinematicZoom', family: 'zoom', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'dive-in zoom into a screen',
    glsl: vawe(`  float e = p*p*(3.0 - 2.0*p);
  vec2 dd = uv - 0.5;
  float sFrom = 1.0 + 0.25 * e * u_intensity;
  float sTo   = 1.0 + 0.25 * (1.0 - e) * u_intensity;
  vec4 cf = getFrom(dd / sFrom + 0.5);
  vec4 ct = getTo(dd / sTo + 0.5);
  col = mix(cf, ct, e);`) },

  { name: 'portal', family: 'shaped', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'glowing portal reveal (once)',
    glsl: vawe(`  vec2 dd = (uv - 0.5) * aspect;
  float r = length(dd);
  float ang = atan(dd.y, dd.x);
  float maxR = length(aspect) * 0.5 + 0.2;
  float edgeN = (fbm(vec2(ang * 3.0, u_seed * 7.0)) - 0.5) * 0.12 * u_intensity;
  float portalR = p * (maxR + 0.15) + edgeN;
  float ring = abs(r - portalR);
  float soft = 0.02 + 0.03 * (1.0 - p);
  float warp = 0.14 * u_intensity * exp(-ring * ring * 26.0);
  vec2 wuv = (dd - normalize(dd + 1e-4) * warp) / aspect + 0.5;
  float m = smoothstep(portalR + soft, portalR - soft, r);
  col = mix(getFrom(wuv), getTo(wuv), m);
  float rim = smoothstep(soft * 3.0, 0.0, ring);
  float ca = rim * 0.02 * u_intensity;
  vec2 rdir = normalize(dd + 1e-4) / aspect;
  col.r = mix(col.r, mix(getFrom(wuv + rdir * ca), getTo(wuv + rdir * ca), m).r, rim);
  col.b = mix(col.b, mix(getFrom(wuv - rdir * ca), getTo(wuv - rdir * ca), m).b, rim);
  vec3 glow = mix(vec3(0.35, 0.7, 1.0), vec3(1.0, 0.4, 0.9), 0.5 + 0.5 * sin(ang * 4.0 + u_seed * 6.2831));
  col.rgb += glow * rim * (0.5 + 0.9 * sin(PI * p)) * u_intensity;`) },
];

// The 14 originals first (their fx indices never shift), then the hand-written house set.
export const UNITS = [...CORE_UNITS, ...HOUSE_UNITS];
export const SEAM_FX = UNITS.map((u) => u.name);
export const SEAM_BLURBS = Object.fromEntries(UNITS.map((u) => [u.name, u.blurb]));
