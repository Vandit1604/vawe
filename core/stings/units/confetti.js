// core/stings/units/confetti.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 9)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* confetti burst */
    for (int i = 0; i < 40; i++) {
      float fi = float(i);
      float ax = hash(vec2(fi, u_seed));
      float sp = 0.35 + 0.65*hash(vec2(fi+40.0, u_seed));
      float px = ax + (hash(vec2(fi+80.0, u_seed)) - 0.5) * 0.35 * pp;
      float py = 1.0 - pp*sp*1.4 + 0.35*pp*pp;         /* up then gravity */
      vec2 d = (uv - vec2(px, py)) * vec2(60.0, 90.0);
      float q = step(abs(d.x), 0.5) * step(abs(d.y), 0.9);
      vec3 col = 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67) + hash(vec2(fi+120.0, u_seed))));
      c.rgb = mix(c.rgb, col, q); c.a = max(c.a, q * (1.0 - pp*pp));
    }`;
export const blurb = 'a burst of coloured pieces thrown across frame. Celebration, and hard to use without looking cheap.';
