# Letter 3D swap

**Use when** a line of lowercase or sentence-case type must turn over as a set of boxes: every
character is a small cube that rolls 90 degrees about its own centre and shows the same character on
the next face, left to right. It is a port of the `letter-3d-swap` component of fancy. The hover
trigger becomes a time: `at` is the second the roll starts. Clip: [letter-3d-swap.mp4](letter-3d-swap.mp4).
Demo: [demo/letter-3d-swap.html](demo/letter-3d-swap.html).

The function is in the demo page (about 45 lines): copy it with the CSS. The roll is one Web
Animation per character, so the renderer seeks it; only the DOM and the delays are built in script.

```css
.l3 { display: flex; flex-wrap: wrap; position: relative; }
.l3-word { display: inline-flex; }
.l3-box { transform-style: preserve-3d; }                    /* one per character: the cube */
.l3-face { backface-visibility: hidden; height: 1lh; background: var(--ground); color: var(--ink); }
.l3-front { position: relative; }
.l3-second { position: absolute; top: 0; left: 0; }
```

```js
import { motionSpringEasing } from '../../core/motion/motion-spring.js';
// letter3dSwap(el, text, { rotateDirection, stagger, from, spring, at, seed })
letter3dSwap(title, 'Set your mind to it', { rotateDirection: 'top', stagger: 0.03, spring: { stiffness: 160, damping: 25 }, at: 0.2 });
// per cube: box.animate([{ transform: initial }, { transform: 'rotateX(90deg)' }],
//   { delay: (at + i * stagger) * 1000, duration, easing, fill: 'both' })  with { duration, easing } = motionSpringEasing(spring)
// and one zero-length animation sets rotateX(0deg) rotateY(0deg) when the last cube ends
```

Sound: none.

## The numbers (the original's defaults)

- Spring: stiffness 300, damping 30, mass 1 by default; the demo uses 160 and 25 with 0.03 s stagger.
  The easing is a 70-point `linear()` curve that `motionSpringEasing` builds the way the motion
  library does for the Web Animations API (the same string, to four decimals, as the live site).
  The spring ends at 0.7 s for 160 and 25 (rest check, not a fixed duration).
- `staggerDuration` 0.05 s. `staggerFrom` is `first`, `last`, `center`, `random` or an index; center
  is `floor(total / 2)` over the characters without spaces; random draws one centre per character.
- `rotateDirection`: `top` (`rotateX(90deg)`), `right` (`rotateY(90deg)`), `bottom` (`rotateX(-90deg)`),
  `left`. Quirk of the original, kept: `left` rolls the same way as `right`; only the second face differs.
- The cube starts pushed back by half a line height (`translateZ(-0.5lh)`). The roll goes from that
  matrix to the bare rotation, so the cube also moves forward by 0.5lh while it turns. There is no
  perspective: the faces are flat and the turn reads as a squash and a flip.
- The faces need an opaque `background` equal to the ground, or the back face shows through.
- After the last cube ends, all cubes reset to `rotateX(0deg) rotateY(0deg)`: the same pixels.
- Word wrapping: words are `inline-flex` boxes in a wrapping flex row, so a long line breaks between words.

## Fidelity

Checked against the live component at 60 fps: the Web Animation time was set frame by frame on both
pages (the live page runs it on the browser clock). The computed transform matrix of each of the 15
cubes, over the first 66 frames, matches the live page exactly (largest difference 0.0000 in every
matrix entry). The page layout matches to 0.01 px, and the frames match to an SSIM of 0.94; the rest
is font smoothing. The reference shows a fallback serif because the component's own font rule is not
valid, and this move uses your face.

## The common mistake

Adding `perspective` to look more 3D. The original has none, and the faces are flat with a hidden back,
so a perspective on the line changes the look of every cube. Add it on purpose, and look at a frame
mid-roll before you keep it.

Credit: port of fancy by Daniel Petho, MIT, https://github.com/danielpetho/fancy
(component `letter-3d-swap`, https://www.fancycomponents.dev/docs/components/text/letter-3d-swap).
