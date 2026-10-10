# Shadow handoff

**Use when** a light scene hands over to a night scene and one card carries the change: the card lifts, its shadow stretches and darkens until it is the next scene's ground, and the card leaves. The shadow is the shared element. It starts as the card's contact shadow in scene A and ends as the flat ground colour of scene B, with no cut and no crossfade. The detail that sells it is the order: the card lifts first (the cause), the shadow answers, and the card leaves only once the shadow already covers the frame. Clip: [shadow-handoff.mp4](shadow-handoff.mp4). Demo: [demo/shadow-handoff.html](demo/shadow-handoff.html).

```js
import '../../core/engine/page-api.js';
import { easeFn } from '../../core/motion/presets.js';
const settle = easeFn('settle'), glide = easeFn('glide'), launch = easeFn('launch');
const LIFT = { at: 0.6, dur: 0.8 }, SPREAD = { at: 0.85, dur: 1.15 }, LEAVE = { at: 2.05, dur: 0.42 };
const day = [15, 32, 51, 0.2], night = [6, 9, 20, 1];                // the shadow ends as the colour of scene B's ground
vawe.onFrame((t) => {
  const p = settle(clamp((t - LIFT.at) / LIFT.dur));                   // height of the card above the ground
  const g = glide(clamp((t - SPREAD.at) / SPREAD.dur));                // how far the shadow has spread over the frame
  const out = launch(clamp((t - LEAVE.at) / LEAVE.dur));
  card.style.translate = `0 ${-6 * u * p - 0.9 * H * out}px`; card.style.scale = 1 + 0.04 * p + 0.1 * out;
  const w = lerp(cw * (1 + 0.1 * p), 1.7 * W, g), h = lerp(ch * (1 + 0.3 * p), 1.7 * H, g);   // longer than wide: a low light
  const dx = lerp(2 * u * p, 0, g), dy = lerp(1.6 * u + 9 * u * p, 0, g);
  Object.assign(shadow.style, { left: `${cx - w / 2 + dx}px`, top: `${cy - h / 2 + dy}px`, width: `${w}px`, height: `${h}px`,
    background: `rgba(${day.map((v, i) => lerp(v, night[i], g)).join()})`, filter: `blur(${lerp(1.2 * u + 3.4 * u * p, 9 * u, g)}px)` });
});
```

Sound: none; one soft low swell under the stretch is the most the film can afford, and it stops when the card leaves.

- Z-order, bottom to top: scene A's ground and copy, the shadow, the card, scene B's copy. The shadow sits above A's copy, so the copy darkens with the ground. B's headline is above everything and rises only after the card is gone.
- The shadow is a real blurred element (`filter: blur`), not a gradient: its edge softens as it grows, 1.2 u at rest and 9 u once it is the ground. Its final colour is B's ground colour exactly, so nothing is swapped.
- The card keeps `--ring` only. The contact shadow is the shared element, and a second `box-shadow` on the card would double it.
- The card leaves on `EASE.launch` in 0.42 s, faster than the 0.8 s lift. It moves up and toward the viewer (scale 1.1), like an object that was lifted.
- What goes wrong: a shadow that only changes opacity is a fade. A shadow that grows evenly on all sides reads as a vignette, so stretch it down and to the right first. If the card leaves before the shadow is dark, a strip of A's ground shows behind it for a few frames.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
