// core/stings/units/ink.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 5)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* ink bleed to near-black */
    float n = fbm(uv*5.0 + u_seed + 3.7);
    float a = smoothstep(n-0.14, n+0.14, bell*1.2);
    float rim = smoothstep(0.12, 0.0, abs(n - bell*1.2));
    c = vec4(mix(vec3(0.02, 0.015, 0.012), vec3(0.24, 0.1, 0.04), rim), a*0.96);`;
export const blurb = 'an ink bleed spreading to near-black. The dark twin of dissolve, for a beat that gets heavier.';
export const aka = ['ink bleed', 'ink spread', 'bleed to black'];
