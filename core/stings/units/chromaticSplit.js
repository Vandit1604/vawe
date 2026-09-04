// core/stings/units/chromaticSplit.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 30)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* chromaticSplit, rgb-fringed shock ring + edge fringe */
    float k = hash(vec2(u_seed, 6.0)) * 6.2831;
    vec2 off = vec2(cos(k), sin(k)) * 0.035 * bell;   /* channels tear apart mid-cut, reconverge */
    vec2 d0 = uv - 0.5; d0.x *= u_res.x/u_res.y;
    float edge = pp * 0.9;
    float rr = smoothstep(0.05, 0.0, abs(length(d0 + off) - edge));
    float gg = smoothstep(0.05, 0.0, abs(length(d0) - edge));
    float bb = smoothstep(0.05, 0.0, abs(length(d0 - off) - edge));
    float vr = smoothstep(0.45, 0.95, length(d0 + off*3.0));
    float vg = smoothstep(0.45, 0.95, length(d0));
    float vb = smoothstep(0.45, 0.95, length(d0 - off*3.0));
    vec3 col = vec3(rr + vr*0.6, gg + vg*0.6, bb + vb*0.6);
    c = vec4(col, (max(max(rr, gg), bb) + max(max(vr, vg), vb)*0.45) * bell);`;
export const blurb = 'an rgb-fringed shock ring with colour fringing at the edges. An impact with a lens defect.';
