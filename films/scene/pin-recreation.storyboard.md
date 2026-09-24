---
message: "You describe a shot, and you are standing in it. The panel you typed into becomes the frame."
audience: "engine reviewers judging whether vawe can hold restraint, not just spectacle"
arc: "one continuous action: an empty ask panel sits still, takes a typed scene description, and then opens: the shot it describes arrives inside its own box and grows until the panel's edges leave frame"
threads: "a transforming object (the ask panel) plus one question, what will vawe render from this brief, which the last beat answers by putting the viewer inside it"
object: "the vawe ask panel"
object_t0: "a wide dark panel centred on black, its gradient ring cool and unlit, placeholder text and a quiet control row only"
object_states: "at the turn: a scene brief types into the panel, the ring lights warm on one side and cool on the other, and the glyph field behind it brightens under each bloom"
object_last: "the panel is gone as a panel: its box has grown past every edge and what is left is the shot itself, a rain-lit street, held."
format: 1920x1080
theme: "themes/default.json"
duration: 7.0s
spectacle: "the panel opening: the shot arrives inside its own box and the box grows until its edges leave frame. the one moment where anything moves fast"
not: "no camera move, no cut, no logo card, no slide-deck layout beyond the one panel itself. the control row and the send button belong to the panel and are not a second surface"
craft:
    color: "near-black ground, two diffuse blooms as atmosphere, warm on one side and cool on the other, never a subject. a faint glyph field lives inside them and takes its tint from whichever bloom is nearest"
    density: "one hero (the panel), its own control row as support, and nothing else. sparse by the ground around it, not by the panel being empty"
    direction: "restraint is the whole film: 0.21-0.25 delta everywhere except the write beat, which alone should read as loud"
    film-structure: "a single continuous object across four states (empty, writing, opening, arrived) holds the film. the panel never leaves screen, it becomes the frame"
    layout: "the panel sits centred on an otherwise empty dark field, wide and short, roughly five to one; nothing else claims the frame"
    motion-craft: "the ring's light and the blooms behind it are hand-keyed off the measured reference timing, no preset fired once and left alone"
---

<!-- Recreation benchmark: motion grammar only (one continuous shot, one event near the 35% mark,
     median frame delta ~0.23, dark-dominant, accent-as-atmosphere) taken from
     refs/pin-890657263828171584.mp4 (grammar/pin-prompt-expand.json). Subject, copy, layout and
     brand are ours: vawe's own scene-brief pill, not the reference's product or wording. -->

## Beat 1: Empty (0s-1.8s)
- type: hook
- object: the pill fades up empty, centered low, with a heading held above it
- onscreen: "Describe the shot."
- mechanism: heading and pill both fade in over the first ~0.6s (opacity only, no slide), then hold completely still; background haze keeps drifting underneath
- becomes: the bare dark field becomes the heading and the empty pill
- trigger: the film opens; nothing before it
- why: name the surface, then go still, so the write beat has something to be loud against
- duration: 1.8s
- feedback: "looks so bad" (studio, 2026-09-24)

## Beat 2: Write (1.8s-3.9s)
- type: product_surface
- object: the pill widens and grows a second line as a scene brief types into it; a soft violet glow rises on its border as it settles
- onscreen: "a slow dolly into a rain-lit street, neon signs reflecting in the wet asphalt"
- mechanism: the brief types character by character at a measured rate (not instant); the pill's width and height track the growing text (CSS var morph, matching the reference's measured box-grow timing); the border glow ramps in as the box reaches its held size
- becomes: the empty pill becomes a pill holding a typed scene brief, lit at its edge
- trigger: the empty pill has held long enough to read as waiting; the brief starts because the wait is now the point
- why: this is the one real event in the film. everything before and after is quiet so this reads as loud
- duration: 2.1s
- feedback: "the chat interface is below the rain and shader and blobs of light" (studio, 2026-09-24)

## Beat 3: Send (3.9s-4.42s)
- type: product_surface
- object: the pointer arrives on the send button and clicks it
- onscreen: "a slow dolly into a rain-lit street, neon signs reflecting in the wet asphalt"
- mechanism: the cursor eases in from the lower right onto the panel's own live box and fires one click at 3.75s; the brief is finished and nothing else moves
- camera: hold
- eye: the finished line -> the pointer crossing toward it -> the send button under the pointer
- becomes: a written brief becomes a sent one. the control that sat unused for four seconds is used
- trigger: the brief has finished typing; the only thing left to do is send it
- why: the shot must be CAUSED. a video that arrives on its own is a cut; a video that arrives on a click is the product working
- duration: 0.52s

## Beat 4: Arrive (4.42s-7.0s)
- type: payoff
- object: the shot the words described, inside the panel's own box
- onscreen: "a slow dolly into a rain-lit street, neon signs reflecting in the wet asphalt"
- mechanism: the clip arrives in the panel at full width and holds; it is SEEKED per frame, never played, so a backward scrub is byte-identical. the ground turns with it, from the panel's near-black to the shot's
- camera: hold
- eye: the sent line -> the frame opening beneath it -> the figure walking away down the wet street
- becomes: the panel stops being a panel and becomes a window. the brief above it is now a caption for what is underneath
- trigger: the click landed; the render is back
- why: the payoff is the whole argument. you describe a shot and you are standing in it, and withholding that would be a worse film than showing it
- duration: 2.58s
- feedback: "the search bar should expand vertically and the video should be cropped to the size of search bar horizontally" (studio, 2026-09-24)
