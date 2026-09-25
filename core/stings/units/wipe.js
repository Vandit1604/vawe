// core/stings/units/wipe.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 14)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* wipe, directional band sweeps across (gl-transitions: Directional) */
    float k = floor(hash(vec2(u_seed, 2.0)) * 4.0);   /* seed picks one of 4 cardinal directions */
    vec2 nd = k < 1.0 ? vec2(1.0, 0.0) : k < 2.0 ? vec2(-1.0, 0.0) : k < 3.0 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    float proj = dot(uv - 0.5, nd) + 0.5;
    float edge = pp * 1.2 - 0.1;
    c = vec4(vec3(1.0), smoothstep(edge + 0.14, edge, proj) * bell);`;
export const blurb = 'a directional band sweeping across the frame. The plainest geometric transition, and it always reads.';
export const aka = ['directional wipe', 'band wipe', 'sweep wipe'];
