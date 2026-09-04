// core/stings/units/scan.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 11)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* scanline sweep, CRT band + trailing glow + lines */
    float band = smoothstep(0.055, 0.0, abs(uv.y - pp));
    float trail = smoothstep(0.3, 0.0, pp - uv.y) * step(uv.y, pp);    /* glow trailing the band */
    float lines = (0.5 + 0.5*sin(uv.y * u_res.y * 0.5)) * 0.10;        /* CRT scanlines */
    c = vec4(vec3(1.0), (band*0.85 + trail*0.28 + lines*bell) * bell);`;
export const blurb = 'a CRT scanline band sweeping through, with a trailing glow. Terminal, monitor, surveillance.';
