// core/stings/units/warp.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 12)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* barrel warp, expanding refraction shock ring */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float r = length(d);
    float edge = pp * 0.95;                            /* shock radius sweeps out past the corners */
    float ring = smoothstep(0.06, 0.0, abs(r - edge)); /* bright refraction front */
    float dark = smoothstep(0.16, 0.06, abs(r - edge)) * step(r, edge); /* compression darkens behind it */
    c = vec4(vec3(ring), (ring*0.8 + dark*0.35) * bell);`;
export const blurb = 'a barrel-warped refraction shock ring expanding outward. An impact felt through the lens.';
