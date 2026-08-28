---
message: "The engine writes video the way you write code, and here it is doing it."
audience: "Developers and design engineers scrolling X and LinkedIn with the sound off, deciding in two seconds."
arc: "one world, flown through: the name → the scene being written → the frame it renders → the wall of everything it can do → the claim, back where we started"
framework: "A oner. The camera is the only transition, so the film cannot be a stack of cards."
threads: "a oner (ONE continuous world, laid out in stage coordinates, with no cuts anywhere: the camera travels station to station and IS the transition) + a through-line (the scene written at station 2 is the frame rendered at station 3, and its effects are the wall at station 4) + a bookend (the flight starts and ends on the wordmark, having gone somewhere)"
format: 1920x1080
theme: "themes/vawe.json, the shipped brand unmodified: white ground, cobalt #2563eb, Anybody and JetBrains Mono"
duration: 20s
pace: explainer, about 4 seconds per idea. Five stations in 20s. ZERO cuts: every junction is a camera flight of about 1.1s, and no dwell runs past 3.5s.
spectacle: "beat 4 (station 4) at 12.0s. The camera PULLS BACK for the only time in the film and a dark slab opens out of the cobalt carrying fifteen real rendered frames. Every other station is a push or a hold at one idea, so the single retreat is the peak."
not: "no cuts of any kind, no narration, no stock photography, no third-party logos, no invented or mocked UI, no preset used where a keyed track belongs, and no claim the film has not already shown."
---

Twenty seconds, silent, to somebody who has scrolled past a hundred product videos this week.

## Beat 1: The name (0s-2.5s)
- type: hook
- shot: full cobalt field, the wordmark on the optical centre
- camera: hold
- picture: the vawe wordmark at 220px, an eyebrow pill above it at 26px
- onscreen: "vawe" / "deterministic motion-graphics engine"
- mechanism: the wordmark rises with a 0.12 anticipation and a 0.10 overshoot, the pill arrives 0.2s ahead of it
- becomes: an empty cobalt field becomes a named product, and a still frame becomes a film that has started
- layout: centred, the only centred beat besides the peak
- style: cobalt ground, white ink, nothing else on screen
- why: name it in two seconds, then get out of the way

## Beat 2: Write it (2.5s-7.5s)
- type: mechanism
- shot: split on the frame's own third, the editor pane left, the rendered output right
- camera: hold
- picture: real captured editor UI, JSON on the left, a rendered frame on the right
- onscreen: "Write the scene as data."
- mechanism: the pane rises in, then one value in the JSON changes and the right side answers it
- becomes: a file becomes a picture, and a number becomes a different picture
- layout: pane x110 w780, output x960 w850, both on the same baseline
- style: white ground, the first flip out of cobalt
- why: the product's own hero device, doing the one thing the whole film is about

## Beat 3: Render it (7.5s-11.5s)
- type: proof
- shot: the output alone, full frame
- camera: one slow push, the only camera move in the film
- picture: the rendered frame filling the frame, a mono counter running bottom left
- onscreen: "Frame by frame."
- mechanism: the counter runs on its own easing, the push settles as it lands, and the line is three words so the picture keeps the frame
- becomes: a still frame becomes a moving one, and a claim about determinism becomes a number you can watch
- layout: full bleed, counter inside the safe band
- style: cobalt ground, the second flip
- why: the word deterministic means nothing; a counter running frame by frame means it exactly

## Beat 4: The whole vocabulary (11.5s-16s)  ← SPECTACLE
- type: spectacle
- shot: a five by five wall of real rendered frames
- camera: hold, no move, so every bit of the motion is the wall arriving
- picture: 25 actual frames from the effects library, each with its mono caption
- onscreen: "566 effects. No templates."
- mechanism: the whole wall staggers in at 0.028 per tile, 0.6s end to end, one gesture not 25 entrances
- becomes: a claim about range becomes a wall of evidence, and one product becomes 566 things it can do
- layout: a real grid inset to the safe area, x110 w1700, y210 h660
- style: white ground, the loudest frame in the film
- why: it answers "is this just templates" with evidence instead of a sentence

## Beat 5: The claim (16s-20s)
- type: end card
- shot: cobalt again, left aligned and low
- camera: hold
- picture: the headline, the domain under it
- onscreen: "One JSON, one video." / "vawe.dev"
- mechanism: the headline rises with the same 0.12 anticipation the wordmark had, closing the bookend
- becomes: a demonstration becomes a claim, and the film returns to the colour it opened on
- layout: headline x140 y380, domain x140 y700, the frame deliberately empty to the right
- style: cobalt, closing where beat 1 opened
- why: say it only now, when it has already been shown four times
