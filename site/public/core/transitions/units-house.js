// core/transitions/units-house.js: the vawe HOUSE SET, transitions hand-written for this engine.
//
// These are ORIGINAL: not copied from any library. Each is written against the seam runner's contract
// (core/transitions/units.js documents it) and tuned to our own knobs, `u_dir` (the 4 directions),
// `u_intensity` (opts.intensity), `u_seed` (noise variation), and the shared `hash`/`fbm` helpers, so a
// scene shapes them through the same speed dial (`timing`) and `dir`/`intensity`/`seed` as every other
// seam. The techniques (a radial sweep, a luminance wipe, a radial blur) are common knowledge; the code,
// the composition, the rims and the defaults are ours. `source: 'vawe'`, no attribution owed.
//
// Every unit is `vec4 transition(vec2 uv)` returning an opaque colour. `p` is the eased progress, and
// `aspect` corrects the circle/angle maths for non-square canvases.

export const HOUSE_UNITS = [
  { name: 'barnDoor', family: 'reveal', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'two doors split from the centre outward along dir, opening onto the next beat. A confident, symmetric reveal',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  // Sign-invariant axis coord: |u_dir.x|,|u_dir.y| are exactly 1/0 for a cardinal dir, so this is
  // byte-identical to the old "abs(u_dir.x)>0.5 ? uv.x : uv.y" pick at those 4 vectors, and blends
  // continuously between the two axes for any angle in between.
  float coord = uv.x * abs(u_dir.x) + uv.y * abs(u_dir.y);
  float d = abs(coord - 0.5) * 2.0;              // 0 at centre line, 1 at the edges
  float soft = u_feather;
  float m = smoothstep(p + soft, p - soft, d);   // opens from the centre out
  return vec4(mix(getFrom(uv), getTo(uv), m).rgb, 1.0);
}` },

  { name: 'clockWipe', family: 'reveal', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'a hand sweeps around the frame like a clock, wiping the next beat in behind it with a soft glowing edge. A timed, mechanical reveal',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  vec2 aspect = vec2(u_res.x/u_res.y, 1.0);
  vec2 d = (uv - 0.5) * aspect;
  float a = atan(d.x, -d.y);                      // 0 at top, sweeps clockwise
  float norm = (a + PI) / (2.0 * PI);             // 0..1 around the dial
  float m = 1.0 - smoothstep(p - u_feather, p + u_feather, norm);
  vec4 col = mix(getFrom(uv), getTo(uv), m);
  float rim = smoothstep(0.02, 0.0, abs(norm - p));
  col.rgb += rim * 0.25 * u_intensity;
  return vec4(col.rgb, 1.0);
}` },

  { name: 'irisRound', family: 'shaped', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'a soft circle opens from the centre with a bright rim, irising the next beat into view. A classic spotlight reveal',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  vec2 aspect = vec2(u_res.x/u_res.y, 1.0);
  float r = length((uv - 0.5) * aspect);
  float maxR = length(0.5 * aspect) + 0.05;
  float front = p * maxR;
  float soft = u_feather;
  float m = smoothstep(front + soft, front - soft, r);   // inside the circle -> the next beat
  vec4 col = mix(getFrom(uv), getTo(uv), m);
  float rim = smoothstep(soft * 2.0, 0.0, abs(r - front));
  col.rgb += rim * 0.3 * u_intensity;
  return vec4(col.rgb, 1.0);
}` },

  { name: 'shatterGlitch', family: 'glitch', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'the frame breaks into blocks whose RGB channels tear apart and flicker, then snap back clean. A hard digital pivot',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  float bell = sin(PI * p);
  vec2 blocks = floor(uv * vec2(24.0, 14.0));
  float n = hash(blocks + floor(u_seed));
  float shift = (n - 0.5) * 0.15 * bell * u_intensity;
  vec2 ro = vec2(shift, 0.0);
  float rr = mix(getFrom(uv + ro), getTo(uv + ro), p).r;
  float gg = mix(getFrom(uv), getTo(uv), p).g;
  float bb = mix(getFrom(uv - ro), getTo(uv - ro), p).b;
  float fl = step(0.96, hash(blocks * 1.7 + floor(u_seed * 3.0))) * bell;
  vec3 c = vec3(rr, gg, bb) + fl * 0.6;
  return vec4(c, 1.0);
}` },

  { name: 'zoomBlur', family: 'zoom', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'both beats streak toward the centre in a radial blur and cross-dissolve. A punchy push between shots',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  float bell = sin(PI * p);
  vec2 c0 = vec2(0.5);
  vec2 dir = uv - c0;
  // Clamped so a low intensity still leaves a readable streak (there is no separate travel to
  // preserve here, unlike whipPan, but the same one-line fix keeps a subtle call from going flat).
  float blurK = clamp(u_intensity, 0.4, 2.0);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float t = float(i) / 7.0;
    float sc = 1.0 - t * 0.15 * bell * blurK;
    vec2 suv = c0 + dir * sc;
    acc += mix(getFrom(suv), getTo(suv), p).rgb;
  }
  return vec4(acc / 8.0, 1.0);
}` },

  { name: 'swirlWarp', family: 'warp', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'a vortex twists the centre of the frame and unwinds into the next beat, strongest mid-cut. Organic, dreamy pivots',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  vec2 aspect = vec2(u_res.x/u_res.y, 1.0);
  vec2 d = (uv - 0.5) * aspect;
  float r = length(d);
  float bell = sin(PI * p);
  float ang = bell * u_intensity * 3.0 * exp(-r * r * 3.0);
  float s = sin(ang), co = cos(ang);
  vec2 rd = vec2(d.x * co - d.y * s, d.x * s + d.y * co);
  vec2 suv = rd / aspect + 0.5;
  return vec4(mix(getFrom(suv), getTo(suv), p).rgb, 1.0);
}` },

  { name: 'rippleWave', family: 'warp', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'concentric waves ripple out from the centre as the frame dissolves, like a drop hitting water. Soft, calming links',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  vec2 aspect = vec2(u_res.x/u_res.y, 1.0);
  vec2 d = (uv - 0.5) * aspect;
  float r = length(d);
  float bell = sin(PI * p);
  float w = sin(r * 40.0 - p * 30.0) * 0.02 * bell * u_intensity;
  vec2 suv = uv + normalize(d + 1e-4) / aspect * w;
  return vec4(mix(getFrom(suv), getTo(suv), smoothstep(0.1, 0.9, p)).rgb, 1.0);
}` },

  { name: 'pixelDissolve', family: 'geometric', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'the frame coarsens into big pixels at the midpoint then sharpens into the next beat. A retro digital dissolve',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  float d = min(p, 1.0 - p);
  float cells = mix(120.0, 12.0, d * 2.0);       // coarsest at the midpoint
  vec2 q = (floor(uv * cells) + 0.5) / cells;
  return vec4(mix(getFrom(q), getTo(q), p).rgb, 1.0);
}` },

  { name: 'blindsWipe', family: 'reveal', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'slatted blinds sweep across the frame along dir, revealing the next beat. A crisp graphic wipe',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  float coord = uv.x * abs(u_dir.x) + uv.y * abs(u_dir.y);
  float slats = 12.0;
  float local = fract(coord * slats);
  float soft = u_feather;
  float m = 1.0 - smoothstep(p - soft, p + soft, local);   // each slat opens on the same clock
  return vec4(mix(getFrom(uv), getTo(uv), m).rgb, 1.0);
}` },

  { name: 'burnThrough', family: 'optical', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'the frame burns away along a noisy front with a hot ember edge, revealing the next beat through the fire. A dramatic organic pivot',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  float n = fbm(uv * 5.0 + u_seed);
  float front = p * 1.2 - 0.1;
  float m = smoothstep(front + u_feather, front - u_feather, n);   // burned -> the next beat
  float rim = smoothstep(0.08, 0.0, abs(n - front));
  vec4 col = mix(getFrom(uv), getTo(uv), m);
  vec3 hot = vec3(1.0, 0.5, 0.15);
  col.rgb = mix(col.rgb, hot, rim * u_intensity);
  return vec4(col.rgb, 1.0);
}` },

  { name: 'spinZoom', family: 'zoom', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'the outgoing beat spins and scales out while the incoming beat spins in. A kinetic whip between shots',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  vec2 aspect = vec2(u_res.x/u_res.y, 1.0);
  vec2 d = (uv - 0.5) * aspect;
  float aFrom = p * 0.6 * u_intensity, aTo = (p - 1.0) * 0.6 * u_intensity;
  float sFrom = 1.0 + 0.4 * p * u_intensity, sTo = 1.0 + 0.4 * (1.0 - p) * u_intensity;
  float cf = cos(aFrom), sf = sin(aFrom);
  vec2 uf = vec2(d.x * cf - d.y * sf, d.x * sf + d.y * cf) / sFrom / aspect + 0.5;
  float ct = cos(aTo), st = sin(aTo);
  vec2 ut = vec2(d.x * ct - d.y * st, d.x * st + d.y * ct) / sTo / aspect + 0.5;
  return vec4(mix(getFrom(uf), getTo(ut), smoothstep(0.35, 0.65, p)).rgb, 1.0);
}` },

  { name: 'lumaWipe', family: 'optical', author: 'vawe', license: 'internal', source: 'vawe',
    blurb: 'the next beat bleeds through the darkest parts of the current one first, along a soft noisy threshold. A cinematic dissolve with grain',
    glsl: `vec4 transition(vec2 uv){
  float p = clamp(u_p, 0.0, 1.0);
  vec4 fromc = getFrom(uv);
  float lum = dot(fromc.rgb, vec3(0.299, 0.587, 0.114));
  float n = (fbm(uv * 3.0 + u_seed) - 0.5) * 0.3;
  float thr = p * 1.3 - 0.15 + n;
  float m = 1.0 - smoothstep(thr - u_feather, thr + u_feather, lum);   // dark areas reveal first
  return vec4(mix(getFrom(uv), getTo(uv), m).rgb, 1.0);
}` },
];
