// core/stings/units/grain.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 3)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* film grain, dense fine specks */
    float g1 = hash(floor(uv*u_res*0.9) + floor(pp*40.0));
    float g2 = hash(floor(uv*u_res*0.9) + floor(pp*40.0) + 17.0);
    float sp = smoothstep(0.58, 1.0, g1) + 0.5*smoothstep(0.68, 1.0, g2);
    c = vec4(vec3(0.92), bell*0.55*sp);`;
export const blurb = 'dense fine film grain rising over the frame. Texture rather than event: use it under something else.';
export const aka = ['film grain', 'grain wash', 'noise texture'];
