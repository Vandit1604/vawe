# CTA morph press

**Use when** the film closes from "this is who we are" to "this is what you do": the brand plate condenses
at its own centre into a smaller, brighter button, a cursor arrives and lands a click a little off
centre, and the button and cursor compress together and release with a ripple. One action, one element,
no surrounding UI. Clip: [cta-morph-press.mp4](cta-morph-press.mp4). Demo:
[demo/cta-morph-press.html](demo/cta-morph-press.html).

```css
.at { position: absolute; left: 50%; top: 50%; translate: -50% -50%; transform-origin: 50% 50%; }   /* plate and button share one centre */
.cta { position: relative; overflow: hidden; }
.ripple { position: absolute; left: calc(50% + 5vh); top: calc(50% + 1.6vh); width: 14vh; height: 14vh; margin: -7vh 0 0 -7vh; border-radius: 50%; background: #fff; opacity: 0; }
```

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut), pop = curveToLinear(CURVES.overshoot), smooth = curveToLinear((u) => u * u * (3 - 2 * u)), leave = curveToLinear((u) => u * u * u);
const W = innerWidth, H = innerHeight, unit = H / 100;
const at = { morph: 900, go: 1250, dur: 850, press: 2350 };   // ms
const from = { x: W * 0.9, y: H * 1.06 }, to = { x: W / 2 + unit * 5, y: H / 2 + unit * 1.6 };   // lands 5 and 1.6 units off centre

// the plate leaves in 340 ms while the button grows into the same place; the eye reads one object changing
plate.animate([{ scale: 1, opacity: 1 }, { scale: 0.55, opacity: 0 }], { duration: 340, delay: at.morph, easing: leave, fill: 'forwards' });
button.animate([{ scale: 0.55, opacity: 0 }, { opacity: 1, offset: 0.3 }, { scale: 1, opacity: 1 }], { duration: 560, delay: at.morph + 120, easing: pop, fill: 'both' });

// x settles on expoOut while y follows a smoothstep, so the path bows and decelerates
curX.animate([{ translate: `${from.x}px 0` }, { translate: `${to.x}px 0` }], { duration: at.dur, delay: at.go, easing: settle, fill: 'both' });
curY.animate([{ translate: `0 ${from.y}px` }, { translate: `0 ${to.y}px` }], { duration: at.dur, delay: at.go, easing: smooth, fill: 'both' });

// the press: both compress on the same frame and release together, then one ripple leaves the press point
cursorSvg.animate([{ scale: 1 }, { scale: 0.84, offset: 0.5 }, { scale: 1 }], { duration: 260, delay: at.press, easing: settle, fill: 'both' });
button.animate([{ scale: 1 }, { scale: 0.94, offset: 0.5 }, { scale: 1 }], { duration: 260, delay: at.press, easing: settle, fill: 'both' });
ripple.animate([{ opacity: 0.4, scale: 0.2 }, { opacity: 0, scale: 4 }], { duration: 620, delay: at.press, easing: settle, fill: 'both' });
```

Sound: droplet at 2.35 s into the move, on the press (default gain); nothing on the morph or the approach.

The two elements sit at the same centre with the same `transform-origin`, and the button is absolutely
placed so it never shoves the plate while they overlap. The morph is one move, not two: the plate
shrinks and fades in 340 ms, which is faster than the button's 560 ms growth, so the exit is quicker
than the entrance. The cursor lands a few units off the centre so the aim reads as a hand; a cursor
that lands dead centre looks scripted. The press is the one moment where two things move on the same
frame. Keep the ripple under 40 percent opacity so it never reads as a glow on the label.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
