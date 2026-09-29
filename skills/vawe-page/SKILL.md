---
name: vawe-page
description: "Author a vawe page film: one films/<name>/page.html the renderer seeks frame by frame. Load before writing or editing any page.html: the contract (duration meta, seek(t) or CSS/WAAPI, determinism, aspects, audio tags, literal numbers), the spring helpers, and the ten mistakes a first draft makes."
effort: medium
---

# vawe-page: write the page

A film is one HTML page. Write it the way you write any page; the renderer seeks it, screenshots
every frame and mixes the audio offline. This skill holds only what a first draft gets wrong.

## The contract, in the page

```html
<!doctype html>
<meta name="duration" content="14.5">        <!-- seconds, required -->
<meta name="fps" content="30">               <!-- optional: YOUR frame tables are in this rate -->
<meta name="message" content="zero fees">    <!-- the one thing to remember -->
<meta name="spectacle" content="6.2">        <!-- the second of the one big moment -->
<audio src="assets/music.mp3" loop data-at="0" data-gain="-3" data-fade-out="0.4"></audio>
<audio data-synth="whoosh" data-at="2.4" data-gain="-6"></audio>
<audio src="assets/vo.wav" data-role="vo" data-at="1.0"></audio>
```

Time is the seek. Two ways, both allowed in one page:

1. CSS `@keyframes` and `element.animate()`. The renderer pauses every animation and sets its
   `currentTime`. Delays and durations are your timeline.
2. `window.seek(t)` (t in seconds, may return a Promise). Paint frame t from t alone.

The renderer installs a virtual clock before your scripts run: `Date`, `performance.now`,
`requestAnimationFrame`, `setTimeout` and `Math.random` all follow the seek. Do not fight it.

Aspect: `<html data-aspect="9:16">`, `--vw` and `--vh` on `:root`, and `window.vawe.aspect` are set
before your scripts run. Lay out for all five (`16:9 9:16 1:1 4:5 4:3`) with CSS; never crop.

Numbers stay literals: a `[[f, v]]` table, a keyframe stop, a `:root` custom property. The studio
edits them in place; a computed constant is invisible to it.

## Springs and tables

```js
import { spring, track, approach, kf, springLinear, springDuration, SPRINGS, rng } from '../../core/motion/springs.js';
el.animate([...], { duration: springDuration(k, d) * 1000, easing: springLinear(k, d), fill: 'both' });
const x = track(t, [[0, 100], [1.2, 640]], 170, 26);   // a spring per target change
const zoom = approach(t * 30, 1, 1.35, 0.15);          // 15 percent of the gap per frame
const rot = kf(t * 30, [[0, 0], [24, 90], [60, 90]], 'easeInOutCubic');
```

`approach` k sits at 0.12 to 0.19 for anything that reads as UI. `SPRINGS.snappy` for leading
edges, `heavy` for big type and logos, `playful` only when the brief asks for overshoot. Full
reference: `core/motion/README.md`.

## Before the first draft

1. Pick the film type in `engine-doctrine/CRAFT/ROUTING.md` and copy its `prompts/` template.
2. Write the beat table (`prompts/beat-sheet.md`): time, message, the one thing that moves, the cue.
3. Make the five stills that define the look. Fix cramped, overlapping or unreadable before motion.
4. `make dev PAGE=films/<name>/page.html FROM= TO=` on the hardest 2 to 4 seconds first.
5. Hand the draft to a fresh session: `vawe-critique`.

## The ten mistakes a first draft makes

1. A live clock. `Date.now()` or a running `requestAnimationFrame` loop instead of t. The frame is a
   function of the seek; anything else renders differently on every run.
2. State carried between frames (`x += dx`). Frame 400 must not need frame 399.
3. `Math.random()` for a still element, so it boils. Use `rng(seed)` and seed per element.
4. A network font. Bundle the face in `films/<name>/assets/` and `@font-face` it; the renderer
   waits for `document.fonts.ready`, not for the network.
5. `var()` inside the `animation` shorthand: Chromium drops the whole declaration silently. Write
   the longhands. `make check GATE=anim-traps D=<page>` finds this and six more.
6. No end keyframe. A `@keyframes` rule with no `100%` slides back after it ends.
7. Opacity or filter on a `preserve-3d` element flattens it. Fade the wrapper.
8. Everything fades in and everything eases out. One entrance per beat, exits faster than
   entrances, arrive fast and land soft (`engine-doctrine/RULES/banned-defaults.md`).
9. Text that cannot be read: hold `words x 0.6 s`, floor 1.2 s
   (`engine-doctrine/RULES/readable-hold.md`). Add a hold; never slow the move.
10. A layout in fixed pixels for 16:9. Use `--vw`/`--vh`, container units and `[data-aspect]`
    selectors, then draft `ASPECT=9:16` once before the final.

Also: a capture scaled below 0.6 loses its type, crop instead; an em dash on screen fails the
validator; the first-frame hook is 12 words or fewer.

## Waivers

A rule broken on purpose is declared in the page, with its reason:

```html
<script type="application/json" id="authoring">
  {"allow": ["dead-air"], "_why": {"dead-air": "the held wordmark IS the last beat"}}
</script>
```

## Commands

- `make dev PAGE=films/<name>/page.html [ASPECT=] [FROM= TO=]`: half size, 30 fps, silent draft.
- `make ship PAGE=films/<name>/page.html [ASPECT=all]`: 60 fps, subframe blur, audio mixed.
- `make critique PAGE= [REF=]`: the fresh look (`vawe-critique`).
- `make next PAGE= REF=`: match a reference (`vawe-reference`).
- `make arsenal Q="…"`: search an effect before you hand-build it.

Templates: `prompts/README.md`. Long films: `prompts/directors-brief-long-form.md`.
