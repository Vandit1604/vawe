---
message: "The film you are watching is written in text, while you watch it happen."
audience: "Developers and design engineers scrolling X and LinkedIn, sound OFF, deciding in two seconds whether to keep watching."
arc: "hook (text makes a frame) → the pane docks → range → the flex → five canvases → collapse back into text → statement"
framework: "Show, then name. Six beats of demonstration, then four words. The claim is never spoken until the film has already proved it."
threads: "a continuous object (the code pane: on screen or one cut away in every beat, growing from one line to a whole file) + a bookend (the film opens on a single line of JSON and closes on the file that line belongs to) + a motif (the cobalt caret, which blinks in the first frame and is the last thing that moves)"
format: 1920x1080
theme: "themes/vawe-night.json, built for this film: the brand cobalt on a deep ink ground with one warm secondary, NOT the near-black-plus-teal that vawe-dark ships"
duration: 30s
pace: "feed pace, about 4s per shot. Seven shots, six cuts, one backdrop window each. The first cut lands at 3.5s, because a feed decides before that."
spectacle: "shot 6 at 23.0s. Every beat so far has run text to picture. Once, and only once, it runs backwards: the finished frame COLLAPSES into the JSON that made it, each element flying to its own line, the caret landing last. `becomes` hands the hero layer to the code pane in its own pose. Every other shot holds one idea at one volume so this one is the only loud thing in the film."
not: "no narration and no voice, because it autoplays muted. No stock photography. No third-party logos or captured competitor UI. No gradient hero. No AI language, no robot imagery, no 'powered by' anything. No shot longer than five seconds. No claim the film has not already shown."
---

Thirty seconds, silent, to a developer who has scrolled past a hundred product videos this week. The
film cannot afford to explain itself. It has to BE the argument, and only name it at the end.

## Beat 1: The caret (0s-3.5s)
- type: hook
- shot: tight on a single line of mono text, centre-left, the rest of the frame dark and empty
- camera: hold, then a 2% push on the last character
- picture: one line of JSON typing itself, character by character, a cobalt caret blinking after it
- onscreen: `{ "text": "motion", "anim": "riseBlur" }`
- mechanism: type-on driven by `parts`, caret blink, then on the closing brace the WHOLE FRAME becomes what that line describes: the word "motion" rises and unblurs at 96px
- becomes: a line of text becomes the thing it describes, and an empty frame becomes a composed one, with no cut between them
- layout: text on the lower third, the payoff word arriving in the upper two thirds
- style: deep ink ground, one cobalt caret, nothing else on screen
- rest: a slow grain drift, nothing more
- why: cause and effect in one shot, before anyone decides to scroll. This is the whole product in three seconds and it needs no explanation.

## Beat 2: The pane docks (3.5s-8s)
- type: mechanism
- shot: the code pane slides to the left third and stays; the film plays in the right two thirds
- camera: hold
- picture: the JSON grows from one line to eight, `"duration": 12` highlighted in cobalt; on the right, a real composed frame
- onscreen: the JSON, and on the right a headline with a counter
- mechanism: `parts` staggers the new lines in; the highlighted number ticks 12 to 18 and the right side visibly gets longer
- becomes: one line becomes a file, and a number becomes a duration
- layout: one third text, two thirds picture, split on the frame's own third
- style: the pane is a surface, not a window: no chrome, no traffic lights
- rest: the caret keeps blinking in the pane
- why: prove the text is driving the picture, not sitting beside it

## Beat 3: Range (8s-13s)
- type: proof
- shot: the right two thirds cycles treatments while the left pane holds
- camera: slow drift right
- picture: one subject, five looks, the changing key visible in the pane each time
- onscreen: `"filter"` cycling: neon, filmNoir, nightVision, timeFreeze, melt
- mechanism: `slotSwap` at a fixed cadence, the pane's changing value in a fixed chip so nothing reflows
- becomes: one source becomes five entirely different pictures, and the highlighted value in the pane becomes each new look as it lands
- layout: unchanged from beat 2, deliberately, so only the content moves
- style: each look owns the frame for under a second
- why: range, shown rather than claimed, and it answers "is this just templates"

## Beat 4: The flex (13s-18s)
- type: spectacle-adjacent
- shot: full frame, the pane gone for the first time
- camera: `dollyZoom` into real geometry, then a `diveIn` on the settle
- picture: extruded 3D type assembling out of code, a shader sting on the cut into it
- onscreen: one word, large, dimensional
- mechanism: `codeAssemble` + `dispersion` sting at the junction
- becomes: flat text becomes a dimensional object, and a held camera becomes the thing that reveals its depth
- layout: centred, the only centred shot in the film, which is what makes it read as the peak
- style: the darkest shot, the most contrast
- rest: the ground stays alive under it
- why: the "how did they do that" beat. It buys the right to make a broad claim at the end.

## Beat 5: Five canvases (18s-23s)
- type: proof
- shot: the frame splits into five, each a different aspect, all playing
- camera: pull back
- picture: 16:9, 9:16, 1:1, 4:5, 4:3, the same film in each
- onscreen: the ratio labels in mono, small
- mechanism: the split arrives as one staggered `parts` reveal, not five separate entrances
- becomes: one frame becomes five shapes, and one film becomes every format it will ever ship in
- layout: a real grid, not a collage
- style: quieter than beat 4 on purpose, so the peak stays the peak
- why: the practical objection ("I need it in three sizes") answered without a word

## Beat 6: The collapse (23s-27s)  ← SPECTACLE
- type: spectacle
- shot: the five snap back to one, and that one falls apart into text
- camera: a held wide, no move, so the motion is entirely in the content
- picture: every element of the finished frame flies to its own line in the JSON, the caret landing last
- onscreen: the whole file, briefly readable
- mechanism: `becomes` hands the hero layer to the code pane in its own pose; `ghost` trails on the elements that travel furthest
- becomes: the picture becomes its own source, and the hero layer becomes a single line in the file. The film's one reversal.
- layout: the file fills the frame, centred for the second and last time
- style: the loudest moment, and the only one
- why: the reveal the whole film has been earning. Everything you just watched was this.

## Beat 7: Statement (27s-30s)
- type: end card
- shot: the file dims back, four words arrive
- camera: hold
- picture: the wordmark, the line, the domain
- onscreen: "Motion design. No timeline." / "vawe.dev"
- mechanism: `wordBlast` on the two-word line, the caret blinking one last time after the domain
- becomes: a demonstration becomes a claim, and the caret becomes the last thing still moving, in that order and never the reverse
- layout: left-aligned, low, the frame mostly empty and that emptiness earned
- style: back to the ground the film opened on
- why: name it only now, when it has already been proved, and let the caret be the last thing that moves
