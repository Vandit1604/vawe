// core/stings/units/dissolve.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 4)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* dissolve to white */
    float n = fbm(uv*6.0 + u_seed);
    float a = smoothstep(n-0.18, n+0.18, bell*1.15);
    c = vec4(vec3(1.0), a*0.95);`;
export const blurb = 'the frame dissolves away to white. A clean act break when the next beat starts bright.';
export const aka = ['dissolve to white', 'white dissolve', 'wash to white'];
