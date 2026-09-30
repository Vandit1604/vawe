# Clip expand from a point

**Use when** a panel, a capture or a colour field grows out of one point. Put something at that point
first (a dot, a cursor, the word that becomes the panel) so the eye is already there when the
expansion starts. `--x` and `--y` name the point once. Clip: [clip-expand.mp4](clip-expand.mp4).
Demo: [demo/clip-expand.html](demo/clip-expand.html).

```css
:root { --x: 22%; --y: 74%; }
.dot { position: absolute; left: var(--x); top: var(--y); width: 2vh; height: 2vh; margin: -1vh 0 0 -1vh;
       border-radius: 50%; background: var(--accent); }
.panel { position: absolute; inset: 0; clip-path: circle(0% at var(--x) var(--y));
         animation-name: expand; animation-duration: 0.8s; animation-delay: var(--beat-2);
         animation-timing-function: var(--settle); animation-fill-mode: both; }
@keyframes expand { to { clip-path: circle(140% at var(--x) var(--y)); } }
```

```html
<div class="dot"></div>
<div class="panel">one point, one panel</div>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
document.documentElement.style.setProperty('--settle', curveToLinear(CURVES.expoOut));
</script>
```

For a rectangular reveal use `inset()` with the same origin: `clip-path: inset(26% 78% 74% 22%)` to
`inset(0)`. A circle reads as a burst, an inset as a window opening.
