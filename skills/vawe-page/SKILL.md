---
name: vawe-page
description: "Author a vawe page film: one films/<name>/page.html the renderer seeks frame by frame. Load before writing or editing any page.html: audio tags, the spring helpers, and the ten mistakes a first draft makes. The page contract itself is in AGENTS.md."
effort: medium
---

# vawe-page: write the page

A film is one HTML page; the renderer seeks it, screenshots every frame and mixes the audio offline.
The contract (duration meta, seek, aspect, literals) is in `AGENTS.md`. Start with
`bin/vawe new <name>`; this skill holds what a first draft gets wrong.

```html
<meta name="message" content="zero fees">    <!-- the one thing to remember -->
<meta name="spectacle" content="6.2">        <!-- the second of the one big moment -->
<audio src="assets/music.mp3" loop data-at="0" data-gain="-3" data-fade-out="0.4"></audio>
<audio data-synth="whoosh" data-at="2.4" data-gain="-6"></audio>
<audio src="assets/vo.wav" data-role="vo" data-at="1.0"></audio>
```

## Springs and tables

```js
import { spring, track, approach, kf, springLinear, springDuration, SPRINGS, rng } from '../../core/motion/springs.js';
el.animate([...], { duration: springDuration(k, d) * 1000, easing: springLinear(k, d), fill: 'both' });
const x = track(t, [[0, 100], [1.2, 640]], 170, 26);   // a spring per target change
const zoom = approach(t * 30, 1, 1.35, 0.15);          // 15 percent of the gap per frame
const rot = kf(t * 30, [[0, 0], [24, 90], [60, 90]], 'easeInOutCubic');
```

`SPRINGS.snappy` for leading edges, `heavy` for big type and logos, `playful` only when the brief
asks for overshoot. Full reference: `core/motion/README.md`.

## Before the first draft

1. Pick the film type in `engine-doctrine/CRAFT/ROUTING.md`; `bin/vawe new <name> --from prompts/<t>.md`.
2. Write the beat table (`prompts/beat-sheet.md`): time, message, the one thing that moves, the cue.
3. Make the five stills that define the look. Fix cramped, overlapping or unreadable before motion.
4. Check frames with `bin/vawe compare --page <page> --ref <ref.mp4> --at s,s,s` (about 4 s for 4 frames).
   Never render a whole range to look at a few frames. `bin/vawe dev <page> --from s --to s` is for motion.
   A recreation is done when `bin/vawe coverage <film.mp4> --ref <ref.mp4>` exits 0.
5. Hand the draft to a fresh session: `vawe-critique`.

## The ten mistakes a first draft makes

1. A live clock. `Date.now()` or a running `requestAnimationFrame` loop instead of t. The frame is a
   function of the seek; anything else renders differently on every run.
2. State carried between frames (`x += dx`). Frame 400 must not need frame 399.
3. `Math.random()` for a still element, so it boils. Use `rng(seed)` and seed per element.
4. A network font. Bundle the face in `films/<name>/assets/` and `@font-face` it; the renderer
   waits for `document.fonts.ready`, not for the network.
5. `var()` inside the `animation` shorthand: Chromium drops the whole declaration silently. Write
   the longhands. `bin/vawe check anim-traps <page>` finds this and six more.
6. No end keyframe. A `@keyframes` rule with no `100%` slides back after it ends.
7. Opacity or filter on a `preserve-3d` element flattens it. Fade the wrapper.
8. Everything fades in and everything eases out. One entrance per beat, exits faster than
   entrances, arrive fast and land soft (`engine-doctrine/RULES/banned-defaults.md`).
9. Text that cannot be read: hold `words x 0.6 s`, floor 1.2 s
   (`engine-doctrine/RULES/readable-hold.md`). Add a hold; never slow the move.
10. A layout in fixed pixels for 16:9. Use `--vw`/`--vh`, container units and `[data-aspect]`
    selectors, then draft `--aspect 9:16` once before the final.

Also: `--vw` and `--vh` hold a unit (`1920px`), so write `calc(var(--vh) * 0.11)`, never `* 0.11px`;
a capture scaled below 0.6 loses its type, crop instead; an em dash on screen fails the validator; the
first-frame hook is 12 words or fewer. Waivers (`<script id="authoring">`) are in `AGENTS.md`.

## Commands

`bin/vawe dev <page> [--aspect --from --to --audio]`: half size, 30 fps, silent.
`bin/vawe ship <page> [--aspect all]`: 60 fps, subframe blur, audio mixed.
`bin/vawe critique <page> [--ref mp4]`: the fresh look (`vawe-critique`; with `--ref`, `vawe-reference`).
Templates: `prompts/README.md`. Long films: `prompts/directors-brief-long-form.md`.
