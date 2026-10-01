# Photo parallax 2.5D

**Use when** a still photo must feel like a place the camera enters, not a flat picture with a zoom.
The one photo is cut into three CSS 3D layers (far, subject, near) by `clip-path`; the camera pushes
forward and drifts sideways, and each layer moves by its depth. No video, no depth map. Clip:
[photo-parallax-2.5d.mp4](photo-parallax-2.5d.mp4). Demo: [demo/photo-parallax-2.5d.html](demo/photo-parallax-2.5d.html).

```css
.stage { position: absolute; inset: 0; perspective: 180vh; overflow: hidden; }
.rig   { position: absolute; inset: 0; transform-style: preserve-3d; }
.layer { position: absolute; left: 50%; top: 50%; width: 106vw; aspect-ratio: 3 / 2; translate: -50% -50%;
         transform: translateZ(calc(var(--z) * 1vh)) scale(calc((180 - var(--z)) / 180)) translateY(10vh); }
.far { --z: -50; }                                                   /* the whole photo: sky and peaks */
.subject { --z: 0;  clip-path: polygon(0% 14.5%, 29.7% 6.6%, /* ...the ridge line... */ 100% 9%, 100% 100%, 0% 100%); }
.near    { --z: 30; clip-path: polygon(0% 76.6%, 51.6% 64.1%, /* ...the rocks and grass... */ 100% 81.3%, 100% 100%, 0% 100%); }
```

```html
<div class="stage"><div class="rig">
  <div class="layer far"><img src="meadow.jpg"></div>      <!-- the same file three times -->
  <div class="layer subject"><img src="meadow.jpg"></div>
  <div class="layer near"><img src="meadow.jpg"></div>
</div></div>
```

```js
import '../../core/engine/page-api.js';
const rig = document.querySelector(".rig"), dur = 3, push = 14, drift = 1.6;                      // camera travel in vh, sideways drift in vw
const ease = (u) => 0.5 * u + 0.5 * u * u * (3 - 2 * u);
vawe.onFrame((t) => {
  const p = ease(Math.min(1, Math.max(0, t / dur))), vh = innerHeight / 100, vw = innerWidth / 100;
  rig.style.transform = `translate3d(${((1 - 2 * p) * drift * vw).toFixed(3)}px, ${(2 * vh * (1 - p)).toFixed(3)}px, ${(push * p * vh).toFixed(3)}px)`;
});
```

Sound: none; the push is space. A soft room tone is the only thing that helps.

A layer at depth `z` is drawn at `P / (P - z - travel)` of its size, so near layers grow and shift
more than far ones: that difference is the parallax. The `scale()` pays the depth back at rest, so
the three cuts line up as one photo on frame 0. The vertical offset sits after the `scale()` in the
same transform, so every depth moves by the same amount; an offset on `top` or `translate` would
split the layers. Gaps cannot open at a cut because the far layer is the whole photo and the subject
layer is the whole photo under its mask: a moved edge shows the same picture a few pixels off, never
a hole. Overscale every layer (106 vw for a 100 vw frame) so the drift and the push never reach an
edge; the demo keeps 1 vw of margin at the worst frame. Cut along real silhouettes (a ridge, a rock
line). Keep the depth steps small (50 vh between far and subject, 30 between subject and near) and
the push at 15 vh or less: a larger step makes the cut edges ghost. Use a photo at least as wide as
the frame, or the push shows pixels. Never use a photo with a real brand, masthead or person.
Fractional transforms (`toFixed(3)`, never `Math.round`) keep the move smooth at 60 fps.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
