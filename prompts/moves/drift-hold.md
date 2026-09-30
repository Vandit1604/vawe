# Drift hold

**Use when** a quiet frame must stay on screen (a headline read, a lockup, a pause before the big
moment) and a frozen frame would look dead. Each layer drifts on its own seeded noise and grows a
little, at different amplitudes, so no two layers ever move together. The eye reads a camera that is
alive, not an animation. Clip: [drift-hold.mp4](drift-hold.mp4). Demo: [demo/drift-hold.html](demo/drift-hold.html).

```js
import '../../core/engine/page-api.js';
import { noise1 } from '../../core/motion/springs.js';
const layers = [
  { el: bg,   seed: 1, amp: 2.2, grow: 0.012 },   // vh of travel, share of scale gained over 2 s
  { el: type, seed: 2, amp: 1.0, grow: 0.022 },
  { el: rule, seed: 3, amp: 1.6, grow: 0.022 },
];
const rate = 0.8;                                  // noise steps per second: a new direction about every 1.2 s
vawe.onFrame((t) => {
  const vh = innerHeight / 100;
  layers.forEach(({ el, seed, amp, grow }) => {
    const x = noise1(t * rate, seed * 10) * amp * vh, y = noise1(t * rate, seed * 10 + 5) * amp * vh * 0.7;
    el.style.transform = `translate(${x}px, ${y}px) scale(${1 + grow * t / 2})`;
  });
});
```

`noise1` is seeded, so frame `t` is the same on every render and depends on no earlier frame. Give
every layer its own seed and amplitude; the headline moves least and the ground most, which reads as
depth. Travel of 1 to 2 vh and 1 to 2 percent scale over the hold is visible in motion and invisible
as a "move". A drift over 3 vh is a pan and pulls the eye off the text. It never blurs. Use it under
a held line, not as a substitute for a beat: the hold still needs its own words-times-0.6 s.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
