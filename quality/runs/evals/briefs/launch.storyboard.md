---
message: "Ledgerline reconciles two ledgers by amount and date, not by matching strings, and tells you exactly which rows still disagree."
audience: "Finance teams and controllers closing the books, watching a launch clip on a product site or a feed."
arc: "one unmatched row is named, shown inside the real diff surface, explained, and resolved, while the running total of the whole reconciliation lands as the payoff"
object: "the reconciliation flag for row 2026-03-11, Northside Roasters"
object_t0: "an UNMATCHED chip, isolated, red"
object_states: "isolated flag, settled into the ledger surface, zoomed and flipped to MATCHED, shrunk to a corner badge, held beside the wordmark, held beside the CTA"
object_last: "a small MATCHED badge resting bottom-left beside the CTA"
format: 1920x1080
theme: ab4-a-ledgerline
duration: 26s
pace: "held, dense, one fact at a time: this is a reconciliation tool, not a highlight reel"
spectacle: "beat 3, the merchant-string resolve: two different strings for the same purchase sit stacked, then the flag snaps from UNMATCHED to MATCHED the instant the caption names why"
not: "no confetti, no generic dashboard mockup, no round numbers, no narration"
craft:
    color: "the palette is themes/ab4-a-ledgerline.json, an accounting-pad read built for this fictional product: ivory paper, near-black ink, one ledger green for matched, one clay red for unmatched. Nothing invented beyond the fiction itself"
    density: "each beat carries one hero (the gap, the dual ledger, the resolving strings, the stat, the mark, the URL) with real dated/amount metadata already inside the ledger rows, not one flat line; beat 2 alone carries four real row pairs"
    direction: "restraint everywhere except beat 3: the two merchant strings resolving into one matched row, on the exact line the viewer has tracked since beat 1, is the one spectacle; every other beat states a single fact and stops"
    html-fragments: "every fragment moves by the engine's own mechanisms: parts stagger the ledger rows in beat 2, vars drive the flag's colour and text swap on the continuous object as a snap threshold, not a crossfade; no CSS animation or transition anywhere"
    layout: "asymmetric throughout: the hook sits left-third, the dual ledger fills the right two-thirds while the flag travels the left rail, the brand and CTA are centred only because the film has nothing left to balance against by then"
    motion-craft: "the continuous object carries a hand-keyed 7-key motion track built from its own placement contract, plus a vars-driven colour/text flip timed to the reveal; the count layer runs the theme's own curve; nothing is a preset firing once"
    sound: "audio auto: true, the engine's own bed carries it; no VO, nothing to caption"
    captions: "none: no VO, this is a muted-feed web/LinkedIn launch clip and every line is already on-screen type at reading size"
    transitions: "one seam family (fade, mech seam) for every boundary, because a reconciliation film should read as one continuous accounting pass, not cuts between unrelated shots; the direction gate's own read earns its one expressive whipPan at the beat 2 to 3 payoff seam"
---

## Beat 1: The gap (0s-3.5s)
- type: hook
- object: an UNMATCHED chip sits alone, red, centred, nothing else on the page yet
- onscreen: "$4,212.18 doesn't match your books." / "BANK feed vs BOOKS ledger" / "UNMATCHED"
- mechanism: the chip fades up alone on a bare field; the dollar figure is the first thing legible and the largest word on screen; the chip holds
- why: a controller who has ever closed a month recognises this number before they recognise the product. Naming the gap in one line buys the next twenty seconds without a claim
- becomes: a blank field becomes the named gap between two ledgers
- object_in: center@640x120
- object_out: center@640x120

## Beat 2: The two ledgers (3.5s-9s)
- type: product_surface
- object: the same chip settles left as a dense two-column ledger fills the rest of the frame, BANK on the left and BOOKS on the right, row by row
- onscreen: "BANK" / "BOOKS" / "2026-03-11 · SQ *NORTHSIDE ROASTERS · -$18.40" / "2026-03-11 · Northside Roasters LLC · -$18.40" / "2026-03-09 · ACH PAYROLL RUN 0311 · -$9,204.50" / "2026-03-09 · Payroll, March 9 · -$9,204.50" / "Ledgerline diffs every row by amount and date."
- mechanism: rows stagger in top to bottom on both columns at once, most pairs turning a quiet matched green as they land; the one row that stays unresolved keeps the chip's red and holds still while its neighbours settle
- why: this is the whole mechanism shown at the density it actually runs at, not a single hero row. Seeing five matched pairs land instantly makes the one holdout worth stopping on
- becomes: the isolated gap becomes a wall of rows, all but one already resolved
- object_in: center@640x120
- object_out: left@640x120

## Beat 3: Matched on the numbers, not the words (9s-13.5s)
- type: transformation
- becomes: the UNMATCHED chip becomes a MATCHED chip as the two merchant strings resolve to one row
- object: the frame pushes in on the one holdout row; its two merchant strings sit stacked, then cross-fade into a single resolved line while the chip flips colour
- onscreen: "SQ *NORTHSIDE ROASTERS" / "Northside Roasters LLC" / "Matched on amount and date, not the memo string." / "MATCHED"
- mechanism: the two strings sit stacked inside a fixed-width box so neither reflows the row around it; the chip's colour and label snap from red UNMATCHED to the theme's ledger green MATCHED as a threshold, not a dissolve, timed to the same instant the caption names why
- why: this is the product's one real claim, made concrete on the exact row the viewer has been watching since beat 1, and it pre-empts the obvious objection: the match is not on the text
- object_in: left@640x120
- object_out: center@700x140

## Beat 4: The whole book (13.5s-19s)
- type: payoff
- object: the chip shrinks to a small badge in the corner as the reconciliation's real total takes the centre of the frame
- onscreen: "9,412 of 9,431 matched automatically." / "19 flagged in 3.2 seconds." / "MATCHED"
- mechanism: a count layer runs up to 9,412 against the fixed 9,431, holds, then the second line settles under it; the badge finishes its shrink into the corner just as the count settles, so nothing competes with it mid-count
- why: the payoff is the fact the whole film has been proving one row at a time, stated once, in real figures, right before the brand asks for nothing
- becomes: one resolved row becomes the whole book's real total
- object_in: center@700x140
- object_out: bottom-left@200x64

## Beat 5: Ledgerline (19s-23s)
- type: brand
- object: the badge holds bottom-left as the wordmark and a single drawn rule take the frame, alone
- onscreen: "LEDGERLINE"
- mechanism: a single ruled line draws itself on above the wordmark as it settles in; nothing else moves
- why: the mark earns a beat of its own, not a bullet beside the payoff, because the whole film has just spent nineteen seconds making the case that will make the wordmark worth remembering
- becomes: the running total becomes the name behind it
- object_in: bottom-left@200x64
- object_out: bottom-left@200x64

## Beat 6: Close (23s-26s)
- type: cta
- object: the badge holds in the same corner as the close card settles
- onscreen: "ledgerline.io" / "Reconcile with confidence."
- mechanism: the URL and the line settle in under the wordmark's held position; the frame holds to the last frame
- why: the close is a fact and an address, not a slogan the film has not earned
- becomes: the name becomes an address
- object_in: bottom-left@200x64
- object_out: bottom-left@200x64
