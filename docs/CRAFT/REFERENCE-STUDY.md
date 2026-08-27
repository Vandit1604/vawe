---
when: a real video looks better than ours and you want to learn/copy why
answers: "the study pipeline (measure → catalog → map) · the 12 premium-feel habits · reference-feel→primitive map"
group: story
---

# REFERENCE STUDY: learn from great videos, then copy the feel (not just the frames)

When a real motion-graphics piece looks better than ours, the difference is almost never one effect, it
is a handful of **habits** we skipped. This doc names those habits, and gives the repeatable pipeline for
extracting them from ANY reference and mapping them to our primitives. Study a reference the way an editor
studies a cut: measure it, name what it does, reproduce the intent. Add what you learn here so the next
video starts ahead.

> First tool: **`make measure`** ([MEASURE.md](MEASURE.md)) turns "a slide with some easing" into
> `0.43s, easeOutSine`. Numbers, not vibes. Second tool: a filmstrip (`ffmpeg fps=… tile=…`) to SEE the
> beats. Everything below was extracted from the Brew launch film this way.

## The pipeline: how to study any reference

0. **Run `make study`, and get the structure for free.** `make study VIDEO=refs/ref.mp4 NAME=ref` is
   the film-side twin of `make sections`. It probes the file, detects the shot boundaries, cuts a
   contact sheet with the IN, MID and OUT frame of every shot, and writes `refs/<name>/study.md` for you
   to fill in. Everything in step 1 below it does for you; read step 1 anyway, because it says WHY the
   sheet samples three frames per shot and not one.

   **What it measures, and where that stops.** Duration, resolution, fps and the shot list come off the
   file. What is on screen, what moves, what triggers the next shot and what sound sits there do not,
   so `study.md` ships those four columns empty and you write them. A tool that guessed them would hand
   you a confident wrong answer dressed as a measurement.

   **Shot detection is evidence, not a verdict.** It reads ffmpeg's per-frame scene score, so a HARD cut
   is exact (a synthetic three-colour film returns 2.00s and 4.00s to the frame) and a DISSOLVE scores
   almost nothing. `out/creed.mp4` peaks at 0.12 against a 0.30 default and therefore returns no cuts at
   all; `out/motion-reel.mp4` authors 14 cuts and the detector finds 3, because the rest cross-fade
   between dark frames. When it finds nothing it says so and falls back to a fixed sample, and it never
   calls that a cut list. When near-misses sit just under the threshold it names them and tells you what
   to re-run. **Read the sheet before you trust the numbers.**

   **`refs/` is gitignored, and that is the boundary.** You are extracting the reference's grammar: shot
   length, cut rate, what carries across a junction. Throw away its UI, its copy and its colours. Never
   put a reference's frames or marks in a film we publish (`../../CLAUDE.md`, "Never embed copyrighted
   material"). The published method this follows cut a 31s film to 15s by REMOVING shots, not by
   speeding them up, and `study.md` asks you to mark each row KEEP or CUT for that reason.

   **It feeds the storyboard.** `study.md` ends with three questions whose answers are storyboard fields:
   `pace:` (from the measured median shot), `threads:`/`object:` (what survives a cut here, then OUR
   version of it) and `spectacle:` (which shot is the loud one). Answer them, then write
   `formats/scene/<topic>.storyboard.md` and run `storyboard-check`. See
   [STORYBOARD-TEMPLATE.md](STORYBOARD-TEMPLATE.md).

1. **Map the beats.** `ffmpeg -vf "fps=3,scale=…,drawtext=…timestamp…,tile=…"` → a labelled contact
   sheet. Read it: one beat per idea, note the copy, the layout, the palette per beat.
   **You will sample the middle of each beat, and the middle is the one frame that hides everything you
   came to learn.** A beat-MIDDLE frame shows the settled state, which is where nothing is moving. Doing
   this missed the dolly, the gradient fill AND the orange colour-wave on one film, three separate times
   (`../MISTAKES.md` #124). A still frame carries composition and colour and nothing about time; for a
   continuous effect it is the least informative test there is, because it is exactly the frame where a
   wrong speed looks right (#155). You MUST also sample: (a) the **entrance** at high fps
   (`fps=12`, first ~0.5s): is the word oversized/blurred and settling (a dolly-in)?; (b) the **exit**
   (`fps=12`, last ~0.5s): does it scale UP + blur to leave (a dolly-out)?; (c) a **hard-zoomed crop of
   the text** (`crop=…,scale=up`): is the fill a flat colour or a GRADIENT / colour-wave?
   **For OUR renders, `make reveal D=<scene.json>` does this automatically**, it renders each beat's
   ENTER arc + settled + EXIT arc from the exact layer start-times, so the reveal is never hidden. It is
   the standing fix for the "judged the hold, missed the reveal" trap; run it every render.
2. **Measure the motion.** For each signature transition, `make measure VIDEO=ref.mp4 FROM=… TO=…` →
   duration + nearest engine preset. Tight fits are authorable numbers; loose fits are the tool telling
   you it is not one tween (typing, two stacked tweens, a mask, re-author by intent).
3. **Catalog the motifs.** List every recurring device (the habits below are the checklist).
4. **Map to our primitives** (table at the bottom). If a motif has no primitive, that is a framework
   finding, log it (docs/MISTAKES.md), don't fake it.
5. **Author → verify.** Build it, then `make measure VIDEO=out/ours.mp4 EXPECT=<preset>` to confirm the
   render matches the reference's motion. `make beats`/`make audit`/`make judge` for the rest.

## The habits that make it feel premium (the checklist)

These are what a good reference does that our defaults do NOT. Reach for them on purpose.

1. **Never static: a continuous camera push on EVERY beat.** The frame is always slowly zooming in (or
   drifting). This is the single biggest "alive vs slideshow" lever. Our default holds still; add a
   `camera` track (`s: 1.03 → 1.12` across each beat) or per-layer `motion` scale. *(Brew: the UI beats
   push 34%→71% area in ~1s: a big dolly-in.)*
   **Keep it SMOOTH** (MISTAKES #125): one MONOTONIC move, never a reversal (don't zoom in then snap
   out). For a multi-keyframe camera push set `ease:"linear"` on the interior keyframes, the default
   easeInOutCubic zeroes velocity at every keyframe, so a chained push pulses/shakes. Per-beat push is
   cleanest as a per-layer `motion.scale` (`ease:"linear"`) that resets naturally per element (the
   another engine way: one continuous interpolation per shot, not chained ease segments). Scale via
   `transform` (GPU, our `#cam` is `will-change:transform`), never font-size, that reflows and jitters.
2. **Zoom / punch transitions, not hard cuts.** Motion carries THROUGH the seam, the outgoing beat
   zooms out as the incoming zooms in. Use `transitions[{fx:"zoom"|"punch"|"whipPan"}]`, not a bg swap.
3. **Massive scale + frame bleed.** The hero word FILLS or exceeds the frame (letters cropped at the
   edges). Scale contrast (one huge word, tiny everything-else) reads as confident. Our timid centered
   headline is the amateur tell. *(Constraint: our `size` caps at 260; for true frame-fill push the
   `camera` in on the beat, or see the harvest note below.)*
4. **Asymmetry, never dead-center.** Hero words sit low-left or offset, not centered. Dead-center is the
   AI-slop tell (`make designspec-check` flags it). Left-align (`align:"left"`, `x` low) the type beats; reserve
   centering for a deliberate brand lockup.
5. **Dolly enter AND exit. The word "breathes" through scale.** The premium version: a word enters
   OVERSIZED + motion-blurred and scales DOWN to settle (a dolly-in, not a scale-up-from-small, note the
   direction), holds, then scales UP bigger + blurs to EXIT (a dolly-out / push-through-the-word). "It
   gets bigger to exit." Author with a `motion` track: `scale 1.5→1.0` in, `1.0→1.9 opacity→0` out, plus
   `motionBlur:true` (the engine auto-streaks fast scale changes). *(Brew: every hero word does this.)*
6. **Gradient text fill.** Hero words are filled with a gradient (dark-top→lighter-bottom), not a flat
   colour. A real display-type premium tell. `gradient:{ from, to, angle }` on the text layer (angle
   180 = ↓). Distinct from `preset:"gradient"` (an animated shimmer sweep).
6. **Motion blur on fast moves.** A whip or fast entrance streaks (directional blur peaking at speed).
   `whipPan` seam, or a `blur` preset. A crisp fast move looks cheap.
7. **One accent word, treated.** A single word per line in the accent colour, often with a marker
   highlight behind it and a tiny sparkle, never the whole line coloured. (Accent as TEXT on a light bg
   needs a DARKER accent to clear contrast: a fill colour ≠ a text colour. See `--accent-ink`.)
8. **Typewriter for inputs.** Prompt/search/command beats type character-by-character with a blinking
   caret (`preset:"type"`). It sells "you're using the product."
9. **Fast, front-loaded pacing.** ~1–1.5s per beat; the strong word lands first; accelerate into a
   payoff, then HOLD it. Uniform pacing reads flat.
10. **Real product UI, shown in 3D.** Captured UI tilted in perspective (`rx/ry` camera or `three:
    uiParallax`/`deviceShowcase`) with a push-in, not a flat screenshot.
11. **Cursor → consequence.** A pointer clicks (`cursor` layer) and the NEXT frames show what the click
    did (a state change, a result). A click with no outcome is a dead beat.
12. **Repeated motifs build rhythm.** The same element recurs (Brew's prompt bar + circular send button,
    the "X emails" refrain). Repetition with variation is structure, not laziness.

## Worked example: the Brew launch film vs our first pass

What our v1 got wrong, and the habit that fixed it:

| Gap in our v1 | Habit | Fix applied |
|---|---|---|
| Static holds (slideshow) | #1 continuous zoom | `camera` push per beat (`s` 1.03→1.12) |
| Hard cuts between beats | #2 zoom transitions | `transitions[{fx:"zoom"/"punch"}]` at boundaries |
| Small centered headline | #3 scale + #4 asymmetry | hero size→250 (cap), `align:"left"`, low `y` |
| Fade-in words | #5 scale-settle | `preset:"scale"`/`bounce` entrances |
| Bright orange text on cream (2.4:1) | #7 accent treatment | `--accent-ink #b83a0f` for accent TEXT on light |

Result: the motion went from "inspired by" to "reads like the same film." What's still bounded (be
honest): the exact **font** and **logo/product assets** (we don't have Brew's source), and **frame-fill
scale** (the `size ≤ 260` cap: the reference "Today." is ~2× ours).

## Framework harvest from this study

- **`size` caps at 260**, which blocks the frame-filling hero scale premium refs use. Options to reach it
  without hacking: push the `camera` in on the beat (works today), or add a fit-to-width / higher hero cap
  to the text layer. **Logged for the engine.**
- The measurement tool's low-contrast + blur-in-place limits (a light word on a same-hue bg defeats the
  corner-median background) are documented in [MEASURE.md](MEASURE.md), a future OpenCV/optical-flow
  upgrade would fix them.

## Reference feel → our primitive (the map)

| Reference feel | Our primitive |
|---|---|
| Always-zooming frame | `camera` keyframes (`s`) · layer `motion.scale` |
| Zoom/punch/whip between beats | `transitions[{fx}]` → cut `zoom`/`punch`, seam `whipPan` |
| Scale-settle word | `preset:"scale"`/`"bounce"`, or `motion` scale 1.15→1.0 easeOutBack |
| Dolly enter/exit (oversized→settle→bigger-out) | `motion` scale 1.5→1.0 in, 1.0→1.9 opacity→0 out + `motionBlur:true` |
| Gradient text fill (dark→light) | `gradient:{from,to,angle}` on the text layer (static; ≠ `preset:"gradient"` sweep) |
| Typed word + caret | `typing:true` (any text layer; HTML spans not preserved, plain/mono beats) |
| Typewriter + caret | `preset:"type"` |
| Marker-highlighted accent word | inline `<span>` bg + `--accent-ink` colour |
| Counter | `count` layer (`from`/`to`/`countDur`) |
| 3D-tilted UI + push | camera `rx/ry` · `three:"uiParallax"`/`"deviceShowcase"` |
| Cursor click → result | `cursor` layer + a timed state change |
| Glow on bright marks | `looks:"bloom"`/`"neon"` (source-coloured) |

Keep this map current: every time a reference does something we can't map, that is the next primitive to
build.
