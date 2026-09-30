# Grid stagger wave

**Use when** a title should arrive with "many things" around it (integrations, features, customers):
the title tile is there from frame 0, and a grid of tiles enters around it in a wave by distance
from the title's centre, 70 ms per tile of distance. The detail that sells it is that the wave
pushes: each tile starts pulled 30 percent of a tile toward the source and at 0.55 scale, and the
front shoves it out to its cell on a spring. A delay by row or column reads as a typewriter; a delay
by Euclidean distance reads as one ring spreading. Clip: [grid-stagger-wave.mp4](grid-stagger-wave.mp4).
Demo: [demo/grid-stagger-wave.html](demo/grid-stagger-wave.html).

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.spring);
const src = { c: 2.5, r: 1.5 }, STEP = 70, T0 = 140;   // source in tile units (the title's centre); ms per tile of distance
tiles.forEach((tile) => {                               // tile.c, tile.r: its column and row
  const dx = tile.c - src.c, dy = tile.r - src.r, d = Math.hypot(dx, dy);
  tile.el.animate([{ translate: `${(-dx / d) * 30}% ${(-dy / d) * 30}%`, scale: 0.55 }, { translate: '0 0', scale: 1 }],
    { duration: 520, delay: T0 + d * STEP, easing: settle, fill: 'both' });
  tile.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: T0 + d * STEP, easing: 'linear', fill: 'both' });
});
title.animate([{ scale: 0.9 }, { scale: 1 }], { duration: 420, easing: curveToLinear(CURVES.expoOut), fill: 'both' });
grid.animate([{ scale: 1 }, { scale: 1.025 }], { duration: 1600, easing: 'linear', fill: 'both' });   // keeps the full grid alive
```

Sound: droplet at 0.14 s into the move, when the first tiles leave the title (default gain); no tick per tile.

70 ms per tile keeps the neighbours of one tile 30 to 80 ms apart (the stagger band) and puts the
farthest corner, about 5.7 tiles out, at 0.54 s. Under 40 ms the wave lands as one block; over 100
ms the far corner arrives after the viewer has read the title. The opacity runs 120 ms, far shorter
than the move, so the tile is seen travelling. Put the source on the thing the viewer should read,
off-centre; a wave from the frame centre points at nothing.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
