// core/stings/units/ripple.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 10)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* ripple rings, expand across the whole frame */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float r = length(d);
    float front = pp * 1.5;                            /* wavefront sweeps past the corners */
    float rings = sin((r - front) * 42.0);
    float behind = smoothstep(front, front - 0.55, r);  /* rings live behind the expanding front */
    float env = smoothstep(0.0, 0.12, pp) * smoothstep(1.0, 0.62, pp);
    c = vec4(vec3(1.0), max(0.0, rings) * behind * env * 0.5);`;
export const blurb = 'concentric rings expanding across the whole frame, like a struck water surface.';
