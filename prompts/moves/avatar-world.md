# Avatar world

**Use when** a person, a brand or a place is the way into the next scene: a profile, a creator page, a case study. A round avatar in a card
grows until its circle is larger than the frame, and its picture becomes the ground of the next scene. The avatar art is vector (an SVG
illustration or a gradient), so it stays sharp at 12 times its size. Clip: [avatar-world.mp4](avatar-world.mp4). Demo: [demo/avatar-world.html](demo/avatar-world.html).

```js
const D = 22 * u;                                                          // the avatar in the card
const SMAX = (Math.hypot(W, H) / 2 / (D / 2)) * 1.03;                      // its radius reaches the farthest corner from the frame centre
avatar.style.cssText = `width:${D}px; height:${D}px; border-radius:50%; overflow:hidden`;   // the svg inside is the art
vawe.onFrame((t) => {
  const k = clamp((t - T.grow) / 0.95), g = 0.3 * k * k * (3 - 2 * k) + 0.7 * easeFn('swap')(k);
  const cx = lerp(START.x, W / 2, g), cy = lerp(START.y, H / 2, g);        // the circle travels to the middle while it grows
  avatar.style.transform = `translate(${cx - D / 2}px, ${cy - D / 2}px) scale(${lerp(1, SMAX, g)})`;
  card.style.opacity = lerp(1, 0.55, g);
});
```

Sound: one soft pluck on the press; a rising swell under the growth that stops when the circle covers the frame.

- The art must be drawn for the end frame too. At the end the frame is a window onto the middle of the art: for 16:9 it shows about
  half of the art's height and 87 percent of its width. Keep the horizon, the sun and the main shapes in the middle half; sky and floor
  at the top and bottom are cropped away. The `slice` setting on the SVG keeps the art square.
- Do not set `will-change: transform` on the avatar. Chromium keeps the first raster and scales it, and the ground is soft. Without it the
  vector is drawn again at each scale and stays crisp.
- The press has a cause: a cursor lands on the avatar, the avatar dips to 95 percent, and the growth starts 0.12 s later. The cursor
  leaves faster than it came (0.3 s, `EASE.launch`).
- Growth takes 0.95 s: 30 percent smoothstep and 70 percent `EASE.swap`, so it starts slow and is fastest in the middle. The card dims to 55
  percent under it. Scene B text arrives 0.83 s after the growth starts, 0.15 s apart (name, count, button), each rising from 4 to 6 u on `EASE.land`.
- The ground keeps living after the handoff: the sun climbs 3.5 percent of the art height over 2.6 s. It is the same element that
  was in the avatar, so the ground is the avatar, not a copy.
- Z-order: card z 1, avatar z 3, scene B text z 4, cursor z 10. Use an illustration or a generated gradient, never a photo of a real person.
- What goes wrong: a circle clip over a static background is an iris ([iris-wipe](iris-wipe.md)). Here the picture grows with the
  circle. If the avatar does not move to the centre while it grows, the frame shows an off-centre part of the art.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
