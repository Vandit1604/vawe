---
when: a real video looks better than ours and you want to learn and copy why
answers: "how to sample a reference, what a dense read shows, and the premium-feel habits to reach for on purpose"
group: story
---

# REFERENCE STUDY: learn from great videos, then copy the feel, not the frames

When a real piece looks better than ours, the gap is rarely one effect. It is a handful of habits we
skipped. Study a reference like an editor: measure it, name what it does, reproduce the intent.
`bin/vawe spec <ref.mp4>` gives the cut list, light map, text timeline and curves.
For the ordered recreation loop see `RECREATION.md`.

## Sampling rate decides what you learn

A contact sheet shows states. Motion lives between them. On one nine-second reference three rates gave
three films:

| rate | what the reader concluded |
|---|---|
| 1 fps | "it never changes composition" |
| 2 fps | it flips its ground, light to dark and back |
| 10 fps | the stacked echo builds, rotates in 3D, blurs into a cylinder and resolves; the closing phrase assembles word by word with four cursor grabs |

Only the last is true. The first two were confident and wrong, and a film planned off the 1 fps read
had to be replanned. So when the question is how something moves, take a contiguous strip at about
10 fps of the busiest shots. It costs many times a sheet in tokens, so spend it only there.

- Also sample the entrance, the exit and a zoomed crop of the text. The beat middle is the one frame
  that hides a dolly, a gradient fill or a colour wave.
- Check the end. Density is usually front-loaded, and a film that opens at a move every 0.7 s may hold
  its last two seconds almost still.
- Copy hold time, not the effect list. The published method this follows cut a 31 s film to 15 s by
  removing shots, not by speeding them up: mark each shot KEEP or CUT.
- Shot detection is evidence, not a verdict. A hard cut scores exactly. A dissolve scores almost nothing
  (a film that authors 14 cuts across dark frames was detected as 3). Review the frames.
- Keep the reference out of published films. Extract its grammar (shot length, cut rate, what carries a
  junction). Drop its UI, copy and colours.

## The habits that make it feel premium

A good reference does these and our defaults do not. Reach for them on purpose, and name the target of each.

1. Never static. A slow continuous push or drift on every beat is the biggest alive-versus-slideshow
   lever. Scale with `transform`, never font-size (reflow jitters). One monotonic move, linear ease.
2. Motion carries through the seam: the outgoing beat zooms out as the incoming zooms in, not a
   background swap.
3. Massive scale and frame bleed. One huge word, tiny everything else, reads as confident. A timid
   centred headline is the amateur tell.
4. Asymmetry. Hero words sit low-left or offset. Reserve centring for a deliberate lockup.
5. Dolly enter and exit. A word enters oversized and blurred and scales down to settle (a dolly-in, not
   a scale-up from small), holds, then scales up and blurs to leave.
6. Gradient fill on hero type (dark top to lighter bottom), not a flat colour.
7. Blur follows fast moves. A crisp fast move looks cheap.
8. One accent word per line, treated, never the whole line. Accent text on a light ground needs a darker
   accent ink to clear contrast.
9. Typewriter with a blinking caret for prompt, search and command beats. It sells "you are using it".
10. Front-loaded pacing, 1 to 1.5 s per beat, the strong word first, accelerate into the payoff, then
    hold. Uniform pacing reads flat.
11. Real product UI, tilted in perspective with a push-in, not a flat screenshot.
12. Cursor to consequence. A click with no visible outcome is a dead beat.
13. Repeated motifs build rhythm. Repetition with variation is structure.

Evidence: the Brew launch v1 had static holds, hard cuts, a small centred headline and fade-in words.
Fixing exactly those (a push per beat, zoom seams, hero size up and left, scale-settle entrances, a
darker accent ink for text at 2.4:1) moved it from "inspired by" to "reads like the same film".
