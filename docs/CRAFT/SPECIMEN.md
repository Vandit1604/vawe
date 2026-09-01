---
when: you are about to write a scene that PROVES a mechanism works
answers: "what a specimen is · the series constants and why each is fixed · when it is `make catalog` instead · why a theme was never the missing piece"
group: look
---

# THE SPECIMEN: a demo is a ten-second film about ONE thing

A demo is written to prove a mechanism works. That purpose leaks straight into the composition,
because the fastest proof is nine specimens side by side, and nine specimens side by side is a debug
harness. A harness is legible and it is never beautiful, and it is the thing we end up showing people.

The measurement, over `formats/scene/_*.json`:

| | the 35 scratch scenes | the 120 shipped films |
|---|---|---|
| contact-sheet shaped (4+ sibling layers of one type stepping across x or y) | **27 (77%)** | n/a |
| more than one `bg` window | **0 (0%)** | 28 (23%) |
| any cut or transition | 1 (3%) | 48 (40%) |
| any camera | 1 (3%) | 40 (33%) |

The shipped column is nothing to boast about either. It is the floor the scratch work falls through.

**A shared design system was never the missing piece, and this is the number that settles it: all 35
of those scenes already declare a theme**, and a theme already carries palette, gradient, type,
motion, bg, vars and a default backdrop. They shared a design system and they still looked like a
harness. Tokens decide what a frame is made of. They do not decide that it is a SHOT.

## The archetype

`make demo Q="what this shows" [NAME=<slug>] [FX=<arsenal key>]` writes
`formats/scene/_demo-<slug>.json` and runs the dev loop on it. A blank file plus "prove it works"
produces a grid every time, so the archetype arrives with the file:

- **ONE subject, full bleed.** Never a grid, never a row of variants.
- **A ground the subject sits ON**, chosen because it is good, never because it reveals the specimen.
- **TWO `bg` windows**, unbound, so `core/junctions.js` binds each to the joint after it.
- **ONE cut and ONE camera move.** Both are one line and both are what separates a shot from a slide.
- **A hand-keyed `motion` track** on the subject, spanning the whole film and changing state across
  the cut, so the same object stands on both sides of the joint.
- **Real copy** naming the thing, and the silence stated with a reason.

## The series constants, and why each one is fixed

The second job of a design system here is not the single frame, it is the ROW: several demos must read
as a series rather than as N unrelated experiments. So the decisions below live as named constants at
the top of `scripts/dev/demo.mjs`, and **nothing lets a caller override one**. The moment one demo
picks its own ground or parks its label somewhere else, two demos cut together jump.

| constant | why it is fixed |
|---|---|
| **one ground** (`soft` then `blobs`) | picked by looking at rendered frames, not by reading preset names. A ground picked per demo, to make an effect legible, is how the scratch library became multi-coloured and busy. Contrast comes from scale and from the empty half of the frame. |
| **one label treatment** | a corner slug naming the mechanism and its registry key, and a footer naming the file. Same position, size and weight every time. This is most of what makes a row read as a series, and it tells the viewer what they are looking at. |
| **one type scale, one subject size** | the subject does not resize to fit a longer line: the line gets shorter, and `--q` is length-capped rather than auto-fitted. Two demos cut together must not jump. |
| **one motion personality** | read from the theme's own `motion` block (easing, stagger). A scaffold that hard-codes its own would move in a way the theme never asked for. |
| **one runtime, one cut, in the same place** | nine seconds, one joint at 4.4s. A shared rhythm is what lets three specimens play back to back. |

Change the constant, not the demo. One fact, one owner.

## When it is `make catalog` instead

**Nine variants of one effect is a contact sheet, and `make catalog` is honestly a contact sheet.** It
renders the block registry to paged sheets and it is the right tool for comparing specimens against
each other. `make demo` is the other question: what does this ONE thing look like when somebody has
composed a frame around it.

If you find yourself adding a fourth sibling layer to a demo, you wanted the catalogue.

## What the specimen waives, and why

Every scaffolded demo carries four waivers, and they are properties of the archetype rather than of any
one film: `no-storyboard` (this page is the plan, once, for the series), `no-preflight` (the nine
decisions are made in the scaffold), `slow-pace` (a specimen is held on purpose; the pace floor grades
films that carry a story) and `text-overstays` (the subject is the object the film is about, not
prose). A demo that needs to break something else is not a specimen any more. Give it a storyboard.
