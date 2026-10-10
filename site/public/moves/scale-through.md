# Scale through

**Use when** the next world should be entered, not cut to: the camera flies into one plain element (a
dot, a disc) until it fills the frame, and its colour is the ground of the next world. Pure Web
Animations, no per-frame code; for the zoom-blur fan of copies see [zoom-through](zoom-through.md).

```js
import { EASE } from '../../core/motion/presets.js';
const STOPS = 16, SCALE = 26;                       // disc of radius r fills the frame corner at about corner / r
const a = document.querySelector('[data-world="a"]');
a.style.transformOrigin = '67.9% 56.7%';            // the disc's centre as it rests, after any push
// log-spaced stops: equal steps in zoom feel even; the easing runs over the whole move
a.animate(Array.from({ length: STOPS + 1 }, (_, i) => ({ scale: String(SCALE ** (i / STOPS)) })),
  { delay: 2400, duration: 700, easing: EASE.launch, fill: 'both' });
// world a hides the moment the disc fills the frame; world b (ground = the disc's colour) sits under it
a.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 3060, duration: 1, fill: 'forwards' });
```

Sound: a rising whoosh over the dive, a soft hit at the swap.

The disc must be a flat colour with no glyph and the next world's ground must be that colour, or the swap
shows. `EASE.launch` accelerates to the cut; the swap frame is one frame of flat colour, so start the next
world's words 0.1 s before it hides the old one. Linear `scale` between two keys feels slow then sudden: the
log-spaced stops fix that. Never push in the same direction twice in a row: follow a scale-through with a pull
back or a whip (taste rule seam-variety).
