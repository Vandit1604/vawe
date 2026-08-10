---
when: "you are about to fold the blinds/colonnade composition pass into docs/MISTAKES.md"
answers: "what was fitted to one photograph inside fieldBlobs, what the paired shadow direction fixes, and which search tool has been dead since it was written"
group: look
title: Pending mistakes, blinds composition pass
what: Findings from the pass that gave the bloom cluster a count and a placement dial. Fold into docs/MISTAKES.md.
---

# Pending: the blinds composition pass

Three findings. The first two are the same class as `colour.spread`: a number fitted to one
photograph and then imposed on every field after it. The third is a tool nobody has run.

## A. The bloom cluster had exactly three lobes, and the three was a constant

**What.** `blinds` was held out of the library at block error 20.0. Its shadow temperature had been
fixed the pass before, from +11.3 to -1.7, and the block error did not move at all. The reference is a
flowing field with several colour regions, orange across the top, magenta through the middle left,
deep red at the left edge and near-black falling away right. The render was one soft lobe that reads
as a spotlight on a curtain. Same palette, different picture.

**Root cause.** `fieldBlobs` in `core/lightfield/index.js` built the light as an array literal of
three `lightBlob` calls with size ranges fitted to `refs/lightfield-ref.jpg`. Three lobes at rx 18 to
40 and ry 30 to 70 overlap into a single mass whatever the seed does with them. `colour.spread` was
this same bug one level up, and the note that fixed it said so; the count and the size ranges were the
half that was left.

**Fix.** `colour.lobes`, 1 to 12, default 3. The lobe series is the fitted three continued by their
own decay, and the whole series is scaled so the cluster covers the same total area at any count. That
scaling is load-bearing: without it the dial would be a brightness control wearing a structure
control's name, and every palette would blow out as you turned it. At 3 the scale is exactly 1 and
every committed preset is byte-identical apart from its class hash.

## B. Lobe placement was independent, so a cluster is lumpy by construction

**What.** `colonnade`'s horizontal luma profile dips at 56% of the width where `refs/ref-b.png` is
flat from 25% to 75%, because two lobes overlapped into two humps with a valley between them. Adding
lobes at random positions moved the dips around and did not fill them.

**Root cause.** Every lobe drew its x independently from `span(r, 8, 92)`. A sum of a few independent
draws is humps and dips; it has no mechanism that produces a broad flat band, at any count.

**Fix.** `colour.evenness`, 0 to 1, default 0. At 1 the span is cut into one band per lobe and each
lobe draws inside its own. Bands are handed out from the middle outwards, because the series decays in
size and handing them out left to right would ramp the lobe size across the frame and tilt every field
to one side. At 0 it is the same single random draw as before, so the fitted layout does not move.

**The lesson under both.** A structural constant cannot be evaluated at a fitted seed. Sweeping
`lobes` at `blinds`' own seed said 3 was best and sweeping it at `colonnade`'s said the same, because
changing the count changes every draw after it and the incumbent seed was chosen for the incumbent
count. The rival was being judged in the incumbent's clothes, which is the same trap
`lightfield-seeds.mjs` documents about palettes. Any change to layout has to be scored against a
re-searched seed or it is scored against nothing.

## C. `shadow.direction` could not say "a lit band"

**What.** Measured on `refs/ref-b.png` against `out/_check-colonnade.png` at 160x104, the render was
27 units too bright at the top edge (29.9 against 56.8) and 16 units too dark at the left edge (39.7
against 23.4), in the same frame.

**Root cause.** `colonnade` uses `direction: 'center'`, which is a radial fall. A radial cannot darken
the top without darkening the sides by more, so no value of `depth` or `softness` reaches the
reference. `top` and `bottom` each darken one end and leave the other lit. The shape the picture needs,
darkness above and below a lit band and nothing taken off the sides, was simply not in the vocabulary.

**Fix.** `top-and-bottom` and `left-and-right` in `DIRECTIONS`: the existing falloff profile mirrored
about the middle of the frame. Both are opt-in, so nothing committed moves.

## D. `lightfield-seeds.mjs` and `lightfield-fit.mjs` have never run

**What.** Both import `./lightfield-model.mjs`. That file is not in the repository and never has been:
`git log -- scripts/author/lightfield-model.mjs` is empty. Running either tool dies on
`ERR_MODULE_NOT_FOUND` before it does any work.

**Why it matters here.** These are the two tools that fit a seed, which is exactly what finding A says
any layout change needs. Their doc comments describe measured results in detail, so a reader has every
reason to believe they work. The seed search for this pass had to be written from scratch against
`lightfield-render.open()`.

**Not fixed in this pass**, and that is a gap rather than a decision: rebuilding the palette solver the
two tools share is a bigger job than the composition fix it was blocking, and the search was done
another way. Either restore `lightfield-model.mjs` or delete the two tools. A tool that cannot start is
worse than no tool, because its comments are read as evidence.
