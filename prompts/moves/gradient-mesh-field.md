# Gradient mesh field

**Use when** a title and one line sit on a ground that must visibly flow, as on a modern SaaS hero:
four soft colour pools orbit across the frame, pull together at a beat and turn from the look's second
colour into its accent, blended in one fragment shader with a fine grain on top so the gradient never
bands. The copy enters with a masked rise and a blur cascade over the moving ground. Clip:
[gradient-mesh-field.mp4](gradient-mesh-field.mp4). Demo: [demo/gradient-mesh-field.html](demo/gradient-mesh-field.html).

```js
import '../../core/engine/page-api.js';
import { shaderField } from '../../core/surfaces/shader-field.js';
const css = getComputedStyle(document.documentElement);
const rgb = (name) => { const h = css.getPropertyValue(name).trim(); return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const frag = `
uniform vec3 u_ground, u_a, u_b;
const float MERGE = 1.5, MERGED = 2.6;                          // the beat: pools pull together and turn to the accent
float hash(float n) { return fract(sin(n * 12.9898 + u_seed * 78.233) * 43758.5453); }
vec2 orbit(float k, vec2 home, vec2 amp, float speed) {         // a seeded loop, a different period per pool
  float a = u_time * speed + hash(k) * 6.2832;
  return home + amp * vec2(cos(a), sin(a * 0.8 + k));
}
float pool(vec2 p, vec2 c, float r) { vec2 d = (p - c) / r; return exp(-dot(d, d)); }
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = gl_FragCoord.xy / u_res.y;
  float m = smoothstep(MERGE, MERGED, u_time);
  vec3 ground = lin(u_ground), a = lin(u_a), b = lin(u_b);
  vec2 goal = vec2(0.84 * aspect, 0.5);
  vec2 c0 = mix(orbit(0.0, vec2(0.40 * aspect, 0.30), vec2(0.34 * aspect, 0.30), 2.10), goal, m);
  vec3 col = mix(ground, mix(a, b, m), 0.85 * pool(p, c0, mix(0.50, 0.40, m)));   // add pools the same way
  float keep = 1.0 - 0.75 * smoothstep(0.80 * aspect, 0.60 * aspect, p.x);        // lights fade out behind the copy
  col = mix(ground, col, keep);
  col = pow(col, vec3(1.0 / 2.2));
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  gl_FragColor = vec4(col + g * 0.035, 1.0);                    // static grain, about 4 levels of 255
}`;
const field = shaderField(frag, { seed: 7, uniforms: { u_ground: rgb('--ground'), u_a: rgb('--tile-alt'), u_b: rgb('--accent') } });
vawe.onFrame((t) => field.draw(t));                           // time is the seek, no loop of its own
```

The title lines use the [mask-rise](mask-rise.md) box and the lead uses the
[blur-word-cascade](blur-word-cascade.md) spans; the demo shows both.

Sound: none; a held ground is quiet, and a pad under it reads as a screensaver.

`shaderField` (`core/surfaces/shader-field.js`) mounts one canvas behind the page and draws it from
`vawe.onFrame` or `window.seek`; it adds `u_time` (the seek), `u_res` and `u_seed`, and any uniform
you pass. Colours come from the look's tokens, so the same shader re-colours with `data-look`.

Measured on the 3 s demo clip at 640 x 360 (script in the move's review notes): the violet pools
travel 2.0 frame widths along their paths and the mint pools 1.1, against a target of 0.25; the mean
frame colour moves 68 RGB units between the first and last frame, so the palette visibly changes
state; the mean luma change per frame is 0.9, so judge flow by pool travel, not by that number.
Orbit speeds of 1.5 to 2.4 rad/s with amplitudes of 0.3 of the frame width make the flow read in
3 s; the old seeded wander (0.45 per second, amplitude 0.14 of the height) moved a pool 0.1 frame
widths and read as a still. The copy needs 4.5:1 on the brightest pixel behind it, not on the
average: the `keep` term fades every pool to 25 percent behind the left 60 percent of the frame,
and the worst frame measures 5.5:1 (white on the brightest background pixel in the copy box).
Never let the accent pool reach text set in the accent colour; keep the headline white. The grain
is static on purpose: grain that changes every frame shimmers in the encode. Use it under a held
title like [drift-hold](drift-hold.md); the hold still needs its own words-times-0.6 s.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
