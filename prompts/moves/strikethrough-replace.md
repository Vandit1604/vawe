# Strikethrough replace

**Use when** the copy says "was X, now Y": an old price, name or claim is struck through and the new
value writes in beside it. The detail that sells it is that the rejection is a physical line: it is
drawn left to right, tilted 3 degrees like a pen, and the old value dims and shrinks the moment the
line passes it, so the eye moves to the new one. Clip:
[strikethrough-replace.mp4](strikethrough-replace.mp4). Demo:
[demo/strikethrough-replace.html](demo/strikethrough-replace.html).

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut);
// .strike: an absolute bar, left -4% right -4% of the old value, top 56%, 1.5 percent of the frame tall, rotate -3deg, origin left
strike.animate([{ scale: '0 1' }, { scale: '1 1' }], { duration: 240, delay: 260, easing: settle, fill: 'both' });
old.animate([{ color: 'var(--ink)', scale: 1 }, { color: 'var(--faint)', scale: 0.7 }],
  { duration: 380, delay: 380, easing: settle, fill: 'both' });          // starts 120 ms into the strike
// the new value: one overflow-hidden mask per character (padding .22em top and bottom, margin -.22em), glyph inside
chars.forEach((el, i) => el.animate([{ translate: '0 130%' }, { translate: '0 0' }],
  { duration: 520, delay: 500 + i * 70, easing: settle, fill: 'both' }));
```

The strike takes 240 ms and the new value starts 240 ms after it does, so the old value is judged
before the new one appears. The new value is larger than the old one (1.5x) and full ink: the
rejected value is quieter, not just crossed out. Use `expoOut` for the characters, not an
overshoot: a glyph that travels 130 percent of its height and overshoots leaves its mask. The line
overhangs the word by 4 percent each side; flush to the glyph edges it looks like a font effect.
Words work the same way, but keep the old one on screen: deleting it removes the contrast.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
