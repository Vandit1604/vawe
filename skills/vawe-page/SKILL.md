---
name: vawe-page
description: "Author a vawe page film: one films/<name>/page.html the renderer seeks frame by frame. Load before writing or editing any page.html: audio tags, the spring helpers, and the page-code mistakes a first draft makes. The page contract itself is in AGENTS.md."
effort: medium
---

# vawe-page: write the page

A film is one HTML page; the renderer seeks it, screenshots every frame and mixes the audio offline.
The contract (duration meta, seek, aspect, literals) is in `AGENTS.md`. Start with
`bin/vawe new <name>`; this skill holds the code a first draft gets wrong. Taste pitfalls are in
`taste/build/DIGEST.md`.

Study first: `bin/vawe refs frames`, then Read `~/.vawe/refs/frames/<id>/*.png` at full size and write what you take
from which frame. Use `bin/vawe` verbs, never raw ffmpeg or Chrome (`bin/vawe --help`).
Order: design each `data-world` beat as a static frame first (`bin/vawe frames <page>`, one still per
world), then write the Shots rows for the motion, then the motion, then `bin/vawe dev`. A film is a
well designed website plus storyboarded motion.

```html
<meta name="message" content="zero fees">    <!-- the one thing to remember -->
<meta name="spectacle" content="6.2">        <!-- the second of the one big moment -->
<audio src="assets/music.mp3" loop data-at="0" data-gain="-3" data-fade-out="0.4"></audio>
<audio data-synth="pluck" data-at="0.85"></audio>   <!-- a quiet tick on one key word, default gain -->
<audio data-synth="swell" data-at="1.66"></audio>   <!-- the one soft swell, ends on the cut -->
<audio src="assets/vo.wav" data-role="vo" data-at="1.0"></audio>
```

## Sound is felt, not noticed

A few soft key ticks and one swell beat many hits. Leave `data-gain` off and a voice takes its soft
default (`DEFAULT_GAIN_DB` in `core/audio/kit.mjs`: UI cues -6 dB, whoosh/riser/swell -4, the
weight voices impact/drop/braam -2). Reach for impact, braam or drop only when the brief asks for
weight. Not every word gets a tick: cue the first and the last. The mix warns when one cue peaks more
than 6 dB above the median cue, with the `data-gain` change that fixes it. Name each beat once in
CSS (`--beat-2: 1.85s`) and read it from every delay in that beat, so one edit moves the beat.

What you write is what you hear: no normalising, default gains land near -20 LUFS, and
`<meta name="loudness" content="-14">` opts in to a delivery target. `node harness/media/review.mjs <page> --final` warns outside -30 to -12 LUFS.

## Moves to copy

`prompts/moves/README.md`: the proven moves, grouped by job (reveal a title, change between shots,
point the eye, product moments), each a CSS and WAAPI snippet with a 1 s clip. Copy one; do not
approximate it by eye.

## Springs and tables

Start every entrance, exit and group from `core/motion/presets.js` (`enter`, `leave`, `stagger`,
`layer`, `BANDS`): they land on real curves, exit at 0.6 of the entrance and stagger 30 to 80 ms,
and the `bin/vawe dev` motion lint names each move that breaks those rules.

```js
import { spring, track, approach, kf, springLinear, springDuration, SPRINGS, rng } from '../../core/motion/springs.js';
el.animate([...], { duration: springDuration(k, d) * 1000, easing: springLinear(k, d), fill: 'both' });
const x = track(t, [[0, 100], [1.2, 640]], 170, 26);   // a spring per target change
const zoom = approach(t * 30, 1, 1.35, 0.15);          // 15 percent of the gap per frame
const rot = kf(t * 30, [[0, 0], [24, 90], [60, 90]], 'easeInOutCubic');
```

Never approximate a curve with `cubic-bezier()`: a hand-fitted bezier starts too hard and stops too
early, and the motion reads jerky. Use the After Effects eases in `EASE` (`core/motion/presets.js`):
`land` to arrive, `landSoft` for a move under 0.4 s, `launch` or `leave` to exit, `glide` for a drift,
`settle`, `swap`, `carry`, `pop`. Each is an exact CSS `linear()` easing; in `window.seek` or
`vawe.onFrame` code use `easeFn(name)`, a function of 0..1. Multi-key motion: `keys()`.

```js
import { EASE } from '../../core/motion/presets.js';
el.animate([{ translate: '0 40px' }, { translate: '0 0' }], { duration: 700, easing: EASE.land, fill: 'both', delay: 1200 });
document.documentElement.style.setProperty('--ease-land', EASE.land); // CSS: animation-timing-function: var(--ease-land)
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

## Page-code mistakes a first draft makes

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
8. A layout in fixed pixels for 16:9. Use `--vw`/`--vh`, container units and `[data-aspect]`
   selectors, then draft `--aspect 9:16` once before the final.
9. `fill: both` (or `backwards`) on an animation with a delay shows its first keyframe from frame 0;
   use `forwards` unless it should sit there before it starts.
10. `--vw` and `--vh` hold a unit (`1920px`): write `calc(var(--vh) * 0.11)`, never `* 0.11px`. A capture
    scaled below 0.6 loses its type: crop instead.

## Commands

`bin/vawe dev <page> [--aspect --from --to --audio]`: half size, 30 fps, silent.
`bin/vawe ship <page> [--aspect all]` runs in the background; wait with `bin/vawe ship --status <page> --wait`
(at most 100 s, repeat until done). Fix the verdict worst first on drafts (`bin/vawe dev`, then
`bin/vawe judge <draft mp4> --fresh`) until PASS, then ship once more. Never use `ship --wait` in an agent
tool call: it hits the timeout.
`bin/vawe critique <page> [--ref mp4]`: the fresh look (`vawe-critique`; with `--ref`, `vawe-reference`).
Templates: `prompts/README.md`. Long films: `prompts/directors-brief-long-form.md`.
