# Shape trace morph

**Use when** a brand mark should be built like an After Effects shape layer: a thin outline draws on
(trim paths), fills as the stroke finishes, then the outline morphs into the real mark on one spring.
Clip: [shape-trace-morph.mp4](shape-trace-morph.mp4). Demo:
[demo/shape-trace-morph.html](demo/shape-trace-morph.html).

Use once per film, as the brand reveal. For a mark that is a line only, use [mark-trace.md](mark-trace.md).

```html
<svg viewBox="0 0 100 100"><path id="shape" pathLength="1" d="M50 10 L84 30 L84 70 L50 90 L16 70 L16 30 Z"/></svg>
<style>
path { fill: var(--accent); fill-opacity: 0; stroke: var(--ink); stroke-width: 2.5; stroke-linejoin: round;
       stroke-linecap: round; stroke-dasharray: 1 2; stroke-dashoffset: 1; }
</style>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const glide = curveToLinear((u) => u * u * (3 - 2 * u)), settle = curveToLinear(CURVES.expoOut), spring = curveToLinear(CURVES.spring);
const FROM = 'M50 10 L84 30 L84 70 L50 90 L16 70 L16 30 Z';
const MARK = 'M58 8 L22 54 L44 54 L38 92 L80 40 L56 40 Z';   // 1 M, 5 L, 1 Z: same as FROM
shape.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900, delay: 100, easing: glide, fill: 'both' });
shape.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 380, delay: 760, easing: settle, fill: 'both' });
shape.animate([{ d: `path("${FROM}")`, stroke: 'var(--ink)' }, { d: `path("${MARK}")`, stroke: 'var(--accent)' }],
  { duration: 800, delay: 1050, easing: spring, fill: 'both' });
</script>
```

Sound: droplet at 1.05 s, when the outline starts to morph (default gain).

- Both paths need the same command count, in the same order (here `M`, five `L`, `Z`). The browser
  interpolates command by command; a different count or type snaps at the first frame instead of morphing.
- `pathLength="1"` with `stroke-dasharray: 1 2` makes one offset value trim any shape, so the dash
  stays correct while the path changes length during the morph. A real-length dash would leave a gap.
- Order in time: trace 0.1 to 1.0 s on a smoothstep (even speed, soft ends), fill from 0.76 s so it
  arrives as the stroke closes, morph from 1.05 s on the spring. The stroke turns accent in the same
  animation, so the outline is gone when the mark lands.
- Pair the points by position: the point at the top of the outline should become the top of the mark,
  or the morph twists. Add a wordmark after the spring has landed, never during it.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
