# Rack focus

**Use when** two things at different depths share a frame and the story passes from one to the other:
the draft in front, the shipped result behind. The near layer is sharp and the far layer soft; the
focus pulls, the near layer melts and the far one resolves. Pinpoint lights behind grow into soft discs
when out of focus and snap to points when in it, which is what sells a lens. Clip:
[rack-focus.mp4](rack-focus.mp4). Demo: [demo/rack-focus.html](demo/rack-focus.html).

Use once per film: the lights that swell into discs is a stock device (engine-doctrine/TASTE-CARD.md, Attractors), never the idea.

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const E = CURVES.expoOut;
const pull = curveToLinear((u) => (u < 0.5 ? 0.5 * (1 - E(1 - 2 * u)) : 0.5 + 0.5 * E(2 * u - 1)));
const beat = { duration: 700, delay: 550, easing: pull, fill: 'both' };
near.animate([{ filter: 'blur(0px)' }, { filter: 'blur(1.9vh)' }], beat);
far.animate([{ filter: 'blur(1.9vh)' }, { filter: 'blur(0px)' }], beat);
far.animate([{ scale: 1.015 }, { scale: 1 }], beat);        // focus breathing
near.animate([{ scale: 1 }, { scale: 0.985 }], beat);
near.animate([{ opacity: 1 }, { opacity: 0.55 }], beat);    // the defocused layer also steps back
```

Sound: none; a focus pull is felt, never heard.

Both blurs run on the same curve, so at the midpoint the two layers are equally soft: that is the
moment the lens is between planes, and it must be brief (0.7 s in all). The curve eases in, peaks and
lands soft, like a hand on a focus ring. Blur is a state here, not motion blur: the layers hold
still and only the focus moves. Keep the blur radius in vh (1.9 vh) so it scales with the frame. The
1.5 percent scale change is focus breathing; more than 3 percent looks like a zoom.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
