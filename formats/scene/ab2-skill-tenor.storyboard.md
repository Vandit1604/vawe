---
message: "Forward one renewal quote, and real negotiators hand it back at a lower price."
audience: "CFOs and heads of procurement at companies renewing six-figure software contracts."
arc: "one continuous action: the renewal quote is forwarded, negotiated, and comes back with a smaller number on it"
object: "the renewal quote (one sheet of paper with one price on it)"
object_t0: "a full-size quote sheet, its annual total still climbing to the vendor's new ask"
object_states: "attached, sent, waited out, reopened, revised, counting down"
object_last: "the same sheet, same total line, the number settling lower. No badge, no percentage claimed."
format: 1920x1080
duration: 6s
theme: themes/ab2-skill.json  (themes/ab-skill.json is already the Shotcode theme and overwriting it would change a shipped film)
note: "Tenor has no app and no dashboard. The only surfaces that exist are the quote and the email you forward it in, so those are the only surfaces on screen. Nothing here is a mock of software the company does not sell."
---

## Beat 1: The ask (0s-2.3s)
- type: hook
- object: the quote sheet at full size on the right, its annual total counting UP from the prior term to the vendor's new ask
- onscreen: "Never sign the first renewal quote." · "SOFTWARE RENEWAL QUOTE" · "ANNUAL TOTAL $412k" · "+18% vs prior term"
- mechanism: the hook reveals word by word at frame 0 beside the sheet, so the words and their subject are the same shot; the total is a `count` layer on the sheet's own total row, so the rise is the document doing it, not an editor
- why: a CFO knows this document and hates it. Naming the rule they already believe buys the next five seconds
- transition_out: no cut. The hook clears and the sheet starts moving.

## Beat 2: Forward it (2.3s-3.46s)
- type: product_surface
- object: the sheet shrinks and travels left into a forward compose row, becoming the attachment on it
- onscreen: "To  deals@tenor.com" · "Fwd: Renewal quote 2027" · "Send"
- mechanism: one `motion` track carries the sheet from full size to the row's attachment slot at scale 0.2; the compose row opens first and the sheet lands in it; a `cursor` presses Send and the button fills
- why: this IS the product. There is no dashboard to show, and the whole ask is one forwarded email, so the film shows exactly that and claims nothing more
- transition_out: a match cut on the mail row (Fwd becomes Re). Weeks of negotiation pass, and the attachment is in the same slot, at the same size, on both sides. A root blur cut was tried first and cut: it hid the object for six frames, which breaks the spine.

## Beat 3: It comes back lower (3.46s-6s)
- type: payoff
- object: the attachment reopens into the same sheet, centred, and the same total line counts DOWN
- onscreen: "FROM Tenor · Re: Renewal quote 2027 · REVISED" · "Negotiated adjustment -$22k" · "$327k" · "negotiated by Tenor" · "Real people negotiated it down."
- mechanism: the reply row arrives on the chip with a `cut`, then the motion track runs in reverse geometry (chip back to full size at centre); a `vars` sweep swaps the sheet's own red uplift line for a green negotiated one, and a second `count` layer walks the total down and settles for the last 0.58s
- why: the payoff is one number moving on a document the viewer already read once. No savings badge, no percentage, no claim the film cannot back
