---
when: "you plan a short film of a common shape (a sting, a launch, a type line) and want a chain of built moves that joins, not a list of moves"
answers: "four chains of existing moves with a beat table, why each chain holds, and the traps at each seam"
group: reference
---

# prompts/moves/RECIPES.md: chains of moves for common short films

Each recipe joins moves from [README.md](README.md). Times are film seconds. The sound column uses
each move's own `Sound:` line: `<audio data-synth="<voice>" data-at="<s>">`, no `data-gain`. A snippet's
delays start at 0, so add the beat start to each one; name each beat once (`--beat-2: 1.60s`).
Measure every rect with the layout at rest, before any `vawe.onFrame` sets a transform.

## 1. Brand sting, 5 s, rich colour

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [text-as-mask](text-as-mask.md) | the picture fills the frame at 0.05 s; the pull back ends on the name | bloom 0.05 |
| 1.55 | [color-block-wipe](color-block-wipe.md) | the name rides the brand block; the block covers at 2.21 and leaves shot B, the brand ground | none |
| 2.45 | [logo-sting](logo-sting.md) | the mark lands as the trailing block clears the centre; the word opens at 2.97 | chime 2.97 |
| 3.20 | [blur-word-cascade](blur-word-cascade.md) | the tagline resolves under the lockup and reads for 1.2 s; the push runs to 5.00 | none |

Why it works: the name is the carrying element (a window, then a rider on the block, then the
lockup word). Seams change axis: scale out, then x, then a scale land, then y. The slowest move (the
pull back, 1.15 s) is 3.2x the fastest (the block's arrival, 0.36 s). The world turns at 1.55, 2.45
and 3.20 s, and the push keeps the last second alive.

Traps:
- Shot A (the masked name) needs its own ground, or shot B shows through before the block covers.
- Swap shots under the block (`tIn + dIn + 0.03`), never before. The name on the block stops the flat run from reading as blank.
- Start logo-sting when the trailing block passes the frame centre, or the mark lands under the block.
- Put the tagline inside logo-sting's `.drift`, so it rides the push (a still line under a moving lockup breaks rule 4).
- Set the push duration to the time left (2.55 s), or it stops early and the tail freezes.

## 2. Product sting, 5 s, real UI

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [pull-back-reveal](pull-back-reveal.md) (dur 0.8 s) | tight on the product mark in the sidebar of a real capture; pulls back to the whole app | bloom 0.10 |
| 0.60 | [cursor-click](cursor-click.md) | the cursor presses the one action at 1.68; the done state holds to 2.90 | pluck 1.68 |
| 2.90 | [ui-strip-away](ui-strip-away.md) | layers leave outward; the same mark travels to the lockup; the word opens at 3.65 | chime 3.65 |
| 4.25 | lockup push, 3.5 percent | the name holds 1.2 s and still moves | none |

Why it works: the mark carries the film, from the first frame (at 9x) to the lockup. The pull back
(0.8 s) is 3.1x the app fade (0.26 s). Each beat shows the real product doing one real thing.

Traps:
- The cursor exits right and the mark then travels right. Send the cursor exit down (x held, y to 1.1 H) so the seams change direction.
- The capture is pixels: cut in a second capture of the done state at the press. Never draw a button over it.
- Hand-off: during the pull back the mark in the slot lives inside `world`. At 2.90 the world is at scale 1, so hide it and show the travelling mark on the same pixel.
- Put ui-strip-away's WAAPI on children of `world`. Pull-back rewrites `world.style.transform` on every frame.

## 3. Launch, 15 s: hook, two features, proof, end

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [caret-typing](caret-typing.md) | the accent caret is on screen at frame 0, types the command and drops into the rule | pluck 0.05, 0.55 |
| 1.60 | [clip-expand](clip-expand.md) | the real capture opens from the rule's end point | bloom 1.60 |
| 2.40 | [cursor-click](cursor-click.md) | feature 1: press at 3.48, the done state (accent) reads to 4.75 | pluck 3.48 |
| 4.75 | [whip-pan](whip-pan.md) | feature 2 waits on the same strip; fastest frame at 5.30 | whoosh 5.02 |
| 5.60 | [skeleton-reveal](skeleton-reveal.md) | feature 2 resolves 6.20 to 6.80; its accent status dot is the next target | pluck 6.20 |
| 8.00 | [zoom-through](zoom-through.md) | the camera dives into the dot; the dot's colour is the proof's ground at 9.02 | swell 8.30 (ends 9.02) |
| 9.10 | [count-up](count-up.md) | the proof number settles at 9.90, chip and sparkline to 10.60 | chime 9.90 |
| 10.90 | [exit-fast](exit-fast.md) | the number leaves up in 0.22 s | none |
| 11.10 | [wordmark-cascade](wordmark-cascade.md) | the name falls onto the rail; the accent full stop | none |
| 12.80 | [cta-pop](cta-pop.md), then [drift-hold](drift-hold.md) from 13.50 | the button pops at 13.10, the arrow leans at 14.00 and 14.40 | droplet 13.25 |

Why it works: the accent point carries the film: caret, then the expand point, then the pressed state,
then the status dot, then the proof ground and the full stop. Seams run x (typing), radial, diagonal,
x (whip), y, z (dive), y, then a scale pop. The slowest moves (count-up 1.15 s, zoom-through 1.1 s)
are 5x the exit. No gap between world turns is over 2 s. The film has one whoosh and one swell.

Traps:
- Set clip-expand's `--x`/`--y` from the rule's rect after the caret spread lands (0.95 s), not at load.
- The cursor must be gone before the whip (it exits at 4.34), or it streaks with shot A.
- Skeleton and zoom-through delays count from their own beat; add 5.60 and 8.00.
- zoom-through needs a flat part with no glyph, and shot B's ground must be the dot's colour. The number is on-accent ink, and the chip drops the accent (one accent per frame).
- Exit the count-up's container. The strips own `translate`, and a `from` on the exit fills backwards over the roll.
- Run the rail bar in ink, not accent, or it fights the button's accent.

## 4. Kinetic type line, 6 s

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [letter-stagger](letter-stagger.md) | "One page in." lands letter by letter; the accent full stop lands last | pluck 0.10 |
| 1.90 | [cut-on-motion](cut-on-motion.md) | the full stop leaves the line as the ball; the ground inverts at 2.40 | none |
| 2.45 | [scale-punch](scale-punch.md) | "One film out" hits; the ball lands as its full stop at 2.67 | pluck 2.65 |
| 4.00 | [weight-morph](weight-morph.md) (1.1 s) | "out" thickens from 200 to 900 | bloom 4.00 |
| 5.10 | [drift-hold](drift-hold.md) | the line drifts to 6.00 | none |

Why it works: one dot carries the line (a full stop, then a ball across the cut, then a full stop).
The cut changes the ground and the axis (letters rise in y, the ball runs in x, the punch is a scale).
The morph (1.1 s) is 3.1x the dot pop (0.35 s). Each line holds 1.2 s or more.

Traps:
- Launch the ball from the full stop's measured rect and hide the stop span on that frame. cut-on-motion's own start (off the left edge) breaks the hand-off.
- Drop cut-on-motion's `flip`: the dot stays accent on both grounds, so check its contrast on each.
- The punch starts at 1.4x, so read the dot's slot with `offsetLeft`/`offsetTop` (they ignore transforms).
- After the ball lands, swap it for the inline dot. The morph reflows the line, and only an inline dot rides it.
- The punch owns `scale` on the h1 and the drift owns `transform`. They compose, so never set both on one property.
