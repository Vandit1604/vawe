// core/stings/units/doors.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 19)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* doors, panels close from both sides (gl-transitions: DoorWay) */
    float hx = abs(uv.x - 0.5), close = pp * 0.5;
    c = vec4(vec3(1.0), smoothstep(0.5 - close - 0.03, 0.5 - close, hx) * bell);`;
export const blurb = 'panels closing in from both sides to meet in the middle.';
