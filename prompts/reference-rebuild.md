---
when: "a reference mp4 must be matched, not merely echoed"
answers: "the three prompts: frame-by-frame SPEC.md, KEEP/CHANGE, the rebuild loop on bin/vawe critique <page> --ref <mp4>"
group: reference
---

# Reference rebuild: frame study, KEEP/CHANGE, rebuild

**Use when** a reference film exists and the deliverable must match it: its light, its pacing, its
type, its motion curves. Route 1 in `engine-doctrine/CRAFT/ROUTING.md`. Not for "inspired by";
that is the director's brief.

**Length:** the reference's length. Never longer.

## The template, in three prompts

### Prompt 1: the SPEC

```
Reference: quality/refs/<ref>/source.mp4. Do not write any code yet.
1. node harness/media/see.mjs quality/refs/<ref>/source.mp4. Read index.md and every grid it wrote.
2. node harness/dev/ref-cutlist.mjs REF=<ref> for the measured cut list. Never eyeball cuts off a sheet.
3. Write quality/refs/<ref>/SPEC.md, frame by frame at every cut and every hold:
   - t (s), the frame's job in five words, the light map (bg colour, key direction, contrast band),
     every on-screen string quoted exactly, the type (size as a fraction of the frame height, weight,
     tracking), the position of each element as a fraction of the frame, the camera (static, push,
     whip), and the motion curve of the one thing that moves (name it from core/motion/motion.js's
     EASINGS; fit, do not guess).
   - Every entrance and exit: duration in ms, direction, and whether it accelerates. Exits should
     run shorter than entrances; write down when the reference disagrees.
4. Measure the approach rate of each settle: what share of the remaining distance closes per frame.
   Real UI motion sits at 12 to 19 percent. Write the number per move.
5. Pull five stills at the five moments that define the look. Name them.
Stop and show me SPEC.md.
```

### Prompt 2: KEEP / CHANGE

```
Read SPEC.md. For every line, write KEEP or CHANGE and one reason.
KEEP: anything the reference does that we want exactly (light, pacing, curves, type scale).
CHANGE: the content (our strings, our captures, our brand from themes/<brand>.json), anything the
reference does that breaks a house rule (an em dash on screen, a hook over 12 words, an exit slower
than its entrance, two adjacent transitions in one direction), and anything measured off the grid.
Nothing is silent: an unmarked line is a bug. Stop and show me the KEEP/CHANGE list.
```

### Prompt 3: the rebuild

```
Build films/<name>/page.html from SPEC.md and the KEEP/CHANGE list. Match the light map first, then
the camera and depth of field, then the type, then the detail (house order for recreations).
Every KEEP line is a number in the page: a @keyframes stop, an element.animate keyframe or a
[[f, v]] table in seek(t). Use approach(f, from, to, k) from core/motion/springs.js with the k you
measured. Then:
  bin/vawe critique films/<name>/page.html --ref quality/refs/<ref>/source.mp4
It compares the draft to the reference at the same timestamps and prints a match score. Loop until
combined >= 0.70, then stop and ask for the critique pass (prompts/critique-pass.md, frame-locked).
Three passes without progress: stop and report, do not keep going.
```

## Inputs to ask for

The reference file, what stays private (references are in-house and are never published), the
strings and captures that replace the reference's content, the brand kit.

## Gotchas

- The stills before the motion: a wrong background makes every later score wrong for a reason that
  is not the motion (`skills/vawe-reference/SKILL.md`).
- Scene detection catches hard cuts only; a crossfade boundary still wants an eye check.
- A reference can run 2x the pace a contact sheet suggests. Trust the cut list, not the sheet.
- `bin/vawe critique <page> --ref <mp4>` scores the match; it does not judge taste. Two fresh judges at 8/10 close a
  beat, never the agent that wrote the fix.

source: pattern from notdwd's reference-rebuild prompts (frame-by-frame SPEC.md, KEEP/CHANGE, the
12 to 19 percent approach rule, five stills, a fresh default-reject critic), an owner-shared
article, not redistributable, so this is our own text in that shape; the study and loop steps are
vawe's own (`skills/vawe-reference/SKILL.md`, `harness/media/see.mjs`). The light-first order is the house
rule for recreations.
