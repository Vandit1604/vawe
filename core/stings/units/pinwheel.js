// core/stings/units/pinwheel.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 18)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* pinwheel, angular sweep, 3 arms (gl-transitions: pinwheel) */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float ang = fract((atan(d.y, d.x)/6.28318 + 0.5) * 3.0);
    c = vec4(vec3(1.0), step(ang, pp * 1.05) * bell);`;
export const blurb = 'an angular sweep with three arms rotating around the centre.';
