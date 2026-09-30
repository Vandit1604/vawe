# Command palette summon

**Use when** the product is keyboard first (the Linear and Raycast beat): the app steps back and dims,
a Cmd+K palette drops in from above on a spring, its rows rise 40 ms apart, three keys type a query at
a real typist's pace, the rows that stop matching collapse to zero height, and Enter turns the chosen
row accent before the palette leaves faster than it came. The detail that sells it is the collapse:
rows lose their height, so the list squeezes shut under the query; a fade would leave holes. Clip:
[command-palette-summon.mp4](command-palette-summon.mp4). Demo: [demo/command-palette-summon.html](demo/command-palette-summon.html).

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut), drop = curveToLinear(CURVES.spring), leave = curveToLinear((u) => u * u * u);
const at = { dim: 120, drop: 150, rows: 220, keys: [780, 930, 1080], enter: 1340, exit: 1560 };   // ms
dim.animate([{ opacity: 0 }, { opacity: 0.28 }], { duration: 220, delay: at.dim, easing: settle, fill: 'both' });
palette.animate([{ translate: '0 -4vh', opacity: 0 }, { opacity: 1, offset: 0.25 }, { translate: '0 0', opacity: 1 }],
  { duration: 520, delay: at.drop, easing: drop, fill: 'both' });
rows.forEach((r, i) => r.animate([{ translate: '0 1.6vh', opacity: 0 }, { translate: '0 0', opacity: 1 }],
  { duration: 360, delay: at.rows + i * 40, easing: settle, fill: 'both' }));
// each typed letter is a span that exists from the start and switches display on its key
letters.forEach((c, i) => c.animate([{ display: 'none' }, { display: 'inline' }], { duration: 1, delay: at.keys[i] - 1, fill: 'both' }));
// a row that stops matching (data-out = the second of the key that drops it) collapses to zero height
misses.forEach((o) => o.animate([{ height: 'calc(var(--u) * 8.4)', opacity: 1 }, { height: '0px', opacity: 0 }],
  { duration: 220, delay: o.dataset.out * 1000, easing: settle, fill: 'both' }));
chosen.animate([{ scale: 1 }, { scale: 0.97, offset: 0.4 }, { scale: 1 }], { duration: 240, delay: at.enter, easing: settle, fill: 'both' });
palette.animate([{ scale: 1, opacity: 1 }, { scale: 0.96, opacity: 0 }], { duration: 180, delay: at.exit, easing: leave, fill: 'forwards' });
```

Sound: pluck at 1.34 s into the move, when Enter presses the chosen row (default gain); no tick per key.

Give each row a fixed height and `overflow: hidden` so the collapse is exact. Keys 150 ms apart read
as a fast, real typist; under 100 ms reads as a paste. The caret sits inside the typed text, so it
moves with each letter; keep it solid, since a blink never lets the frame settle. The highlight
moves to the first match on the key that removes the old first row. Put real feature names in the
rows: the list is a free feature menu for the viewer.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
