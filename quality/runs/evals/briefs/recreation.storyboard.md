---
message: "Postmark Studio sets, casts and prints by hand, and sells the type it cuts."
audience: "a print-curious buyer landing on the shop's site; this is the recreation-type eval fixture (docs/EVALS.md), re-rendered on every doctrine change"
arc: "home -> type specimens -> the press -> print runs -> the craft line -> the end card (one beat per invented site section, in the site's own order)"
format: 1920x1080
theme: "themes/vawe-paper.json"
duration: 22s
threads: "a continuous object (the compositor's steel line gauge: a thin accent rule, hand-keyed on a `w` track, widening and narrowing to measure whatever the beat is showing) + a bookend (the registration-mark crosshair opens beside the wordmark in beat 1 and closes beside it in beat 6, resolved)"
spectacle: "beat 2 (Type specimens) · the two oversized specimen letterforms in two different display faces · the loudest visual moment because it is the one beat where the PRODUCT (a typeface) fills the frame at full size"
not: "no captured brand (the source is invented, ruled by the owner: these six eval briefs stay fictional and self-contained), no gradient hero, no Inter/Space Grotesk/Instrument Serif/Fraunces, no drop shadow anywhere (letterpress is a deboss, never a lift), no metric-only measurements (this shop thinks in points and picas)"
craft:
  (see docs/RULES/INDEX.md; every beat below states its own trace to the design study)
---

<!-- Fidelity cannot be scored on this film: there is no real Postmark Studio to compare frames
     against. This film tests the RECREATION SPINE (studied grammar -> beats -> continuous object ->
     verify), not the fidelity dimension. Say so plainly in any report that cites this file. -->

### THE INVENTED DESIGN STUDY
(stands in for `make sections` output: there is no real site to crawl, so this is written first, as
though it had been, and every beat below traces back to a line here.)

**The company.** Postmark Studio: a working letterpress print shop that also cuts and sells its own
typefaces. Two trades in one building, which is the whole reason its site (and this film) needs a
type-specimen section AND a print-run price list, not just one or the other.

**Dominance.** White-first, paper-first. The ground is never dark: `themes/vawe-paper.json`'s own note
says it plainly, "90% paper-white typographic stage." A print shop's showroom is lit paper, not a dark
SaaS dashboard, and the theme was picked for exactly that reason (see "Theme" below).

**The two or three faces, and their roles.**
- **UI voice (Geist, `type.sans`) + labels (Geist Mono, `type.mono`)**: every word that is the SHOP
  talking (eyebrows, headlines, prices, plate specs) stays in the theme's own two faces. This is the
  shop's own voice and it never changes.
- **The guest display face, one per specimen card (Tiempos Headline / Big Shoulders Stencil, bundled
  in `core/tokens.css`, hand-set only inside the beat-2 fragment's own CSS)**: this is the detail wrong
  for any other brand. A software launch film commits to ONE display face for its whole runtime; a type
  foundry's whole selling point is that the display face rotates, because the product being sold IS
  the changing face. Two specimen cards, two unrelated faces, on purpose.

**Shape language.** Hairline cards, hard-ish corners (16px radius, the theme's own `kit-radius-md`),
**zero shadow anywhere**. `vawe-paper.json`'s note: "no shadows, elevation = 1px hairline." A letterpress
impression is a DEBOSS, a mark pressed IN; a drop shadow is a mark lifted OFF the page, the literal
opposite gesture, so this is not a house-style borrowing, it is the one physical fact this brand cannot
contradict without lying about what it sells.

**Density.** Editorial, not dashboard-dense: one idea per beat, generous padding, a single row of
cards/tiles per beat rather than a grid. A print shop sells craft attention, not throughput.

**Three details that would be wrong for any other brand:**
1. **The registration mark.** A crosshair-in-circle (the pre-press alignment mark printers use to
   line up colour plates) opens beside the wordmark in beat 1, reappears on every specimen card in
   beat 2 and again, resolved and alone, on the plate-spec panel in beat 3, then returns beside the
   wordmark in beat 6. It is the film's one recurring emblem, and it is drawn from an actual pre-press
   object, not invented as decoration.
2. **Imperial print units, always paired with the metric fact.** "72PT / 18P0," "900GSM COTTON."
   A modern SaaS product is metric-only; a print shop's whole trade vocabulary is points and picas,
   because that is the unit the type case and the press bed are built in.
3. **The display face changes per card, per beat, never per film.** Named above under "faces": this is
   the one convention this film breaks that a launch film would never break, and it breaks it because
   the product being sold actually is a rotating set of faces.

**Theme chosen: `vawe-paper`, and why (not authored, picked from the existing 41).** Its own note reads
almost like a brief for this exact brand: "90% paper-white typographic stage, ONE terracotta accent
used only as thin marks (left-edge bar, ticks, underlines), white hairline cards (no shadows, elevation
= 1px line)." That is verbatim the letterpress register this film needed: a paper ground, a single warm
accent doing the work of an ink stamp or a wax seal, and hairline elevation standing in for a deboss.
The continuous object (the line gauge, a thin accent rule) was written to exploit exactly the "accent
as a thin mark" clause; it was not designed first and then matched to a theme, the theme's own
description IS the object's design brief. `type.serif` maps to Geist (the theme has no dedicated serif,
which `core/registry/theme-contract.js`'s own comment calls a normal, explicit choice for a brand
without one) precisely because Postmark's actual "serif" moment lives in the guest display faces inside
the beat-2 fragment, never in the film's own chrome.

## Beat 1: Home (0.0s-3.4s)
- type: hook
- onscreen: "Postmark Studio" / "Set by hand. Pulled by hand." / eyebrow "LETTERPRESS & TYPE FOUNDRY"
- mechanism: wordmark + tagline, registration-mark crosshair opens beside it (bookend, half 1 of 2)
- becomes: the bare paper stage becomes a named shop with a trade
- object_in: "lower-band@0x4"
- object_out: "lower-band@140x4"
- why: open loop, name the shop and its two trades (press + foundry) before either is shown
- duration: 3.4s
- traces to study: "Dominance" (paper-first ground), "detail 1" (registration mark opens here)

## Beat 2: Type specimens (3.4s-8.0s)
- type: build
- onscreen: eyebrow "TYPE" / "Two faces from the case." / specimen captions "GARAMONT No.3 · 72PT /
  18P0 · WT 400" and "PLATEN GROTESK · 60PT / 15P0 · WT 900"
- mechanism: two hairline specimen cards, each carrying a different guest display face at full size,
  each with its own registration mark, staggered popIn entrance (`parts`)
- becomes: the shop's claim ("we set by hand") becomes two real typefaces you can see and would buy
- object_in: "lower-band@140x4"
- object_out: "lower-band@1600x4"
- why: the foundry half of the business, shown before the press half, so both trades land before either
  is asked to carry the whole film; this is the SPECTACLE beat
- duration: 4.6s
- traces to study: "the two or three faces" (the guest-face rule), "detail 2" (pica/point specs),
  "detail 1" (registration mark on every card)

## Beat 3: The press (8.0s-12.5s)
- type: build
- onscreen: eyebrow "PRESS" / "Every plate finds register." / plate spec "PLATE 03 · IN REGISTER" /
  "900GSM COTTON · 2 PASS · HAND-FED"
- mechanism: ink swatches (ink black, the theme's own terracotta accent, uncoated paper) beside a
  resolved, larger registration mark and a plate-spec panel, swatches stagger in
- becomes: the two faces from beat 2 become physical, printed objects (paper stock, ink, a plate)
- object_in: "lower-band@1600x4"
- object_out: "lower-band@420x4"
- why: the press half of the business, proven with the production facts (stock weight, pass count) a
  software launch film would never carry, because this shop's craft claim has to be backed by them
- duration: 4.5s
- traces to study: "detail 1" (registration mark resolves here), "detail 2" (imperial units, "900GSM"),
  "shape language" (zero shadow, hairline swatches)

## Beat 4: Print runs (12.5s-17.0s)
- type: build
- onscreen: eyebrow "PRINT RUNS" / "Priced by the sheet, not the click." / "CARDS FROM $48 RUN OF
  250CT" / "INVITATIONS FROM $210 RUN OF 100CT" / "BROADSIDES FROM $65 RUN OF 25CT"
- mechanism: three hairline price tiles, riseIn stagger, the accent colour reserved for the one number
  on each tile that matters (the price), per the theme's own "accent only as a thin mark" rule
- becomes: the craft shown in beats 2-3 becomes something the viewer can actually order, at a stated
  price and run count
- object_in: "lower-band@420x4"
- object_out: "lower-band@1600x4"
- why: the commercial beat has to follow proof of craft, never precede it, or the price reads as the
  whole pitch instead of the payoff of the two beats before it
- duration: 4.5s
- traces to study: "density" (one row, generous padding, not a dashboard grid), "the accent" (thin mark
  only, on the price)

## Beat 5: The craft line (17.0s-20.0s)
- type: benefit_highlight
- onscreen: "Every impression, one plate at a time."
- mechanism: one centred line, no card, no eyebrow: the frame empties on purpose after four built beats
- becomes: everything shown (two faces, one press, three prices) becomes one sentence the viewer keeps
- object_in: "lower-band@1600x4"
- object_out: "lower-band@340x4"
- why: land the payoff, the bookend answer to beat 1's "set by hand, pulled by hand" (both name doing
  one thing at a time, by hand, and this is the sentence that pays that claim off)
- duration: 3.0s
- traces to study: "density" (the one beat that deliberately empties the frame, the opposite of the
  built beats, to make the sentence the whole picture)

## Beat 6: The end card (20.0s-22.0s)
- type: cta
- onscreen: "Postmark Studio" / "postmark.studio"
- mechanism: the wordmark returns, small and centred, the registration mark closes beside it (bookend,
  half 2 of 2), the line gauge settles to its smallest width of the film, under the mark alone
- becomes: the payoff becomes an address the viewer can type
- object_in: "lower-band@340x4"
- object_out: "lower-band@200x4"
- why: one clear next step, remove the risk, close the registration-mark bookend opened in beat 1
- duration: 2.0s
- traces to study: "detail 1" (registration mark closes here, resolved)
