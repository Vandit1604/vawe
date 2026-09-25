---
message: "Motion graphics from pure data: every frame is deterministic."
audience: "a developer opening the repo for the first time, reading sample.json beside this file"
arc: "hook -> payoff"
format: 1080x1920
theme: "themes/default.json"
duration: 7.6s
angle: "Two sentences, one per beat, and the type does all the moving. The sample teaches the schema, not a brand, so nothing but type is on the stage."
threads: "a bookend: the first line names the input (data), the second names the guarantee (deterministic); both sit on the same left margin at the same y, so the second reads as the answer to the first"
spectacle: "beat 2 · 'Every frame,' resolving from blur char by char while 'deterministic.' rises in the serif. Beat 1 stays plain word-rise so the contrast lands."
not: "no transition (two beats, one field, the second sentence replaces the first in place), no image, no logo, no sound, no brand colour"
craft:
    color: "themes/default.json, untouched; the sample must not teach a palette"
    density: "one sentence per beat, two lines each, nothing else on the stage"
    direction: "restraint: the only device is the second beat's blur-resolve against the first beat's plain rise"
    film-structure: "a bookend holds it: both sentences sit in the same place on the same field, so the second reads as the answer to the first; there is no cut to hold, the swap is the structure"
    layout: "left anchor at 100px, both beats at the same y band so the swap reads as one place changing"
    motion-craft: "word rise with a 90ms stagger in beat 1; char blur-resolve at 30ms then a line rise in beat 2; exits are none on purpose so the frame is never empty"
    keyed-motion: "none: the sample shows the kinetic presets, not a hand-keyed track"
    imagery: "none: type only, by design"
    show-dont-tell: "the claim is 'deterministic' and the proof is the render itself: the same JSON gives the same frames"
    sound: "silent: the sample is read in a docs page, never in a feed"
    transitions: "none: two beats on one field, the second replaces the first in place"
    captions: "sentence captions mirror the two lines, so the sample shows captionMode"
    typography: "sans at 84 for the plain beat, sans 108 and serif 126 for the resolve beat: the contrast is the point"
---

<!-- The reference sample every new author reads first (AGENTS.md: read sample.json before composing).
     It stays two beats and type-only so that what it teaches is the schema, not a look. -->

## Beat 1: hook (0.2s-3.7s)
- type: hook
- onscreen: "Motion graphics" then "from pure data."
- mechanism: word rise, 90ms stagger, both lines on the left margin
- becomes: an empty field becomes a claim
- trigger: the film opens
- why: name the input in the fewest words
- duration: 3.5s

## Beat 2: payoff (3.7s-7.6s)
- type: payoff
- onscreen: "Every frame," then "deterministic."
- mechanism: the first line resolves from blur char by char; the second rises in the serif; no exits, the frame never empties
- becomes: the claim becomes the guarantee
- trigger: the input was named; the payoff states what the renderer promises about it
- why: the one fact a first reader must leave with
- duration: 3.9s
