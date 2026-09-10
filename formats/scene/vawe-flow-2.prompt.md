# vawe-flow-2 · film prompt

the idea: vawe lives on a terminal: a macOS terminal window with timestamps, italic command words, rounded success/error output panels and a bottom prompt bar with a return glyph types the 12-second launch film request with per-word colour like the madera video, camera starts wide then travels to the prompt; the terminal ground chains with camera movement into the next scene where the timeline's tracks and clips assemble from the left; then the your-films act where each film plays live and the ground takes that film's colour as you browse; then the logo assembles with its line drawing and the wordmark text growing out of the logo

duration: 13.03s (kept, matches example-madera's measured 13.03s: the owner's five beats fit the same six-section spine, so there is no reason to fight the reference's pace) · structure copied from example-madera

## Act 1 (0s-4.54s)
on screen: a macOS terminal window (traffic-light dots top-left, a centred title), a left column of timestamps running down beside a few prior command lines (the command word in italic monospace, e.g. "render", "capture"), each followed by a softly rounded output panel (one success green, one error red, a line or two of real mock output), and a prompt input bar docked at the bottom with a return glyph; the bar fills with "make a 12 second launch film" typed word by word, each word taking its own accent colour before settling to ink (the madera device, moved from per-letter to per-word so it "controls the eye" one phrase at a time), then a text cursor lands on the return glyph and presses it
enters: (film opens already in motion, no prior joint - the terminal is already showing prior commands when the camera arrives)
leaves: on the press, the last output line pulses cobalt, the whole window snaps into a fast left exit with motion blur (measured: x axis, gap 0.1s, matching example-madera's own send exit) [recipe: flow-seam]
ground: ink #0f1620 - a real dark terminal surface, not a foreign black: it is the vawe theme's own ink colour so a "software that lives on a terminal" still reads as vawe's palette, not a generic dark-mode screenshot
camera: opens WIDE on the whole terminal window ("show it all", the owner's own words) then a slow continuous dolly travels down toward the prompt bar as the reveal plays out [recipe: window-dolly]
type: the theme's own monospace for command lines (italic for the command word), the theme's sans for UI chrome and timestamps, cobalt/success-green/error-red for the output panels
content: dense real material - the terminal fills most of the frame with real prior commands and real output panels, not an empty shell waiting for the one line that matters (aim for fill parity with example-madera's own editor act, about 0.39)

## Joint at 4.54s
recipe: flow-seam out=terminal in=timeline axis=x

- flow-seam (seam): one act leaves fast on an axis with motion blur, a frame of empty ground, the next act arrives on the same axis and direction while the ground changes colour [first source: example-madera@4.54s]
- window-dolly (camera): a slow continuous dolly-in that zooms the camera toward a named layer's box, tightening the frame across the whole shot with no cut [first source: example-madera@0s]
- word-by-word (enter): a line arrives one word after another, each word rising into place, for a tagline or headline entrance instead of the whole line sliding in as one block [first source: example-madera@4.58s]

## Act 2 (4.54s-5.28s)
on screen: the terminal's ink ground is still on screen, motion-blurring away, while a single thin timeline track and one clip block slide in from the LEFT edge (not the right, the owner named the direction explicitly: "assemble from the left side") - this is the ground-chaining beat: the terminal's own dark surface is what the timeline's ground grows out of, so the cut never reads as a cut
enters: from the LEFT along the x axis, the one deliberate axis change from example-madera's own right-entry grammar, because the owner named this direction and the terminal-to-timeline chain reads better arriving from the side the eye is already resting on after the terminal's left exit
leaves: (no separate exit; the assembly continues directly into Act 3 without a further joint)
ground: crossfades from ink #0f1620 toward the theme's white ground as the timeline UI takes over the frame
camera: the same dolly from Act 1 continues and levels off as it arrives at the timeline strip - one unbroken camera move across the terminal-to-timeline chain, never a reset [recipe: window-dolly]
type: none yet - only the track line and the first clip's shape are on screen
content: quiet on purpose - one track, one clip - because a dense timeline arriving all at once would read as a cut dressed up as a build; content grows across Acts 2-3 together

## Joint at 6s
recipe: flow-seam out=terminal in=timeline axis=x

- flow-seam (seam): one act leaves fast on an axis with motion blur, a frame of empty ground, the next act arrives on the same axis and direction while the ground changes colour [first source: example-madera@4.54s]
- window-dolly (camera): a slow continuous dolly-in that zooms the camera toward a named layer's box, tightening the frame across the whole shot with no cut [first source: example-madera@0s]
- word-by-word (enter): a line arrives one word after another, each word rising into place, for a tagline or headline entrance instead of the whole line sliding in as one block [first source: example-madera@4.58s]

## Act 3 (5.28s-6s)
on screen: more tracks and clips keep assembling from the left, stacking downward one at a time, until vawe's own multi-track timeline panel (the real editor UI: tracks, clip thumbnails, a playhead) is most of the way built
enters: continues from the left, staggered, each clip settling with a small landing bounce - no named recipe covers a staggered multi-element build from one edge; this is authored by hand at the storyboard/scene stage with a `move`/`motion` track per clip, not a recipe line [unrouted: no core capability for a staggered from-one-edge assembly of many independent blocks; recipes/README.md's `word-by-word` is text-only]
leaves: (no separate exit; the timeline holds briefly then the next joint below fires the whole act's exit)
ground: settles fully to the theme's white-first ground
camera: a brief static hold once most tracks have landed, so the assembly reads clearly before anything else happens
type: small UI labels on each clip (theme sans, small, real track/clip names)
content: dense real material - a real multi-track timeline filling most of the frame, aimed at fill parity with example-madera's own card-swipe act (about 0.39), because this is the section that REPLACES that act (see the joint note below)

## Joint at 8.12s
recipe: flow-seam out=timeline in=films axis=x

- flow-seam (seam): one act leaves fast on an axis with motion blur, a frame of empty ground, the next act arrives on the same axis and direction while the ground changes colour [first source: example-madera@4.54s]
- window-dolly (camera): a slow continuous dolly-in that zooms the camera toward a named layer's box, tightening the frame across the whole shot with no cut [first source: example-madera@0s]
- word-by-word (enter): a line arrives one word after another, each word rising into place, for a tagline or headline entrance instead of the whole line sliding in as one block [first source: example-madera@4.58s]

## Act 4 (6s-6.53s)
on screen: the assembled timeline exits left with motion blur; the first "Your films" ring-browse film starts entering from the right, already playing (moving footage, not a still)
enters: from the right along the x axis, matching example-madera's own card-entry direction for this slot (this is the section that stands in for the reference's swipe-card act: see the note below on why the literal cards were cut)
leaves: (no separate exit; continues directly into Act 5)
ground: begins crossfading from the timeline's white ground toward the first film's own dominant colour
camera: a slight continuous push on the film card, steady through the swap [recipe: window-dolly]
type: none - the film itself carries the frame
content: dense real material - a real, moving film still, not a static photo (the owner: "each film should play, not be static")

## Joint at 9.57s
recipe: flow-seam out=timeline in=films axis=x

- flow-seam (seam): one act leaves fast on an axis with motion blur, a frame of empty ground, the next act arrives on the same axis and direction while the ground changes colour [first source: example-madera@4.54s]
- window-dolly (camera): a slow continuous dolly-in that zooms the camera toward a named layer's box, tightening the frame across the whole shot with no cut [first source: example-madera@0s]
- word-by-word (enter): a line arrives one word after another, each word rising into place, for a tagline or headline entrance instead of the whole line sliding in as one block [first source: example-madera@4.58s]

## Act 5 (6.53s-8.12s)
on screen: the ring keeps browsing through two more real vawe films (playing, not stills); each time the ring turns, the ground crossfades to a blurred wash of THAT film's own dominant colour - the direct reuse of example-madera's card-ground-retint device, now driving a film ring instead of a product swipe deck
enters: each new film arrives from the right along the x axis as the ring turns, same grammar as the joint above, repeated
leaves: the ring settles on its last film, ground held at that film's colour, ready for the next joint's exit
ground: mid-tone, re-tinted per film (blue, then olive, then whatever the third featured film's own dominant colour is) - the owner's own line: "change bg colour according to each film's colour when browsing"
camera: the same slight continuous push carries across the whole ring-browse, never resetting [recipe: window-dolly]
type: a small caption under the active film (its name), theme sans, small
content: dense real material - real playing footage at hero size, aimed at fill parity with example-madera's card act (about 0.39)

NOTE on the cut/kept pick-cards act: example-madera's original swipe-card act (its Act 3, 6s-8.12s in the six-section spine) is NOT reproduced as a literal card-pick moment here. The owner's brief never asks the viewer to choose between options; it asks for "Your films" to play while the ground takes each film's colour as the ring browses. That IS the card act's one load-bearing device (ground retints per item as the user moves through a set), so the device is kept and the literal "swipe to choose" framing is dropped - reusing it as-is would mean vawe was picking a film for the viewer, which is not what happens in Your films. The two act-slots this device used to occupy (Acts 4-5 above) are spent on it directly; the slot that in madera holds the FIRST tagline plus the timeline-build content above (Acts 2-3) is where the timeline-assembly beat lives instead, because "assemble from the left" is itself a multi-item build exactly like the pattern this section's joints already carry.

## Joint at 11.08s
recipe: flow-seam out=films in=logo axis=y

- flow-seam (seam): one act leaves fast on an axis with motion blur, a frame of empty ground, the next act arrives on the same axis and direction while the ground changes colour [first source: example-madera@4.54s]
- window-dolly (camera): a slow continuous dolly-in that zooms the camera toward a named layer's box, tightening the frame across the whole shot with no cut [first source: example-madera@0s]
- word-by-word (enter): a line arrives one word after another, each word rising into place, for a tagline or headline entrance instead of the whole line sliding in as one block [first source: example-madera@4.58s]

## Act 6 (8.12s-8.6s)
on screen: the last film in the ring holds one beat longer than the others (a small pause to mark "this is the point"), its ground colour steady, before the ring exits
enters: (continues from Act 5, no new entrance)
leaves: the ring exits left with motion blur as its ground colour fades back toward the theme's white ground, preparing the frame for the logo
ground: fading from the last film's colour back to the theme's white-first ground
camera: continues the same push, no reset
type: none
content: quiet, on purpose - the frame is clearing for the logo, echoing example-madera's own pattern of a quiet beat before its loudest hold

## Act 7 (8.6s-9.57s)
on screen: the ground finishes clearing to plain white-first ground; small cobalt marks (the pieces the logo will assemble from) begin entering from off-frame, scattered, matching the scale and colour of vawe's own mark strokes
enters: the marks arrive from scattered off-frame positions (matching example-madera's own mark-assembly entrance, which arrives from below) [recipe: flow-seam; unrouted: no named core capability for shape-to-glyph landing, same gap example-madera's own study already found]
leaves: (no separate exit; the marks keep arriving and landing through Acts 8-10)
ground: settled to the theme's white-first ground
camera: static hold begins here and continues through the rest of the film, once the marks start landing
type: none yet
content: quiet - a handful of small marks on plain ground

## Act 8 (9.57s-10.37s)
on screen: the marks keep landing and start tracing the vawe mark's own outline as a drawn line (a stroke that draws itself on, echoing "the white line is showing")
enters: continues from Act 7, no new entrance
leaves: (no separate exit)
ground: theme's white-first ground, held
camera: static hold, continued
type: none yet - this beat is the line drawing itself, not type
content: quiet, building toward the mark

## Act 9 (10.37s-11.08s)
on screen: the drawn line completes into the full vawe wave mark; as the last stroke lands, the wordmark text "vawe" begins growing out from the mark itself (the owner: "when logo assembles and white line is showing, text should come out of the logo as well")
enters: the wordmark's letters emerge from the mark's own position, scaling and sliding out to their resting place beside it - no named recipe covers a text-grows-out-of-a-shape entrance; this is a framework gap like the mark-assembly gap above, authored by hand with a `motion` track keyed off the mark layer's own completion time [unrouted: no core capability for text originating from another layer's shape; nearest is `split`/`preset` text sugar, which starts from the text's own box, not a foreign layer's]
leaves: (no separate exit; holds to the end of the film)
ground: theme's white-first ground, held
camera: static hold, continued
type: the theme's own sans, at the mark's own weight, growing out to full size
content: quiet, on purpose - the only still moment in the film, earned by everything before it moving (matches example-madera's own closing beat)

## Act 10 (11.08s-13.03s)
on screen: the vawe mark and its wordmark hold together, fully formed, centred on plain ground, to the end of the film
enters: (continues directly from Act 9)
leaves: (film ends, no next joint; holds on the mark and wordmark)
ground: theme's white-first ground, #f7f5f0 or the theme's own paper tone, held
camera: static hold, no push
type: the theme's own sans, all-caps or the theme's own case for "vawe", centred beside the completed mark
content: quiet, type and mark on ground only - the resting point after everything else moved

## Change me
`on screen`, `camera` and `type` were filled in by looking at every page in
refs/example-madera/pages/, never from memory, and by applying the owner's brief in the STEPS above:
rewrite them freely to fit a new idea. `ground`, `enters`, `leaves` and the recipe lines are measured
off the reference itself: change them only if you want a different reference feel, and keep the recipe
line syntax (harness/lib/contract.mjs#parseRecipeLine) so `make assemble` can still read it once this
becomes a storyboard. The one-breath paragraph at the top is also yours to rewrite for a new subject.
