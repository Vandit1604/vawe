# Split reveal

**Use when** the next shot is behind the current one and the current one should open like a pair of
doors. Shot A is drawn twice, each copy showing one half, so the seam is invisible until they part.
The detail that sells it is the light in the gap: shot B waits in the dark, a shadow is cast beside
each door, and B lights up and settles from 1.12x as the doors clear. Clip:
[split-reveal.mp4](split-reveal.mp4). Demo: [demo/split-reveal.html](demo/split-reveal.html).

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const E = CURVES.expoOut, W = innerWidth, far = 0.62;
const whip = (u) => (u < 0.5 ? 0.5 * (1 - E(1 - 2 * u)) : 0.5 + 0.5 * E(2 * u - 1));
const open = (u) => 0.4 * u + 0.6 * whip(u);
const t = { duration: 850, delay: 350, easing: curveToLinear(open), fill: 'both' };
// each .door is 50vw wide: a clipped full-width copy of shot A, plus an .edge gradient beside its inner side
left.animate([{ translate: '0 0' }, { translate: `${-W * far}px 0` }], t);
right.animate([{ translate: '0 0' }, { translate: `${W * far}px 0` }], t);
veil.animate([{ opacity: 0.85 }, { opacity: 0.8, offset: 0.4 }, { opacity: 0 }], t);   // black over shot B
shotB.animate([{ scale: 1.12 }, { scale: 1 }], { duration: 1100, delay: 350, easing: curveToLinear(E), fill: 'both' });
// door blur: stdDeviation = 0.2 x one frame's travel, x only, set in vawe.onFrame as in push-blur
```

Sound: none; the light in the gap is the event, and it stays quiet.

The doors travel 62 percent of the width, not 50: the shadow beside each door must also leave the
frame, or a grey band stays on screen after the move. Keep the veil dark until the gap is wide
(the 0.4 offset), or B is lit before it is uncovered and the gap reads as a hole. A linear share in
`open` keeps the doors moving through the middle; a pure ease-in-out spends the move in two frames.
No highlight line on the door edge: it reads as a border while the doors are still shut.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
