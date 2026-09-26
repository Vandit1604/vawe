---
when: "you know GSAP and want the vawe JSON that does the same thing"
answers: "17 side-by-side pairs, a GSAP tween/timeline/stagger/ease/motionPath/wiggle/loop/trim/matte next to the vawe field or JSON that does the same job, and why the shape differs (renderFrame(n) has no wall clock and no callbacks)"
group: reference
---

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
`n`. There is no "current position" to advance; every frame re-derives it. A `group` layer's own
`clock` (`{ duration, rate, loop: n | forever | pingpong, hold }`, `core/timeline/group-clock.js`) is
the closer GSAP-timeline analog when the whole sub-sequence itself must repeat: it gives its children
a local timeline scoped to the group's window, the way a nested GSAP timeline with `repeat` does.

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
{ "parts": [{ "select": ".x", "anim": "fadeUp", "ease": "power2.out" }] },
{ "motion": [{ "t": 0, "x": 0 }, { "t": 1, "x": 100, "ease": "power2.out" }] }
```
Two vocabularies, one spelling now works on both. GSAP-driven fields (`parts[].ease`, `morph.ease`,
`fx.ease`, `splitText.ease`, `motionPath.ease`) hand a GSAP ease name straight to `gsap.fromTo`,
unchanged. Fields the engine's own interpolator drives (`motion[].ease`, `camera`, `timeRemap`) used
to take only an `EASINGS` name (`easeOutCubic`, `easeOutElastic`, `punch`...) and refuse a GSAP
spelling; naming one in the other's field was the single most-repeated mistake in this repo's log
(`engine-doctrine/MISTAKES.md #447`). `resolveGsapAlias` (`core/motion/motion.js`) closed that gap:
an engine-driven field now resolves a recognised GSAP spelling (`power2.out`, `back.out(1.7)`,
`elastic.out(1, 0.3)`...) to its equivalent engine curve, so the vocabulary an author already knows
from GSAP works either place. Only the families with no engine equivalent (`steps`, `rough`, `slow`)
still need the GSAP-owned field; `core/validate/easing.mjs` names that at `make check GATE=validate`, not at render.
`motion[].ease` also takes a per-property map instead of one name (Separate Dimensions), `{ "x":
"linear", "y": "easeOutCubic" }`, for when x and y on the same pair of keys should travel different
curves; a property the map omits still rides the segment's own curve.

## 5. Fly an object along a curve

```js
gsap.to(".comet", { motionPath: { path: "#curve", autoRotate: true, start: 0.1, end: 0.9 }, duration: 3 });
```
```json
{ "motionPath": { "path": "M0,0 C120,-160 380,-160 500,0", "autoOrient": true, "from": 0.1, "to": 0.9, "dur": 3.0 } }
```
GSAP's `MotionPathPlugin` is loaded here directly, unchanged, and the plugin is loaded only when a
scene actually uses `motionPath` (`core/engine/preload.js`). `autoRotate` (GSAP's own name) still
works, and `autoOrient` is the same dial under After Effects' name: either spelling turns the layer's
heading to track the curve's own tangent. `from`/`to` (0-1) trim which stretch of the path this tween
crosses, the motion-path equivalent of `start`/`end` above.

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
gsap.to(el, { y: -80, repeat: -1, yoyo: true, duration: 1 });
```
```json
{ "motion": [{ "t": 0, "y": 0 }, { "t": 1, "y": -80 }],
  "drive": { "loop": { "mode": "pingpong", "from": 0, "to": 1 } } }
```
GSAP repeats a tween forever by re-running it. Vawe has no loop to re-run: `drive.loop`
(`core/tracks/drive.js`) is a CLOCK decision, not a driven property, that repeats this layer's own
keyframes past `to` seconds instead of holding on the last one. `mode: "pingpong"` is `yoyo: true`
(alternates direction each pass); `mode: "cycle"` is a plain `repeat`, restarting at `from` every time.
Either way, frame 4000 and frame 40 both come from the same closed-form remap of `n`, never from "how
many times has this played." For ambient motion with no keyframes to repeat, `idle: "breathe"`
(`core/engine/idle.js`) is the same idea for a held frame: a closed-form `sin()` of the layer's own
local time.

## 8. A `wiggle()`-style ambient jitter

```js
// AE expression, the usual reason to reach for a wiggle in a GSAP/AE-adjacent workflow:
// wiggle(2, 20) on rotation, 2 wiggles per second, +/-20deg
```
```json
{ "drive": { "wiggle": { "prop": "rot", "freq": 1.5, "amp": 2 } } }
```
`wiggle()` is pseudo-random per-frame noise; a renderer that seeks out of order cannot use anything
seeded by "the last frame", so `drive.wiggle` (`core/tracks/drive.js`) sums octaves of a seeded,
deterministic noise function instead: the same frame always samples the same value, on any worker, in
any order. `drive` also owns `link` (`{ from: "otherId.prop", mul, add, delay }`), the pick-whip: one
property copies another layer's own animated value, delayed for follow-through. `wiggle` and `link`
compose in the same `drive` object and can run on the same layer at once.

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

## 16. Draw-on strokes (Trim Paths)

```js
gsap.registerPlugin(DrawSVGPlugin);
gsap.fromTo("#check", { drawSVG: "0%" }, { drawSVG: "0% 100%", duration: 0.6 });
```
```json
{ "trim": { "start": 0.1, "end": 0.6 } }
```
GSAP needs a paid plugin (`DrawSVGPlugin`) to reveal a stroke by length. `trim` (AE's own Trim Paths,
`core/tracks/trim.js`) is built in: `start`/`end`/`offset` are fractions 0-1 of the path's real length
(`getTotalLength()`), and each is independently keyframable by naming `trimStart`/`trimEnd`/
`trimOffset` in the layer's own `motion` array, composing with x/y/rot on the same keys.

## 17. A track matte (luma/alpha wipe)

```js
gsap.set(".wipe", { mixBlendMode: "luminosity" }); // and a hand-built mask-image / SVG mask hack
```
```json
{ "modifiers": [{ "matte": { "layer": "wipeId", "mode": "luma" } }] }
```
GSAP has no first-class track matte: reproducing After Effects' luma/alpha matte means a hand-rolled
CSS mask or an SVG `<mask>` wired up outside GSAP entirely. Vawe's `matte` modifier (`core/fx`) takes
another layer's id directly: that layer's luma or alpha becomes THIS layer's own alpha, white showing
and black hiding, and `-inverted` variants flip which side shows. The matte source must paint an image
(an `image`/`svg` layer, or a `rect`/`html` layer with a gradient `bg`) and needs its own `id`; it
moves with its own motion track, so animating the source animates the reveal.

## See also

- `engine-doctrine/PRIMITIVES.md` : every primitive named above, in one table.
- `engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md` : the same exercise for After Effects expressions.
- `skills/vawe-scene-authoring/reference/motion-primitives.md` : the interpolator API in full.
