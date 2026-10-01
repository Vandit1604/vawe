# Photo parallax 2.5D

**Use when** a still photo must feel like a place the camera enters, not a flat picture with a zoom.
One photo is cut into three layers (far, mid, near) as transparent webp files; the camera pushes in
and drifts sideways, and each layer moves by its depth, so a near rock slides over the hiker and the
valley behind it. No video, no depth map. Clip: [photo-parallax-2.5d.mp4](photo-parallax-2.5d.mp4).
Demo: [demo/photo-parallax-2.5d.html](demo/photo-parallax-2.5d.html).

```css
body { overflow: hidden; }
.layer { position: absolute; left: 50%; top: 46%; width: 112vw; aspect-ratio: 4 / 3; translate: -50% -50%; transform-origin: 46% 54%; }
.layer img { display: block; width: 100%; height: 100%; }          /* three webp cut-outs, 3000 px wide, same size and position */
```

```html
<div class="layer" id="far"><img src="ridge-far.webp"></div>      <!-- the whole scene, the hidden foreground filled by blur -->
<div class="layer" id="mid"><img src="ridge-mid.webp"></div>      <!-- the hiker and the middle rocks, cut at the horizon -->
<div class="layer" id="near"><img src="ridge-near.webp"></div>    <!-- the big left boulder and the ferns -->
```

```js
import '../../core/engine/page-api.js';
const rig = { far: { push: 0.04, drift: 0.8 }, mid: { push: 0.13, drift: 2.4 }, near: { push: 0.30, drift: 7.0 } };   // scale gained, sideways travel in vw
const dur = 3.4, ease = (u) => 0.5 * u + 0.5 * u * u * (3 - 2 * u);
vawe.onFrame((t) => {
  const p = ease(Math.min(1, Math.max(0, t / dur))), vw = innerWidth / 100;
  for (const [id, v] of Object.entries(rig)) {
    document.getElementById(id).style.transform = `translate3d(${(v.drift * vw * p).toFixed(3)}px, 0, 0) scale(${(1 + v.push * p).toFixed(5)})`;
  }
});
```

Sound: none; the push is space. A soft room tone is the only thing that helps.

Each layer has its own scale and drift: the far layer gains 4 percent and travels 0.8 vw, the mid
layer 13 percent and 2.4 vw, the near layer 30 percent and 7 vw. The ratio between near and far is
what the eye reads as depth, so keep it at 3x or more; the demo uses 7.5x on the push and 8.8x on
the drift. All layers share one `transform-origin` (a point on the subject), so at p = 0 they line up
as the original photo. Measured in the demo at 1280 px: the near layer travels 90 px sideways against 10 px for the far
layer, and the near boulder edge moves from x = 485 to 545 px toward the hiker.

Cut the layers once, in an image tool, with two rules. First, give every layer that sits over
another a hidden part that is filled by blur (the far layer under the mid cut, the mid layer under
the near cut): the cut then reveals soft out-of-focus ground, never a duplicate of the picture.
Second, put the near cut edge where the layer grows away from the origin. An edge that moves toward
the origin reveals the fill as a band; the first cut of this demo showed a brown bar along the
bottom for this reason. Overscale every layer (112 vw wide for a 100 vw frame) so the push and the
drift never reach an edge. Keep the source at 1.5x the largest displayed width or more: the demo
uses a 3000 px cut of a 5712 px photo, shown at most 1860 px wide (1.6x). The earlier 960 px
photo was soft at 1280 px. The card enters with [mask-rise](mask-rise.md) lines after the push has
started. Fractional transforms (`toFixed(3)`, never `Math.round`) keep the move smooth at 60 fps.
Never use a photo with a real brand, masthead or person; the hiker is seen from behind and the
photo is CC0 (`demo/assets/photos/credits.json`).

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
