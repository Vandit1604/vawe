// core/stings/units/domainWarp.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 23)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* domainWarp, liquid marble wash (fbm through fbm) */
    vec2 q = vec2(fbm(uv*3.0 + u_seed), fbm(uv*3.0 + u_seed + 7.3));
    float r = fbm(uv*3.0 + 3.5*q + u_seed);
    float a = smoothstep(r - 0.22, r + 0.22, bell*1.25);
    float rim = smoothstep(0.16, 0.0, abs(r - bell*1.25));
    vec3 hue;                                          /* marble veins take your palette, else seed hues */
    if (u_palN > 0) { hue = palAt(int(mod(floor(r*4.0), float(u_palN)))); }
    else { hue = 0.5 + 0.5*cos(6.2831*(r*0.5 + hash(vec2(u_seed, 9.1)) + vec3(0.0, 0.33, 0.67))); }
    c = vec4(mix(vec3(0.98), hue, 0.35 + 0.5*rim), a*0.95);`;
export const blurb = 'a liquid marble wash, noise folded through noise. Organic, slow, and unlike anything geometric here.';
export const aka = ['liquid marble', 'domain warp wash', 'marble noise'];
