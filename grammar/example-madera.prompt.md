# example-madera · film prompt

An AI agent window types a shopping prompt, a tagline names what the product understands, a swipe
deck of product photos flicks by, a second tagline names what it finds, a results window rises with
a grid of matched products, and the wordmark assembles from scattered shapes to close.

duration: 13.03s · aspect: 1640:1080 (nearest canvas 4:3) · pace: median act 1.73s, 27.6 joints/min · ground: light grey → light grey → blurred photo wash, blue then olive then brick red → light grey → olive wash → light grey

## Act 1 (0s-4.54s)
on screen: a tilted app window titled "New Agent" (macOS traffic-light dots, a sidebar with Search,
Suggestions, Chats and two saved chat titles) settles flat, then a search field appears, then a
prompt bar with a blue "Ask" tag types "Help me find a new paper lamp" character by character with a
blinking caret, then a cursor clicks the send button (a black circle, arrow icon).
enters: (film opens, no prior joint)
leaves: the sent prompt bar snaps to a green "sent" pulse, motion-blurs and slides off-frame left as
the window defocuses (measured: x axis, gap 0.1s, see refs/example-madera/ideate-strips/joint-1-2.png) [recipe: flow-seam]
ground: light, #def9fe (measured, luma 209.1)
camera: a slow, continuous dolly-in on the window through the whole act (the sidebar and prompt bar
both grow steadily larger frame to frame) [recipe: window-dolly]
type: the app's own UI type (system sans, small), plus a blue monospace-ish "Ask" pill tag on the
prompt bar
content: dense real material, fills about a third of the frame, plain UI (fill 0.39, detail 3.8, photo 0.03)

## Joint at 4.54s
recipe: flow-seam out=act1 in=act2 axis=x
measured: gap 0.1s, axis x, ground #ecefec to #ebeeeb

## Act 2 (4.54s-6s)
on screen: the line "MADERA understands your taste." enters word by word, each word its own colour
(MADERA bold near-black, understands tan, your green, taste blue), settling to a single dark colour
once the sentence completes; faint grey triangle/circle/square motifs drift in the background
enters: from the right along the x axis (measured, gap 0.1s) [recipe: flow-seam + word-by-word]
leaves: the sentence slides off left word by word, the trailing words blurring as they go
(measured: x axis, gap 0.05s, see refs/example-madera/ideate-strips/joint-2-3.png) [recipe: flow-seam; unrouted: per-word exit, core/tracks/units.js splits text IN only, no staggered-out]
ground: light (measured, luma 221.1)
camera: static hold once the words settle, no push
type: a bold display sans for "MADERA", a lighter weight for the rest of the line, left-aligned
mid-frame
content: light real material, fills a small part of the frame, plain UI (fill 0.06, detail 5.1, photo 0.04)

## Joint at 6s
recipe: flow-seam out=act2 in=act3 axis=x
measured: gap 0.05s, axis x, ground #eaedea to #bbc2c0

## Act 3 (6s-8.12s)
on screen: a swipe-card deck (a Tinder-style card: a product photo of a room interior, "Pass"/"Like"
buttons below it) cycles through several photos as a hand cursor drags each card off; the ground tints
shift under each card (pale blue-grey, then olive, then brick red) as if lit by the photo on screen
enters: from the right along the x axis (measured, gap 0.05s) [recipe: flow-seam]
leaves: the last card (a warm red-lit interior) exits left, the red photo ground fades to light
grey under the empty frame, no cut (measured: x axis, gap 0.05s, see refs/example-madera/ideate-strips/joint-3-4.png) [recipe: flow-seam]
ground: mid, warm, #a48f76 (measured, luma 136); the true ground here is a blurred product photo, tinted
blue then olive then red as the cards change, not a flat fill
camera: a slight continuous push on the card stack, steady through each swipe [recipe: window-dolly]
type: none (photo cards + UI button labels only)
content: dense real material, fills about a third of the frame, photographic (fill 0.39, detail 11.1, photo 0.23)

## Joint at 8.12s
recipe: flow-seam out=act3 in=act4 axis=x
measured: gap 0.05s, axis x, ground #77554b to #eaedea

## Act 4 (8.12s-9.57s)
on screen: the line "MADERA find items you love." enters word by word (MADERA bold black, find tan,
items green, you blue, love red, period black), settling to solid dark type; the same faint square/
circle motifs sit in the background, on plain light grey
enters: from the right along the x axis (measured, gap 0.05s) [recipe: flow-seam + word-by-word]
leaves: the settled sentence rises and blurs straight up out of frame (measured: y axis, gap 0.05s,
see refs/example-madera/ideate-strips/joint-4-5.png) [recipe: flow-seam]
ground: light (measured, luma 219.7)
camera: static hold once the words settle, no push
type: same bold display sans as act 2, MADERA the heaviest weight, left-aligned mid-frame
content: quiet, type on ground only (fill 0.05, detail 4.1, photo 0.03)

## Joint at 9.57s
recipe: flow-seam out=act4 in=act5 axis=y
measured: gap 0.05s, axis y, ground #e7eae7 to #aeb2a8

## Act 5 (9.57s-11.08s)
on screen: a tilted browser/app window rises from the bottom; its heading types in word by word,
"Japandi and Modern Paper Lamps", while a grid of product photos (paper lamps: a floor lamp, a table
lamp, a pendant, styled shots) fills in beneath it, ending at six photos in two rows
enters: from the bottom along the y axis (measured, gap 0.05s) [recipe: flow-seam + word-by-word]
leaves: the window rises straight up out of frame, blurring, while the olive ground fades to light
grey (measured: y
axis, gap 0.083s, see refs/example-madera/ideate-strips/joint-5-6.png) [recipe: flow-seam]
ground: mid, olive, #8c7c68 (measured, luma 175.6); an olive-brown wash behind the tilted white window
camera: a slow continuous dolly-in on the window as its content fills in [recipe: window-dolly]
type: the app's own UI type for the heading, plus small product captions under each photo
content: dense real material, fills about two thirds of the frame, photographic (fill 0.69, detail 10.3, photo 0.23)

## Joint at 11.08s
recipe: flow-seam out=act5 in=act6 axis=y
measured: gap 0.083s, axis y, ground #b9b9ae to #e8ece8

## Act 6 (11.08s-13.03s)
on screen: scattered small coloured marks (a blue triangle, a green dot, a tan square, red squares)
fly in from below and land as the individual letterforms of "MADERA", which resolve into the bold
wordmark and hold, centred, on plain light ground
enters: from the bottom along the y axis (measured, gap 0.083s) [recipe: flow-seam; unrouted: marks assembling into letterforms, no named core capability for shape-to-glyph landing]
leaves: (film ends, no next joint; holds on the wordmark)
ground: light (measured, luma 221)
camera: static hold, no push, once the marks land
type: the same bold display sans as the taglines, all-caps wordmark, centred
content: quiet, type on ground only (fill 0.02, detail 1.9, photo 0.00)

## Change me
`on screen`, `camera` and `type` were filled in by looking at every strip in
refs/example-madera/ideate-strips/, never from memory: rewrite them freely to fit a new idea. `ground`,
`enters`, `leaves` and the recipe lines are measured off the reference itself: change them only if you
want a different reference feel, and keep the recipe line syntax
(harness/lib/contract.mjs#parseRecipeLine) so `make assemble` can still read it once this becomes a
storyboard. The one-breath paragraph at the top is also yours to rewrite for a new subject.
