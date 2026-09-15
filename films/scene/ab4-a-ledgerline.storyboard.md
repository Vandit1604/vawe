---
message: "Ledgerline reads the bank CSV nobody can read and hands back a ledger you can."
audience: "Freelancers and small-business owners who export their bank statement and then stare at it."
arc: "one row is pulled out of a raw export, split at its commas, named and categorized, and put back as the first line of a finished ledger"
object: "one transaction row, line 47 of the export"
object_t0: "a jammed comma-delimited string, indistinguishable from the 411 rows around it"
object_states: "buried in the wall, lifted out alone, split at its commas into three fields, named and given a category, seated as the top line of a clean ledger"
object_last: "the top row of the finished ledger, category set, with the rest of the file resolved under it and the month's total settled at the foot"
format: 1080x1920
theme: themes/ab4-a-ledgerline.json
duration: 12s
---

## Beat 1: The export (0s-2.9s)
- type: hook
- object: line 47 sits in the wall of raw CSV, drifting up with every other row, marked only by a thin rule that finds it and holds
- onscreen: "Your bank calls this a statement." · "statement_export_2026-03.csv" · "LINE 47 OF 412" · "2026-03-14,SQ *BLUE BOTTLE 4471,-6.75,USD"
- mechanism: a full-bleed column of monospace CSV rows scrolls slowly upward behind the hook; the hook decodes in word by word over it, then defocuses out; the scroll brakes to a stop as the marker rule lands on line 47
- why: everyone who has ever opened a bank export recognises this wall and the small despair of it. Naming what they already feel buys the next ten seconds without a single claim
- transition_out: no cut. The hook blurs out, the wall stops moving, and line 47 is the only thing still lit.

## Beat 2: One row, lifted (2.9s-5.6s)
- type: product_surface
- object: line 47 rises out of the wall to the centre of the frame and its commas open into three ruled columns, date and merchant and amount
- onscreen: "The commas were always columns." · "DATE" · "MERCHANT" · "AMOUNT" · "2026-03-14" · "SQ *BLUE BOTTLE 4471" · "-6.75"
- mechanism: the row travels up and scales on its own motion track while the wall behind it falls away and dims; a vars sweep drives the comma separators to zero width and the column rules to full, so the string opens rather than being replaced
- why: this is the whole trick of the product shown once, small: the commas were always the columns. Doing it to one row makes the file-wide version at the end legible in a single second
- transition_out: a snappy fade cut on the surrounding frame while the row itself holds its position and keeps opening through the boundary.

## Beat 3: The row names itself (5.6s-8.6s)
- type: transformation
- object: the same row, now a ledger entry: the merchant string resolves to a real name, a category chip lands in the fourth column, and the amount right-aligns as currency
- onscreen: "Blue Bottle Coffee" · "COFFEE" · "-$6.75" · "matched on the merchant, not the memo string" · "Now the other 411."
- mechanism: the raw merchant string cross-fades to the resolved name inside a fixed-width box so nothing after it reflows; the category chip pops in under the merchant column on a spring; the amount switches from bare mono to a currency figure and takes the accent
- why: the difference between a CSV and a ledger is one field, and this beat is that field arriving. It also answers the obvious objection out loud: the match is on the merchant, not on the garbage in the memo
- transition_out: the finished row settles down and left toward the top line of a ledger sliding up under it.

## Beat 4: The book, even (8.6s-12s)
- type: payoff
- object: the row is now the top line of the finished ledger, unchanged, with eight resolved rows cascading in beneath it and the month's total settling at the foot
- onscreen: "LEDGERLINE · MAR 2026" · "412 ROWS CATEGORIZED" · "MARCH OUTGOINGS  -$18,431.06" · "Ledgerline" · "Bank CSV in. Ledger out."
- mechanism: the ledger body cascades in row by row under the held top line while the camera eases back from the row to the whole page; the footer total counts to its figure and settles; the drawn ledger mark strokes itself on beside the wordmark for the end card
- why: the payoff is the file the viewer came in holding, finished, with their own row still visible at the top of it. The claim at the end is a sentence for something the previous three seconds already did
- transition_out: the end card holds to the last frame. Nothing exits.
