---
message: "The engine writes video the way you write code, and here it is doing it."
audience: "Developers and design engineers scrolling X and LinkedIn with the sound off, deciding in two seconds."
arc: "name it → write the scene → watch it render → see the whole vocabulary → the claim"
framework: "Show, then name. Four beats of the product working, then four words."
threads: "a bookend (the film opens on cobalt and closes on cobalt, with white in between) + a motif (the ground flips white to cobalt on every single cut, so the world turns with the edit) + a through-line (one scene is written in beat 2, renders in beat 3, and its effects are the wall in beat 4)"
format: 1920x1080
theme: "themes/vawe.json, the shipped brand unmodified: white ground, cobalt #2563eb, Anybody and JetBrains Mono"
duration: 20s
pace: explainer, about 4 seconds per idea. Five ideas in 20s, four cuts at 2.5 / 7.5 / 11.5 / 16.0, no shot over 4.5s.
spectacle: "beat 4 at 11.5s. The arsenal wall arrives all at once: 25 real rendered frames staggered in over 0.6s, the only moment the film shows more than one thing. Every other beat holds one idea at one volume, which is what makes this one the peak."
not: "no narration, no stock photography, no third-party logos, no dark mode, no invented or mocked UI, no shot over five seconds, and no claim the film has not already shown."
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
