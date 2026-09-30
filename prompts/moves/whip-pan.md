# Whip pan

**Use when** the next shot is to the side of this one and a cut would feel abrupt. Both shots sit on
one horizontal strip; the strip slides one screen width and a horizontal blur follows its speed, so at
the fastest frame both shots are a streak and the eye never sees the seam. The pan eases in, peaks at
the midpoint and lands soft. Clip: [whip-pan.mp4](whip-pan.mp4). Demo: [demo/whip-pan.html](demo/whip-pan.html).

```html
<svg width="0" height="0" style="position: absolute"><filter id="motion" x="-10%" width="120%"><feGaussianBlur id="mb" stdDeviation="0 0"/></filter></svg>
<div class="strip" style="width: 200vw; filter: url(#motion)"><section class="shot a"></section><section class="shot b"></section></div>
<script type="module">
import '../../core/engine/page-api.js';
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const E = CURVES.expoOut;
const whip = (u) => (u < 0.5 ? 0.5 * (1 - E(1 - 2 * u)) : 0.5 + 0.5 * E(2 * u - 1));
const strip = document.querySelector('.strip'), blur = document.getElementById('mb');
const t0 = 0.3, dur = 0.5, travel = window.innerWidth;
strip.animate([{ translate: '0 0' }, { translate: `${-travel}px 0` }],
  { duration: dur * 1000, delay: t0 * 1000, easing: curveToLinear(whip), fill: 'both' });
vawe.onFrame((t) => {
  const u = Math.min(1, Math.max(0, (t - t0) / dur)), du = 1 / 240;
  const slope = (whip(Math.min(1, u + du)) - whip(Math.min(1, u))) / du;
  const pxPerFrame = (slope / dur) * travel / 60;
  blur.setAttribute('stdDeviation', `${(u > 0 && u < 1 ? pxPerFrame * 0.4 : 0).toFixed(2)} 0`);
});
</script>
```

The curve is `expoOut` mirrored: slow start, full speed at 50 percent, soft landing. At 0.5 s the
peak is about a fifth of the screen width per frame, so a blur of 0.4 of that (x only) turns text into
a streak without turning the frame to grey. Under 0.35 s the pan reads as a cut; over 0.7 s it reads
as a slow pan and the streak is gone. Let shot A keep moving until the pan starts (the bars here
still fill) and let shot B land with a small settle of its own. Change axis at the next seam: after a
whip to the left, do not whip left again.
