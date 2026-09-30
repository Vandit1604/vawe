# Logo wall

**Use when** the proof beat comes before the call to action: a wall of customer logos passes as
social proof. Three lanes of hairline cells slide in from alternate sides, fast and blurred, and
land on a soft curve under one line of copy; they never stop, so the last frame still moves. The
detail that sells it is that no two logos look alike: each has its own mark and its own typeface,
so the wall reads as different companies and not as one font repeated. Clip:
[logo-wall.mp4](logo-wall.mp4). Demo: [demo/logo-wall.html](demo/logo-wall.html).

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut), run = 190 * u;      // u = 1 percent of the frame height
// lane markup: .lane (overflow hidden) > .row (absolute, left -20u) > .track (flex, 2 x 12 cells of 38u)
// a cell is an inline SVG mark (24 x 24 viewBox, filled, currentColor) plus a wordmark; invented brands only (demo/assets/logos.js)
lanes.forEach((row, i) => {
  const dir = i % 2 ? 1 : -1, delay = 150 + i * 110;                // lanes alternate, 110 ms apart
  row.animate([{ translate: `${-dir * run}px 0` }, { translate: '0 0' }], { duration: 1300, delay, easing: settle, fill: 'both' });
  row.firstElementChild.animate([{ translate: '0 0' }, { translate: `${dir * 6 * u}px 0` }], { duration: 2000, easing: 'linear', fill: 'both' });
  // blur: SVG feGaussianBlur on the row, x only, stdDeviation = 0.3 x its travel per frame, set in vawe.onFrame as in push-blur
});
```

Sound: none; the eye reads the count, and the number in the line above carries the beat's cue.

Three lanes at 110 ms apart tear the wall in as one gesture; one lane reads as a ticker, five as
a screen saver. The blur ends before the logos can be read, which is right: the eye should read
the count, not the names. The drift (6 percent of the height over the whole clip) keeps the wall alive
after the landing. Never use a real brand: draw invented marks as inline SVG at one visual
weight, and give each wordmark its own face and case. Keep the ink one colour;
the accent belongs to the number in the line above.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
