// core/stings/units/thermal.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 28)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* thermal, iron-bow heat veil, coarse cells */
    vec2 cell = floor(uv * vec2(96.0*u_res.x/u_res.y, 96.0)) / 96.0;
    float heat = fbm(cell*3.0 + u_seed) * (0.6 + 0.55*bell);
    vec3 col = mix(vec3(0.05, 0.0, 0.12), vec3(0.55, 0.0, 0.55), smoothstep(0.0, 0.35, heat));
    col = mix(col, vec3(0.95, 0.35, 0.05), smoothstep(0.35, 0.62, heat));
    col = mix(col, vec3(1.0, 0.85, 0.25), smoothstep(0.62, 0.8, heat));
    col = mix(col, vec3(1.0), smoothstep(0.8, 0.95, heat));
    float sweep = smoothstep(0.05, 0.0, abs(uv.y - (1.0 - pp)));   /* sensor line rides the cut */
    c = vec4(col + vec3(0.2)*sweep, (0.85*smoothstep(0.15, 0.45, heat) + sweep*0.3) * bell);`;
export const blurb = 'an iron-bow heat veil in coarse cells, colour mapped from luminance rather than painted on.';
