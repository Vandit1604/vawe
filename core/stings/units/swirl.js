// core/stings/units/swirl.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 21)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* swirl, rotational light streaks from centre (gl-transitions: Swirl) */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float r = length(d);
    float a0 = atan(d.y, d.x) + (1.0 - smoothstep(0.0, 0.7, r)) * bell * 6.2831;
    c = vec4(vec3(1.0), pow(0.5 + 0.5*sin(a0 * 8.0), 4.0) * smoothstep(0.85, 0.0, r) * bell * 0.6);`;
export const blurb = 'rotational light streaks thrown out from the centre.';
