# Vawe for people who know GSAP

Same mental model, different clock. GSAP plays forward in real time and calls back when a value
changes. Vawe has no playback: `renderFrame(n)` computes the WHOLE frame from a frame number, so any
frame can render before or after any other, on any worker, in any order. Every pair below is a GSAP
idea on the left and its Vawe equivalent on the right, with the reason the shape differs.

## 1. A single tween

```js
gsap.to(".card", { opacity: 1, y: 0, duration: 0.5 });
```
```json
{ "type": "html", "html": "<div class=\"card\">…</div>",
  "parts": [{ "select": ".card", "anim": "fadeUp", "each": 0.5 }] }
```
GSAP animates a live DOM node over wall-clock time. Vawe's `parts` entry is a name (`fadeUp`) that
`core/motion/parts.js` resolves to fixed from/to/exit vars, then samples at `t` on every frame. No
callback fires; the value at frame `n` is just read off the curve.

## 2. A timeline, several tweens in sequence

```js
gsap.timeline().to(a, {y:0}).to(b, {opacity:1}, "+=0.2");
```
```js
const { name, t01 } = track(n, fps, [{ name: 'a', dur: 1.2 }, { name: 'b', dur: 0.8 }]);
```
GSAP's timeline plays tweens in order and tracks where playback is. `track()` (`core/motion/motion.js`)
takes a frame and a beat list and returns which beat is active and its local progress, purely from
`n`. There is no "current position" to advance; every frame re-derives it.

## 3. Stagger across a group

```js
gsap.to(".word", { y: 0, stagger: 0.045 });
```
```json
{ "type": "text", "text": "Ship it today", "split": "word", "preset": "up", "stagger": 0.045 }
```
Same idea, same number. `stagger` here is a per-unit offset the engine's own `animateUnits`
(`core/type/type.js`) computes at build, then samples per frame like everything else.

## 4. Easing names

```js
gsap.to(el, { x: 100, ease: "power2.out" });
```
```json
{ "parts": [{ "select": ".x", "anim": "fadeUp", "ease": "power2.out" }] }
```
GSAP-driven fields (`parts[].ease`, `morph.ease`, `fx.ease`, `splitText.ease`, `motionPath.ease`) take
a real GSAP ease name unchanged. Every other field (`motion`, `camera`, `timeRemap`) is driven by the
engine's own interpolator and takes an `EASINGS` name instead (`easeOutCubic`, `easeOutElastic`,
`punch`...). Naming a GSAP ease in an engine-driven field, or vice versa, is the single most-repeated
mistake in this repo's log (`engine-doctrine/MISTAKES.md #355`); `core/validate/easing.mjs` refuses it
by name at `make validate`, not at render.

## 5. Fly an object along a curve

```js
gsap.to(".comet", { motionPath: { path: "#curve", autoRotate: true }, duration: 3 });
```
```json
{ "modifiers": [{ "motionPath": { "path": "M0,0 C120,-160 380,-160 500,0", "autoRotate": true, "dur": 3.0 } }] }
```
GSAP's `MotionPathPlugin` is loaded here directly, unchanged, and the plugin is loaded only when a
scene actually uses `motionPath` (`core/engine/preload.js`). `autoRotate` behaves exactly as it does
in GSAP: the layer's heading tracks the curve's own tangent.

## 6. An instant set, no animation

```js
gsap.set(el, { opacity: 0.4 });
```
```js
el.style.opacity = '0.4'; // written directly inside renderFrame(n), no easing call
```
`gsap.set` skips the tween and writes the value now. Inside `renderFrame(n)` every write is already
"now": there is no running animation to skip, only a value computed for this `n`.

## 7. Infinite repeat / yoyo

```js
gsap.to(el, { scale: 1.02, repeat: -1, yoyo: true, duration: 4.6 });
```
```json
{ "idle": "breathe" }
```
GSAP repeats a tween forever by re-running it. Vawe has no loop to re-run: `idle: "breathe"`
(`core/engine/idle.js`) is a closed-form `sin()` of the layer's own local time, so frame 4000 and frame
40 both come from the same formula, never from "how many times has this played."

## 8. A `wiggle()`-style ambient jitter

```js
// AE/GSAP-adjacent: wiggle(2, 20) on position
```
```json
{ "idle": { "name": "drift", "amp": 14, "period": 9 } }
```
`wiggle()` is pseudo-random per-frame noise; a renderer that seeks out of order cannot use anything
seeded by "the last frame", so `drift` (`core/engine/idle.js`) is a sum of two incommensurate sine
waves instead. It looks unrepeating over a beat's length and is 100% reproducible from `n` alone.

## 9. Scroll-scrubbed animation

```js
gsap.to(el, { x: 500, scrollTrigger: { scrub: true } });
```
```js
el.style.transform = `translateX(${interpolate(t, [0, 3], [0, 500])}px)`;
```
`ScrollTrigger`'s `scrub` ties a tween's progress to a scroll position instead of the clock. Every
Vawe animation is already scrubbed, to `n`, all the time: there is no non-scrubbed mode to opt out of.

## 10. Timeline labels and `.seek()`

```js
tl.addLabel("reveal").seek("reveal");
```
```js
const t = n / fps; // "reveal" is just the number of seconds you wrote it at
```
GSAP labels a point in playback so later code can jump to it. Vawe has no jump: a beat's start is a
plain number (or an offset like `"cardA.end+0.3"`, resolved once at build,
`core/timeline/relative-time.js`), and reaching it is just computing `renderFrame` for that `n`.

## 11. `onComplete` / `onUpdate` callbacks

```js
gsap.to(el, { x: 100, onComplete: () => launchConfetti() });
```
```js
// no callback exists: whatever "onComplete" would trigger is itself a pure function of n
if (t >= 1) confettiOpacity = interpolate(t, [1, 1.4], [0, 1]);
```
A callback is a side effect keyed to wall-clock progress, and side effects are exactly what
`renderFrame(n)` must not have (frames render out of order, on different workers). Anything a callback
would trigger has to become its own value computed from `n`, same as everything else on the frame.

## 12. A reversed `.from()` tween as an exit

```js
gsap.from(el, { y: 24, opacity: 0 }); // implicitly reverses on the way out
```
```js
// core/motion/parts.js PARTS.fadeUp: [null, { y: 24, opacity: 0 }, { y: 0, opacity: 1 }, { y: -24, opacity: 0 }]
```
`gsap.from()` infers its exit by reversing the entrance. Vawe's `parts` entries carry the exit as an
explicit fourth slot, and it is deliberately not always a reversal: a translate continues past its
resting point (`fadeUp` exits upward through `-24`, never back down through `+24`), while a scale
reverses to its own baseline, because there is nowhere "onward" for a shape that only grew.

## 13. Targeting the DOM vs. authoring the timing in HTML

```js
gsap.utils.toArray(".stat").forEach((el, i) => gsap.to(el, { opacity: 1, delay: i * 0.1 }));
```
```html
<div data-part-anim="fadeUp" data-part-start="0.1" data-part-dur="0.4">Stat one</div>
```
GSAP selects elements from JS and times them there. An `html` layer can instead carry its own timing
as `data-part-*` attributes; `core/motion/parts.js` lowers them into the same `parts[]` array a
hand-written one would be, so the markup and the timing live in one file. JSON `parts` wins if both
are present.

## 14. A bouncy, physical ease

```js
gsap.to(el, { y: 0, ease: "elastic.out(1, 0.4)" });
```
```js
el.style.transform = `translateY(${spring(t, { bounce: 0.4, settle: 0.6 }).y}px)`;
```
GSAP's elastic ease is a canned curve. `spring()` (`core/motion/motion.js`) is a real damped-spring
solution in `t`, and `springSettle()` tells you exactly when it stops moving, so a hold can be sized to
match instead of guessed.

## 15. Randomised motion

```js
gsap.to(el, { x: "random(-20, 20)", duration: 2 });
```
```js
const phase = hashId(L.id); // core/engine/idle.js: phase hashed from layer identity, never drawn
```
`Math.random()` (and GSAP's `random()` helper) breaks determinism outright: two renders, or two
workers rendering the same frame, must disagree. Wherever Vawe wants motion that looks unsynchronised
across a cast of layers, it hashes a phase from something stable (the layer's own `id`) instead of
drawing one, so the "randomness" is fixed forever once written.

## See also

- `engine-doctrine/PRIMITIVES.md` : every primitive named above, in one table.
- `engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md` : the same exercise for After Effects expressions.
- `skills/vawe-scene-authoring/reference/motion-primitives.md` : the interpolator API in full.
