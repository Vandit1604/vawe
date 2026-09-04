// core/stings/units/ridgedBurn.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 26)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* ridgedBurn, filament ember front sweeps up */
    float n = fbm(uv*4.0 + u_seed);
    float ridge = 1.0 - abs(2.0*n - 1.0);             /* fold the noise → sharp filaments */
    float field = (1.0 - uv.y)*0.6 + ridge*0.4;
    float d = field - (1.3*pp - 0.1);
    float burned = smoothstep(0.04, -0.02, d);
    float rim = smoothstep(0.09, 0.0, abs(d));
    float fil = pow(ridge, 4.0) * rim;                /* white-hot filament cores in the front */
    vec3 col = mix(vec3(0.04, 0.01, 0.0), vec3(1.0, 0.55, 0.1), rim) + vec3(1.0, 0.9, 0.6)*fil;
    c = vec4(col, max(burned*bell, rim*bell*0.95));`;
export const blurb = 'a filament ember front sweeping upward, like paper catching along a ragged edge.';
