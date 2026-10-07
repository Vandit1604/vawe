---
when: "you plan a film of a common shape (a sting, a launch, a type line, a 20 to 30 s product, proof or brand film) and want a chain of built moves that joins, not a list of moves"
answers: "fifteen chains of existing moves (eight short films, six complete videos of 20 to 30 s, then the spectacle beat that goes inside any film) with a beat table, why each chain holds, and the traps at each seam"
group: reference
---

# prompts/moves/RECIPES.md: chains of moves for common short films

A recipe is one proven path, not the film. The direction you picked decides the film, so pick the
recipe from your direction's family (type-led, object- or product-led, graphic- or colour-led), and change at least two moves to make it yours.

Each recipe has one row that reads `invent: the film's own moment`. Do not copy it: design that beat
from the brief's own words, product and look, and name its move in the Shots table. A film whose beats
follow a recipe almost 1:1 gets advice from `dev` (`harness/lib/recipe-echo.mjs`).

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
| 4.10 | invent: the film's own moment | one small event on the lockup that only this brand's own mark, colour or name can cause | none |
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
| 4.15 | invent: the film's own moment | one rhythm event that belongs to the name's own letters or product, on the pulse | none |
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
| 3.95 | invent: the film's own moment | one thing the brand's real work does to the lockup tile that no other studio's work would | none |
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
| 3.95 | invent: the film's own moment | one real thing the product's own UI does on the done state, taken from its captures | none |
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
| 3.55 | invent: the film's own moment | one change the viewer sees made in the product's own data, not in the claim text | none |
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
| 4.05 | invent: the film's own moment | one moment where the accent does something only this product's checkout can do | none |
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
| 10.60 | invent: the film's own moment | the one proof moment specific to this product, built from its own number or capture | none |
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
| 4.70 | invent: the film's own moment | one event on the line's own dot or words that follows from what the sentence says | none |
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

# Complete videos, 20 to 30 s

Same rules as above, at film length. Each film shows the product or the idea working in its middle,
holds every read at 1.2 s or more, and has one spectacle second with about 1.5 s of quiet before it
(no sound, no travel, only a drift). Exits run 0.22 s; entrances run 0.6 s or more. Adjacent seams
change axis or direction. Stock devices (accent bar, sheen band, drifting lights) appear once per
film. The beat times are a plan: re-time them to the copy's reading time (words x 0.6 s from 4 words up, else 1.2 s; `harness/lib/read-hold.mjs`).

## 9. Problem to fix launch, 21 s (thread: one card)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [overwhelm-collapse](overwhelm-collapse.md) | 26 real notices flood and collapse; the one clean card opens at 1.61 and its claim reads to 3.40 | bloom 1.61 |
| 3.40 | [card-assemble](card-assemble.md) | the clean card is the shell; the parts build in from the left, right and below; the button lands at 4.40 | droplet 4.40 |
| 6.20 | [cursor-click](cursor-click.md) | the press at 7.28 fixes the mess; the accent done state reads to 8.80 | pluck 7.28 |
| 8.80 | [exit-fast](exit-fast.md) | the card leaves left in 0.22 s | none |
| 9.10 | [count-up](count-up.md) | "3.2 h saved a week" settles at 9.90 (spectacle); chip and sparkline to 10.60 | chime 9.90 |
| 11.40 | invent: the film's own moment | the one moment where the fix changes something only this product's users would recognise | none |
| 11.80 | [logo-wall](logo-wall.md) | lanes land under the settled number from 11.80; the wall drifts to 15.00 | none |
| 15.00 | [exit-fast](exit-fast.md), [wordmark-cascade](wordmark-cascade.md) | wall and number leave up; the name falls onto the rail at 15.30, full stop at 15.85 | droplet 15.85 |
| 16.90 | [cta-pop](cta-pop.md), then [drift-hold](drift-hold.md) | the button pops at 17.20, the arrow leans at 18.00 and 18.40; the line drifts to 21.00 | droplet 17.35 |

Why it works: the problem is the flood and the fix is one card, so the contrast is the story and the
card is the thread (clean element, shell, pressed state). Seams change axis: radial in, then x and y
parts, a bowed cursor path, an x exit, a y roll, x lanes, a y exit, a y fall, a scale pop. The
slowest move (card build, 1.0 s) is 4.5x an exit. The quiet before the spectacle is the done-state hold.

Traps:
- Put items in the flood at frame 0 (rule 1) and accelerate the gaps; the flood is the only busy stretch, so the fix has to read calm.
- The clean element is the card-assemble shell at its final rect. Start the parts after it settles, or the card shows twice.
- The flood items are the product's real notice types, the wall logos are invented marks. Never real brands.
- count-up: the number is the one accent on the dark ground, so the chip drops its accent (one accent per frame).
- logo-wall keeps the number's accent; its `Sound: none` holds. Exit the count-up's container, not its wheels.
- Run the rail bar in ink, not accent, or it fights the button.
- cursor-click exits down; the card then leaves left. Two exits in the same direction read as one.

## 10. AI product demo, 22 s (thread: the accent figure)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [caret-typing](caret-typing.md) | "Ask your ledger." types; the caret drops into the rule at 0.95; the line reads to 1.80 | pluck 0.05, 0.55 |
| 1.80 | [clip-expand](clip-expand.md) | the real window (empty composer) opens from the rule's end point and rests by 2.80 | bloom 1.80 |
| 3.20 | [ai-stream-response](ai-stream-response.md) | the prompt leaves the composer at 3.70; "Margin rose 2.1% in Q3." streams and is settled by 8.00; it reads to 11.00 | pluck 3.70 |
| 11.00 | [clip-expand](clip-expand.md), inset | a window opens from the "2.1%" figure: the real report; it reads to 14.10 (quiet) | bloom 11.00 |
| 14.10 | [success-check](success-check.md) | the press on "Send to team" at 14.30; the circle lands at 15.04 (spectacle); done reads to 16.40 | chime 15.04 |
| 16.40 | [exit-fast](exit-fast.md), [wordmark-cascade](wordmark-cascade.md) | the window leaves left; the name falls onto the rail at 16.70, its full stop at 17.25 | droplet 17.25 |
| 17.80 | invent: the film's own moment | one moment in the round trip that uses the product's own data, figure or wording | none |
| 18.20 | [drift-hold](drift-hold.md) | the lockup drifts to 22.00 | none |

Why it works: a prompt becomes an answer, the answer becomes a deliverable and the deliverable is
sent, so the film is the whole round trip. The accent figure is the thread (answer, chip, the report's
headline number, the check circle, the full stop). Seams: x (typing), radial, y (send and stream),
an inset window, a scale land, an x exit, a y fall. The expand (1.0 s) is 4.5x the exit.

Traps:
- Use one window for clip-expand and ai-stream-response: same pixels at 2.80 and at 3.20, or the swap shows.
- ai-stream-response streams in chunks from `rng`; keep the answer to 5 words (3 s to read, words x 0.6). The figure is the only accent.
- Measure the "2.1%" chip's rect after the stream settles and set `--x`/`--y` from it. Use `inset()`, since a report is a window, not a burst.
- The report is a real capture or the product's DOM, never a drawn chart. A capture cannot morph: rebuild only the button as live DOM for success-check, and select it by its button (`.pay path`).
- Keep the report still for 2 s before the press. That is the quiet before the spectacle; nothing but a drift runs there.
- The rail bar runs in ink. The circle's accent is already the film's last bright thing.

## 11. Feature tour, 20 s (thread: the camera's one canvas)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [pan-stations](pan-stations.md) + [cursor-click](cursor-click.md) | station 1 is a real capture at frame 0; the press at 1.48 reads done to 3.50 | pluck 1.48 |
| 3.60 | pan 1, right | station 2 arrives at 4.02, its node lights | pluck 4.02 |
| 4.02 | [card-assemble](card-assemble.md) | station 2's card builds (button at 5.02); it holds to 7.50 | droplet 5.02 |
| 7.60 | pan 2, diagonal up | station 3 arrives at 8.02 | pluck 8.02 |
| 8.60 | [cursor-click](cursor-click.md) | press at 9.68; done reads to 11.50 | pluck 9.68 |
| 11.60 | pan 3, down | station 4 arrives at 12.02; 1.4 s of quiet | pluck 12.02 |
| 13.40 | [ui-focus-zoom](ui-focus-zoom.md) | the cursor lands on the status at 13.40; the camera scales from 13.45 (spectacle); the status holds to 16.30 | none |
| 16.40 | [exit-fast](exit-fast.md), [calm-lockup](calm-lockup.md) | the world leaves up in 0.22 s; the brand settles from 16.70, the line at 16.84 | bloom 16.76 |
| 17.40 | invent: the film's own moment | one moment on the canvas that belongs to the product's own extra feature or surface | none |
| 18.00 | [drift-hold](drift-hold.md) | the lockup floats to 20.00 | none |

Why it works: one canvas, so four features read as one product and not four slides. The rail and the
lit nodes say where the camera has been. Seams change direction on every pan (right, up-right, down),
then a z dive, then a y exit. The lockup's settle (1.0 s) is 4.5x the exit (0.22 s).

Traps:
- card-assemble is added at station 2 so two clicks do not sit side by side. A third click beside them would be a template.
- Exit the cursor down before each pan (it is gone by 2.50 and by 10.80). A cursor in the world streaks with the pan.
- pan-stations and ui-focus-zoom both move the world. Drive both from one camera state (`translate`, `scale`) in one `vawe.onFrame`, and read station 4's rect with `offsetLeft`/`offsetTop`, never mid-pan.
- Hold each station for words x 0.6 s, at least 1.2 s, and drift the camera through the hold so it is never a still.
- ui-focus-zoom needs a target with no glyph under it (a status pill). Cut out on the next beat; never zoom back on a mirror curve.
- calm-lockup's lights are the film's one stock device. Lay the lockup on the ground the status colour sits on, so the zoom's last frame and the lockup share a ground.

## 12. Proof film, 20 s (thread: one number)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [count-up](count-up.md) | "26,800 renders a month" is on screen at frame 0, settles at 0.80; chip and sparkline to 1.55; it reads to 3.80 | chime 0.80 |
| 3.80 | [exit-fast](exit-fast.md) | the number leaves left in 0.22 s | none |
| 4.05 | [chart-build](chart-build.md) | the bars rise to the same 26.8k; 1.35 s of silence, then the last bar turns accent (spectacle); it reads to 8.60 | droplet 5.40 |
| 8.60 | [exit-fast](exit-fast.md) | the chart leaves down | none |
| 8.85 | [logo-wall](logo-wall.md) | lanes land under "212 studios" by 9.90; the wall drifts to 13.60 | none |
| 13.60 | [exit-fast](exit-fast.md), [wordmark-cascade](wordmark-cascade.md) | wall and line leave up; the name falls at 13.85, its full stop at 14.40 | droplet 14.40 |
| 14.80 | invent: the film's own moment | one proof detail only this product can show: a real customer figure or a real chart event | none |
| 16.20 | [cta-pop](cta-pop.md), then [drift-hold](drift-hold.md) | the button pops at 16.50, the arrow leans at 17.30 and 17.70; the line drifts to 20.00 | droplet 16.65 |

Why it works: the number is the claim, the chart is its proof and the wall says who counts it. The
same figure (26.8k) is the roll, the last bar and the sparkline's end point, so each beat confirms the
last. Seams change axis: a y roll, an x exit, y bars, a y exit, x lanes, a y exit, a y fall, a scale
pop. The wall (1.1 s) is 5x an exit. Only four sound cues, so the film stays quiet.

Traps:
- Use one unit and one data set. The chart axis and the number share units, and the sparkline ends where the last bar ends.
- The accent is the number, then the last bar, then the wall's line, then the button. No frame has two: the chart's tag is white, the chip drops its accent.
- The wall is invented marks at one visual weight, one ink. The accent stays on the line above it.
- Exit the wall with its line as one container. Exit the count-up's container, not the wheels.
- The chart holds 3.2 s: axis labels and a title are words, and they read at words / 3 s. Drift the card so the hold is never a still.
- Run the rail bar in ink, not accent, or it fights the button.

## 13. Kinetic type manifesto, 20 s (thread: one sentence)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [blur-word-cascade](blur-word-cascade.md) | "Every tool wants its own format." resolves; line 2 "You know HTML." follows at 2.40; both read to 5.80 | none |
| 6.00 | [word-swap-slot](word-swap-slot.md) (segs 480/480/480) | hard cut to the inverted ground; "We write pages that feel [fast / loud / clean / alive]" sits 0.30 s, rolls, lands at 7.74; it reads to 11.40 | pluck 7.74 |
| 11.40 | [exit-fast](exit-fast.md) | the line leaves left in 0.22 s | none |
| 11.60 | [scale-punch](scale-punch.md) | "One page in." is already on the ground; "film" of "One film out." hits at 12.30 (spectacle), full stop at 12.52; it reads to 15.40 | pluck 12.50 |
| 15.40 | [exit-fast](exit-fast.md), [wordmark-cascade](wordmark-cascade.md) | the line leaves up; the name falls at 15.70, its full stop at 16.25 | droplet 16.25 |
| 17.20 | invent: the film's own moment | one moment where the words of the manifesto do what they say | none |
| 17.60 | [drift-hold](drift-hold.md) | the lockup drifts to 20.00 | none |

Why it works: one argument in four beats (the problem, the values, the claim, the name), and each beat
has its own engine, so the type never repeats a trick. The soft open is the quiet before the hit. The
seams change axis: a soft in-place resolve, a cut, a y slot roll, an x exit, a scale punch, a y exit,
a y fall. The cascade's word (0.8 s) is 3.6x the punch's dot (0.22 s).

Traps:
- Frame 0 needs a subject: the first word starts to resolve at 0.00, not after a beat of empty ground.
- The claim is the one line with an accent: "film" in the punch, or the last slot word, never both. Give the slot's last word the accent only if the punch word stays ink.
- word-swap-slot's own segs miss a beat grid. At 480 each the `Sound:` time moves to the last landing.
- Set the punch's line 1 ("One page in.") in quiet ink before the hit, or the word punches into an empty ground. Read the dot's slot with `offsetLeft`.
- Line 1 of A is 6 words (3.6 s at words x 0.6) and B is 6 words: hold both that long. Add hold, never slow the move.
- Do not punch a second word. The same hit twice makes the film read as a template.

## 14. Brand reveal, 20 s (thread: the accent, then the mark)

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [pull-back-reveal](pull-back-reveal.md) (dur 0.8 s) | tight on the mark in the sidebar of a real capture; pulls back to the app, which reads to 3.00 | bloom 0.10 |
| 3.00 | [cursor-click](cursor-click.md) | the press at 4.08; the accent done state reads to 6.40; the cursor leaves down by 4.90 | pluck 4.08 |
| 6.40 | [exit-fast](exit-fast.md), [count-up](count-up.md) | the app leaves left; "1.8 s to paid" settles at 7.50; chip to 8.25; it reads to 10.20 | chime 7.50 |
| 10.20 | [exit-fast](exit-fast.md), [mark-trace](mark-trace.md) | the number leaves up; the line draws the mark from 10.50, thickens at 11.45 (spectacle); the mark reads to 12.90 | droplet 11.45 |
| 12.90 | [logo-sting](logo-sting.md), word half only | the word opens from behind the mark at 13.42; the lockup re-centres by 14.30; the push runs to 20.00 | chime 13.42 |
| 14.45 | invent: the film's own moment | one moment where the mark does something that only this brand's own shape allows | none |
| 14.60 | [blur-word-cascade](blur-word-cascade.md) | the tagline resolves inside the lockup's `.drift` and reads from 15.90 to 20.00 | none |

Why it works: the film shows the product do one real thing, proves it with one number, then the mark
draws itself and becomes the name. The accent is the thread (the mark's dot at frame 0, the pressed
state, the number, the trace tip, the name's full stop). Seams: a z pull back, a bowed diagonal, an x
exit, a y roll, a y exit, a draw in place, an x opening word, a y rise.

Traps:
- Three moves make 9 s, not 20, so cursor-click, count-up and blur-word-cascade are added to give the reveal a real middle. Cut them and the film is a sting.
- mark-trace draws the mark and logo-sting lands one. Take only logo-sting's word opening and its push. Drop its sheen band: mark-trace's accent bar is the film's one stock device.
- The ground is never empty: the drift runs under the exits, and mark-trace's line is on screen within 0.3 s of the number leaving.
- Put the tagline inside logo-sting's `.drift`, so it rides the push. Set the push duration to the time left (7.1 s), or the tail freezes.
- The capture is pixels: cut in a second capture of the done state at the press. Never draw a button over it.
- The mark at frame 0 and the traced mark are the same path at the same size, so the thread reads.

## 15. Spectacle beat, 3 s, inside any film (thread: one camera, three depths)

The one big moment of a film, in three parts: quiet before, the moment, the release. Put it where
`<meta name="spectacle">` says; the quiet before is the 1 to 2 s ahead of it.

| time | move | what carries into the next beat | sound |
|---|---|---|---|
| 0.00 | [camera-moves](camera-moves.md) `drift` on the ground only | quiet: one line, fewer moves, the slow band (cinematic), nothing else arrives; it reads for 1.0 s | none |
| 1.00 | [camera-moves](camera-moves.md) `push` with [depth-parallax](depth-parallax.md) | the camera starts leaning 0.2 s before the word lands; ground 0.3, mid 1, front 1.8; it runs to 2.40 | whoosh 0.80 |
| 1.20 | [arrival-spring](arrival-spring.md) `pop` | the hero word lands on `EASE.pop`, the one deep overshoot of the beat | hit 1.20 |
| 1.40 | [chain-beats](chain-beats.md) overlap | the front-layer chips arrive 0.2 s after the word, one in four on `EASE.nudge`, a ring bursts on the ground; four layers move at once | tick 1.60 |
| 2.40 | [camera-moves](camera-moves.md) `drift` from the push's end | the release: the push has stopped, the camera drifts, nothing new arrives; it holds to 3.00 | none |
| 2.20 | invent: the film's own moment | one detail inside the big moment that only this product's own object can make | none |

Why it works: contrast. Few moves and a slow band make the quiet; then four layers move together
under one camera, with one deep overshoot, so the eye has one place to go; then the camera keeps drifting
so the hold is alive. The camera starts before the word, so the word lands into a move that is already
under way.

Traps:
- The quiet is not a freeze: the ground drifts under it (taste rule live-hold).
- Spend `pop` once. The rest of the beat lands on `land` and `nudge`; three eases in one scene is advice from `dev`.
- Chain the camera moves by `from`: a drift that starts at scale 1 after a push to 1.16 jumps.
- A front layer at depth 1.8 leaves the frame at the end of the push: set its things 12 percent inside the edge.
- Put the film's spectacle meta on the hero word's landing second, not on the push's start.
