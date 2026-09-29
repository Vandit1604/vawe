// core/stings/units/dispersion.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 31)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* dispersion. A spectral prism band sweeps the frame */
    float k = floor(hash(vec2(u_seed, 8.0)) * 2.0);   /* seed picks the sweep direction */
    float proj = (k < 1.0 ? (uv.x + uv.y*0.35) : (1.0 - uv.x + uv.y*0.35)) / 1.35;
    float band = proj - (pp*1.5 - 0.25);
    float w = fbm(vec2(proj*6.0, uv.y*3.0) + u_seed);
    float inb = smoothstep(0.3, 0.0, abs(band + (w - 0.5)*0.18));
    vec3 spec = 0.5 + 0.5*cos(6.2831*((band*3.0 + w*0.4) + vec3(0.0, 0.33, 0.67)));
    float shard = pow(0.5 + 0.5*sin((proj + w*0.2)*40.0), 3.0);   /* fine prism shards inside the band */
    c = vec4(mix(spec, vec3(1.0), 0.25), inb * (0.5 + 0.5*shard) * bell);`;
export const blurb = 'a spectral prism band sweeping the frame, splitting light into its colours as it passes.';
export const aka = ['prism dispersion', 'spectral band', 'light split sweep'];
