// core/stings/units/whipPan.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 29)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* whipPan, horizontal smear streaks race the cut */
    float dir = hash(vec2(u_seed, 4.0)) < 0.5 ? -1.0 : 1.0;
    float n1 = vnoise(vec2(uv.x*2.2 - dir*pp*7.0, uv.y*90.0) + u_seed);
    float n2 = vnoise(vec2(uv.x*5.0 - dir*pp*11.0, uv.y*160.0) + u_seed*1.7);
    float streaks = 0.6*n1 + 0.4*n2;                  /* low-freq x, high-freq y = long smears */
    float body = smoothstep(0.35, 0.85, streaks);
    c = vec4(vec3(0.92, 0.95, 1.0)*(0.55 + 0.45*streaks), body * bell * 0.9);`;
export const blurb = 'horizontal smear streaks racing across, as if the camera whipped sideways. Energy carried into a payoff.';
