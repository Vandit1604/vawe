// core/stings/units/squares.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 17)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* squares, grid cells fill in, staggered (gl-transitions: GridFlip) */
    vec2 cell = floor(uv * vec2(20.0*u_res.x/u_res.y, 20.0));
    float delay = hash(cell) * 0.55;
    c = vec4(vec3(1.0), smoothstep(delay, delay + 0.12, pp) * bell);`;
export const blurb = 'grid cells filling in on a stagger. Modular, and it suits a layout that is already a grid.';
export const aka = ['grid reveal', 'square tiles', 'mosaic grid'];
