// core/stings/units/glitch.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 6)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                              /* rgb glitch, channel-split displaced bars */
    float row = floor(uv.y*44.0);
    float stp = floor(pp*16.0);
    float on = step(0.66, hash(vec2(row, stp)));       /* which rows tear this step */
    float sh = (hash(vec2(row+9.0, stp)) - 0.5) * 0.16 * on;   /* per-row horizontal shift */
    float rc = step(0.45, hash(vec2(floor((uv.x+sh+0.014)*72.0), row+stp)));
    float gc = step(0.45, hash(vec2(floor((uv.x+sh)*72.0),        row+stp+3.0)));
    float bc = step(0.45, hash(vec2(floor((uv.x+sh-0.014)*72.0), row+stp+7.0)));
    vec3 col = vec3(rc, gc, bc);
    float a = on * max(rc, max(gc, bc)) * bell * 0.9;
    c = vec4(col, a);`;
export const blurb = 'rgb channel split into displaced bars. Digital failure, interference, a system under strain.';
export const aka = ['digital glitch', 'rgb split', 'channel split glitch'];
