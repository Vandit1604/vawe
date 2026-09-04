// core/stings/units/blinds.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 16)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* blinds, venetian bars open together (gl-transitions: windowblinds) */
    float local = fract(uv.y * 14.0), open = pp * 1.1;
    c = vec4(vec3(1.0), smoothstep(open + 0.05, open - 0.05, local) * bell);`;
export const blurb = 'venetian bars opening together. Mechanical and rhythmic.';
