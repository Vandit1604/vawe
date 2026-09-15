---
approved: 2026-09-10
message: "You describe a film, vawe renders it, and the same file renders the same frames every time."
audience: "Founders and designers who need a launch film and have no motion designer."
arc: "one unbroken move through the product: a request is typed, real films are picked, results rise, the mark forms. Nothing cuts. Every change leaves on the axis the next thing arrives on."
threads: "a cursor that causes every change + one exit axis per act (left for the request and the picks, up for the results) + a ground that takes its colour from whatever is on screen"
format: 1920x1080
theme: "themes/vawe.json"
duration: 13s
spectacle: "beat 6 (pick) · the ground re-tints to a blurred copy of each film still as its card is dragged away · the film's one loud moment"
not: "no hard cut anywhere, no centred slide deck, no gradient hero, no stock photography, no copy vawe cannot back, no second typeface, no sound bed"
craft:
    captions: "No captions. The only words are a typed request, two short taglines and a heading, and each is on screen long enough to read."
    color: "A soft light ground that re-tints from the content on screen: a warm olive under the editor, then a blurred copy of each film still. Ink for type, one cobalt accent for the cursor's actions and the colour flash on each new word."
    density: "A change every half second or less, studied frame by frame off the reference at 60fps. Each act carries three or four moves: a camera move, an entrance, an action, an exit."
    direction: "The restraint is that nothing ever cuts and the camera never stops. The spectacle earns it by being the one place the ground itself changes colour, three times, driven by the content."
    film-structure: "A cursor holds the film and causes each change. Acts join by a fast exit on one axis with motion blur, the next arrival on the same axis, and a tenth of a second of empty ground between."
    fragment-exemplars: "No fragment files. The editor window, the prompt, the taglines and the results grid are inline markup on layers, so the whole film is one scene."
    html-fragments: "Every move comes from the engine: keyframe tracks for position, rotation, depth and blur, `typing` for the prompt, `vars` for the colour flash. No CSS animation or transition."
    layout: "Asymmetric and off-centre while things move; the window sits tilted and low, the taglines start right of centre and travel left, the mark alone is centred at the end."
    motion-craft: "Hand-keyed with real deceleration: arrivals ease out, exits accelerate past 480 px/s so the automatic motion blur smears them, and the camera drifts continuously underneath."
    show-dont-tell: "The claim that vawe renders what you write is shown as a request being typed and sent, then real stills of films vawe rendered. The determinism claim is stated once, briefly, and backed by `make probe`."
    sound: "Silence is the decision, as in the reference. The film is carried entirely by motion and colour."
    typography: "One face, the vawe theme's sans. Interface type at UI size inside the windows, taglines at display size, the mark at its own weight. Size is the only variable."
---

<!-- STUDIED FRAME BY FRAME off refs/_clips/example-madera.mp4: all 782 frames at 60fps, 724 of them
     unique. It never cuts. Each act leaves fast on one axis with motion blur and the next arrives on
     the same axis; the axis changes only when the story does. The ground crossfades and takes its
     colour from the content. The camera never stops. This film keeps that grammar and tells a true
     vawe story with vawe's own material. No reference content is used. -->

## Beat 1: Focus (0s-1.4s)
- type: hook
- onscreen: "(an editor window, no words yet)"
- trigger: the film opens on the product, so it arrives already in motion
- mechanism: an inline-markup editor window keyed on rotX, rotY and z, its blur keyed from 14px to 0 so focus racks onto the sidebar, while the camera pushes in
- becomes: the bare olive ground becomes a tilted editor window coming into focus
- why: open on the thing itself, soft first, so the eye is pulled in by the focus rack rather than told where to look
- duration: 1.40s

## Beat 2: Find the prompt (1.4s-2.4s)
- type: product_surface
- onscreen: "(the prompt box)"
- trigger: focus lands on the sidebar, so the camera is free to travel
- mechanism: the camera pans right along the window and pushes toward the prompt box, which grows in frame as the camera arrives
- becomes: the sharp sidebar becomes the prompt box filling the frame
- why: the camera finds the one place something will happen, so the next action has a stage
- duration: 1.00s

## Beat 3: Type (2.4s-3.6s)
- type: product_surface
- onscreen: "Make a 12 second launch film"
- trigger: the prompt box reaches full size under the camera
- mechanism: `typing` reveals the request letter by letter; each letter flashes cobalt and settles to ink through `vars`; the camera is keyed to follow the caret so the text slides left as it grows
- becomes: the empty prompt becomes a typed request
- why: the request IS the product demonstration, and a caret the camera follows reads as someone writing
- duration: 1.20s

## Beat 4: Send (3.6s-4.6s)
- type: product_surface
- onscreen: "Make a 12 second launch film"
- trigger: the last letter lands
- mechanism: a cursor enters from below and travels to the send button, which turns cobalt on hover through `vars`; the click fires, and the whole window exits left past 480 px/s so motion blur smears it
- becomes: the typed request becomes an empty ground
- why: the cursor causes the exit, so the change has a visible reason; the fast left exit sets the axis the next act arrives on
- duration: 1.00s

## Beat 5: Tagline one (4.6s-6.0s)
- type: product_surface
- onscreen: "vawe renders what you write."
- trigger: the window leaves the frame to the left
- mechanism: inline markup, one span per word, each entering from the right with a short stagger and flashing a colour that settles to ink through `vars`; small shapes drift slowly behind; the line exits left with motion blur
- becomes: the empty ground becomes the first claim, then empty again
- why: one true sentence names what the previous act showed, and it leaves on the same axis
- duration: 1.40s

## Beat 6: Pick (6.0s-8.2s)
- type: payoff_withheld
- onscreen: "(stills of three real vawe films, a Keep button)"
- trigger: the tagline leaves to the left
- mechanism: a stack of image cards of stills from films vawe rendered (argus-launch, preface-launch, product-feature-tour); the cursor presses Keep and drags each card left with rotation; a full-bleed blurred copy of the current still crossfades underneath, so the ground re-tints three times
- becomes: the empty ground becomes a stack of real films, and each card becomes the next
- why: the spectacle, and the proof that vawe's output is real, shown as films someone is choosing
- duration: 2.20s

## Beat 7: Tagline two (8.2s-9.5s)
- type: product_surface
- onscreen: "Same file. Same frames."
- trigger: the last card is dragged out of frame
- mechanism: the same word-by-word entrance and colour settle as beat 5, but the line exits UP with motion blur, which changes the axis for the final act
- becomes: the last card becomes the second claim, then empty ground
- why: the determinism claim is true and short, and turning the exit axis upward marks the move to the ending
- duration: 1.30s

## Beat 8: Results (9.5s-11.0s)
- type: product_surface
- onscreen: "Your films"
- trigger: the tagline leaves upward
- mechanism: a tilted window rises from below on y and rotX; its heading types; a grid of six stills from real vawe films pops in with a stagger; the window exits upward with motion blur
- becomes: the empty ground becomes a grid of real films rising into frame, then leaving
- why: the result of the request typed in beat 3, arriving on the axis the last act set
- duration: 1.50s

## Beat 9: Mark (11.0s-13.0s)
- type: payoff_withheld
- onscreen: "(the vawe mark)"
- trigger: the results window leaves the frame upward
- mechanism: small cobalt shapes gather at centre and an SVG `morph` melts them into the vawe wave mark, which then holds
- becomes: scattered shapes become the vawe mark, held still
- why: the only still moment in the film, earned by everything before it moving
- duration: 2.00s
