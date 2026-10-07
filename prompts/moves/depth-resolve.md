# Depth resolve

**Use when** a line has two depths: the words that matter are near and sharp, the words around them
are far, small and soft, and they resolve as the camera arrives. The same call is a focus pull on any
element: a blur that clears. It guides the eye (near first, far second) and makes a held frame richer.

```js
import { focus, parallax, stagger } from '../../core/motion/presets.js';
const far = document.querySelectorAll('.far');          // small, soft ink, e.g. 7% of frame height
parallax([[ground, 0.4], [farLayer, 0.7], [mid, 1]], { kind: 'pull', at: 2.9, duration: 1.4, from: 1.15 });
stagger(document.querySelectorAll('.near'), { at: 3.0, band: 'professional', from: '0 0.5em' });
far.forEach((el, i) => focus(el, { at: 3.5 + i * 0.12, blur: 9, scale: 0.8, opacity: 0.4, duration: 0.9 }));
// a plain focus pull: focus(card, { at: 1, blur: 14 })
```

Sound: none.

`focus` clears `blur` px from a smaller (`scale`) and fainter (`opacity`) start on `EASE.settle`, which
never overshoots; the far words settle after the near ones, 0.1 s apart, ending as the camera stops.
Far words rest at an ink with 4.5:1 contrast on the ground (the dev check reads the pixels), so do not fade
them to a ghost: depth is size and softness, not low contrast. Keep far text off the near text's box.
See also [rack-focus](rack-focus.md) for a focus that shifts between two subjects.
