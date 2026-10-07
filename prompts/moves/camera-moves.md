# Camera moves

**Use when** a whole world should feel like it is seen through a lens that moves: lean in on a hold,
pull back to reveal, drift while the viewer reads, whip to the next world. Each is a transform on one
wrapper (or on one layer, see [depth-parallax](depth-parallax.md)), so it is deterministic under the seek.
A film with no camera reads as slides.

```js
import { camera, EASE } from '../../core/motion/presets.js';
const w = document.querySelector('[data-world="hero"]');
camera(w, { kind: 'push', at: 0, duration: 2.4, origin: '66% 56%' });      // 1 to 1.12, EASE.glide: never quite stops
camera(w, { kind: 'pull', at: 0, duration: 1.4 });                          // 1.15 to 1, EASE.settle: reveals
camera(w, { kind: 'drift', at: 2.4, duration: 3, from: 1.12, to: 1.15 });   // live hold: slides 1.5% and scales 3%
// a whip: the old world leaves on EASE.launch, the new one arrives on EASE.land, together
camera(oldWorld, { kind: 'whipOut', at: 5.0, duration: 0.3 });
camera(newWorld, { kind: 'whipIn', at: 5.0, duration: 0.3 });
```

Sound: a whoosh at the start of the whip, one per film; the push, pull and drift are felt, not heard.

Push 8 to 20 percent over the beat; `to` and `from` set the scale. A wrapper takes one scale animation at a
time, so chain moves by passing the last move's end as `from` (the push ends at 1.12, the drift starts there).
`origin` is the thing the beat is about, not the frame centre. The whip needs both worlds visible for its
0.3 s, side by side: put `dir: -1` to whip the other way, and change the direction at the next whip.
A held beat gets a `drift`, never a frozen frame (taste rule live-hold). See also [push-in](push-in.md)
for the single-subject lean and [whip-pan](whip-pan.md) for a streak that follows the speed.
