// core/stings/units/polka.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 20)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* polka, dot curtain grows to cover (gl-transitions: PolkaDotsCurtain) */
    vec2 cell = fract(uv * vec2(12.0*u_res.x/u_res.y, 12.0)) - 0.5;
    c = vec4(vec3(1.0), smoothstep(pp*0.72, pp*0.72 - 0.12, length(cell)) * bell);`;
export const blurb = 'a curtain of dots growing until they cover the frame.';
