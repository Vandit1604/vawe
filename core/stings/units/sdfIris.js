// core/stings/units/sdfIris.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 24)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* sdfIris, iris wipe through a seeded shape */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float ang = atan(d.y, d.x);
    float k = floor(hash(vec2(u_seed, 11.0)) * 4.0);  /* star / hex / diamond / triangle */
    float n = k < 1.0 ? 5.0 : k < 2.0 ? 6.0 : k < 3.0 ? 4.0 : 3.0;
    float pinch = k < 1.0 ? 0.35 : 0.12;              /* star lobes cut deep, polygons stay taut */
    float rr = length(d) * (1.0 + pinch * (0.5 + 0.5*cos(ang*n + u_seed)));
    float front = pp * 1.1;
    float rim = smoothstep(0.05, 0.0, abs(rr - front));
    c = vec4(vec3(1.0), (smoothstep(front + 0.07, front, rr)*0.95 + rim*0.5) * bell);`;
export const blurb = 'an iris wipe through a seeded shape, so the aperture is not simply a circle. Focus, with character.';
