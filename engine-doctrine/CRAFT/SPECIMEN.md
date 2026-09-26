---
when: you are about to write a scene that PROVES a mechanism works
answers: "what a specimen is · why the subject is a picture · the series constants and why each is fixed · when it is `make site X=catalog` instead"
group: look
---

# THE SPECIMEN: a demo is a ten-second film about ONE thing

## AGENT SUMMARY

- A demo proves ONE mechanism: `make demo Q="…" [NAME=<slug>] [FX=<key>] [SUBJECT=<path>]` writes the
  fixed archetype (`films/scene/_demo-<slug>.json`) and runs the dev loop. Never hand-author a demo
  from a blank file, a blank file plus "prove it works" produces a debug-harness grid every time.
- The subject MUST be a real picture (full-bleed, bled off three edges with the fourth feathered),
  never a headline: most effects need real tonal detail to act on, and a line of type gives them none.
- The archetype's constants (one ground: aurora then mesh, no ruled grid, one label treatment, one
  type scale, one motion personality read off the theme, one 9s runtime with one cut at 4.4s) are
  fixed in `harness/dev/demo.mjs` and never overridden per-demo, so a row of demos reads as a series.
- Enforced by `[ref: make demo]`; no gate. Every scaffolded demo carries four waivers as properties
  of the archetype: `no-storyboard`, `no-preflight`, `slow-pace`, `text-overstays`.
- Confirm: is the subject a real picture, not a line of type, and did you change the CONSTANT, not
  the demo, if something needs to differ?

A demo is written to prove a mechanism works. That purpose leaks straight into the composition,
because the fastest proof is nine specimens side by side, and nine specimens side by side is a debug
harness. A harness is legible and it is never beautiful, and it is the thing we end up showing people.

The measurement, over `films/scene/_*.json`:

| | the 54 scratch scenes | the 143 shipped films |
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

`make demo Q="what this shows" [NAME=<slug>] [FX=<key>] [SUBJECT=<path>]` writes
`films/scene/_demo-<slug>.json` and runs the dev loop on it. A blank file plus "prove it works"
produces a grid every time, so the archetype arrives with the file:

- **ONE subject, and it is a PICTURE, full bleed.** Never a grid, never a row of variants.
- **A ground the subject sits ON**, chosen because it is good, never because it reveals the specimen,
  and carrying no ruling of any kind.
- **TWO `bg` windows**, unbound, so `core/timeline/junctions.js` binds each to the joint after it.
- **ONE cut and ONE camera move.** Both are one line and both are what separates a shot from a slide.
- **A hand-keyed `motion` track** on the subject, spanning the whole film and changing state across
  the cut, so the same object stands on both sides of the joint.
- **Real copy** captioning the picture, and the silence stated with a reason.

## The subject is a picture, and that is the load-bearing part

An effect acts on a SUBJECT, and most of the arsenal needs something with real detail to act on:
`thermalBlur` remaps a luminance falloff, `edgeDetect` needs edges, a halftone needs midtones. A line
of type on a near-white field gives none of them anything.

The first version of this scaffold made the subject a headline. Every filter came out a murky blob and
the fault read as the filter's. It was the subject's. So the picture carries the effect, the line of
type CAPTIONS it, and the slug names the registry key. The house specimen is a CC0 plaster cast with a
full tonal ramp from specular white to black (`assets/brands/looks/photos/credits.json`); `SUBJECT=`
swaps in a capture or an image of your own, into a box that does not move.

The repo loses this measurement against itself: 56 of its scenes carry zero pictorial layers and the
median film gives 6% of its layers to picture, against 46% and 38% for the two films it is proudest of.
A specimen whose whole subject is a sentence in large type is a slide.

## The series constants, and why each one is fixed

The second job of a design system here is not the single frame, it is the ROW: several demos must read
as a series rather than as N unrelated experiments. So the decisions below live as named constants at
the top of `harness/dev/demo.mjs`, and **nothing lets a caller override one**. The moment one demo
picks its own ground or parks its label somewhere else, two demos cut together jump.

| constant | why it is fixed |
|---|---|
| **one ground** (`aurora` then `mesh`) | picked by rendering candidates and looking at them, not by reading preset names. Dark, so the specimen's own dark ground bleeds into the world instead of sitting on it as a slab, and single-hue, because a ground picked to make an effect legible is how the scratch library became multi-coloured. **No ruling.** A ruled grid or a rod field reads as a design tool's canvas, which is the harness signal this whole archetype exists to remove, and the first two picks here (`blobs`, then `spotlight`/`brandglow`) carried a grid and a dot field. `aurora` and `mesh` are aurora plus grain and nothing else. |
| **the picture bleeds off three edges, and the fourth is feathered** | a CSS `mask` on the layer, so it works whatever the subject is. Without it the cast's true black met the theme's dark navy at a hard vertical seam, and one visible rectangle edge is the whole harness look coming back. It also means no quarter of the frame is passive space, which is the test in CLAUDE.md: name what the emptiness is doing, then ask whether enlarging the subject removes it and improves the frame. |
| **one label treatment** | a corner slug naming the mechanism and its registry key, and a footer naming the file. Same position, size and weight every time. This is most of what makes a row read as a series, and it tells the viewer what they are looking at. |
| **one type scale, one caption size** | the caption does not resize to fit a longer line: the line gets shorter, and `Q` is length-capped rather than auto-fitted. Two demos cut together must not jump. |
| **one motion personality** | read from the theme's own `motion` block (easing, stagger). A scaffold that hard-codes its own would move in a way the theme never asked for. |
| **one runtime, one cut, in the same place** | nine seconds, one joint at 4.4s. A shared rhythm is what lets three specimens play back to back. |

Change the constant, not the demo. One fact, one owner.

## When it is `make site X=catalog` instead

**Nine variants of one effect is a contact sheet, and `make site X=catalog` is honestly a contact sheet.** It
renders the block registry to paged sheets and it is the right tool for comparing specimens against
each other. `make demo` is the other question: what does this ONE thing look like when somebody has
composed a frame around it.

If you find yourself adding a fourth sibling layer to a demo, you wanted the catalogue.

## What the specimen waives, and why

Every scaffolded demo carries four waivers, and they are properties of the archetype rather than of any
one film: `no-storyboard` (this page is the plan, once, for the series), `no-preflight` (the nine
decisions are made in the scaffold), `slow-pace` (a specimen is held on purpose; the pace floor grades
films that carry a story) and `text-overstays` (the line is a caption on a picture, not prose; it stays
because the thing it names is still on screen). A demo that needs to break something else is not a
specimen any more. Give it a storyboard.
