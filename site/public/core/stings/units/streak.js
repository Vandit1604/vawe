// core/stings/units/streak.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 7)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* light streaks, sharp radial rays + hot core */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float ang = atan(d.y, d.x);
    float r = length(d);
    float rays = pow(0.5 + 0.5*sin(ang*9.0 + u_seed*6.28), 6.0);       /* many fine rays */
    rays += pow(0.5 + 0.5*sin(ang*2.0 + 1.57), 26.0) * 1.4;            /* 2 dominant anamorphic streaks */
    float core = smoothstep(0.16, 0.0, r);                             /* bright hot centre */
    float fall = smoothstep(0.95, 0.04, r);                            /* reach the edges then fade */
    c = vec4(vec3(1.0), (rays*fall*0.5 + core*0.85) * bell);`;
export const blurb = 'sharp radial light rays from a hot core. Photographic rather than digital: a lens catching a source.';
export const aka = ['light streaks', 'lens streak', 'radial streak'];
