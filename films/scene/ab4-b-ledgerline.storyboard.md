---
message: "Ledgerline takes the raw line your bank exports and gives it back as a categorized ledger."
audience: "freelancers and small-business owners who reconcile their own bank exports by hand"
arc: "one continuous action: a single exported transaction line is read, split, named, and filed into a finished ledger"
object: "one exported transaction line (SQ *BLUE BOTTLE COFF;2026-03-04;-6.75;POS DEBIT)"
object_t0: "raw semicolon mush in a monospace face, the whole width of the phone, unreadable at a glance"
object_states: "raw string · one of a wall of raw strings · a split three-column row · a named row wearing a category · row one of a finished ledger"
object_last: "the same line, top of a ledger where every row is categorized and the month total has resolved"
format: 1080x1920
theme: themes/ab4-b-ledgerline.json
duration: 12s
---

## Beat 1: The export (0s-3.0s)
- type: hook
- object: the raw line alone at centre, typed in as one unbroken semicolon string, then pushed up the frame as five more identical-looking strings stack under it
- onscreen: "This is what your bank calls an export." · "SQ *BLUE BOTTLE COFF;2026-03-04;-6.75;POS DEBIT" · "statement-2026-03.csv"
- mechanism: the line types on character by character at frame 0 under the hook, so the viewer reads the mush at reading speed; the camera then eases back a little while five more rows arrive under it on a fast stagger and the block dims
- becomes: one raw line becomes a wall of six raw lines, and the wall becomes the job you were about to do by hand
- why: the viewer already knows this file and already dreads it. Showing the exact string they get is cheaper and truer than any adjective for messy
- transition_out: no cut. The stack stays put and the top line lifts out of it.

## Beat 2: Read (3.0s-5.8s)
- type: product_surface
- object: the top line lifts clear of the stack and its semicolons open into three aligned columns, merchant on the left, date centre, amount right
- onscreen: "Ledgerline reads every line." · "Blue Bottle Coffee" · "04 Mar · card · San Francisco" · "-6.75"
- mechanism: one `motion` track carries the top row up and forward while the stack behind it defocuses; a `vars` sweep on the same row swaps the raw string for the split columns in place, so the glyphs land where the delimiters were
- becomes: the semicolon string becomes a three-column row, and the merchant code becomes a merchant name
- why: this is the product's actual work and it is invisible in a screenshot. Doing it on the line the viewer just read proves it on their own data

## Beat 3: Name it (5.8s-8.4s)
- type: product_surface
- object: the split row, now holding still centre frame, grows a category chip on its right edge
- onscreen: "And knows what it was." · "Coffee" · "Meals & Entertainment"
- mechanism: the line of copy rises word by word while the chip scales up at the row's right edge and the row's left rule takes the category colour, then the parent account name arrives under the chip a second later
- becomes: an uncategorized row becomes a Coffee row, and the row's neutral rule becomes the category's colour
- why: categorizing is the part people actually pay for and the part they most doubt a tool can get right, so the film spends a beat landing one correct answer instead of claiming an accuracy number

## Beat 4: The ledger (8.4s-12.0s)
- type: payoff
- object: the row settles to the top of a full ledger as the five raw strings behind it resolve into rows like it, each with its own category chip, and the month total counts up beneath them
- onscreen: "MARCH 2026 · 6 LINES · CATEGORIZED" · "TOTAL OUT" · "$554.40" · "Ledgerline"
- mechanism: the camera pulls back, the row scales down into slot one, and the five stack rows cut to categorized rows on a 0.06s stagger; a `count` layer walks the month total up and settles, and the wordmark holds under it
- becomes: the wall of raw strings becomes a categorized ledger, the single row becomes row one of it, and the blank total resolves into the month's number
- why: the payoff has to be the whole file done, not the one line, because the one line was only ever the promise. The total is the sum of the six amounts on screen and nothing wider is claimed, and the last thing that moves is the ledger completing itself, not a slogan arriving
