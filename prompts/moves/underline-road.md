# Underline road

**Use when** a headline is about a way to somewhere and the next scene is a map: the underline under the key word extends past the line, bends down, and becomes the route on a simple map. The underline is the shared element, one stroke from the first frame to the last, and the camera follows its head down the page into the map. There is no cut and no crossfade. The detail that sells it is the camera: it trails the head at the same speed while the line runs down, so the viewer never sees a seam, and it stops when the map ends. Clip: [underline-road.mp4](underline-road.mp4). Demo: [demo/underline-road.html](demo/underline-road.html).

```js
import '../../core/engine/page-api.js';
import { easeFn } from '../../core/motion/presets.js';
const land = easeFn('land'), swap = easeFn('swap');
const T_UL = 0.35, D_UL = 0.4, T_GO = 1.05, D_GO = 1.8, k = 0.09 * H;
const sp = (x) => k * Math.log(1 + Math.exp(x / k));                 // a soft max(x, 0): the camera starts and stops without a kink
const stops = (x0, y0) => [[x0, y0], [XS[5], y0], [XS[5], YS[2]], [XS[3], YS[2]], [XS[3], DEST.y], [DEST.x, DEST.y]];   // street centres
vawe.onFrame((t) => {
  world.style.translate = '0 0';                                     // measure the word before the camera moves
  const r = word.getBoundingClientRect();
  route.setAttribute('d', rounded(stops(r.left, r.bottom - 0.1 * r.height), 3.2 * u));   // corners are quadratic curves, radius 3.2 u
  const total = route.getTotalLength(), under = r.width, go = clamp((t - T_GO) / D_GO);
  const s = t < T_GO ? under * land(clamp((t - T_UL) / D_UL)) : under + (total - under) * (0.5 * go + 0.5 * swap(go));
  route.style.strokeDasharray = `${total} ${total}`; route.style.strokeDashoffset = total - s;
  const head = route.getPointAtLength(Math.min(s, total));
  const x = head.y - 0.55 * H;
  world.style.translate = `0 ${-(sp(x) - sp(x - 1.1 * H))}px`;       // follow the head from 55 percent of the frame, stop at 1.1 frames
});
```

Sound: none; the pin landing at the end is the one point a cue could use.

- One world, 2.5 frames tall: scene A at the top, the map below, one stroke over both. Z-order: map under, headline copy, route, pin, ETA card. The map blocks fade in over the first 28 vh of their own height with a static gradient mask, so the map has no top edge.
- The route follows street centres, and the streets are gaps of 3.4 u between blocks, so the line runs inside a road. The stroke is 1.1 u for the whole length: an underline and a route are the same line.
- The head runs half linear, half `EASE.swap`: no stop at the bend, a soft arrival at the pin. The camera velocity equals the head's down the vertical run, which keeps the head at 55 percent of the frame height.
- Cause before effect: the underline draws under the word and holds 0.3 s so the word is read, then the line runs. The pin pops on `EASE.pop` when the head arrives and one ring leaves it; the ETA card rises 0.15 s later.
- What goes wrong: a camera that eases on its own curve falls behind the head or passes it, and the line looks like it is sliding on the page. Measuring the word while the world is translated shifts the underline by the camera offset, so measure first. A map drawn with a visible first row below scene A reads as a second slide, not the same place.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
