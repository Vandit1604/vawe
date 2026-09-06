---
when: the film is all type in boxes
answers: "decoration vs explanation · what each claim shape wants · the subject-size rule · no gate, your eyes"
group: density
codes: number-not-count
applies-when: hasTextBeats
confirm: "does each claim beat SHOW an artifact, not just set type?"
---

# SHOW, DON'T ONLY TELL: what to show, and how

## AGENT SUMMARY

- Every claim beat must SHOW an artifact, not just set type: decoration (glow, mark, hairline) carries no information; explanation (a bar, a ring, a diagram, a captured surface) does work the words cannot.
- No gate enforces this (`visual-vocabulary` was deleted in 2026-08 for lying about area). Code `number-not-count` is the nearest gate signal; the rest is `make judge` and your eyes.
- Checkable action: does each claim beat SHOW an artifact, not just set type?

A film can be well written, locked to the palette, cut in time and directed hard, and still show the
viewer nothing. Every layer that carries information is a word. The viewer reads it, believes it or
does not, and moves on. Measured across this library when the gate landed: **52 of 93 shipped scenes
carried no large pictorial layer at all.** Re-measured over the gate-visible scenes: **64 of 148 carry
zero pictorial layers of any size, last measured** (run `node scripts/gates/waiver-drift.mjs` for the
current count), and the median film gives **5% of its layers to picture.** That
was not a house style anyone chose. It is what you get when nobody is asked the question. It is debt,
not a pattern to copy.

Read the rest of this document as craft, not as a checklist a tool will run for you. The thing it asks
you to do has not changed; only the pretence that it was being checked has. What checks it now is
`make judge` and your eyes.

## 1. Decoration is not explanation

**DECORATION dresses the frame and carries no information.** A glow, a gradient, a hairline rule, a
corner tick, a scanline overlay, a logo mark beside a wordmark, grain, a vignette. All of it can be
beautiful. None of it tells the viewer anything they did not already have from the words.

**EXPLANATION does work the words cannot.** A bar whose length IS the number. A ring whose arc IS the
share. A captured real product surface. A diagram of a flow. A map. A photograph of the thing being
talked about. An svg that draws on or morphs so a relationship becomes visible.

A film can be drowning in the first and have none of the second. All three Ledgerline cuts were: pure
typography wearing a great deal of decoration, and all three fail this gate. `creed-launch` carries 19
pictorial layers and not one of them is large, because they are all logos and marks. The house habit is
shipping icons, not shipping explanations.

**This is the same rule CLAUDE.md already makes about backgrounds** (2a0: the background is decoration,
it is never information). One idea, applied twice. There the point is that a moving backdrop does not
excuse an empty frame. Here it is that a decorated frame does not excuse an unillustrated claim.

## 2. Find the thing in your content that wants a picture

Go through the script line by line and mark what each claim actually is. Five things want a graphic,
and each wants a specific one. If a line is none of these, it is fine as type.

| The claim is… | It wants | Because |
|---|---|---|
| **a quantity** ("4.2 million requests") | a bar or column whose **length is the figure**; a count-up next to it, never instead of it | a number set in type is a word; a bar is a size the eye compares without reading |
| **a proportion or a share** ("83% of them") | a ring, an arc, a stacked bar, a filled grid of units | the missing 17% is visible in a ring and invisible in a numeral |
| **a change over time** ("down from 40s to 2s") | a line, a sparkline, a before/after pair held side by side | the shape of the fall is the argument; the two endpoints are not |
| **a relationship or a flow** ("it routes through three checks") | a diagram, a step flow with the track travelling, a map, nodes and connectors that draw on | order and dependency have no typographic form |
| **a real thing that exists** (the product, the page, the person, the place) | the real surface: `make capture` on the live UI, a photo, a screenshot clipped to a card | the thing itself always beats a description of the thing |

**A real captured surface outranks a chart you drew.** If the claim is about the product, show the
product. `make capture` on the live component is the highest source in [IMAGERY.md](IMAGERY.md)'s
ladder for a reason: real gradients, real copy, real logos, no fabrication.

**If nothing in a beat is any of the five, ask whether the beat has a point.** A beat that names a
quantity and then does not show it is asking the viewer to do the picturing. That is what
`text-only-beat` flags, and the honest fix is usually to find the number the claim rests on rather than
to bolt a graphic onto a slogan.

## 3. The graphic must be the subject, not a garnish

**You will add a logo, an icon or a mark, and count it as showing something. Don't.** `creed-launch`
carries 19 pictorial layers and fails this anyway, because every one of them is a small logo. The house
habit is shipping icons, not shipping explanations.

A layer type is not enough. Put a 60px logo beside a headline and you have added punctuation, not a
picture. The gate draws the line at **8% of the canvas**, which is about a 400 by 400 box on either the
portrait or the landscape frame. Below that, it counts as a mark and buys nothing.

Treat 8% as the floor, not the target. If the graphic is the point of the beat, it should own the
frame: hero scale, the type demoted to a caption around it. Scale contrast is the whole trick. One huge
thing and one small label reads as designed; a chart and a headline at the same weight reads as a
slide.

Two practical traps:

- **A layer with no `w` measures zero.** The gate takes area from `w` and `h` (falling back to `w`), so
  an image or svg sized only by its content is invisible to it, and probably too small on screen too.
  Set the box.
- **Backdrop-track graphics do not count** (`track: 0`), by design. A picture behind the content is
  scenery. If it is the explanation, bring it forward.

## 4. The three questions to ask yourself, since nothing asks them for you

The deleted gate asked exactly three, and they are still the right three. Ask them by hand.

1. **Is there one carrying graphic in the whole film?** Not an icon, not a logo, not a rule. Something
   large enough to be the subject of its beat: roughly 8% of the canvas or more. Decoration cannot
   answer this. Adding more glow, more hairlines, more corner ticks moves nothing.
2. **How much of the running time has one on screen?** Under a third and the film leans on type for
   most of its length, whatever the one good beat looks like.
3. **Which beats hold nothing but type?** Name them. Then ask each what it could show instead.

**And the question none of it settles: does the picture EXPLAIN anything?** This is why the old gate
was never sufficient even when it worked: even at its best it could prove a picture was large and never
that it explained anything. A big decorative photograph satisfied all three above and
deserved to fail a human. A bar chart of a number nobody cares about satisfied them too. That
judgement is yours, and it is what `make judge` and the fidelity critic in
[SUBAGENTS.md](SUBAGENTS.md) are for.

A film whose whole idea is type on a field is a legitimate answer to all of this, decided on purpose
and defended. It is not an answer to "I could not think of one".

## 5. Where to get the graphic

- **Blocks** (`docs/BLOCKS.md`, `make catalog`): `barChart` · `lineChart` · `donutChart` · `gauge` ·
  `progressRing` · `kpiRow` · `stepFlow` · `table` · `comparison`. Fastest route from a number to a
  shape. Note that a block is build-time sugar: `{"type":"block","block":"lineChart"}` becomes real
  layers at load, no separate step; run `make expand D=<file>` (prints to stdout) when you want to see
  what the film actually draws.
- **Captured UI**: `make capture` on the live product, previewed standalone with `make preview`.
- **Blueprints** (`make blueprints`): count-ups, cascades, dashboard dives already choreographed.
- **Bespoke SVG**: [AUTHOR-THE-FRAME.md](AUTHOR-THE-FRAME.md) for a diagram no block covers, including
  draw-on and morph.
- **Photos and logos**: [IMAGERY.md](IMAGERY.md) for sourcing, treatment and licensing. Never embed
  copyrighted stills.

Density is the neighbouring rule, not the same one: [DENSITY.md](DENSITY.md) asks whether the frame is
full enough to look produced. This one asks whether anything in it is doing the explaining. A frame can
pass density on three text elements and still show nothing.

## Provenance

**Why there is no gate.** There used to be one. `visual-vocabulary` measured a layer's area to tell a
mark from a picture, and its size helper squared any layer that declared one axis and had no readable
intrinsic aspect. A 590x18 decorative underline was scored as 590x590 and credited with a tenth of the
frame, so the gate handed a pass to a hairline. It was deleted in 2026-08 because it lied. It was also
waived by 30 of 130 films. See `docs/TASTE.md` for the cull and what would bring it back.

### The backlog (triaged 2026-07-29)

The gate landed on a library that was already built, and 48 scenes failed it. That number is not 48
mistakes. It was triaged once, and the buckets are recorded here so nobody re-derives them.

| bucket | n | disposition |
|---|---|---|
| generated derivatives (`*.expanded`, `*.beatsync`) | 6 | skipped by the gate; they inherit their source's verdict |
| frozen A/B evidence (`ab-`, `ab2-`, `ab3-`, `ab4-`) | 6 | **waived, do not edit.** Editing them destroys the experiments `MISTAKES.md` #161-163 are written about |
| the moving field IS the subject | 3 | waived: the gate reads `layers` and never `bg`, so it is structurally blind to a film whose subject is the backdrop |
| single-capability probes | 18 | waived, each naming the one effect it isolates |
| recreation evidence | 1 | waived: every position is dictated by the reference film |
| **real authoring debt** | **19** | author |

Every waiver carries its reason in `authoring._why`. **A waiver with no reason is indistinguishable from
not having looked**, and the campaign is judged on how many reasoned waivers it produced as much as on
how many charts.

**The 19, in campaign order.** Gallery flagships first (highest exposure, and the reference set every
future author copies, so these go strict-clean), then the most self-indicting failure, then site assets:

1. `example-product-promo` · `example-swiss-grid` · `example-kinetic-type`, the gallery flagships.
2. `showcase-vocabulary`: its own on-screen text reads *"17.8M looks from one file · 832 x 33 x 26 x 25"*
   and it draws no combinatorics at all. The most self-indicting film in the library.
3. `hero-site` · `ransom-intro` · `showcase-cuts` · `showcase-type` · `showcase-stings` ·
   `showcase-aspect` · `creed-launch` · `stripe`, shipped site assets. **These do not get the probe
   waiver**: a public showcase of a capability is a film a stranger watches.
4. `app-showcase` · `northwind` · `threadcite-3s` · `vawe-identity` · `showcase-intro` ·
   `showcase-flight` · `ledgerline-neon`. Everything else, taken opportunistically when touched.

**A note on `creed-launch`.** It carries 19 pictorial layers and fails anyway, because every one of them
is a small logo. Size is the whole point of the measurement: a mark next to a headline reads as
punctuation, not as the subject.
