// core/stings/units/lens.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 27)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* lens, flare: hot core, ghosts down the axis, anamorphic streak */
    vec2 lp = vec2(0.2 + 0.6*hash(vec2(u_seed, 1.0)), 0.25 + 0.5*hash(vec2(u_seed, 2.0)));
    vec2 d = uv - lp; d.x *= u_res.x/u_res.y;
    float core = smoothstep(0.22, 0.0, length(d));
    float streakH = smoothstep(0.012 + 0.05*core, 0.0, abs(uv.y - lp.y)) * smoothstep(0.75, 0.1, abs(uv.x - lp.x));
    vec2 axis = vec2(0.5, 0.5) - lp;                  /* ghost discs march through frame centre */
    float ghosts = 0.0;
    for (int i = 1; i <= 4; i++) {
      float fi = float(i);
      vec2 gd = uv - (lp + axis * 0.55 * fi); gd.x *= u_res.x/u_res.y;
      float grad = 0.02 + 0.022*fi;
      ghosts += smoothstep(grad, grad*0.45, length(gd)) * (0.45 - 0.07*fi);
    }
    vec3 col = vec3(1.0)*core + vec3(0.6, 0.8, 1.0)*streakH + vec3(0.9, 0.7, 1.0)*ghosts;
    c = vec4(col, (core*0.9 + streakH*0.6 + ghosts*0.8) * bell);`;
export const blurb = 'a full anamorphic flare: hot core, ghosts down the axis, a horizontal streak. Cinematic and very loud.';
