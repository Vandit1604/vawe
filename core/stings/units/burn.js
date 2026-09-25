// core/stings/units/burn.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 1)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* film burn */
    float n = fbm(uv*3.0 + u_seed);
    float front = 1.25*pp - 0.12;
    float d = n - front;
    float burned = smoothstep(0.05, -0.02, d);
    float rim = smoothstep(0.10, 0.0, abs(d));
    vec3 ember = vec3(1.0, 0.42, 0.08);
    vec3 col = mix(vec3(0.03, 0.012, 0.004), ember, rim);
    float a = max(burned*bell, rim*bell*0.95);
    c = vec4(col, a);`;
export const blurb = 'a film burn: the frame chars through and blows out, the way heat eats a print. Warm, analogue, and loud.';
export const aka = ['film burn', 'burn transition', 'flare burn'];
