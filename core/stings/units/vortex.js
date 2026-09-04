// core/stings/units/vortex.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 25)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* vortex, ink spiral pulls into a dark eye */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float r = length(d);
    float twist = bell * 7.0 * (1.0 - smoothstep(0.0, 0.9, r));
    float a0 = atan(d.y, d.x) + twist + u_seed;
    float arms = pow(0.5 + 0.5*sin(a0*3.0 + r*14.0), 3.0);
    float eye = smoothstep(0.30*bell, 0.0, r);
    float cover = smoothstep(0.9, 0.15, r) * bell;
    vec3 col = mix(vec3(0.02, 0.02, 0.03), vec3(0.85, 0.9, 1.0), arms*0.5 + eye*0.6);
    c = vec4(col, (arms*0.7 + eye*0.9) * cover);`;
export const blurb = 'an ink spiral pulling inward to a dark eye. A beat being swallowed rather than ended.';
