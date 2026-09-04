// core/stings/units/bokeh.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 13)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* bokeh discs drift */
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      vec2 pcen = vec2(hash(vec2(fi, u_seed)), hash(vec2(fi+12.0, u_seed)));
      pcen.x += (pp - 0.5) * 0.25 * (0.5 + hash(vec2(fi+24.0, u_seed)));
      float rad = 0.03 + 0.06*hash(vec2(fi+36.0, u_seed));
      vec2 d = uv - pcen; d.x *= u_res.x/u_res.y;
      float disc = smoothstep(rad, rad*0.55, length(d));
      c.rgb = mix(c.rgb, vec3(1.0), disc*0.5); c.a = max(c.a, disc * bell * 0.22);
    }`;
export const blurb = 'soft out-of-focus discs drifting across frame. Ambient and quiet: closer to a texture than a cut.';
