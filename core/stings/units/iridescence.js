// core/stings/units/iridescence.js: one sting fx, extracted verbatim from the shared shader.
// glsl: the exact GLSL block that ran inside `else if (u_fx == 33)` in the old monolith.
// blurb: the catalog line core/registry.js refuses to boot without.
export const glsl = `                             /* iridescence, thin-film interference sheen */
    /* Hue as a function of a fake view angle: the film's optical thickness varies across the frame, so
       the wavelength that constructively interferes shifts and the sheen travels. The companion to the
       shipped 'dispersion', which splits a beam; this one COATS. Pure in (uv, pp).
       NOTE: no backticks in here - the whole shader is a JS template literal and one would end it. */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float view = length(d) * 2.2 + (uv.x + uv.y) * 0.35;   /* stand-in for the angle of incidence */
    float film = view * 9.0 - pp * 6.2831;                 /* thickness sweeps with progress */
    vec3 sheen = 0.5 + 0.5 * cos(vec3(film, film + 2.094, film + 4.188));
    float band = smoothstep(0.0, 0.45, pp) * smoothstep(1.0, 0.55, pp);  /* rises and leaves */
    c = vec4(sheen, band * bell * 0.55 * smoothstep(1.15, 0.15, length(d)));`;
export const blurb = 'a thin-film interference sheen, the colour of oil on water shifting with angle.';
