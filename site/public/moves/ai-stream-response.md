# AI stream response

**Use when** an AI product answers a question. The prompt is typed in the composer and sent up into
the thread; the assistant shows a status line ("Reading invoices_q3.csv") with a shine passing over
it; the answer then streams in chunk by chunk with a dot riding the newest chunk, and the source
chips and actions follow. The status leaves and the first chunk starts on its spot. Clip:
[ai-stream-response.mp4](ai-stream-response.mp4). Demo: [demo/ai-stream-response.html](demo/ai-stream-response.html).

```js
import { curveToLinear, CURVES, rng } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut), accelerate = curveToLinear((u) => u * u * u);
// send: the bubble rises from the composer's own position
user.animate([{ opacity: 0, translate: `0 ${composer.getBoundingClientRect().top - user.getBoundingClientRect().top}px`, scale: 0.96 }, { opacity: 1, translate: '0 0', scale: 1 }],
  { duration: 420, delay: 500, easing: settle, fill: 'both' });
// working: a status line in muted text with an ink shine (background-clip: text) swept once, then gone
status.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0' }], { duration: 700, delay: 640, easing: 'linear', fill: 'both' });
status.animate([{ opacity: 0 }], { duration: 110, delay: 970, easing: accelerate, fill: 'both' });
// stream: chunks of 1 to 3 words, 55 to 110 ms apart from a seeded rng; the caret shows only between one chunk and the next
const r = rng(7); let t = 1000;
chunks.forEach((el, i) => {
  const start = t; t += 55 + r() * 55;
  el.animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0px)' }], { duration: 150, delay: start, easing: settle, fill: 'both' });
  el.nextElementSibling.animate([{ opacity: 0 }, { opacity: 1, offset: 0.001 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], { duration: t - start, delay: start, fill: 'both' });
});
```

Sound: pluck at 0.50 s into the move, when the prompt bubble leaves the composer (default gain); no tick per chunk.

Text streams in uneven chunks, not letters: real models emit tokens in bursts, and a letter-by-letter
type reads as the prompt again. The gaps come from `rng`, never `Math.random`. The caret is an
inline zero-width box with an absolute dot, so it never moves the text. A status line that names
what the model reads says more than bouncing dots, and one shine across it is enough to read as
"working". Put the one number the answer is about in the accent (2.1%). Sources and actions appear
after the last chunk, so the tail of the clip is not static. Give the prompt and the answer a real
question and real figures.

Build the product the way the real ones are built, in one product unit (`--px`, a pixel of a 510 px
tall window): a 188 px history rail, a 48 px bar with the model picker, a 540 px centred column, a
user bubble with a 20 px radius and no assistant bubble, a 28 px model mark, 15.5/1.62 answer text,
26 px source chips, and a 22 px radius composer with its tools row and a round send button.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
