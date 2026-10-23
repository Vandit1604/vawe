# Luma matte dissolve

**Use when** the next shot should arrive through its own light: its bright areas appear first, its
midtones follow and its dark ground fills in last, so a lit subject grows out of the previous shot
along its own contours. The matte is not a shape: it is the next shot's luminance, thresholded by a
value that falls from above white to below black. The detail that sells it is that the edge is the
picture: a bright sky opens along its own cloud line, and the dark frame around it comes last. Clip: [luma-matte-dissolve.mp4](luma-matte-dissolve.mp4).
Demo: [demo/luma-matte-dissolve.html](demo/luma-matte-dissolve.html).

```html
<filter id="luma" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2126 0.7152 0.0722 0 0" result="L"/>
  <feComponentTransfer in="L" result="M"><feFuncA id="ramp" type="linear" slope="8" intercept="-8"/></feComponentTransfer>
  <feComposite in="SourceGraphic" in2="M" operator="in"/>
</filter>
```

```js
const S = 8, t0 = 1.6, dur = 1.4;                       // S: the edge is 1/S of the luminance range wide
const sweep = (u) => 1 - (1 - u) ** 1.7;
shotB.style.filter = 'url(#luma)';                      // shot A sits under it, unchanged
vawe.onFrame((t) => {
  const u = Math.min(1, Math.max(0, (t - t0) / dur)), th = 1 + 1 / S - (1 + 2 / S + 0.02) * sweep(u);
  ramp.setAttribute('intercept', (-S * th).toFixed(4));   // alpha = S x (luminance - th): visible where the pixel is brighter than th
});
```

Sound: none; the next shot arrives through its own light, and a soft cut stays soft.

The threshold starts above white plus one edge width and ends below black minus one edge width, so
the first frame shows nothing and the last shows everything, with no pop. Shot B needs a spread of
brightness to read: a white subject, a mid-tone falloff and a dark ground. A flat, evenly lit shot
dissolves as one block, and a shot that is bright everywhere arrives on the first frames. Give the
curve a power near 1.7 and not an exponential: the dark ground holds most of the pixels, and a curve
that idles at the end leaves them undecided for too long. Read the filter in sRGB
(`color-interpolation-filters`), or the linear-light luminance shifts every threshold.

The clip (5 s, silent) shows two real photographs, as an editor cuts them. A misty mountain path (shot A) dissolves into a seaside shelter at dusk (shot B). The sky of B is its brightest part, so a box of sunset sky opens first in the mist, then the sea, then the grass. The dark timber frame fills in last. The clip draws no shape, glow or orb: the picture is the matte. Both shots fill the frame and push in 3.5 percent over 5 s, like footage from a locked-off camera. The matte runs from 1.6 s to 3.0 s; both shots hold before and after. Photo credits are in `demo/assets/photos/credits.json`.
