# Halftone field

**Use when** a physical, printed or retro frame needs a ground that moves without a single object
moving: a 45 degree dot screen whose dots swell and shrink in a wave that travels across the frame.
The dot centres never move, only the radii change, so the type on top reads as fixed. Clip:
[halftone-field.mp4](halftone-field.mp4). Demo: [demo/halftone-field.html](demo/halftone-field.html).

```js
import '../../core/engine/page-api.js';
import { shaderField } from '../../core/surfaces/shader-field.js';
const css = getComputedStyle(document.documentElement);
const rgb = (name) => { const h = css.getPropertyValue(name).trim(); return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const frag = `
uniform vec3 u_ground, u_dot, u_faint, u_accent;
const float CELL = 0.032;                                      // dot pitch as a share of the frame height
void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = gl_FragCoord.xy / u_res.y;
  vec2 g = vec2(p.x + p.y, p.y - p.x) * 0.7071 / CELL;         // rotate the screen 45 degrees
  vec2 id = floor(g), f = fract(g) - 0.5;
  vec2 c = (id + 0.5) * CELL;                                  // the wave reads the cell centre, so a dot is one size
  vec2 cp = vec2(c.x - c.y, c.x + c.y) * 0.7071;
  float wave = 0.5 + 0.5 * sin(4.0 * cp.x + 1.6 * cp.y - u_time * 3.2 + u_seed);   // a plane wave, 0.5 cycles a second
  float keep = 1.0 - 0.45 * smoothstep(0.80 * aspect, 0.56 * aspect, cp.x);          // smaller dots behind the copy
  float radius = mix(0.10, 0.50, wave) * keep;                 // 0.5 is the cell edge: dots never merge
  float aa = 1.0 / (u_res.y * CELL);                           // one pixel, in cell units
  vec3 ink = mix(u_dot, u_faint, 0.25);
  ink = mix(ink, u_accent, 0.5 * smoothstep(0.72 * aspect, 0.94 * aspect, cp.x));   // half way to the accent, away from the copy
  gl_FragColor = vec4(mix(u_ground, ink, smoothstep(radius + aa, radius - aa, length(f))), 1.0);
}`;
const field = shaderField(frag, { seed: 2, uniforms: { u_ground: rgb('--ground'), u_dot: rgb('--dot'), u_faint: rgb('--faint'), u_accent: rgb('--accent') } });
vawe.onFrame((t) => field.draw(t));                            // time is the seek
```

Sound: none; a held ground is quiet.

Measured on the 4 s demo clip at 640 x 360 on the `chrome` look: the mean luma change is 0.62 per
frame at 60 fps (0.43 once the copy has settled), and the worst contrast of the ink against the lightest
and darkest pixel behind the text box is 4.7:1 over 12 frames. Dark ink sets the limit here: the dot
tone must stay light, so the mix toward `--faint` is 25 percent; at 30 percent the worst frame
fell to 4.55:1. A full-strength accent made the right edge a block of orange that pulled the eye, so
the accent is a half mix, and only right of the copy. The luma change follows the tone gap between dot
and ground as much as the wave speed: a paler dot made up for a faster wave (0.65 at 2.4 rad/s with
30 percent, 0.62 at 3.2 rad/s with 25 percent).

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
