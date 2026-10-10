# Cursor spotlight

**Use when** a click opens the next screen and the film must not cut: the cursor tip is the handoff object. After the press, a
soft circle is born at the tip, grows from a tip-sized spot, and shows the next screen inside it. Screen A stays outside the circle
until the circle covers the frame. The cause (the press) and the effect (the circle) share one point, so the viewer reads "this click
opened that screen". Clip: [cursor-spotlight.mp4](cursor-spotlight.mp4). Demo: [demo/cursor-spotlight.html](demo/cursor-spotlight.html).

```js
import { easeFn } from '../../core/motion/presets.js';
const land = easeFn('land'), settle = easeFn('settle');
const FEATHER = 0.14, R0 = 0.9 * u;                                        // u = innerHeight / 100
const RMAX = (FAR / (1 - FEATHER)) * 1.02;                                 // FAR: tip to the farthest corner
vawe.onFrame((t) => {
  const k = clamp((t - T.grow) / 0.8), g = 0.35 * k * k * (3 - 2 * k) + 0.65 * settle(k);
  const R = lerp(R0, RMAX, g), f = Math.max(R * FEATHER, 1.5);
  const mask = `radial-gradient(circle at ${x}px ${y}px, #000 ${Math.max(R - f, 0)}px, transparent ${R}px)`;
  shotB.style.maskImage = mask;                                            // shot B sits above shot A, the cursor above both
  shotB.firstElementChild.style.transform = `scale(${lerp(1.06, 1, land(k))})`;
});
```

Sound: one soft click on the press (0.1 s before the circle is born); nothing on the growth.

- The edge is a mask, not a blur: a radial gradient with an opaque core and a soft shoulder of 14 percent of the radius. A blur of the
  edge would also blur the content inside it.
- The core, `R - feather`, must reach the farthest corner, so `RMAX = FAR / (1 - FEATHER)`. If you set `RMAX = FAR`, a wedge of
  shot A stays in the corner after the move and shows when the cursor leaves.
- The circle centre is the cursor tip, and the cursor keeps drifting 2 percent of the width for 1 s after the press, so the tip
  is never frozen under the circle. Stop following the cursor when it leaves: the centre must not move with the exit.
- Timing: the cursor lands in 0.8 s on `EASE.land`, the press dips the arrow 14 percent and the button 3.5 percent, the circle starts
  0.1 s after the press and grows in 0.8 s: a quarter on a smoothstep, the rest on `EASE.settle`. The cursor leaves in 0.35 s on `EASE.launch`, faster than it came.
- Speed across the handoff: the cursor arrives near rest and the circle is born at rest, so no speed jumps. Do not start the circle
  while the cursor still travels fast, or the circle seems to lag behind its own tip.
- Z-order is explicit: shot A z 1, shot B z 5 with the mask, cursor z 10. If B is below A the mask shows nothing.
- Shot B arrives at 1.06x and settles to 1 while the circle grows, and its own motion (a counter, bars) starts 0.5 s into the growth, so the
  hold is alive. Draw the cursor with a white fill and a dark edge: it must read on both screens.
- What goes wrong: a hard `clip-path: circle()` reads as an iris wipe ([iris-wipe](iris-wipe.md)), a hard edge that closes. Here the
  circle opens, with a soft edge, from the tip. A circle born from the button centre, not the tip, breaks the link to the cursor.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
