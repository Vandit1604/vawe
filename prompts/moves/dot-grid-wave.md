# Dot grid wave

**Use when** a clean product or data frame needs a ground that reads as a fine texture and shows a
wave only when it passes: a field of 2 to 3 px dots on a 22 px pitch (at 1080 p), and one soft wave of
scale and opacity that travels across it. It is SVG with the look's ink, no shader. The dots behind the
copy fade to a quarter. Clip:
[dot-grid-wave.mp4](dot-grid-wave.mp4). Demo: [demo/dot-grid-wave.html](demo/dot-grid-wave.html).

```js
import '../../core/engine/page-api.js';
const PITCH = 0.021, BASE = 0.0011, SPEED = 1.7;      // pitch (22 px at 1080) and radius (1.2 px) as shares of the frame height
const W = innerWidth, H = innerHeight;
const svg = document.getElementById('grid');          // <svg class="grid">, position: absolute; inset: 0
svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
svg.style.fill = getComputedStyle(document.documentElement).getPropertyValue('--ink');
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const dots = [];
for (let y = PITCH * H / 2; y < H; y += PITCH * H) {
  for (let x = PITCH * H / 2; x < W; x += PITCH * H) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
    svg.append(c);
    const zone = (1 - smooth(0.60 * W, 0.74 * W, x)) * (1 - smooth(0.30 * H, 0.40 * H, Math.abs(y - 0.5 * H)));   // the copy box
    dots.push({ c, nx: x / H, ny: y / H, keep: 1 - 0.75 * zone });               // a quarter of the opacity behind the copy
  }
}
vawe.onFrame((t) => {
  for (const d of dots) {
    const w = (0.5 + 0.5 * Math.sin(2.4 * (d.nx * 0.9 + d.ny * 0.45) - t * SPEED));   // a long plane wave, a pure function of t
    d.c.setAttribute('r', (BASE * H * (1 + 0.5 * w)).toFixed(2));
    d.c.setAttribute('opacity', (d.keep * (0.10 + 0.42 * w)).toFixed(3));
  }
});
```

Sound: none; a held ground is quiet.

Owner feedback on the first version ("dot backgrounds I don't like, too big dots") rebuilt this move.
The first version had 7 px dots on a 37 px pitch in the accent colour. This one has 2.4 to 3.6 px dots
(0.22 to 0.33 percent of the frame height) on a 22 px pitch at 1080, in the look's ink at 10 percent
opacity at rest and 52 at the crest. Taken from `zeke/swiss-design`: opacity, not a second hue, makes
the hierarchy; from `mengto/container-lines`: structure drawn thin and at low opacity, behind the
content. `demo/demo.css` tokens won where they differed.

Measured on the 4 s demo clip at 640 x 360 on the `daylight` look: the mean luma change is 0.18 per
frame at 60 fps and about 0 once the copy has settled, below the 0.5 to 3.0 band. That is the cost of
a fine texture: the dots cover under 2 percent of the frame, so the wave shows as a slow tide of
opacity, which a viewer sees on a full-size frame and the luma number does not catch. The worst
contrast of navy ink against the darkest pixel behind the text box is 9.5:1. Do not animate `cx` or
`cy`: a grid whose dots move reads as a swarm, not a wave.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
