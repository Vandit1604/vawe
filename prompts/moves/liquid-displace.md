# Liquid displace

**Use when** a title should arrive as if seen through moving water and then settle to perfectly sharp
type: an SVG turbulence map bends the letters, and the bend drains to zero. Clip:
[liquid-displace.mp4](liquid-displace.mp4). Demo: [demo/liquid-displace.html](demo/liquid-displace.html).

Use on one title per film. The type must hold readable and sharp for at least 1.2 s after it settles.

```html
<svg width="0" height="0" style="position:absolute"><filter id="liquid" x="-10%" y="-30%" width="120%" height="160%" color-interpolation-filters="sRGB">
  <feTurbulence id="noise" type="fractalNoise" baseFrequency="0.004 0.02" numOctaves="2" seed="7" result="n"/>
  <feGaussianBlur in="n" stdDeviation="4" result="s"/>
  <feDisplacementMap id="disp" in="SourceGraphic" in2="s" scale="0" xChannelSelector="R" yChannelSelector="G"/>
</filter></svg>
<h1 id="title" style="filter:url(#liquid)">Tidepool</h1>
<script type="module">
import '../../core/engine/page-api.js';
import { CURVES } from '../../core/motion/springs.js';
const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vh'));
vawe.onFrame((t) => {                                         // the seek time drives the filter, never a SMIL animate
  const left = 1 - CURVES.expoOut(Math.min(1, Math.max(0, (t - 0.05) / 1.1)));   // 1 at the start, 0 at 1.15 s
  disp.setAttribute('scale', (vh * 0.3 * left).toFixed(2));
  noise.setAttribute('baseFrequency', `${(0.004 + 0.012 * left).toFixed(5)} ${(0.02 + 0.03 * left).toFixed(5)}`);
  title.style.filter = left < 0.002 ? 'none' : 'url(#liquid)';   // settled type is the plain text, not a zero-scale resample
});
</script>
```

Sound: none; a slow settle has no event to mark.

- `feDisplacementMap` moves each pixel by `scale` times the noise channel minus one half, so the scale
  is the amount of bend. Tie it to the frame height so the bend holds at any size (0.3 of `--vh` here).
- Drive the filter from `vawe.onFrame`, which gets the seek time. A live `<animate>` (SMIL) runs on the
  document clock, which the renderer does not seek, so every frame would come out the same.
- `baseFrequency` falls with the scale, so the ripples widen as they calm. Wide ripples read as water;
  a high frequency that stays high reads as a glitch.
- The blur on the noise (`stdDeviation` 4) smooths the map. Without it the letter edges tear into
  stair steps, which reads as a broken filter.
- Switch the filter off when the scale is zero. The type is then the browser's own text rendering.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
