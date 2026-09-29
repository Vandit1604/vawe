// core/stings/units/leak.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 2)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* light leak, seed-generative, multi-hue */
    vec3 col = vec3(0.0); float amax = 0.0;                              /* every seed = a different leak */
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 lp = vec2(0.12 + 0.76*hash(vec2(fi, u_seed)), 0.12 + 0.76*hash(vec2(fi+5.0, u_seed)));
      float rad = 0.32 + 0.5*hash(vec2(fi+9.0, u_seed));
      float l = smoothstep(rad, 0.0, length(uv - lp));
      vec3 hue;                                                          /* colours = your palette, else seed-generated */
      if (u_palN > 0) { hue = palAt(int(mod(fi, float(u_palN)))); }
      else { float h = hash(vec2(fi+13.0, u_seed)); hue = 0.5 + 0.5*cos(6.2831*(h + vec3(0.0, 0.33, 0.67))); }
      col += hue * l * (0.55 + 0.6*hash(vec2(fi+21.0, u_seed)));
      amax = max(amax, l);
    }
    float sd = hash(vec2(u_seed, 3.7)) - 0.5;                            /* a soft diagonal film streak */
    float streak = smoothstep(0.32, 0.0, abs(uv.x - uv.y - sd));
    vec3 sh;
    if (u_palN > 0) { sh = palAt(int(mod(hash(vec2(u_seed, 7.1))*4.0, float(u_palN)))); }
    else { sh = 0.5 + 0.5*cos(6.2831*(hash(vec2(u_seed, 7.1)) + vec3(0.0, 0.33, 0.67))); }
    col += sh * streak * 0.45; amax = max(amax, streak*0.55);
    c = vec4(min(col, vec3(1.5)), bell * 0.8 * clamp(amax, 0.0, 1.0));`;
export const blurb = 'a light leak, seed-generative and multi-hue. Colour bleeding in at the edges as if the camera back opened.';
export const aka = ['light leak', 'light leak transition', 'lens leak'];
