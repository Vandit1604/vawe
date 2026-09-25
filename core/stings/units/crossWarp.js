// core/stings/units/crossWarp.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 22)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* crossWarp, noise-smeared directional veil */
    float k = floor(hash(vec2(u_seed, 5.0)) * 4.0);   /* seed picks one of 4 cardinal directions */
    vec2 nd = k < 1.0 ? vec2(1.0, 0.0) : k < 2.0 ? vec2(-1.0, 0.0) : k < 3.0 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    float w = fbm(uv*4.0 + u_seed);
    float proj = dot(uv - 0.5, nd) + 0.5 + (w - 0.5)*0.35;   /* the wipe edge is dragged by noise */
    float edge = pp * 1.5 - 0.25;
    float a = smoothstep(edge + 0.22, edge, proj);
    float rim = smoothstep(0.10, 0.0, abs(proj - edge - 0.11));
    c = vec4(vec3(1.0), (a*0.92 + rim*0.5) * bell);`;
export const blurb = 'a noise-smeared directional veil dragging the frame sideways as it goes.';
export const aka = ['cross warp', 'directional veil', 'noise smear'];
