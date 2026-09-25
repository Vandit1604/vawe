// core/stings/units/gridPixelateWipe.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 32)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* gridPixelateWipe, chunky pixel blocks sweep a diagonal, each a quantised block tint */
    vec2 grid = vec2(26.0*u_res.x/u_res.y, 26.0);
    vec2 cell = floor(uv * grid);
    vec2 cc = (cell + 0.5) / grid;
    float diag = (cc.x + cc.y) * 0.5;                  /* 0..1 diagonal wipe front */
    float jit = hash(cell) * 0.10;                     /* per-cell grain roughens the front → pixel-art edge */
    float on = smoothstep(diag + jit + 0.05, diag + jit, pp * 1.2);
    float q = floor(hash(cell + 7.0) * 3.0 + 1.0) / 3.0;   /* 3 quantised brightness blocks (u_tint recolours) */
    c = vec4(vec3(q), on * bell);`;
export const blurb = 'chunky pixel blocks sweeping a diagonal, each block a quantised tint. A wipe and a pixelate at once.';
export const aka = ['pixelated wipe', 'grid pixelate', 'blocky diagonal wipe'];
