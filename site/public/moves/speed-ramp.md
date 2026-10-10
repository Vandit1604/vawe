# Speed ramp

**Use when** both sides of a cut move the same way: a line shrinks toward the centre and the next word
grows out of that same push, or one panel slides off left and the next slides in from the right. The
outgoing content accelerates into the cut, the cut lands at the peak speed, and the incoming content
leaves it at that same speed and slows to rest. The eye keeps its momentum, so the cut does not read as
a hold followed by a jump. It differs from [speed-ramp-freeze](speed-ramp-freeze.md), which slows to
a hold on one contact frame. Use one ramp for the cut into the big moment.

```js
import { ramp } from '../../core/motion/presets.js';
ramp(document.querySelector('.seq'), document.querySelector('.final'), { at: 18.8, kind: 'scaleOut' });
```

`ramp(outEl, inEl, { at, kind, duration, amount, inAmount, blur, fade, dir, origin })`. `at` is the cut second.
`kind` is `scaleOut` (shrink away, the next arrives from larger), `scaleIn` (push in, the next arrives from smaller),
`x` or `y` (slide; `dir` 1 goes left or up). Both elements sit in the same place, and `inEl` must cover
`outEl` (an opaque ground) because the outgoing is hidden at the cut and the incoming appears at it.

| number | default | why |
|---|---|---|
| total `duration` | 0.45 s | 0.18 s out (40%), 0.27 s in (60%): exits are shorter than entrances |
| `amount` / `inAmount` | scale 0.3 / 0.4 (out to 0.7, in from 1.4); slide 40 / 60 per cent of the frame | the incoming travels further, so it can slow down for longer |
| outgoing ease | easy ease in, then 3.5x the average speed at the cut | slow, then fast |
| incoming ease | starts at the speed that matches the outgoing, ends on `long` | the in handle speed is solved: `amount / dOut x outSpeed = inAmount / dIn x inSpeed` |
| `blur` | 6 px | only at the cut: the outgoing gains it in its last 40%, the incoming loses it in its first 35% |
| `fade` | 0.5 | the outgoing opacity at the cut |

Sound: put the landing cue (sub-thump or swell peak) on `at` exactly. A swell that rises into it starts
about 1.2 s before.

Do not stretch the ramp past 0.7 s: it stops reading as one move. Do not add a second ease on the
same two elements. If the incoming does not cover the outgoing, the outgoing vanishes at the cut and shows a hole.
