# Flash cut

**Use when** a hard cut lands on a beat and should hit. A white frame peaks for about three frames
and the scene changes inside the peak, so the viewer never sees the cut, only the exposure falling
away on the new shot. The new shot starts over-bright (`brightness(2.4)`) and 1.06x, and both settle
with the flash. Clip: [flash-cut.mp4](flash-cut.mp4). Demo: [demo/flash-cut.html](demo/flash-cut.html).

```js
import { EASE } from '../../core/motion/presets.js';
const beat = 500, cutAt = beat + 20;   // ms; the cut is inside the peak
flash.animate(
  [{ opacity: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 1, offset: 0.16, easing: EASE.leave }, { opacity: 0 }],
  { duration: 420, delay: beat, fill: 'both' });
shotB.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: cutAt, fill: 'both' });
shotA.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, delay: cutAt, fill: 'both' });
shotB.animate([{ filter: 'brightness(2.4)', scale: 1.06 }, { filter: 'brightness(1)', scale: 1 }],
  { duration: 700, delay: cutAt, easing: EASE.land, fill: 'both' });
```

```html
<meta name="blank" content="0.52-0.58">   <!-- the renderer flags an all-white frame; declare it -->
```

Sound: swell at -0.20 s into the move, 0.72 s before the cut at 0.52 s, so it stops dead on the cut (default gain); this is the film's one swell, so use it on one flash only.

One frame up (0.04 of 420 ms), about three frames held, then a long tail: the fall is what makes it
read as light and not as a white slide. Held for 6 frames or more it is a strobe. Use it once or
twice a film, on the strongest beats only; a flash on every cut is a tell. Give shot A a little
motion up to the flash (the card drifts 2 vw) so the last frame before it is not a still.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
