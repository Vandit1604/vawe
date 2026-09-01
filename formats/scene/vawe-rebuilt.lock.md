# LOCK SHEET · vawe-rebuilt

Structural recreation of the grammar stored in `grammar/rebuilt.json`.
Nothing is rendered until this is signed off.

## What is borrowed and what is not

**Borrowed: the causal skeleton only.** Five shots at 9.53 / 1.17 / 3.50 / 4.07 / 10.97s. The ground
inverting on every cut. A sans + serif-italic pairing carrying the whole identity. One tiny object
surviving every cut. Scale contrast as the single loud moment.

**Not borrowed, and this is not negotiable.** Their mark, their name, their copy, their captured UI,
their photography. `CLAUDE.md` forbids embedding copyrighted material in a published film, and a brand
film is entirely brand. The subject is **vawe**, so this one ships; `brew-launch-act1` and
`higgsfield-recreation` do not, and that is the difference.

## The five beats

| # | in | len | ground | our subject | the move | measured target |
|---|----|-----|--------|-------------|----------|-----------------|
| 1 | 0.00 | 9.53 | dark | "Every video · *hand-built*." → "*Time*" → "So we made it **data**." | type ACCUMULATES word by word on a held frame; the GROUND blooms cobalt under the last line and closes | motion 3.0 |
| 2 | 9.53 | 1.17 | **light** | one JSON key typing into a chip: `"module": "scene"` | one word types, nothing else in frame. Punctuation, not a scene | motion 6.7 |
| 3 | 10.70 | 3.50 | dark | the GRID: 20 real frames from the library, tiles at four depths, "one JSON" / "one film" crossing cells | the grid travels as ONE object while cells carry their own content | motion 5.8 |
| 4 | 14.20 | 4.07 | **light** | "**RENDER**" crosses the frame at 8x, motion-blurred → "deterministic, every time" → payoff | scale contrast IS the move. THE SPECTACLE | motion 7.6 |
| 5 | 18.27 | 10.97 | dark | cards at depth, the count `renderFrame(n)`, wordmark settles, hold, fade | objects at visibly DIFFERENT depths | motion 4.4 |

## The look

- **Theme** `vawe`. Accent `#2563eb`, which is within a hair of the reference's own blue by coincidence,
  not by lifting.
- **Type** `Anybody` for the sans. The theme's `serif` is also Anybody, which cannot carry the
  serif-italic half of the device, so this film declares `InstrumentSerif-Italic` inline. That is a
  theme gap and it gets logged.
- **Grounds** five windows, no `from`/`to`, bound to the four cuts by `core/junctions.js`:
  `plain(dark) → plain(light) → plain(dark) → plain(light) → aurora(dark)`.

## What carries across every cut

**A single cobalt dot, 10px.** It is the joint between two words in beat 1, the seed the bloom grows
from, the cursor in beat 2, the annotation bullet in beat 4, and the last thing on screen in beat 5.
It is the smallest object in the film and the only one in all five beats.

## SPECTACLE

Beat 4, at 14.6s: the word **RENDER** crosses the whole canvas at roughly eight times the film's own
type size, motion-blurred, in under a second. Loud because everything else is restrained.

## NOT

No narration. No stock photography. No gradient hero. No logo animation. No cut effect of any kind:
**the ground inversion IS the transition**, which is the reference's own strongest lesson.

## The new arsenal this film exists to exercise

| capability | where | why here |
|---|---|---|
| `depth` | beats 3 and 5 | the grid and the cards need parallax, which is a DIFFERENCE of depth |
| `adjust` | beats 1 and 4 | the bloom and the blow-through, graded over everything beneath |
| `idle` | beats 1 and 5 | held frames that are alive, which is what a 9.5s and an 11s shot need |
| bound bg windows | all | five grounds, four cuts, the cuts own the numbers |
| keyed `blur` | beat 4 | the focus pull on RENDER |
| `motion` tracks | beats 1, 4, 5 | hand-keyed, not presets |

## Sound

`{ "silent": true, "_why": "…" }` for the first pass, replaced before ship. The reference has audio and
its beat 2 is 1.17s, which is a sound-led cut; we cannot answer that with a silent film.

## Acceptance

- `./bin/vawe` prints motion in the 3.0 to 7.6 band, against our library's best of 1.78
- the ground inverts on all four cuts
- the dot is in all five beats
- `make judge` read by eye, not just green gates
