---
message: "One order at Postmark Studio takes fourteen days because every step is still done by hand, and the film pays that number off at the end."
audience: "a print-curious buyer scrolling a feed, deciding whether a letterpress shop is worth the wait"
arc: "hook (name the number) -> compose -> set -> pull -> reveal (pay the number off) -> end card"
threads: "a continuous object (the compositor's pica rule: a thin accent line, hand-keyed on a `w` track along the lower-band, widening to bracket the case and narrowing to bracket one card) + a single order followed start to finish (one card, not a catalogue tour)"
spectacle: "beat 4 (The pull) - the press stroke and the card's deboss appearing under it in one continuous motion - the loudest beat because it is the one moment ink actually becomes a mark"
not: "no captured brand (fictional shop, ruled fictional by the owner: engine-doctrine/EVALS.md), no gradient hero, no Inter/Space Grotesk/Instrument Serif/Fraunces, no drop shadow anywhere (a letterpress mark is a deboss, pressed IN, never lifted off the page), no catalogue tour of every product line (one order only, followed start to finish)"
format: 1920x1080
theme: vawe-paper
duration: 24s
craft:
  captions: "no spoken track, so no word-timed captions; the only text is on-screen copy, already checked against the web safe strip"
  color: "eyedropped from vawe-paper's own locked palette (paper white, ink, one terracotta accent); no fragment invents a colour"
  density: "each built beat (2, 3, 4) carries an eyebrow + headline + one real support object (specimen cards, ink swatches and a plate spec, or the press diagram); beats 1, 5 and 6 stay deliberately lean, the hook, the payoff and the close"
  direction: "beats 2/3/5 stay restrained, one row, no camera flourish, so beat 4's press pull, the film's one spectacle, reads as louder against them"
  html-fragments: "every fragment moves via `parts` stagger; the beat-4 platen falls on `--t` in a `calc()`, never a CSS animation or transition"
  layout: "every content beat is left-anchored near x=160-210 with one oversized hero line over a small eyebrow/support cluster; only the end card centers, a deliberate closing convention"
  motion-craft: "the platen's fall is a clamp()'d `--t` ramp with no bounce (a press does not bounce), and the continuous object is a 7-key hand-authored width track, never a fired preset"
  sound: "sound is on: an auto-resolved bed plus one `impact` cue timed to the platen's visual contact at 15.2s"
  transitions: "dissolve/seam crossfades between beats: the paper ground keeps changing register, not the shop, so every cut reads as one page turning, never a scene break"
---

<!-- THE DESIGN STUDY (stands in for `make sections`: no real Postmark Studio exists, so this is
     written first as though it had been crawled, per engine-doctrine/EVALS.md's ruling that these fictional
     briefs study themselves. Company facts (letterpress + type foundry, points/picas, registration
     marks, zero shadow) are carried over from the sibling eval fixture quality/runs/evals/briefs/recreation.json
     so both films describe the same shop; the ANGLE here is deliberately narrower and different: one
     order, followed start to finish, instead of a six-section site tour. Fidelity cannot be scored:
     there is no real site to compare frames against. This film is a postable piece testing whether the
     recreation SPINE (studied grammar -> beats -> continuous object) still holds when the brief is a
     single narrative instead of a section-by-section inventory. -->

**The company.** Postmark Studio sets type by hand and pulls it by hand, on its own press, in faces it
cuts itself. Two trades, one order: a customer's card starts in the type case and ends in the mail.

**Why a single order, not a tour.** The eval fixture already proves the vocabulary works as a site
tour (home, specimens, press, prices, craft line, end card). A postable film gets one watch, often
without sound, and a tour reads as six unrelated cards. Following ONE order start to finish gives the
hook a real question ("why fourteen days?") and the payoff a real answer, which a tour cannot do
because nothing in it is a question.

**Dominance.** White-first, paper-first: vawe-paper's own note, "90% paper-white typographic stage."
Never a dark ground; a print shop's showroom is lit paper.

**Type.** Geist / Geist Mono for every word the shop itself says (eyebrows, headline, plate specs,
price). One guest display face per specimen letterform inside beat 2's fragment only, never the film's
own chrome, because the ROTATING face is the product being sold, and a film that put a display face in
its own headline would be showing its logotype changing mid-sentence.

**Shape.** Hairline cards, 16px radius (`kit-radius-md`), zero shadow anywhere: `vawe-paper.json`'s own
"no shadows, elevation = 1px hairline." A deboss is a mark pressed IN; a drop shadow lifts a mark OFF
the page, the opposite gesture, so no shadow is a physical fact this brand cannot contradict.

**Three details that would be wrong for any other brand.**
1. **The registration mark** (a crosshair-in-circle, the pre-press plate-alignment mark). Opens beside
   the wordmark in beat 1, appears again at the plate in beat 3, and closes beside the wordmark in
   beat 6: a bookend, not decoration borrowed from nowhere.
2. **Imperial print units, paired with the metric fact.** "60PT / 15P0," "220GSM COTTON." A print
   shop's whole trade vocabulary is points and picas; a modern SaaS product would never carry a pica.
3. **A deboss simulated without a shadow**: an inset border ring and a paper-grain edge on the pulled
   card in beat 4, never `box-shadow`, so the "no shadow" rule survives the one beat that most wants to
   break it.

**Theme: `vawe-paper`, kept from the sibling fixture, and why re-argued here rather than assumed.** Its
own note ("ONE terracotta accent used only as thin marks... white hairline cards, no shadows") reads as
a brief for a print shop rather than a SaaS product: a paper ground, one warm accent standing in for an
ink stamp, hairline elevation standing in for a deboss. The continuous object (the pica rule) exploits
that same "accent as a thin mark" clause. `type.serif` maps to Geist (the theme carries no dedicated
serif, an explicit choice per `core/registry/theme-contract.js`) because this brand's one serif moment
lives inside the beat-2 specimen fragment, never in the film's own chrome.

**Sound.** On by default, unlike the sibling fixture (silent, proving the spine only). A press has a
sound: a `impact` cue at 15.2s, timed to the moment the platen bar visually reaches the card in beat 4,
not to the continuous object (which the viewer does not attribute a sound to).
[`engine-doctrine/CRAFT/SOUND.md`](../../engine-doctrine/CRAFT/SOUND.md).

## Beat 1: The number (0.0s-3.5s)
- type: hook
- onscreen: "Postmark Studio" / "Every card, fourteen days." / eyebrow "LETTERPRESS & TYPE FOUNDRY"
- placement: lower-band
- mechanism: wordmark + tagline naming a specific, unexplained number; registration-mark crosshair opens beside it (bookend, half 1 of 2)
- becomes: a blank paper stage becomes a named shop with an unanswered question
- object_in: "lower-band@0x4"
- object_out: "lower-band@140x4"
- why: open a real loop (why fourteen days?) rather than a slogan; a number the film owes an answer
- duration: 3.5s

## Beat 2: The case (3.5s-8.0s)
- type: build
- onscreen: eyebrow "DAY 1 - COMPOSE" / "Every letter, picked by hand." / specimen captions "GARAMONT No.3 - 60PT / 15P0 - WT 400" and "PLATEN GROTESK - 48PT / 12P0 - WT 900"
- placement: lower-band
- mechanism: two hairline specimen cards, each a different guest display face at full size, staggered popIn (`parts`), a day-count eyebrow starts the clock the payoff will close
- becomes: "picked by hand" becomes two real typefaces the order could be set in
- object_in: "lower-band@140x4"
- object_out: "lower-band@1600x4"
- why: the slowest, most deliberate step goes first, so the number in beat 1 starts to feel earned
- duration: 4.5s

## Beat 3: The plate (8.0s-13.0s)
- type: build
- onscreen: eyebrow "DAY 6 - SET" / "Every plate finds register." / "PLATE 04 - IN REGISTER" / "220GSM COTTON - 2 PASS"
- placement: lower-band
- mechanism: ink swatches (ink black, terracotta accent, uncoated paper) beside a resolved registration mark and a plate-spec panel, swatches stagger in
- becomes: the chosen face becomes a locked plate, ready to print, at the film's own midpoint
- object_in: "lower-band@1600x4"
- object_out: "lower-band@420x4"
- why: the object narrows to bracket ONE plate, the moment the order stops being a choice and becomes a fixed thing
- duration: 5.0s

## Beat 4: The pull (13.0s-18.0s)
- type: build
- onscreen: eyebrow "DAY 9 - PULL" / "Every card gets the full weight of the platen." / "SET BY HAND. PULLED BY HAND."
- placement: lower-band
- mechanism: a press-bed diagram (platen bar sliding down toward a card, no shadow, an inset deboss ring appears on the card as the bar reaches it) synced to a soft mechanical thump in the audio bed
- becomes: ink becomes a mark: the plate from beat 3 becomes the pressed card the order will ship as
- object_in: "lower-band@420x4"
- object_out: "lower-band@1600x4"
- why: the spectacle beat, the one moment craft becomes visible and physical; the object widens back out because this is the beat everything else was proof for
- duration: 5.0s

## Beat 5: The mailbox (18.0s-21.5s)
- type: benefit_highlight
- onscreen: "Day 14. In your mailbox." / "$58 - one card, one plate, one pull"
- placement: lower-band
- mechanism: the finished card alone, centred, no other chrome; the eyebrow's day-count resolves to the number beat 1 opened
- becomes: the open loop from beat 1 closes: fourteen days becomes a card in hand, at a stated price
- object_in: "lower-band@1600x4"
- object_out: "lower-band@300x4"
- why: pay the hook off before the end card, so the last beat can be pure address, not another claim
- duration: 3.5s

## Beat 6: The end card (21.5s-24.0s)
- type: cta
- onscreen: "Postmark Studio" / "postmark.studio"
- placement: lower-band
- mechanism: the wordmark returns small and centred, the registration mark closes beside it (bookend, half 2 of 2), the pica rule settles to its smallest width of the film
- becomes: the payoff becomes an address the viewer can type
- object_in: "lower-band@300x4"
- object_out: "lower-band@160x4"
- why: one clear next step, close the registration-mark bookend opened in beat 1
- duration: 2.5s
