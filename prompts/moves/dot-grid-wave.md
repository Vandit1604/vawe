# Dot grid wave

**Use when** a clean product or data frame needs a ground that moves but stays plain: a field of
dots, and one wave of scale and brightness that travels across it. It is SVG and CSS colour, no
shader, so a viewer can restyle it. The dots behind the copy stay small and pale. Clip:
[dot-grid-wave.mp4](dot-grid-wave.mp4). Demo: [demo/dot-grid-wave.html](demo/dot-grid-wave.html).

```js
import '../../core/engine/page-api.js';
const PITCH = 0.052, BASE = 0.0095, SPEED = 3.4;      // pitch and radius as shares of the frame height, wave in rad/s
const W = innerWidth, H = innerHeight;
const svg = document.getElementById('grid');          // <svg class="grid">, position: absolute; inset: 0
svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
svg.style.fill = getComputedStyle(document.documentElement).getPropertyValue('--accent');
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const dots = [];
for (let y = PITCH * H / 2; y < H; y += PITCH * H) {
  for (let x = PITCH * H / 2; x < W; x += PITCH * H) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
    svg.append(c);
    const zone = (1 - smooth(0.60 * W, 0.74 * W, x)) * (1 - smooth(0.30 * H, 0.40 * H, Math.abs(y - 0.5 * H)));   // the copy box
    dots.push({ c, nx: x / H, ny: y / H, keep: 1 - 0.8 * zone });                // the wave is 5 times weaker behind the copy
  }
}
vawe.onFrame((t) => {
  for (const d of dots) {
    const w = (0.5 + 0.5 * Math.sin(6.0 * (d.nx * 0.9 + d.ny * 0.45) - t * SPEED)) * d.keep;   // a plane wave, a pure function of t
    d.c.setAttribute('r', (BASE * H * (0.5 + 1.3 * w)).toFixed(2));
    d.c.setAttribute('opacity', (0.2 + 0.8 * w).toFixed(3));
  }
});
```

Sound: none; a held ground is quiet.

Measured on the 4 s demo clip at 640 x 360 on the `daylight` look: the mean luma change is 0.63 per
frame at 60 fps (0.46 once the copy has settled), and the worst contrast of navy ink against the
darkest pixel behind the text box is 6.9:1 over 12 frames. The first render ran at 2.4 rad/s and
measured 0.49 with 2.2:1 contrast: the wave reached full strength under the copy box, and indigo at full
opacity cannot sit under navy type. The `zone` term fixes that, and it must be wider than the text box
you can see, because the box measured from the frame is wider than the title. Do not animate `cx` or `cy`: a grid whose dots
move reads as a swarm, not a wave.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
