# AI stream response

**Use when** an AI product answers a question. The prompt is typed in the composer and sent up into
the thread; the assistant shows a working indicator; the answer then streams in chunk by chunk with a
caret riding the newest chunk. The indicator leaves and the first chunk starts on its spot. Clip:
[ai-stream-response.mp4](ai-stream-response.mp4). Demo: [demo/ai-stream-response.html](demo/ai-stream-response.html).

```js
import { curveToLinear, CURVES, rng } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut), accelerate = curveToLinear((u) => u * u * u);
// send: the bubble rises from the composer's own position
user.animate([{ opacity: 0, translate: `0 ${composer.getBoundingClientRect().top - user.getBoundingClientRect().top}px`, scale: 0.96 }, { opacity: 1, translate: '0 0', scale: 1 }],
  { duration: 420, delay: 500, easing: settle, fill: 'both' });
// working: three dots wave 100 ms apart, then leave fast as the answer begins on their spot
dots.forEach((d, i) => d.animate([{ translate: '0 0' }, { translate: '0 -1.1vh', offset: 0.35 }, { translate: '0 0' }], { duration: 420, delay: 680 + i * 100, iterations: 2, easing: settle }));
dotsBox.animate([{ opacity: 0 }], { duration: 110, delay: 920, easing: accelerate, fill: 'both' });
// stream: chunks of 1 to 3 words, 55 to 110 ms apart from a seeded rng; the caret shows only between one chunk and the next
const r = rng(7); let t = 950;
chunks.forEach((el, i) => {
  const start = t; t += 55 + r() * 55;
  el.animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0px)' }], { duration: 150, delay: start, easing: settle, fill: 'both' });
  el.nextElementSibling.animate([{ opacity: 0 }, { opacity: 1, offset: 0.001 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], { duration: t - start, delay: start, fill: 'both' });
});
```

Text streams in uneven chunks, not letters: real models emit tokens in bursts, and a letter-by-letter
type reads as the prompt again. The gaps come from `rng`, never `Math.random`. The caret is an
inline zero-width box with an absolute bar, so it never moves the text. The wave runs on the indicator
for about 0.3 s, long enough to read as "working" and short enough for a film. Put the one number the
answer is about in the accent (2.1%). Sources and actions appear after the last chunk, so the tail
of the clip is not static. Give the prompt and the answer a real question and real figures.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
