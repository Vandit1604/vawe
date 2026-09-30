# Before and after wipe

**Use when** the claim is a change and the change should be a picture: the same card in two states,
and a scan line carries the after state over the before. Both states share one layout, so only the
numbers and the colour change; the before is grey, the after holds the one accent. Clip:
[before-after-wipe.mp4](before-after-wipe.mp4). Demo: [demo/before-after-wipe.html](demo/before-after-wipe.html).

```html
<div class="card">
  <div class="state before">...812 ms, jagged grey line...</div>
  <div class="state after">...96 ms, flat accent line...</div>
  <div class="scan"><div class="trail"></div><div class="grip"></div></div>
</div>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const E = CURVES.expoOut, accelerate = curveToLinear((u) => u * u * u);
const scanCurve = curveToLinear((u) => (u < 0.5 ? 0.5 * (1 - E(1 - 2 * u)) : 0.5 + 0.5 * E(2 * u - 1)));
const W = card.getBoundingClientRect().width, at = 300, dur = 900;
after.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: dur, delay: at, easing: scanCurve, fill: 'both' });
scan.animate([{ translate: '0 0' }, { translate: `${W}px 0` }], { duration: dur, delay: at, easing: scanCurve, fill: 'both' });
scan.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 80, delay: at - 60, easing: 'linear', fill: 'both' });
scan.animate([{ opacity: 0 }], { duration: 160, delay: at + dur - 120, easing: accelerate, fill: 'both' });
</script>
```

The clip and the line run the same curve over the same width, so the line is always on the edge of
the after state. The curve is the iris curve: a soft start, a fast middle, a soft landing, so the
eye has time to read the before and again the after. The line fades in just before it moves and
leaves faster than it came; the exit keyframe has no `from`. The trail is a 16 percent accent
gradient on the after side only. Put the number the claim rests on (812 ms to 96 ms) at the same
spot in both states, and keep a shared reference (the SLO line) so the change is measured, not
just stated.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
