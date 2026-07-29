# SHOW, DON'T ONLY TELL: what to show, and how

A film can be well written, locked to the palette, cut in time and directed hard, and still show the
viewer nothing. Every layer that carries information is a word. The viewer reads it, believes it or
does not, and moves on. Measured across this library when the gate landed: **52 of 93 shipped scenes
carried no large pictorial layer at all.** That was not a house style anyone chose. It is what you get
when nobody is asked the question.

Gate: `make visuals D=<file>` (`scripts/gates/visual-vocabulary.mjs`), also step `visuals` inside
`author-check`. FAIL `no-visual-vocabulary`. WARN `graphics-thin` · `text-only-beat`.

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

## 4. What the gate can and cannot see

It proves a picture is on screen and is large enough to be the subject, and it counts how many beat
windows have one. That is all.

- `no-visual-vocabulary` (FAIL): not one carrying graphic in the whole film. Decoration cannot fix this.
  Adding more glow, more rules, more ticks moves nothing, because none of them are in the count.
- `graphics-thin` (WARN): fewer than a third of the beat windows have a graphic on screen. The film
  leans on type for most of its length.
- `text-only-beat` (WARN): named beat windows hold nothing but type.

**It cannot prove a picture explains anything.** A big decorative photograph passes and deserves to
fail a human. A bar chart of a number nobody cares about passes. Green here means the film is not pure
typography; it does not mean the graphic earned its place. That judgement is yours, and it is what
`make judge` and the fidelity critic in [SUBAGENTS.md](SUBAGENTS.md) are for. Never read a tick from
this gate as a verdict on the frame.

Waive a deliberate break with `{"authoring":{"allow":["graphics-thin"]}}`. A waiver is for a film whose
whole idea is type on a field, decided on purpose and defended. It is not for "I could not think of
one".

## 5. Where to get the graphic

- **Blocks** (`docs/BLOCKS.md`, `make catalog`): `barChart` · `lineChart` · `donutChart` · `gauge` ·
  `progressRing` · `kpiRow` · `stepFlow` · `table` · `comparison`. Fastest route from a number to a
  shape. **Caveat as of today: the gate reads the raw JSON and does not expand blocks**, so a real
  chart authored as `{"type":"block","block":"lineChart"}` still reports `no-visual-vocabulary`. Check
  it on the expanded file (`make expand D=<file>`, then `make visuals D=<file>.expanded.json`) before
  you believe the failure. `showcase-count` fails on the source and passes on the expansion.
- **Captured UI**: `make capture` on the live product, previewed standalone with `make preview`.
- **Blueprints** (`make blueprints`): count-ups, cascades, dashboard dives already choreographed.
- **Bespoke SVG**: [AUTHOR-THE-FRAME.md](AUTHOR-THE-FRAME.md) for a diagram no block covers, including
  draw-on and morph.
- **Photos and logos**: [IMAGERY.md](IMAGERY.md) for sourcing, treatment and licensing. Never embed
  copyrighted stills.

Density is the neighbouring rule, not the same one: [DENSITY.md](DENSITY.md) asks whether the frame is
full enough to look produced. This one asks whether anything in it is doing the explaining. A frame can
pass density on three text elements and still show nothing.

---

## The backlog (triaged 2026-07-29)

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

1. `example-product-promo` · `example-swiss-grid` · `example-kinetic-type` — the gallery flagships.
2. `showcase-vocabulary` — its own on-screen text reads *"17.8M looks from one file · 832 x 33 x 26 x 25"*
   and it draws no combinatorics at all. The most self-indicting film in the library.
3. `hero-site` · `ransom-intro` · `showcase-cuts` · `showcase-type` · `showcase-stings` ·
   `showcase-aspect` · `creed-launch` · `stripe` — shipped site assets. **These do not get the probe
   waiver**: a public showcase of a capability is a film a stranger watches.
4. `app-showcase` · `northwind` · `threadcite-3s` · `vawe-identity` · `showcase-intro` ·
   `showcase-flight` · `ledgerline-neon` — everything else, taken opportunistically when touched.

**A note on `creed-launch`.** It carries 19 pictorial layers and fails anyway, because every one of them
is a small logo. Size is the whole point of the measurement: a mark next to a headline reads as
punctuation, not as the subject.
