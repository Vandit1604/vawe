# Direction wipe

**Use when** the thing on screen moves and the next beat should arrive along the same line: a bar
sweeping right wipes in the next world from the left edge of its path, so the cut reads as the
movement continuing. A fade or a wipe against the movement reads as a second event.

```js
import { EASE } from '../../core/motion/presets.js';
// the old world's motion ends moving right; the next world is revealed by a mask edge that moves right too
const next = document.querySelector('[data-world="b"]');
next.style.clipPath = 'inset(0 100% 0 0)';
next.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
  { delay: 2000, duration: 450, easing: EASE.carry, fill: 'both' });
// the leading edge carries a thin line of the accent so the eye sees what moved
edge.animate([{ left: '0%' }, { left: '100%' }], { delay: 2000, duration: 450, easing: EASE.carry, fill: 'both' });
```

Sound: a short swipe, timed to the edge's fastest frame.

Match the axis and direction of the last visible move: a rise wipes up (`inset(100% 0 0 0)` to `inset(0)`), a
slide left wipes from the right. `EASE.carry` is still fast at the end, so the wipe hands its speed to the
next beat's first move (start that move 60 ms before the wipe ends). Change the direction at the next
seam (taste rule seam-variety). For a coloured edge see [color-block-wipe](color-block-wipe.md).
