// core/stings/units/circle.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 15)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* circle, disc expands from centre (gl-transitions: circleopen) */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    c = vec4(vec3(1.0), smoothstep(pp*0.95 + 0.08, pp*0.95, length(d)) * bell);`;
export const blurb = 'a disc expanding from the centre. Focus opening outward from one point.';
export const aka = ['circle reveal', 'iris expand', 'disc reveal'];
