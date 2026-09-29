---
name: vawe-reference
description: "Match a reference film with a vawe page: make spec REF= writes SPEC.md frame by frame, every line is marked KEEP or CHANGE, the page is rebuilt light first, then make next PAGE= REF= loops until the match passes. Load when a reference mp4 must be matched, not merely echoed."
effort: high
---

# vawe-reference: reference -> SPEC -> KEEP/CHANGE -> rebuild -> match

Use when a reference film exists and the deliverable must match its light, pacing, type and curves.
Not for "inspired by"; that is a director's brief (`prompts/directors-brief-long-form.md`).
References are in-house and never published. Length is the reference's length, never longer.

## 1. Start and study

```bash
make dev-tool X=new TYPE=recreation NAME=<name> REF=quality/refs/<ref>/source.mp4
make spec REF=quality/refs/<ref>/source.mp4
```

`make spec` writes `quality/refs/<ref>/SPEC.md` with the measured cut list and, at every cut and hold:

- t in seconds and the frame's job in five words;
- the light map: background colour, key direction, contrast band;
- every on-screen string, quoted exactly;
- type: size as a fraction of frame height, weight, tracking;
- each element's position as a fraction of the frame; the camera (static, push, whip);
- the curve of the one thing that moves, fitted, not guessed, and the approach rate of every settle
  (the share of the remaining distance closed per frame; real UI sits at 0.12 to 0.19);
- every entrance and exit: duration in ms, direction, accelerating or not.

Read every line. Where the tool could not measure, measure by eye from the strip and write the
number down. Do not write any code yet.

## 2. KEEP / CHANGE

Mark every SPEC line. Nothing is silent; an unmarked line is a bug.

- **KEEP**: what the reference does that we want exactly. Light, pacing, curves, type scale.
- **CHANGE**: the content (our strings, our captures, our kit from `assets/brands/<brand>/kit.json`),
  anything that breaks a house rule (an em dash on screen, a hook over 12 words, an exit slower than
  its entrance, two adjacent transitions in one direction), anything measured off the grid.

Stop and show the KEEP/CHANGE list before the rebuild.

## 3. Rebuild, light first

Build `films/<name>/page.html` (`vawe-page` for the contract). Match in this order: the light map,
then the camera and depth of field, then the type, then the detail. Every KEEP line becomes a
literal in the page: a `@keyframes` stop, an `element.animate` keyframe, or a `[[f, v]]` table in
`seek(t)`. Use `approach(f, from, to, k)` from `core/motion/springs.js` with the k you measured.

## 4. The match loop

```bash
make next PAGE=films/<name>/page.html REF=quality/refs/<ref>/source.mp4 [FROM= TO=] [FINAL=1]
```

It compares the draft to the reference at the same timestamps and prints a match score. Loop until
the score passes. Three passes without progress: stop and report; do not keep going. `make ship`
refuses a final render until this loop has passed for the page's current content.

## 5. The frame-locked critique

Hand the draft to a fresh session (`vawe-critique`) with `REF=`. Anything the draft added that the
reference does not have, and no CHANGE line names, is a rejection. Two fresh judges at 7 or above
close a beat, never the agent that wrote the fix.

## Gotchas

- Stills before motion: a wrong background makes every later score wrong for a reason that is not
  the motion.
- Trust the cut list, not the sheet: a reference can run twice the pace a contact sheet suggests.
- Scene detection catches hard cuts only; a crossfade boundary wants an eye check.
- `make next` scores the match, not taste. The critique is a separate step.

Prompt text for the three stops: `prompts/reference-rebuild.md`. The loop's doctrine:
`engine-doctrine/CRAFT/RECREATION.md`.
