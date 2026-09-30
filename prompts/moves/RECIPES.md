---
when: "you plan a short film of a common shape (a sting, a launch, a type line) and want a chain of built moves that joins, not a list of moves"
answers: "eight chains of existing moves (three per 5 s sting, one per family) with a beat table, why each chain holds, and the traps at each seam"
group: reference
---

# prompts/moves/RECIPES.md: chains of moves for common short films

A recipe is one proven path, not the film. The direction you picked decides the film, so pick the
recipe from your direction's family (type-led, object- or product-led, graphic- or colour-led), and change at least two moves to make it yours.

Each recipe joins moves from [README.md](README.md). Times are film seconds. The sound column uses
each move's own `Sound:` line: `<audio data-synth="<voice>" data-at="<s>">`, no `data-gain`. A snippet's
delays start at 0, so add the beat start to each one; name each beat once (`--beat-2: 1.60s`).
Measure every rect with the layout at rest, before any `vawe.onFrame` sets a transform.

## 1. Brand sting, 5 s, graphic- or colour-led: rich colour (thread: the name)

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

## 2. Brand sting, 5 s, type-led (thread: a rhythm)

One pulse every 0.48 s (125 bpm): 0.48, 0.96, 1.44, 1.92 and on. Every landing and every cut is on it.

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [tracking-collapse](tracking-collapse.md) (converge 1.44 s) | "KILN" is sharp on the pulse at 0.48 and tracked tight at 1.44 | bloom 0.00 |
| 1.62 | [slice-shift](slice-shift.md) | the bands tear on the pulse at 1.92; the line waits under them, "Kiln" as its first word | none |
| 2.40 | [word-swap-slot](word-swap-slot.md) (segs 480/480/480) | "Kiln fires [cups / tiles / yours]": the values land on 2.88, 3.36 and 3.84 | pluck 3.84 |
| 3.54 | [outline-fill](outline-fill.md), fill only | "yours" is an outline; the accent floods it from the baseline on the pulse at 4.32 | bloom 4.24 |
| 4.40 | [drift-hold](drift-hold.md) | the line drifts to 5.00 | none |

Why it works: the pulse is the thread, so the eye expects each change a beat before it comes. The
name returns as the line's subject, not as a lockup after a tagline. Seams change axis: the tear
runs in x, the slot rolls in y, the flood is colour in place. The converge (1.44 s) is 3x a slot
roll (0.48 s). One accent, on one word, at the end.

Traps:
- word-swap-slot's own segs (380/380/650) miss the pulse. At 480 each, its `Sound:` time moves to the last landing, 1.44 s into the move.
- tracking-collapse starts at opacity 0 and blur; start the sharpen at 0, so frame 0.1 already shows the letters (rule 1).
- Lay out the line under the bands before they move, with "Kiln" on the name's baseline and left edge, so the tear reads as the sentence arriving around the name.
- Build "yours" in the slot with its outline and fill spans from the start, and run only the fill half of outline-fill; its rise would fight the slot's roll.
- Pad the slot window 0.35 em (its own clip) so the roll never cuts the "y" of "yours" (rule 7).

## 3. Brand sting, 5 s, object-led (thread: one tile)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [grid-stagger-wave](grid-stagger-wave.md) | the mark tile sits at the left third from frame 0; the studio's work rings out from it by 1.06 | droplet 0.14 |
| 0.85 | [crash-zoom](crash-zoom.md) (hit at 1.40) | the camera slams onto the mark tile at 1.53; the tile is 2.6x, in the centre | pluck 1.53 |
| 2.10 | [grid-tile-flip](grid-tile-flip.md) | the frame is a wall of tiles the size of the zoomed mark; it turns to the name's ground | none |
| 3.00 | [wordmark-cascade](wordmark-cascade.md) | "tessera" falls onto the rail; the full stop is the mark tile and lands last | droplet 3.55 |
| 4.20 | [drift-hold](drift-hold.md) | the rail run ends at 4.85; the lockup drifts to 5.00 | none |

Why it works: one tile carries the film. It is the source of the wave, the target of the zoom, the
unit of the wall and the full stop. Seams change axis: a scale in, then a turn on y, then a fall.
The grid push (1.6 s) is 12x the crash push (0.13 s). The rail run is the film's one stock device.

Traps:
- Make the mark tile W / 8 / 2.6 (about 92 px at 1920 wide), so at 2.6x it is exactly one tile of the 8 x 5 wall.
- crash-zoom holds 16 copies of the world; start the wave's WAAPI on every copy with the same delays, or the copies disagree and ghost.
- The eye is at the centre after the zoom, so start the flip wave at the centre tile, not the bottom-left corner (rule 10).
- Draw the full stop as the tile at x-height size in the accent; it is the one accent in the last frames.
- The tiles in the wave are the studio's real work, never stock shapes: an empty grid is a template.

## 4. Product sting, 5 s, product-led: real UI (thread: the product mark)

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

## 5. Product sting, 5 s, type-led (thread: a type line)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [command-palette-summon](command-palette-summon.md), no exit | the real app dims, the palette drops at 0.15, "rep" types, Enter lights "Run report" at 1.34 | pluck 1.34 |
| 1.40 | [type-fill-transition](type-fill-transition.md) | the camera dives into the "o" of "report" in the lit row; its ink is shot B's ground at 2.37 | none |
| 2.37 | [mask-rise](mask-rise.md) | "Ledger reports: 3 hours" rises on the new ground | none |
| 2.80 | [strikethrough-replace](strikethrough-replace.md) | "3 hours" is struck at 3.06; "3 min" rises from 3.30 and reads by 3.90 | pluck 3.30 |
| 3.90 | [drift-hold](drift-hold.md) | the line drifts to 5.00 | none |

Why it works: one word carries the film. "report" is the typed query, the chosen row, the letter
the camera enters and the first word of the claim. The claim is a change the viewer sees made, not
a slogan. Seams change axis: a dive in z, then a rise in y. The dive (1.0 s) is 4.5x a row collapse
(0.22 s).

Traps:
- The palette is the product's own: a capture, or its DOM rebuilt from the product's CSS. Rows are real command names, never invented ones.
- Drop the palette's exit. The dive leaves through the palette, and an exit would remove the letter the camera enters.
- type-fill-transition sums `offsetLeft` to the world; the row sits several levels deep, so add each offset parent up to `world`.
- The lit row's label is on-accent ink, so shot B's ground is that ink: read it with `getComputedStyle`. Put the accent on "3 min" only.
- The old value reads for about 0.45 s before the strike; it only has to be seen. The new line then holds 1.1 s to the end.

## 6. Product sting, 5 s, graphic- or colour-led (thread: a colour)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.30 | [success-check](success-check.md) | the real checkout's accent pay button takes the press at 0.50; the check circle lands at 1.24 | chime 1.24 |
| 1.20 | [shape-morph-wipe](shape-morph-wipe.md) | the accent circle grows from 1.60, widens into a card and past the frame by 2.45 | none |
| 2.00 | [count-up](count-up.md) | on the accent ground, "1.8 s to paid" settles at 2.80 | chime 2.80 |
| 3.20 | [liquid-wipe](liquid-wipe.md) | the dark ground floods in from the left from 3.45; the name waits in the left third | none |
| 4.40 | [drift-hold](drift-hold.md) | the name, its full stop in the accent, drifts to 5.00 | none |

Why it works: the accent is the thread. It is the button, then the check circle, then the ground,
then the name's full stop. The frame shows the real checkout from frame 0. Seams change axis: a
growth from one point, then a flood in x. A liquid row (up to 1.1 s) is 6.9x the label's exit (0.16 s).

Traps:
- A capture cannot morph. Rebuild only the button as live DOM from the product's CSS, on the capture's exact pixels; never a guessed style.
- Measure the circle's rect at rest (the button's height), not mid-spring, and hide the ring before the mask passes it.
- The accent ground is full frame from about 2.3 to 3.8 s. Keep it under 2 s (rule 2), and set the number in on-accent ink with no accent chip.
- Shot A is the accent, so the liquid's accent rim is invisible on it: drop the rim, and let the accent return only as the full stop.
- Put the name in the left third. The flood comes from the left, so the name reads from about 3.8 s and holds 1.2 s.

## 7. Launch, 15 s: hook, two features, proof, end

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

## 8. Kinetic type line, 6 s

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [letter-stagger](letter-stagger.md) | "One page in." lands letter by letter; the accent full stop lands last | pluck 0.10 |
| 1.90 | [cut-on-motion](cut-on-motion.md) | the full stop leaves the line as the ball; the ground inverts at 2.40 | none |
| 2.45 | [scale-punch](scale-punch.md) | "One film out" hits; the ball lands as its full stop at 2.67 | pluck 2.65 |
| 4.00 | [weight-morph](weight-morph.md) (1.1 s) | "out" thickens from 200 to 900 | bloom 4.00 |
| 5.10 | [drift-hold](drift-hold.md) | the line holds still; only the ground drifts to 6.00 | none |

Why it works: one dot carries the line (a full stop, then a ball across the cut, then a full stop).
The cut changes the ground and the axis (letters rise in y, the ball runs in x, the punch is a scale).
The morph (1.1 s) is 3.1x the dot pop (0.35 s). Each line holds 1.2 s or more.

Traps:
- Launch the ball from the full stop's measured rect and hide the stop span on that frame. cut-on-motion's own start (off the left edge) breaks the hand-off.
- Drop cut-on-motion's `flip`: the dot stays accent on both grounds, so check its contrast on each.
- The punch starts at 1.4x, so read the dot's slot with `offsetLeft`/`offsetTop` (they ignore transforms).
- After the ball lands, swap it for the inline dot. The morph reflows the line, and only an inline dot rides it.
- The drift goes on the ground behind the line, never on the h1: a drifting line reads as a move, not a hold.
