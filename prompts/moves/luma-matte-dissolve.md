# Luma matte dissolve

**Use when** the next shot should arrive through its own light: its bright areas appear first, its
midtones follow and its dark ground fills in last, so a lit subject grows out of the previous shot
along its own contours. The matte is not a shape: it is the next shot's luminance, thresholded by a
value that falls from above white to below black. The detail that sells it is that the edge is the
picture: a lamp starts as a white point and widens along its own falloff, and the headline (white)
is up before the ground (near black). Clip: [luma-matte-dissolve.mp4](luma-matte-dissolve.mp4).
Demo: [demo/luma-matte-dissolve.html](demo/luma-matte-dissolve.html).

```html
<filter id="luma" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2126 0.7152 0.0722 0 0" result="L"/>
  <feComponentTransfer in="L" result="M"><feFuncA id="ramp" type="linear" slope="8" intercept="-8"/></feComponentTransfer>
  <feComposite in="SourceGraphic" in2="M" operator="in"/>
</filter>
```

```js
const S = 8, t0 = 0.3, dur = 1.0;                       // S: the edge is 1/S of the luminance range wide
const sweep = (u) => 1 - (1 - u) ** 1.7;
shotB.style.filter = 'url(#luma)';                      // shot A sits under it and dims to 0.55 and 0.96x
vawe.onFrame((t) => {
  const u = Math.min(1, Math.max(0, (t - t0) / dur)), th = 1 + 1 / S - (1 + 2 / S + 0.02) * sweep(u);
  ramp.setAttribute('intercept', (-S * th).toFixed(4));   // alpha = S x (luminance - th): visible where the pixel is brighter than th
});
```

The threshold starts above white plus one edge width and ends below black minus one edge width, so
the first frame shows nothing and the last shows everything, with no pop. Shot B needs a spread of
brightness to read: a white subject, a mid-tone falloff and a dark ground. A flat, evenly lit shot
dissolves as one block, and a shot that is bright everywhere arrives on the first frames. Give the
curve a power near 1.7 and not an exponential: the dark ground holds most of the pixels, and a curve
that idles at the end leaves them undecided for too long. Read the filter in sRGB
(`color-interpolation-filters`), or the linear-light luminance shifts every threshold.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
