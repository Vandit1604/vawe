---
when: "any film over one beat is about to be built"
answers: "the shot table (start, dur, what the viewer notices, action to end state, camera, exposure, sound cue, out) and how its rows become page literals"
group: reference
---

# Beat sheet: the table you write before any code

**Use when** any film over one beat is about to be built. Every strong repo in the ecosystem
writes a shot table first and codes from it; the ones that skip it ship dead holds and cuts nobody
planned. This is the table, and the one-line prompt that asks for it.

**Length:** one table, one row per shot. Ten minutes.

## The prompt

```
Before any code, write films/<name>/beats.md as the table below, one row per shot. Every row has one
focal action and an end state I can picture. The slowest row is at least 3x the fastest. Exits are
shorter than entrances. Something happens in every row. Stop and show me the table.
```

## The table

```markdown
| # | start | dur | the viewer notices | action, to its end state | camera | exposure | sound cue (t) | out |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.00 | 1.6 | the promise, four words | words land on beats 1 to 4, settle | static | ones | pluck x4 (0.00, 0.50, 1.00, 1.50) | hard cut on 2.00 |
| 2 | 2.00 | 2.4 | the word "film" is now the product | the word's box grows into the capture, content swaps with a 120 ms blur | push 4 percent | ones | whoosh (1.97) | match cut |
```

Column meanings:
- **the viewer notices**: what the eye lands on first. One thing. If you cannot name it, the shot
  has no focal point.
- **action, to its end state**: the change and where it ends. An end state you can picture is one
  you can check on the sheet.
- **camera**: static, push, pull, whip, tilt. One camera language per film.
- **exposure**: ones (every frame), twos (every second frame), or hold. A hand-drawn look is on
  twos; UI is on ones. Write `hold` only with a `dead-air` waiver and its reason.
- **sound cue (t)**: the synth voice or file, at the picture's time. A contact lands 30 ms before
  its frame.
- **out**: the transition to the next row. Adjacent rows change axis or direction.

## Questions

Ask in this order; the first changes the table most. A skipped question takes its default; never wait.

1. **Length**: the total seconds, and about how many rows? Default: 15 s, 6 rows. Why: the sum of dur is the duration meta; a longer film than the rows has a dead tail.
2. **Grid**: a beat grid (BPM and offset) or free timing? Default: free; cuts follow the picture. Why: with a grid every start is a beat, or two frames before one.
3. **Exposure**: ones or twos? Default: ones. Why: UI is on ones; a drawn look is on twos, and the column is per row.
4. **Cues**: synth voices or sound files? Default: synth voices from `core/audio/kit.mjs`. Why: cues come from the picture and are placed 30 ms early either way.

## From the table to the page

Each row becomes a block in `page.html`: an element or a shot function, and a keyframe stop or
`[[f, v]]` table with the row's start and dur as literals. The studio edits those literals in place,
so the table and the page agree by construction.
## Gotchas

- A row with two focal actions is two rows.
- A row longer than 4 seconds with one action is a hold wearing an action's clothes. Split it or
  waive it.
- The sum of dur is the duration meta. If the film is longer than the rows, the tail is dead.
- Sound cues come from the picture; you write them when you write the action, not after the render.

source: the column set is adapted from Hanif's `templates/beat-sheet.md` in
https://github.com/buildwithhanif/claude-animation-skill (MIT, Hanif) and the "reads: start to end"
storyboard shape in https://github.com/JohnHeibel/ClaudeAnimationBase (MIT, John Heibel); the
"freeze the hold is the biggest cheap-motion tell" and "a duration with no tail" rewrites are from
HyperFrames' prompt anatomy, https://github.com/heygen-com/hyperframes/blob/main/docs/prompting/anatomy.mdx
(Apache 2.0, HeyGen), pattern only, none of its attribute vocabulary.
