# Stack cover

**Use when** the next shot is a new panel that should feel like a sheet laid over the last one. The
sheet slides in from the side; the old shot moves a quarter as far, shrinks a little and dims, so the
two sit at different depths. The detail that sells it is the shadow: it is cast by the sheet's leading
edge and grows wider and darker as the overlap grows. Clip: [stack-cover.mp4](stack-cover.mp4). Demo:
[demo/stack-cover.html](demo/stack-cover.html).

```js
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const ease = curveToLinear(CURVES.expoOut), W = innerWidth;
const opt = { duration: 1000, delay: 200, easing: ease, fill: 'both' };
sheet.animate([{ translate: `${W}px 0` }, { translate: '0 0' }], opt);
old.animate([{ translate: '0 0', scale: 1 }, { translate: `${-W * 0.24}px 0`, scale: 0.96 }], opt);
dim.animate([{ opacity: 0 }, { opacity: 0.4 }], opt);                       // #14103a over the old shot
cast.animate([{ opacity: 0.25, scale: '0.35 1' }, { opacity: 1, scale: '1 1' }], opt);   // right:100% of the sheet, transform-origin: right
copy.animate([{ translate: '9vw 0' }, { translate: '0 0' }], { ...opt, duration: 1100 }); // lags the sheet
// blur only the sheet body (not the cast): stdDeviation = 0.25 x one frame's travel, x only, set in vawe.onFrame as in push-blur
```

Sound: none; a soft cut stays soft.

The `cast` is a 34 vw wide gradient that falls off in 5 stops (0.34 to 0 alpha), not a `box-shadow`: a
box-shadow cannot grow with progress. Keep it outside the blurred element or the blur turns it to bands.
Make the sheet 4.4 percent wider than the frame and start it that far left, so its rounded leading
corners are off screen once it lands. The old shot must move about a quarter as far: equal speeds read
as a slide, not a stack. Let the copy lag the sheet by 9 vw so the sheet is a surface with things on it.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
