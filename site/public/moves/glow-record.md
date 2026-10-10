# Glow record

**Use when** an alert turns into a live state: a notification leads to a recording, a call or a live stream. The red of a notification
badge floods the frame from the badge, reaches the farthest corner in about 0.35 s, and then gathers back into one point: the red dot of
the recording light in the next scene. The red is the handoff object. The swap of the scenes happens inside the full-frame red, so the
viewer never sees it. Clip: [glow-record.mp4](glow-record.mp4). Demo: [demo/glow-record.html](demo/glow-record.html).

```js
const R_FULL = (FAR * 1.02) / (1 - FEATHER);                               // the opaque core must reach the farthest corner
vawe.onFrame((t) => {
  const e = land(clamp((t - 1.35) / 0.35)), g = settle(clamp((t - T_GATHER) / 0.85));
  const cx = lerp(SRC.x, DST.x, g), cy = lerp(SRC.y, DST.y, g);            // badge to recording light
  const R = t < T_GATHER ? lerp(SRC.r, R_FULL, e) : lerp(R_FULL, DST.r, g);
  const f = Math.max(R * 0.3, 0.25 * u);
  flood.style.background = `radial-gradient(circle at ${cx}px ${cy}px, rgba(255,45,58,0.92) ${Math.max(R - f, 0)}px, rgba(255,45,58,0) ${R}px)`;
  host.style.filter = `brightness(${1 + 0.45 * lit})`;                     // the frame over-exposes under the light
  shotA.style.visibility = t >= T_FULL ? 'hidden' : 'visible';
  shotB.style.visibility = t >= T_FULL ? 'visible' : 'hidden';
});
```

Sound: a short ping when the badge count rolls; one low swell that stops dead when the red is full; nothing on the gather.

- The light is the exposure-flash recipe with a red gel ([exposure-flash](exposure-flash.md)): the layer is `mix-blend-mode: screen`, so it
  adds light to the screen, and the host takes `filter: brightness()` up to 1.45, so the UI over-exposes where the red lands. Do not paint
  the glow with a `box-shadow` or a blurred copy of the badge. `core/surfaces/lens.js` bloom has 6 levels and a glow of a few hundred pixels at
  most, so it cannot reach the far corner; use it for the small glow of the end dot when the page has a lens.
- Timing: the badge count rolls 2 to 3 on `EASE.land` in 0.2 s; the badge swells to 1.35x in the 0.15 s before the flood (anticipation);
  the flood reaches the farthest corner in 0.35 s on `EASE.land`; it holds 0.08 s; it gathers in 0.85 s on `EASE.settle`. The flood is fast
  because it is the exit of scene A. The gather is slow because it is the arrival of the recording light.
- The soft edge is 30 percent of the radius while the light is large, and it shrinks with the radius to 0.25 u, so the last frames of the gather are a crisp dot.
- Speed: the centre moves from the badge to the dot on the same curve as the radius, so the red contracts toward the dot, not toward
  the middle. The scene swap is at the first full-frame frame, before the hold; the viewer sees red on red.
- The end dot is its own element, the same colour and size as the disc at the end of the gather and 0.05 s under it. It then pulses at 1 Hz
  between 55 and 100 percent opacity, so the hold is alive; the timecode and the level bars run beside it.
- What goes wrong: a flood slower than 0.5 s reads as a fade. A flood that stops before the corner leaves a wedge of A. A recording dot of
  another size or red pops when the disc ends. Keep a full-frame red hold under 0.1 s: longer is a strobe.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
