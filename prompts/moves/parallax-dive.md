# Parallax dive

**Use when** a title should arrive by flying into a scene, not by appearing in it. Layers sit at real
depths in CSS 3D; the camera moves forward through them, so near layers rush past the frame edge, mid
cards drift outward and the far dots barely move. The title starts small and deep and ends at scale 1.
The speed differences are the depth; nothing is faked with per-layer offsets. Clip:
[parallax-dive.mp4](parallax-dive.mp4). Demo: [demo/parallax-dive.html](demo/parallax-dive.html).

```css
.stage { position: absolute; inset: 0; perspective: 80vh; perspective-origin: 50% 50%; }
.rig   { position: absolute; inset: 0; transform-style: preserve-3d; }
.layer { position: absolute; left: 50%; top: 50%;
         translate: calc(var(--x) * 1vw - 50%) calc(var(--y) * 1vh - 50%);
         transform: translateZ(calc(var(--z) * 1vh)); }   /* depth in vh: --z -240 far, -120 title, +30 near */
```

```js
import '../../core/engine/page-api.js';
import { CURVES } from '../../core/motion/springs.js';
const t0 = 0.1, dur = 1.8, dive = 120;                     // dive: camera travel in vh, so the title (z -120) ends at z 0
const ease = (u) => 0.35 * u + 0.65 * CURVES.expoOut(u);
vawe.onFrame((t) => {
  const p = ease(Math.min(1, Math.max(0, (t - t0) / dur))), vh = innerHeight / 100;
  rig.style.transform = `translate3d(${-3 * p * vh * 0.5625}px, 0, ${dive * p * vh}px)`;   // a small sideways drift adds parallax
  near.forEach((n) => { n.style.opacity = Math.min(1, Math.max(0, (52 - dive * p) / 22)); });
});
```

A layer at depth `z` is drawn at `P / (P - z - travel)` of its size, `P` being the perspective (80 vh),
so a layer with `z + travel` near 80 vh fills the frame: fade the near layers out before that, as the
last line does. Put every depth in vh, not px, or the scene changes with the aspect. Give the camera a
sideways drift of a few vw so the parallax shows in two axes. Keep the title the only large bright
thing; the cards are context and stay dim. No blur is needed, the speed differences carry the depth.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
