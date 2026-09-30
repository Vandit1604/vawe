# Push in

**Use when** a shot holds for a beat or more and the eye should lean toward one subject: a number, a
card, a face. The camera scales toward the subject, not the frame centre, and the layer behind it
scales less, so the two separate the way real depth does. Clip: [push-in.mp4](push-in.mp4).
Demo: [demo/push-in.html](demo/push-in.html).

```css
.world { transform-origin: 34vw 46vh; }   /* the subject, not the middle of the frame */
.bg    { transform-origin: 34% 50%; }
```

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
// half constant speed, half expoOut: the camera keeps moving to the last frame and still lands soft
const push = curveToLinear((u) => 0.5 * u + 0.5 * CURVES.expoOut(u));
const opts = { duration: 2000, easing: push, fill: 'both' };
document.querySelector('.world').animate([{ scale: 1 }, { scale: 1.2 }], opts);
document.querySelector('.bg').animate([{ scale: 1 }, { scale: 1.05 }], opts);
```

Push 8 to 20 percent over the beat. Under 5 percent the eye reads a mistake, not a move; over 30
percent it is a punch-in and needs a faster curve. Pure `expoOut` stops the move in the first
second, so the second half of a 2 s beat sits dead; the linear half keeps it alive. Push toward the
thing the beat is about, and end the push on the beat's last frame or a cut, never in a hold.
Never blur a push: the subject is the sharpest thing in frame.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
