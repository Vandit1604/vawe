// core/stings/units/pixel.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 8)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* pixelate, chunky mosaic fills then clears */
    float px = 30.0;
    vec2 cell = floor(uv * vec2(px*u_res.x/u_res.y, px));
    float cover = step(hash(cell), bell*1.15);                         /* more blocks as bell rises */
    float shade = mix(0.32, 1.0, hash(cell + 3.1));
    c = vec4(vec3(shade), cover * bell * 0.82);`;
export const blurb = 'a chunky mosaic that fills the frame and then clears. Reads as resolution being lost and regained.';
