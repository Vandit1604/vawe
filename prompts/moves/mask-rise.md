# Mask rise

**Use when** a line of type enters from under an invisible edge. The mask box is taller than the
line: 0.25em below for descenders (g, y, p) and 0.1em above for accents, pulled back with negative
margins so the layout does not move. Without that padding the descenders are cut on the way up and
the settled word still looks clipped. Clip: [mask-rise.mp4](mask-rise.mp4). Demo:
[demo/mask-rise.html](demo/mask-rise.html).

```css
.mask { overflow: hidden; padding: 0.1em 0.1em 0.25em; margin: -0.1em -0.1em -0.25em; }
.mask > span { display: block; translate: 0 118%;
               animation-name: rise; animation-duration: 0.7s; animation-delay: var(--beat-1);
               animation-timing-function: var(--settle); animation-fill-mode: both; }
@keyframes rise { to { translate: 0 0; } }
```

```html
<h1 class="mask"><span>typography</span></h1>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
document.documentElement.style.setProperty('--settle', curveToLinear(CURVES.expoOut));
</script>
```

For two or three lines, one `.mask` per line and a 60 ms step in `animation-delay` between them.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
