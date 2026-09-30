# Light leak transition

**Use when** two shots should meet through warmth instead of a wipe: a calm or human cut, a change of day
or mood, a soft end of a beat. A warm flare swells over the frame on an ease-in, the cut lands on its
peak where nothing else is visible, and the flare dies on a fast exponential tail while the new shot
climbs out of it. Everything is generated gradients, so no image asset ships with it. Clip:
[light-leak-transition.mp4](light-leak-transition.mp4). Demo:
[demo/light-leak-transition.html](demo/light-leak-transition.html).

```css
.leak, .wash { position: absolute; pointer-events: none; mix-blend-mode: screen; opacity: 0; }
.leak { inset: -25% -30%; background:
  radial-gradient(38% 52% at 18% 52%, #ffc45c 0%, rgba(255, 150, 60, 0.8) 34%, rgba(255, 96, 80, 0) 74%),
  radial-gradient(30% 40% at 42% 26%, #ff7a6b 0%, rgba(255, 90, 120, 0) 72%),
  radial-gradient(42% 56% at 34% 88%, #ffd98a 0%, rgba(255, 160, 70, 0) 72%); }
.wash { inset: 0; background: radial-gradient(120% 130% at 24% 50%, rgba(255, 214, 140, 0.96), rgba(255, 150, 84, 0.78) 55%, rgba(255, 96, 96, 0.5)); }
```

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut), ramp = curveToLinear((u) => u * u);
const at = { leak: 450, dur: 1500, peak: 0.4 }, cut = at.leak + at.dur * at.peak;   // ms; the cut sits on the peak
// slow rise, quick fall: the ease-in carries the first interval, expoOut the second
const swell = (amp) => [{ opacity: 0, easing: ramp }, { opacity: amp, offset: at.peak, easing: settle }, { opacity: 0 }];
wash.animate(swell(0.95), { duration: at.dur, delay: at.leak, fill: 'both' });
leak.animate(swell(1), { duration: at.dur, delay: at.leak, fill: 'both' });
// the blobs travel and grow while the wash stays put: two speeds read as light, not a fade
leak.animate([{ translate: '-22% 4%', scale: 0.85, rotate: '-6deg' }, { translate: '16% -3%', scale: 1.35, rotate: '5deg' }],
  { duration: at.dur, delay: at.leak, easing: curveToLinear((u) => u * u * (3 - 2 * u)), fill: 'both' });
// the old shot sinks into the light, the cut lands on the peak, the new shot climbs out of it
shotA.animate([{ opacity: 1 }, { opacity: 0.12 }], { duration: 420, delay: cut - 420, easing: ramp, fill: 'both' });
shotA.animate([{ opacity: 0.12 }, { opacity: 0 }], { duration: 1, delay: cut, fill: 'forwards' });
shotB.animate([{ opacity: 0.12 }, { opacity: 1 }], { duration: 560, delay: cut, easing: settle, fill: 'both' });
```

Sound: whoosh at 0.45 s into the move, so its swell meets the flare at the cut (default gain).

Two layers do the job: a full-frame wash that hides the cut and a set of offset blobs that move, both
on `mix-blend-mode: screen` so they only ever add light and the dark shot stays readable at the edges.
Sink the old shot to about 12 percent before the peak, or its white type shows through the wash as a
ghost. Pick the warm family (amber, coral, peach) and keep it to one flare per film: the same leak twice
reads as a template. Text is never under the flare at the peak, and no text glows. This move needs no
image: a leak photo adds weight and a licence for what three gradients do.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
