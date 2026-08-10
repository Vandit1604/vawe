---
when: you are folding the lightfield fidelity pass into the main mistake log
answers: "the three lightfield looks that did not match their references, what was actually missing, and the four generator changes that fixed them"
group: look
---

# MISTAKES, pending — the lightfield fidelity pass

Written on a worktree branch so `docs/MISTAKES.md` stays untouched while the main thread edits it.
Fold these in as the next numbers, keeping the format. Every number here is
`node scripts/author/lightfield-check.mjs`, block error against the look's own reference.

| look | before | after | shadow warmth, before | after |
|---|---|---|---|---|
| blinds (`ref`) | 20.0 | 20.0 | +11.3 | -1.7 |
| ember | 64.2 | 22.2 | +4.4 | +2.2 |
| colonnade | 27.3 | 21.5 | +9.7 | +5.2 |

---

## #A — a ceiling reported by a previous pass was a missing operation, not a ceiling

**What went wrong.** `ember` shipped as the tonal INVERSE of its own reference for three passes:
`refs/ref-a.jpg` is black with bright flames on it, and the render was a lit field with black teeth
in it. Each pass turned dials inside the same reading of the picture and scored 64 against an image
where the next-worst look scored 27.

**Root cause.** The generator had exactly one way to make an element bright: `color-dodge`, clamped at
about 1.5x. **1.5 times black is black**, so no combination of `sheen`, `seam`, palette and seed could
draw a bright mark on a dark ground. A flame, a filament, a neon line and a star are all that picture,
and all of them were unreachable. The previous pass called this "needs a fourth pattern"; it needed a
second BLEND, and a pattern would not have helped, because the pattern was never wrong.

Dodge itself was a correct earlier fix: `plus-lighter` had lit up the first reference's black
right-hand side with bars that should not be there. The error was treating "dodge is right for a
blind" as "dodge is right".

**The fix.** `shadow.light: 'reflected' | 'emitted'`, default `reflected`, which is today exactly.
`emitted` puts the lit cells on a `plus-lighter` layer painted in `colour.bloom`: the element ADDS
light, so it is bright against black and clips to white where the field beneath it is already hot.
One question, one word: does this element take light, or give it?

**The gate.** `lightfield-test.mjs` asserts both modes and that `reflected` is the default and emits
byte-identical output. `lightfield-check.mjs` already reported the failure per look; it just could not
say why.

**The general lesson.** A ceiling reported by a previous pass is a hypothesis, and this one was named
wrongly in a way that cost two more passes. When a look cannot be reached by any dial, ask which
OPERATION is missing before asking which value is.

---

## #B — a layout fitted to one photograph was imposed on every field after it

**What went wrong.** `ember`'s light is off the bottom-right corner of the frame. No seed put it
there. `lightfield-seeds.mjs` had ranked four million layouts and `lightfield-fit.mjs` had confirmed
the shortlist, so the search looked exhaustive and was not.

**Root cause.** `fieldBlobs` placed the bloom cluster at `y` 0 to 25, the mid below it and the deep
body against the left edge, and those ranges were fitted to `refs/lightfield-ref.jpg`. The seed jitters
positions INSIDE that frame. Four million draws of a light that is always high is still a light that
is always high, so the search space never contained the answer and the number never said so.

**The fix.** `colour.originX` / `colour.originY`, defaulting to the CENTRES of the fitted ranges so
they shift nothing. They move the bloom cluster and the mid rigidly and leave `deep` alone, because
`deep` is the body the light sits in rather than part of the light. Off-frame values are legal, and
`ember` uses `118, 112`: a light source is often just outside the picture.

**The general lesson.** A constant that was measured against one reference is a fitted value wearing a
law's clothes. This file already records `spread` and `seamWidth` as the same mistake; this is the
third, and the tell is the same each time, a range in the code with a photograph's name in the comment
above it.

---

## #C — the mound of light on a face was nailed to one side of every element

**What went wrong.** Every lit field this generator could draw was lit from the same side. A blind is
brightest a little way in from the seam it trails; a flame is dark at its leading edge and hot at its
trailing one, and there was no way to say the second.

**Root cause.** `span(r, 22, 46)`, a fixed range, inside `slats`.

**The fix.** `shadow.peak`, 0 to 100, default 34, with the same +/-12 spread around it, which is the
old fixed range exactly. Also: a three-stop mound with the peak hard against an edge drew a DARK
HAIRLINE in the last few percent of the bar, precisely where a flame is hottest, so a falloff shorter
than 6% of the bar is now not drawn at all.

---

## #D — a landscape is not a row of boxes, and softness could not turn one into the other

**What went wrong.** `colonnade`'s dark masses were twelve separate rounded boxes with steps between
them; `refs/ref-b.png` is ONE continuous ridge with the panel seams drawn over it. Two previous passes
tried to close that gap with `envelope.softness` and made the picture worse both times.

**Root cause.** An envelope is one extent PER ELEMENT. A landscape is one curve sampled PER COLUMN.
Softness blurs an edge, and what was wrong was who owned the edge. With twelve panels there is no
value of any per-element dial that yields a continuous horizon, because the resolution of the
silhouette is the number of elements.

**The fix.** `envelope.mass`, 0 to 1, default 0 (emits nothing). Above 0 the same curve, with the same
`kind`, `from`, `to` and `anchor`, is drawn ONCE across the frame at 180 columns with smooth value
noise riding on it, in its own multiply layer blurred as a whole by `envelope.softness`. The elements
then run the full frame, which is what turns their seams into the full-height panel lines the
reference has. The number is the mass's opacity, so a ridge can be a cut-out or a haze.

**The gate.** `lightfield-test.mjs` asserts the ridge is continuous (every column within a whisker of
its neighbour), that the elements go back to full frame, and that the whole mass takes ONE motion
group: 180 columns each taking their own phase would tear the horizon along every column.

---

## #E — a mean error cannot see a shadow's temperature, and `blinds` proved it twice

**What went wrong.** `blinds` scored 20.0 and its lower-left corner read `#5a071f`, a lit crimson,
where the reference is `#1c0b21`, a dark violet. The seed search was genuinely exhausted here (259
alternatives, all worse) and moving the light with the new `originX/Y` scored worse again (27.2 and
27.1 against 20.0). The layout was right.

**Root cause.** The preset carried `depth: 0`, recorded as a fitted result: "the colour field already
drains to the ground, and every second fall on top measured worse". That was measured before `shade`
existed, on a cost function that summed the whole frame. The reference darkens towards the bottom
left; no blob layout puts a shadow there, so the one thing the search could not reach was the only
thing missing.

**The fix.** A `bottom-left` fall at 0.45 plus a colder `shade`, with `vivid` 1.3 paying back the
chroma the extra ambient fill costs. Corner `#5a071f` to `#340514`; shadow band +11.3 warmer than the
reference to -1.7. **Block error 20.0 to 20.0.** The mean did not move by a tenth and the picture
changed, which is the argument for the per-look shadow-warmth column existing at all.

---

## What is still wrong, measured

* **ember's hottest flames are amber where the reference's are white** (`#a47800` against `#fefff2`).
  An emitted element adds ONE colour, so the field cannot run from saturated red at one end to
  white-hot at the other: getting white needs blue in `bloom`, and a cream bloom washes the dim
  flames at the other end of the same field and scores worse (22.2 to 28.6). Reaching it would need
  an emitter colour that varies with intensity, which is a blackbody ramp and a real feature, not a
  dial.
* **blinds still shows the lobe edges as arcs** and the reference has none. `spread` is the dial for
  it and it costs more than it earns here: 0.12 costs a point of block error and three of shadow
  warmth, because a longer reach carries warm light into the corners the reference keeps black. The
  honest fix is more, smaller lobes, which is another fitted constant (three) in `fieldBlobs`.
* **colonnade's ridge has three summits where the reference has about five**, and its sky lacks the
  pale horizontal haze band the reference carries at mid height.

## Unrelated, found on the way

`scripts/author/lightfield-seeds.mjs` **cannot run**: it imports
`scripts/author/lightfield-model.mjs`, which is not in the repository. It has been broken since
`7e0fe03` at the latest. `docs/LIGHTFIELD.md` still documents it as a working command.
