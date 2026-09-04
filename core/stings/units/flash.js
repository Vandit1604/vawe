// core/stings/units/flash.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 0)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                                     /* flash */
    float v = 1.0 - 0.55*length(uv-0.5);
    c = vec4(vec3(1.0), bell*bell*v);`;
export const blurb = 'a single hard white flash across the whole frame. The bluntest cut cover there is, and the one to use when the two shots have nothing in common.';
