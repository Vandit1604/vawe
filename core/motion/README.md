---
when: you write a film page and want entrances, exits, staggers, spring motion, keyframe tables or seeded noise without writing the math
answers: "how a page uses the presets (enter, leave, stagger, layer, camera, parallax, focus, BANDS) and springs.js (spring, track, approach, kf, springLinear)"
group: engine
---

# core/motion

`presets.js` is the house motion as Web Animations. `springs.js` is pure math for pages: functions of time, no state, no `Math.random`, no dependencies.
`curves.js` holds the easings it uses by name (`easeOutCubic`, `easeInOutQuart`, ...).

```js
import { spring, track, approach, kf, springLinear, springDuration, curveToLinear, CURVES, SPRINGS, rng, noise1 } from '../../core/motion/springs.js';
```

## 0. Presets: the house motion as four calls

`presets.js` returns Web Animations the renderer seeks. Times are seconds. `band` is a speed band
(`BANDS`: energy 0.15-0.3, professional 0.3-0.5, gravity 0.5-0.8, cinematic 0.8-2.0 s) and each call
takes its middle unless you pass `duration`. `bin/vawe new` writes a starter that uses all four.

The page chooses its band, ease and stagger once, in `<meta name="signature" content="band=professional; ease=land; stagger=60; seam=...; palette=...; thread=...">`
(`signature.js`). The four calls default to it: `band`, `ease` (enter only) and `gap` below are the fallbacks when the page chose nothing,
and an option you pass always wins. `bin/vawe dev` names each dial still unchosen and shows the measured band, ease and stagger.

```js
import { enter, leave, stagger, layer, EASE, keys, BANDS, bandOf, pickBand } from '../../core/motion/presets.js';
```

`enter(el, { at, band = 'gravity', from = '0 0.5em', scale = 0.96, blur, ease = 'land' })`: arrives fast and lands
soft on `EASE.land`; the fade ends in the first 40% of the move. `blur` (px) clears as it settles.

```js
enter(title, { at: 0.2, band: 'gravity', from: '-0.8em 0' });
```

`leave(el, { at | end, to = '0 -0.3em', blur })`: 0.6 of the element's own `enter` (or of `band`),
on `EASE.launch`, an accelerating curve; `ease: 'leave'` decelerates instead. `end` finishes it on a cut. It fills forwards only, so it never covers the
entrance before it starts.

```js
leave(title, { end: 2.0 });
```

`stagger(els, { at, gap = 0.05, seed, ...enter })`: `enter` on each, 30 to 80 ms apart with seeded
jitter, the whole run fitted inside 0.5 s, so no two land on one frame.

```js
stagger(document.querySelectorAll('.facts li'), { at: 2.0, band: 'energy', from: '0.6em 0' });
```

`layer(main, secondary, { at, band, overlap = 0.3, secondary: {...enter} })`: the lead enters, and
the secondary (one element or a list) starts `overlap` of the lead's move before it lands, one band
slower.

```js
layer(title, subline, { at: 0, band: 'professional' });
```

`stagger` also takes `nudgeEvery: n`: every nth element lands on `EASE.nudge`, an arrival that passes its mark by about 6 per cent.
The reference films overshoot 21 to 41 per cent of their arrivals and the dev check `overshoot-share` counts them, so give one arrival in three
`nudge` (`stagger(..., { nudgeEvery: 3 })`, or `enter(el, { ease: 'nudge' })`) and `EASE.pop` to the one that matters.

`camera(wrapper, { kind, at, band | duration, from, to, origin, strength, dir })` is one camera move on the element that holds a whole world,
in transforms only, so the seek runs it. `kind`: `push` (scale 1 to 1.12 on `glide`), `pull` (1.15 to 1 on `settle`), `drift` (a slow slide
and 3 per cent scale for a live hold), `whipOut` and `whipIn` (a 0.3 s slide of a world off or onto the frame with a blur, on `launch` and `land`).
`from` and `to` are scales; chain a drift after a push with `from` set to the push's `to`. `parallax([[el, depth], ...], opts)` runs the same
move on layers, each by its depth (0.3 ground, 1 the camera, 1.8 front). `focus(el, { at, blur, scale, opacity, duration })` clears a blur from a
smaller, fainter start on `settle`: a focus pull, or far words that resolve when the camera arrives.

```js
import { camera, parallax, focus } from '../../core/motion/presets.js';
parallax([[ground, 0.3], [mid, 1], [front, 1.8]], { kind: 'push', at: 0, duration: 2.4 });
camera(oldWorld, { kind: 'whipOut', at: 5, duration: 0.3 });
camera(newWorld, { kind: 'whipIn', at: 5, duration: 0.3 });
focus(farWord, { at: 3.5, blur: 9, scale: 0.8, opacity: 0.4 });
```

`ramp(outEl, inEl, { at, kind: 'scaleOut' | 'scaleIn' | 'x' | 'y', duration = 0.45, amount, inAmount, blur, fade })` is a speed ramp across a cut at `at`:
the outgoing move ends there on an accelerating ease, the incoming starts there on a decelerating one, and the two handle speeds are solved so
the velocity is equal on both sides of the cut (`rampSpeeds` shows it). `inEl` must cover `outEl`. See [speed-ramp](../../prompts/moves/speed-ramp.md).

```js
ramp(document.querySelector('.seq'), document.querySelector('.final'), { at: 18.8, kind: 'scaleOut' });
```

`pickBand(px)` names the band for a move of that many pixels at the 700 px/s an eye follows;
`bandOf(seconds)` names the band a duration sits in.

## After Effects handles

A segment is shaped by two handles, one per key. `influence` is how far along the segment the handle
reaches (per cent of its duration); `speed` is the pace at the key as a multiple of the segment's
average (0 stops dead, 1 is straight, 4.8 rushes). The handles are `easyEase` 33/0, `hang` 75/0,
`long` 60/0, `fling` 12/4.8, `overshoot` 35/-0.4 and `linear`. `EASE` names the pairs that real
work uses, as CSS `linear()` strings, built with `curveToLinear(handleCurve(out, in))`.

| name | out | in | use | evidence |
|---|---|---|---|---|
| `land` | fling | hang | an entrance: fast start, long soft arrival (default of `enter`) | arrive side: 27% of Lottie entrances end on hang or long; fast start: HyperFrames |
| `landSoft` | fling at 20/2.5 | hang | an entrance under 0.4 s: the first frame moves 15 per cent of the way, not 24 | measured on the migrated clips: `land` at 4.8x reads as a jump on a short move |
| `settle` | long | long | a big or heavy move easing both ends, 0.5 to 1 s | 18% of tuned Lottie entrances |
| `swap` | hang | hang | a snappy swap: the value waits at each key | 27% of tuned glides |
| `glide` | easyEase | speed 0.1 | a slow drift that never quite stops, camera and scale | glide, position: ease at both ends is the median |
| `carry` | easyEase | fling | still fast at the key, into a cut | HyperFrames carousels (6 to 11x in) |
| `leave` | easyEase | long | a decelerating exit | 76% of tuned Lottie exits end ease then hang |
| `launch` | easyEase | 25/3 | an accelerating exit (default of `leave`: exits run shorter and speed up), at most 3x at the cut | owner rule; Lottie shows no exit above 1.5x; 4.8x at the cut read as a vanish |
| `nudge` | fling | overshoot at speed -0.8 | an arrival that passes its mark by about 6 per cent: one arrival in three, so the film overshoots 21 to 41 per cent like the references | measured: peak 1.063, counted by the `overshoot-share` check (tolerance 0.01) |
| `pop` | fling | overshoot at speed -1.5 | a pop that passes its mark by about 15 per cent and settles back (CTA, notification, check) | the `overshoot` handle's own blurb: a deeper speed is an authored choice (-0.4 passes by 2 per cent, too little to see) |

`keys(el, prop, [[t, value, handle?], ...])` is an After Effects key table. Times are seconds, a handle
shapes both sides of its key (or `{ in, out }` one each), and each segment gets the `linear()` of the
two handles that meet there. The renderer seeks it like any Web Animation.

```js
keys(card, 'translate', [[0.2, '0 80px', { out: 'fling' }], [0.9, '0 0', { in: 'hang' }], [2.4, '0 0', 'easyEase'], [3.0, '0 -40px']]);
```

Use `easing: EASE.land` on a plain `el.animate` for one segment. In per-frame code (`vawe.onFrame`, `window.seek`) use `easeFn('land')(u)`. Never `ease`, `ease-in-out` or
`linear` on a move over 0.3 s: the motion lint says which `EASE` name to use.

Every `EASE` name, the 30 classic eases and the CSS keywords have a page with the curve, the velocity,
the `linear()` string and the handle data: <https://vawe.dev/easing>. `node scripts/site/easing.mjs`
builds its data from this library.

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
- `curveToLinear(fn)` turns any curve into an exact CSS `linear()` easing; `CURVES` holds `expoOut`, `spring`, `overshoot`.
  It returns a string for `easing:`, so calling it in `vawe.onFrame` throws; there call `easeFn('land')(p)`, the same `EASE` name as a function.
- `exposure.js`: `flashAt(t, cuts)` gives the white overlay, the brightness and the shot index of an exposure flash; `flashCuts` keeps at most 3 flashes a second. See [exposure-flash](../../prompts/moves/exposure-flash.md).
- `rng(seed)` mulberry32; `noise1(x, seed)` smooth noise in [-1, 1] for drift; `loopT(t, dur)` wraps t.

## The starter's motion

`bin/vawe new` writes drifting ground blobs, a blur on each entrance and `EASE.pop` on every second fact. Skill used: emilkowalski/animate (transform and opacity, ease-out arrivals). Rejected: its cubic-bezier curves, Motion library and no-animation gate (`EASE` names and WAAPI win; a film is seen once).

## Link the states

`states.js` writes the motion between the worlds for you, with the View Transitions vocabulary. Each beat is a
`data-world` element with `data-at="<second>"` (the first may omit it); a world ends where the next begins.

```html
<style>
  [data-id="tray"] { view-transition-name: tray; }                    /* same name in two worlds: it moves */
  ::view-transition-group(*)    { animation-duration: 650ms; }       /* movers, and the default */
  ::view-transition-group(tray) { animation-duration: 800ms; animation-timing-function: ease-in-out; animation-delay: 0ms; }
  ::view-transition-old(root)   { animation-duration: 300ms; }       /* how the leaving content goes */
  ::view-transition-new(chip)   { animation-delay: 80ms; }           /* how a named newcomer comes */
</style>
<script type="module">
import { linkStates } from '../../core/motion/states.js';
document.querySelectorAll('.w').forEach((el) => { el.style.viewTransitionName = el.dataset.id; });  // one name per element
linkStates();
</script>
```

- A name on one element in each of two worlds: the new one animates from the old rect (translate and scale, no cross-fade). Text scales by height.
- Unnamed content in the old world leaves; in the new world it enters. A name in one world only leaves or enters like unnamed content, with its own `old(name)` or `new(name)` rule. `root` means unnamed content, `*` means all.
- Order: leavers (0.6 of an entrance, `EASE.launch`) end at the cut; movers start at the cut on `EASE.carry`, one that must vacate a spot goes before one that lands there, a far move bows to its right, and a mover waits (at most 0.6 s) rather than pass through another; enterers (`EASE.land`) start when the movers are 85% landed.
- A name inside a named parent moves with the parent and keeps the parent's timing. A named parent that enters around a mover does not fade, because its child would fade with it.
- A texture (`aria-hidden="true"`) that covers over half the frame is the ground: it swaps at the cut. An unnamed box that holds named things is never animated: name it to animate it.
- `linkStates()` returns a promise (it waits for fonts, then measures each world alone) with `[{ world, at, moved, animations }]`. Duplicate names inside one world throw.

## Render it

`bin/vawe dev <page> --from s --to s` renders a half-size draft of the seconds you are working on.
