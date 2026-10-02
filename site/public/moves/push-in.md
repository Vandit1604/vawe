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
import { EASE } from '../../core/motion/presets.js';
// glide never quite stops: the camera is still moving on the beat's last frame
const opts = { duration: 2000, easing: EASE.glide, fill: 'both' };
document.querySelector('.world').animate([{ scale: 1 }, { scale: 1.2 }], opts);
document.querySelector('.bg').animate([{ scale: 1 }, { scale: 1.05 }], opts);
```

Sound: none; a camera lean is felt, never heard.

Push 8 to 20 percent over the beat. Under 5 percent the eye reads a mistake, not a move; over 30
percent it is a punch-in and needs a faster curve. `EASE.land` stops the move in the first
second, so the second half of a 2 s beat sits dead; `EASE.glide` keeps it alive. Push toward the
thing the beat is about, and end the push on the beat's last frame or a cut, never in a hold.
Never blur a push: the subject is the sharpest thing in frame.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
