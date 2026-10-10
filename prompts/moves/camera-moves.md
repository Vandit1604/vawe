# Camera moves

**Use when** a whole world should feel like it is seen through a lens that moves: lean in on a hold,
pull back to reveal, whip to the next world. Clip: [camera-moves.mp4](camera-moves.mp4) (a push toward a subject). Demo: [demo/camera-moves.html](demo/camera-moves.html). Each is a transform on one
wrapper (or on one layer, see the layered depth section of [parallax-dive](parallax-dive.md)), so it is deterministic under the seek.
**The camera holds still by default.** It moves only with a reason: the spectacle, a reveal. A camera that
moves in every beat is the lazy way to keep a hold alive: live-hold does not count a whole-frame move, and
constant-camera (taste rule) names a camera that moves for over 60 percent of the film or over 4 worlds in a row.

```js
import { camera, EASE } from '../../core/motion/presets.js';
const w = document.querySelector('[data-world="hero"]');
camera(w, { kind: 'push', at: 0, duration: 2.4, origin: '66% 56%' });      // 1 to 1.12, EASE.glide: never quite stops
camera(w, { kind: 'pull', at: 0, duration: 1.4 });                          // 1.15 to 1, EASE.settle: reveals
camera(w, { kind: 'drift', at: 2.4, duration: 3, from: 1.12, to: 1.15 });   // slides 1.5% and scales 3%: a rare, deliberate slow move, not a hold's life
// a whip: the old world leaves on EASE.launch, the new one arrives on EASE.land, together
camera(oldWorld, { kind: 'whipOut', at: 5.0, duration: 0.3 });
camera(newWorld, { kind: 'whipIn', at: 5.0, duration: 0.3 });
```

Sound: a whoosh at the start of the whip, one per film; the push, pull and drift are felt, not heard.

Push 8 to 20 percent over the beat; `to` and `from` set the scale. A wrapper takes one scale animation at a
time, so chain moves by passing the last move's end as `from` (the push ends at 1.12, the drift starts there).
`origin` is the thing the beat is about, not the frame centre. The whip needs both worlds visible for its
0.3 s, side by side: put `dir: -1` to whip the other way, and change the direction at the next whip.
A held beat is kept alive by an element motion (a line typing, a counter, a glint, a secondary action), never by a camera `drift` and never frozen (taste rules live-hold and constant-camera). See [whip-pan](whip-pan.md) for a streak that follows the speed.

**Push toward a subject.** When a shot holds for a beat or more and the eye should lean toward one subject (a number, a card, a face), scale the world toward the subject, not the frame centre, and scale the layer behind it less, so the two separate the way real depth does:

```css
.world { transform-origin: 34vw 46vh; }   /* the subject, not the middle of the frame */
.bg    { transform-origin: 34% 50%; }
```

```js
const opts = { duration: 2000, easing: EASE.glide, fill: 'both' };
document.querySelector('.world').animate([{ scale: 1 }, { scale: 1.2 }], opts);
document.querySelector('.bg').animate([{ scale: 1 }, { scale: 1.05 }], opts);
```

Push 8 to 20 percent over the beat. Under 5 percent the eye reads a mistake, not a move; over 30 percent it is a punch-in ([crash-zoom](crash-zoom.md)) and needs a faster curve. `EASE.land` stops the move in the first second, so the second half of a 2 s beat is still; `EASE.glide` keeps the lean going to the beat's last frame. Push toward the thing the beat is about, end the push on the last frame or a cut, never in a hold, and never blur a push: the subject is the sharpest thing in frame.

