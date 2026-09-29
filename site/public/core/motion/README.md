---
when: you write a film page and want spring motion, keyframe tables or seeded noise without writing the math
answers: "how a page imports core/motion/springs.js and uses spring, track, approach, kf and springLinear"
group: engine
---

# core/motion

`springs.js` is pure math for pages: functions of time, no state, no `Math.random`, no dependencies.
`curves.js` holds the easings it uses by name (`easeOutCubic`, `easeInOutQuart`, ...).

```js
import { spring, track, approach, kf, springLinear, springDuration, SPRINGS, rng, noise1 } from '../../core/motion/springs.js';
```

## 1. CSS and WAAPI: a spring as an easing

The renderer seeks `document.getAnimations()`, so a native animation needs no `seek`.

```js
const { k, d } = SPRINGS.snappy;
el.animate([{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
  { duration: springDuration(k, d) * 1000, easing: springLinear(k, d), fill: 'both', delay: 600 });
```

## 2. A seek(t) canvas: track and approach

`window.seek(t)` paints frame t as a pure function. Every frame is computable alone.

```js
window.seek = (t) => {
  const x = track(t, [[0, 100], [1.2, 640], [2.4, 280]], 170, 26);   // one spring per target change
  const zoom = approach(t * 30, 1, 1.35, 0.15);                     // frame number, 15% of the gap per frame
  ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
  ctx.fillRect(x, 200, 80, 80);
};
```

## 3. A `[[f, v]]` table with kf

Tunable numbers stay as literals so the studio can edit them. Values may be arrays (colours).

```js
const ROT = [[0, 0], [24, 90], [60, 90], [84, 0]];
const TINT = [[0, [20, 20, 30]], [60, [40, 90, 255]]];
const f = t * 30;
el.style.rotate = `${kf(f, ROT, 'easeInOutCubic')}deg`;
const [r, g, b] = kf(f, TINT);
```

## Other exports

- `spring(t, k, d)`: 0 to 1, correct for under, critical and over damping. Presets in `SPRINGS`:
  `snappy` (UI, leading edges), `default`, `heavy` (big type, logos), `playful` (visible overshoot).
- `indicator(t, stops, width)`: `{left, right}` for a moving highlight; the leading edge is stiffer.
- `swapAlpha(t, tIn, tOut)`: text in a morphing box enters after the morph starts, leaves before the next.
- `rng(seed)` mulberry32; `noise1(x, seed)` smooth noise in [-1, 1] for drift; `loopT(t, dur)` wraps t.
