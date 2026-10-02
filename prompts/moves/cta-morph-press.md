# CTA morph press

**Use when** the film closes from "this is who we are" to "this is what you do": one brand plate changes
shape into a confident button (width, height and radius on one spring, the label crossfading inside), a
cursor arrives on a bowed path, presses with a dip and a release spring, and the button shows the result
(a confirmed state). One action, one element, no surrounding UI. Clip:
[cta-morph-press.mp4](cta-morph-press.mp4). Demo: [demo/cta-morph-press.html](demo/cta-morph-press.html).

```css
.morph { position: absolute; left: 50%; top: 50%; translate: -50% -50%; overflow: hidden; }   /* one element; width, height and radius are set per frame */
.lbl { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; white-space: nowrap; }   /* plate, go and ok labels stacked */
```

```js
import { spring } from '../../core/motion/springs.js';
import { easeFn } from '../../core/motion/presets.js';
const at = { morph: 0.9, go: 1.25, arrive: 2.25, down: 2.35, release: 2.5 };   // seconds
const plate = { w: 80 * u, h: 36 * u, r: cardRadius }, button = { w: 66 * u, h: 17 * u, r: 8.5 * u };   // u = frame height / 100

vawe.onFrame((t) => {
  // one pop drives all three; the radius follows, so the plate is the button at every frame between
  const m = easeFn('pop')(clamp((t - at.morph) / 0.7));
  el.style.width = `${lerp(plate.w, button.w, m)}px`;
  el.style.height = `${lerp(plate.h, button.h, m)}px`;
  el.style.borderRadius = `${Math.max(0, lerp(plate.r, button.r, m))}px`;
  // colour follows later than size, and the labels swap one after the other, never both at half opacity
  plateLabel.style.opacity = 1 - seg(t, at.morph, at.morph + 0.3);
  goLabel.style.opacity = seg(t, at.morph + 0.5, at.morph + 0.8) * (1 - seg(t, at.release, at.release + 0.1));
  okLabel.style.opacity = seg(t, at.release + 0.1, at.release + 0.28);

  // the press: a fast dip, then a spring back that overshoots a little
  const pressed = seg(t, at.down, at.down + 0.09) - spring(t - at.release, 300, 13);
  el.style.scale = 1 - pressed * 0.04;

  // the cursor rides a quadratic bow and decelerates onto the label, dips with the button and leaves
  const [x, y] = bezier(start, bow, target, seg(t, at.go, at.arrive, easeFn('landSoft')));
  cursor.style.translate = `${x}px ${y + pressed * 0.9 * u}px`;
  cursorSvg.style.scale = 1 - pressed * 0.16;
});
```

Sound: droplet at 2.35 s into the move, on the press (default gain); nothing on the morph or the approach.

The button is a real size (about 66 by 17 units, a third of the frame wide), never a chip beside the plate.
Radius, width and height share one pop, so nothing pops; the colour change starts after the size
change so the plate is never a muddy half-colour. The two button labels swap in sequence. The release stays a physical spring (`spring(t, 300, 13)`): no `EASE` segment rings back past the press. The bow comes
from the quadratic control point, and `land` on the parameter makes the cursor decelerate into the
press. The result (a check and "You're in" on the dark paper colour) is what makes the press read as a
product moment. Keep one focal point: the cursor leaves before the hold.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
