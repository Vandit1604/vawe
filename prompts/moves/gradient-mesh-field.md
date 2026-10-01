# Gradient mesh field

**Use when** a title and one line sit on a ground that must feel alive, as on a modern SaaS hero:
three or four soft colour pools drift on slow seeded paths and blend in one fragment shader, with a
fine grain on top so the gradient never bands. Text stays still; the ground is the only mover. Clip:
[gradient-mesh-field.mp4](gradient-mesh-field.mp4). Demo: [demo/gradient-mesh-field.html](demo/gradient-mesh-field.html).

```js
import '../../core/engine/page-api.js';
import { shaderField } from '../../core/surfaces/shader-field.js';
const css = getComputedStyle(document.documentElement);
const rgb = (name) => { const h = css.getPropertyValue(name).trim(); return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const frag = `
uniform vec3 u_ground, u_a, u_b;
float hash(float n) { return fract(sin(n * 12.9898 + u_seed * 78.233) * 43758.5453); }
float vnoise(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
vec2 wander(float k, vec2 home, float amp) {                  // a seeded path: smooth value noise in x and y
  float s = u_time * 0.45 + k * 19.7;
  return home + amp * 2.0 * vec2(vnoise(s) - 0.5, vnoise(s + 41.3) - 0.5);
}
float pool(vec2 p, vec2 c, float r) { vec2 d = (p - c) / r; return exp(-dot(d, d)); }
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = gl_FragCoord.xy / u_res.y;
  vec3 col = lin(u_ground), a = lin(u_a), b = lin(u_b);
  col = mix(col, a, 0.85 * pool(p, wander(0.0, vec2(0.30 * aspect, 0.22), 0.14), 0.62));
  col = mix(col, b, 0.26 * pool(p, wander(3.0, vec2(0.86 * aspect, 0.26), 0.12), 0.42));   // add pools the same way
  col = pow(col, vec3(1.0 / 2.2));
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  gl_FragColor = vec4(col + g * 0.035, 1.0);                  // static grain, about 4 levels of 255
}`;
const field = shaderField(frag, { seed: 7, uniforms: { u_ground: rgb('--ground'), u_a: rgb('--tile-alt'), u_b: rgb('--accent') } });
vawe.onFrame((t) => field.draw(t));                           // time is the seek, no loop of its own
```

Sound: none; a held ground is quiet, and a pad under it reads as a screensaver.

`shaderField` (`core/surfaces/shader-field.js`) mounts one canvas behind the page and draws it from
`vawe.onFrame` or `window.seek`; it adds `u_time` (the seek), `u_res` and `u_seed`, and any uniform
you pass. Colours come from the look's tokens, so the same shader re-colours with `data-look`. The
copy needs 4.5:1 on the lightest pixel it can meet, not on the average: the demo caps the pool
strengths (0.85, 0.58, 0.38, 0.26) and keeps the pale pools to the right, away from the text, and
measures 4.7:1 at the worst frame. Keep every pool's strength low where the text sits. Keep the
paths slow (a new direction every 2 s or more) and the amplitude under 15 percent of the frame
height, or the ground stops reading as light and starts to read as a screen saver. The grain is
static on purpose: grain that changes every frame shimmers in the encode. Use it under a held
title like [drift-hold](drift-hold.md); the hold still needs its own words-times-0.6 s.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
