# Exposure flash

**Use when** a screen film cuts between worlds and the cut must read as a camera over-exposing: the frame blows
out for 3 frames, the shot swaps inside the peak, and the new shot starts over-bright and settles in 0.15 s.
A 0.3 s white div at partial opacity is not this: it is a fade, not a flash. Clip:
[exposure-flash.mp4](exposure-flash.mp4). Demo: [demo/exposure-flash.html](demo/exposure-flash.html).
The helper is `core/motion/exposure.js`. The flash is a real exposure change, not a CSS look. The glow, mask and
colour fringe of a screen are lens work: do not fake them with CSS (a stripe layer, a blurred copy, a colour offset).

```html
<div id="host"><div class="shot">...</div><div class="shot">...</div></div>
<div id="white" style="position:absolute;inset:0;background:#fff;opacity:0"></div>
<script type="module">
import '../../core/engine/page-api.js';
import { flashAt } from '../../core/motion/exposure.js';
const CUTS = [0.7, 1.3];
vawe.onFrame((t) => {
  const { white: w, brightness, shot } = flashAt(t, CUTS);   // { fps: 30, frames: 3, peak: 0.75, over: 2, settle: 0.15 }
  shots.forEach((s, i) => s.toggleAttribute('data-on', i === shot));
  host.style.filter = brightness === 1 ? 'none' : `brightness(${brightness})`;
  white.style.opacity = w;
});
</script>
```

Sound: a short noise hit at each cut (default gain).

- The peak is `frames / fps` seconds centred on the cut: white at 0.75 alpha lifts a mean luma of 60 to about 200.
  `shot` counts the cuts passed, so the swap happens in the middle of the peak and the viewer never sees it.
- After the peak the shot is at `brightness(2)` and eases to 1 on a squared curve over `settle` s.
- Safety: `flashAt` flashes at most 3 cuts in any one second (`flashCuts`). A fourth cut in that second still
  cuts, without the flash. Keep flashes to a few per film; they are accents.
- Measured on the clip (60 fps): mean luma 27 before the cut, 203 to 208 in the peak, 67 on the first frame
  after it, then 38 after 0.15 s.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
