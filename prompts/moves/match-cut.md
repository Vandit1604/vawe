# Match cut

**Use when** the film changes scene and one shape can bridge it: shot A holds a shape, shot B holds
the same shape at the same place, size and angle, doing a different job. Here a spinner ring on the
dark ground becomes the completed ring around "41 s" on the light one. The world flips in one
millisecond; the ring does not move, so the eye reads a change of meaning, not a cut. Clip:
[match-cut.mp4](match-cut.mp4). Demo: [demo/match-cut.html](demo/match-cut.html).

```html
<section class="shot a"><svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" pathLength="100" stroke-dasharray="28 72"/></svg></section>
<section class="shot b"><svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" pathLength="100" stroke-dasharray="28 72"/></svg></section>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut);
const T = 1250, cut = 500;   // ms
document.querySelector('.b').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: cut, fill: 'both' });
// one angle track for both rings: linear before the cut, expoOut after it, starting at the same speed
const spin = [{ rotate: '0deg' }, { rotate: '220deg', offset: cut / T, easing: settle }, { rotate: '272deg' }];
document.querySelectorAll('.ring').forEach((r) => r.animate(spin, { duration: T, fill: 'both' }));
document.querySelector('.b circle').animate([{ strokeDasharray: '28 72' }, { strokeDasharray: '100 0' }],
  { duration: 1000, delay: cut, easing: settle, fill: 'both' });
</script>
```

Three things must match across the cut: position, size and angle. The ring gets one `rotate` track
applied to both copies, so the angle cannot jump; the arc length (28 of 100) is the same in both.
The speed matches too: the linear turn is 440 degrees a second, and the `expoOut` tail is sized so
its first frame moves as fast (distance x 6.5 / duration). Change only what the shot means (ground,
colour, the words). Put the cut on a beat, and start B's new elements 60 ms after it, never on it.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
