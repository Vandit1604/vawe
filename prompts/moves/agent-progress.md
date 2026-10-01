# Agent progress

**Use when** the feature is an AI agent doing several steps for the viewer: it reads, traces, patches and
tests, and the proof is visible labour. A card springs in, four rows rise 70 ms apart, an arc turns beside a
status line that swaps whole states, and the rows flip from numbered outlines to solid check circles one
by one while the bar advances. The film ends mid-list, with the last row still turning, so the work reads
as ongoing. No prompt is typed and no cursor is needed. Clip: [agent-progress.mp4](agent-progress.mp4).
Demo: [demo/agent-progress.html](demo/agent-progress.html).

```css
.badge { position: relative; width: 6.4vh; height: 6.4vh; }
.badge > * { position: absolute; inset: 0; }
.done { border-radius: 50%; background: var(--done); opacity: 0; scale: 0.4; }   /* the solid circle, hidden until its check */
.done path { stroke-dasharray: 24; stroke-dashoffset: 24; }                     /* the tick draws on one dash */
.lab i { position: absolute; inset: 54% 0 auto; height: 0.35vh; background: var(--muted); transform: scaleX(0); transform-origin: 0 50%; }
```

```js
import { EASE } from '../../core/motion/presets.js';
const at = { rows: 420, checks: [1250, 1800, 2350], swaps: [420, 1250, 2000] };   // ms
rows.forEach((r, i) => r.animate([{ translate: '0 1.8vh', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 380, delay: at.rows + i * 70, easing: EASE.land, fill: 'both' }));
spin.animate([{ rotate: '0deg' }, { rotate: '900deg' }], { duration: 3200, easing: 'linear', fill: 'both' });   // finite, never infinite
// a slot swaps whole states: the old one leaves in 120 ms, the next rises in 260 ms
slot.forEach((el, i) => {
  el.animate([{ opacity: 0, translate: '0 0.9vh' }, { opacity: 1, translate: '0 0' }], { duration: 260, delay: at.swaps[i], easing: EASE.land, fill: 'both' });
  if (at.swaps[i + 1]) el.animate([{ opacity: 1 }, { opacity: 0, translate: '0 -0.9vh' }], { duration: 120, delay: at.swaps[i + 1] - 120, easing: EASE.launch, fill: 'forwards' });
});
// a check lands: outline out, circle pops with overshoot, tick draws, label strikes and dims
at.checks.forEach((k, i) => {
  num[i].animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.6 }], { duration: 120, delay: k, easing: EASE.launch, fill: 'forwards' });
  done[i].animate([{ opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1 }], { duration: 380, delay: k, easing: EASE.pop, fill: 'forwards' });
  tick[i].animate([{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], { duration: 260, delay: k + 100, easing: EASE.land, fill: 'forwards' });
  strike[i].animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 300, delay: k + 60, easing: EASE.land, fill: 'forwards' });
});
```

Sound: pluck at 1.25 s into the move, when the first check lands (default gain); no tick per check.

The state change is the point: the viewer watches rows turn from a number into a result. Give the
checks uneven gaps (550 ms here, then 550) and start them after the last row has arrived, so arrival and
work never overlap. The status line and the counter swap whole states, never a crossfade of two half
visible words. The bar advances in the same frames as the check, on the same curve. Keep the last row
unchecked: a full list ends the work and the eye stops, an unfinished one keeps it. Use one working accent
for the machine (arc, bar) and a second colour only for done; strike and dim the label to `--muted`, never
to `--faint`, so it still reads.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
