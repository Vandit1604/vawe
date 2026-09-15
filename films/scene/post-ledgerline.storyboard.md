---
message: "Ledgerline matches two ledgers on amount and date, not on the merchant string, and shows you the handful of rows that still disagree."
audience: "Finance teams and controllers, watching a launch clip on a company feed or a product page."
arc: "loose, not a locked sequence: name the gap, show the real diff surface working at scale, prove the one hard case, then state the total and ask, with the mark riding quietly in the corner the whole way rather than owning a beat"
object: "the reconciliation flag for row 2026-03-11, Northside Roasters"
object_t0: "an UNMATCHED chip, isolated, red, centred"
object_states: "isolated chip, settled left inside the ledger surface, pushed to centre and flipped MATCHED on resolve, shrunk to a corner badge held through the close"
object_last: "a small MATCHED badge resting bottom-left, still on screen under the CTA overlay"
format: 1920x1080
theme: ab4-a-ledgerline
duration: 24s
pace: "held and dense, one fact at a time, the register of a reconciliation pass, not a highlight reel"
spectacle: "beat 3: the two merchant strings for the same purchase sit stacked, then the chip snaps from UNMATCHED to MATCHED the instant the caption names why. Every other beat states one fact and stops"
not: "no dedicated logo beat, no confetti, no generic dashboard mockup, no round numbers, no narration, no CTA beat of its own"
craft:
    color: "themes/ab4-a-ledgerline.json: ivory paper, near-black ink, one ledger green for matched, one clay red for unmatched. Text on the beat-4 accent window uses the theme's light token (--surface / --on-dark), never --ink, because ink and the clay red both fail on that window"
    density: "beat 2 alone carries four real dated row pairs across two columns, not one hero row; every beat carries a real number, never a placeholder"
    direction: "restraint everywhere except beat 3, the merchant-string resolve on the exact row the viewer has tracked since beat 1"
    html-fragments: "parts stagger the ledger rows in beat 2; vars drive the flag's colour and label as a snap threshold in beat 3, never a crossfade; no CSS animation or transition anywhere"
    layout: "asymmetric: hook sits left-third in beat 1, the dual ledger fills the right two-thirds in beat 2 while the flag travels the left rail, beat 4's stat and CTA overlay share one frame off-centre rather than each taking their own card"
    mark: "the wordmark is NOT a dedicated late beat: a small quiet LEDGERLINE mark sits top-left from beat 1 onward, ambient and constant, per Google ABCD guidance that early/ambient placement does not hurt recall while opening ON the logo does. It never moves and never resizes"
    motion-craft: "the continuous object is a hand-keyed 4-key motion track built from its own placement contract, plus a vars-driven colour/text flip timed to the beat 3 reveal; the count layer in beat 4 runs the theme's own curve"
    sound: "audio auto: true, the engine's own bed carries it; cue times land on the 3 transition seams; no VO, nothing to caption"
    captions: "none: no VO, this is a muted-feed web launch clip and every line is already on-screen type at reading size"
    transitions: "one seam family (fade, mech seam) at every boundary: a reconciliation film reads as one continuous pass, not cuts between unrelated shots"
    cta: "the CTA does not take its own beat: ledgerline.io and the tagline overlay directly on the beat 4 product/stat shot, per the corrected structure, while the badge and the ambient mark both hold in frame under it"
    show-dont-tell: "beat 2's ledger is the real diff surface, not a claim about it; beat 3 shows the two literal merchant strings resolving, not a sentence saying they resolved; beat 4's total is a real count layer counting to 9,412, not a static number set in type"
    typography: "JetBrains Mono carries every figure, code-like string and the ambient mark, because a ledger is a column of numbers and a proportional face breaks the column; Bricolage Grotesque carries the sentence-level lines. The theme's scale (hook ~92, headline ~65, body ~38, caption ~25) holds unchanged across all four beats"
---

## Beat 1: The gap (0s-4s)
- type: hook
- object: an UNMATCHED chip sits alone, red, centred, on a bare paper field; a small quiet LEDGERLINE wordmark settles top-left in the same beat and stays for the rest of the film
- onscreen: "$4,212.18 doesn't match your books." / "BANK feed vs BOOKS ledger" / "UNMATCHED" / "LEDGERLINE"
- mechanism: the chip fades up alone on the paper field; the dollar figure is the largest, first-legible word; the ambient mark fades in small and still in the same beat, so its first appearance is not a dedicated hero moment
- why: a controller who has closed a month recognises this number before the product. Naming the gap buys the next twenty seconds without a claim, and placing the mark now, quietly, means it never has to reopen the film later
- becomes: a blank field becomes the named gap, with the mark already riding along in the corner
- object_in: center@640x120
- object_out: center@640x120

## Beat 2: The two ledgers (4s-11s)
- type: product_surface
- object: the chip settles left as a dense two-column ledger fills the right two-thirds, BANK on the left and BOOKS on the right, row by row
- onscreen: "Ledgerline diffs every row by amount and date." / "BANK" / "BOOKS" / "03-09 · ACH PAYROLL RUN 0311 · -9,204.50" / "03-09 · Payroll, March 9 · -9,204.50" / "03-11 · SQ *NORTHSIDE ROASTERS · -18.40" / "03-11 · Northside Roasters LLC · -18.40" / "03-12 · WIRE OUT 88214 · -2,600.00" / "03-12 · Contractor wire, Reyes · -2,600.00" / "03-14 · CHECK 1042 · -740.00" / "03-14 · Office lease, check 1042 · -740.00"
- mechanism: rows stagger in top to bottom on both columns at once (parts), most pairs turning ledger green as they land; the one row that stays unresolved keeps the chip's clay red and holds still while its neighbours settle
- why: this is the mechanism at the density it actually runs at, four real row pairs, not one demo row. Seeing three pairs land instantly makes the one holdout worth stopping on
- becomes: the isolated gap becomes a wall of rows, all but one already resolved
- object_in: center@640x120
- object_out: left@640x120

## Beat 3: Matched on the numbers, not the words (11s-16.5s)
- type: transformation
- object: the frame pushes in on the one holdout row; its two merchant strings sit stacked, then the chip flips colour the instant the caption names why
- onscreen: "SQ *NORTHSIDE ROASTERS" / "Northside Roasters LLC" / "Matched on amount and date, not the memo string." / "MATCHED"
- mechanism: the two strings sit stacked inside a fixed-width box so neither reflows the row around it; a vars threshold snaps the chip's colour and label from clay red UNMATCHED to ledger green MATCHED in one frame, not a dissolve, timed to the caption
- why: this is the product's one real claim, made concrete on the exact row watched since beat 1, and it pre-empts the obvious objection: the match is not on the text
- becomes: the UNMATCHED chip becomes a MATCHED chip as the two merchant strings resolve to one row
- object_in: left@640x120
- object_out: center@700x140

## Beat 4: The whole book, and the ask (16.5s-24s)
- type: payoff
- object: the chip shrinks to a small badge bottom-left as the reconciliation's real total takes the centre of the frame; the URL and tagline settle over the same shot rather than a fresh card
- onscreen: "9,412 of 9,431 matched automatically." / "19 flagged in 4.1 seconds." / "MATCHED" / "ledgerline.io" / "Reconcile with confidence."
- mechanism: a count layer runs up to 9,412 against the fixed 9,431, holds, then the flagged line settles under it; the badge finishes shrinking into the corner as the count settles; the URL and tagline overlay the same frame in its last third rather than opening a new beat, and the ambient mark holds top-left, unchanged, to the last frame
- why: the payoff is the fact the film has been proving one row at a time, stated once, in real figures, with the ask riding the same shot instead of asking for a fresh one it has not earned
- becomes: one resolved row becomes the whole book's real total, and the total becomes an address
- object_in: center@700x140
- object_out: bottom-left@200x64
