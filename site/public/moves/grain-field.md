# Grain field

**Use when** a quiet, printed or filmic frame must breathe: a slow tonal ground, two soft patches of
tone that wander, and fine film grain that turns over 24 times a second on top. The type stays clean.
The grain is a hash of the pixel cell and the frame number, taken from the seek time, so every render
draws the same grain. Clip: [grain-field.mp4](grain-field.mp4). Demo:
[demo/grain-field.html](demo/grain-field.html).

```js
import '../../core/engine/page-api.js';
import { shaderField } from '../../core/surfaces/shader-field.js';
const css = getComputedStyle(document.documentElement);
const rgb = (name) => { const h = css.getPropertyValue(name).trim(); return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const frag = `
uniform vec3 u_ground, u_raised, u_accent;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + u_seed * 17.0) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 p = gl_FragCoord.xy / u_res.y;
  float tone = 0.6 * vnoise(p * 1.6 + vec2(u_time * 0.45, -u_time * 0.3))      // two layers of slow tone
             + 0.4 * vnoise(p * 3.0 - vec2(u_time * 0.25, u_time * 0.55));
  vec3 col = mix(u_ground, u_raised, smoothstep(0.30, 0.70, tone));
  col = mix(col, u_accent, 0.07 * smoothstep(0.55, 0.85, tone));                // a trace of the accent in the warm patches
  float frame = floor(u_time * 24.0 + 0.001);                                    // grain turns over at 24 fps, from the seek
  vec2 cell = floor(gl_FragCoord.xy / 2.0) + vec2(frame * 17.31, frame * 5.77);  // a 2 px grain
  float grain = hash(cell) + hash(cell + 41.7) - 1.0;                            // two hashes: a triangular spread, no hard speckle
  gl_FragColor = vec4(col + grain * 0.035, 1.0);
}`;
const field = shaderField(frag, { seed: 5, uniforms: { u_ground: rgb('--ground'), u_raised: rgb('--raised'), u_accent: rgb('--accent') } });
vawe.onFrame((t) => field.draw(t));                                              // never Math.random: the virtual clock owns it
```

Sound: none; a held ground is quiet.

Measured on the 4 s demo clip at 640 x 360 on the `paper` look: the mean luma change is 0.95 per
frame at 60 fps, 0.8 once the copy has settled. The grain gives most of it, so the number moves with
the grain amplitude (0.035 here, about 9 levels of 255) and the grain rate: grain at 60 fps doubles the
change and starts to shimmer. A 2 px cell survives the 640 px downscale and the encode; 1 px cells
vanish in it. The worst contrast of the ink against the lightest and darkest pixel behind the text box
is 10.2:1 over 12 frames. Keep the two tones within a few percent of each other: the ground moves in
tone, never in shape, so it does not pull the eye from the line. Never seed the grain with
`Math.random`: the page clock replaces it, and a grain built from earlier frames breaks the seek.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
