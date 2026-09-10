---
message: "This engine can make real 3D glass: shapes that bend and split the frame behind them, not frosted panels."
audience: "Authors of this repo, deciding whether a glass look is reachable without a 3D renderer."
arc: "hook → build → proof → payoff"
framework: "BAB. Before is the frosted panel everyone already writes; After is a lens that eats the type behind it; the Bridge is the recipe, named on screen as it happens."
threads: "a continuous object (the sphere crosses every beat and every backdrop) and escalation (each beat asks the same optical effect to do a harder thing: bend, then bend on a light ground, then split colour)"
object: "the glass sphere"
object_t0: "off-frame left, small, over a black and cobalt bed"
object_states: "beat 1 it crosses the word GLASS at full size · beat 2 it carries onto a WHITE ground, where refraction has to work against a bright bed · beat 3 it shrinks and leaves, handing the frame to the rod · beat 4 it returns alone on black, over the one light pool left"
object_last: "the sphere holding the blue pool compressed inside it, above the claim"
format: 1920x1080
theme: "themes/vawe.json"
duration: 17s
pace: "showreel, 3.5s per idea. Four ideas, four beats, one claim each."
spectacle: "beat 4 · the rod layer · a glass cylinder on the low-index filter sweeping across AND SPLITS, so the same letters and the same two colour bands are refracted twice at three different indices and the fringes open up. It is the only beat where the dispersion is meant to be obvious; every other beat keeps it as a hairline."
not: "no gradient hero, no floating cards, no purple, no stock 3D render, no drop-shadowed panel calling itself glass. Nothing inside a shape is painted: every pixel is the scene's own backdrop, displaced."
---

This video tells authors of this repo that the engine can make real 3D glass, because
`backdrop-filter` accepts an SVG filter and an SVG filter can refract.

## Beat 1: GLASS (0s-4.4s)
- type: hook
- object: the sphere enters from off-frame left, small, and grows as it crosses
- shot: wide, the word fills the middle third and the sphere crosses it
- camera: none. The shapes travel; moving the camera as well would make the refraction unreadable
- picture: a glass sphere over a hard-edged cobalt and orange bed with a fine grid
- onscreen: "GLASS" / "the frame, refracted"
- mechanism: hand-keyed motion track, 4 linear keys · kinetic word reveal · a bed that pans against it
- becomes: a flat backdrop becomes a lens, and the letters behind it bend
- trigger: nothing yet. This beat opens the film by making the claim and proving it in one frame
- layout: type in the middle third, the sphere crossing it left to right
- style: black ground, two saturated bands, a fine white grid. Nothing soft anywhere
- rest: none. The sphere never stops travelling
- why: state the subject and prove it at the same time, so nobody has to take the claim on trust
- duration: 4.4s
- transition_in: cut

## Beat 2: IT BENDS (4.4s-9.0s)
- type: build
- object: the sphere reverses and crosses back, now under a second shape
- shot: wide, two shapes over the word
- camera: none
- picture: a squircle drops in from the top right over a WHITE bed with an ink band and an orange one
- onscreen: "IT BENDS" / "negative displacement scale"
- mechanism: a second hand-keyed track with rotation · a tone inversion on the backdrop
- becomes: the effect that read as a dark-mode glow has to work on a white ground, and does
- trigger: the claim in beat 1 needs its mechanism named before anyone believes the next one
- layout: type across the middle third, shapes entering from the upper right and crossing down-left
- style: white-first, hard vertical bands, black type. The exact inverse of beat 1
- rest: none
- why: name the mechanism, and remove the easiest objection (that this is just a glow on black)
- duration: 4.6s
- transition_in: cut

## Beat 3: AND SPLITS (9.0s-13.4s)
- type: proof
- object: the sphere shrinks and leaves, handing the frame to the rod
- shot: wide, one shape sweeping the full width
- camera: none
- picture: a glass rod on the low-index filter sweeping across two saturated bands and the word
- onscreen: "AND SPLITS" / "three refraction indices"
- mechanism: a single sweep track · the second glass preset, whose three passes sit further apart
- becomes: the hairline fringes of the first two beats open into visible colour separation
- trigger: bending alone does not explain the colour, so the film owes the viewer dispersion
- layout: two colour bands across the middle half, the rod crossing them vertically
- style: near-black with a dot field, one green band and one magenta band. The loudest frame
- rest: none. This is the spectacle beat and the sweep IS the rest
- why: dispersion is the step nobody guesses, so it gets the loudest shape and the highest contrast
- duration: 4.4s
- transition_in: cut

## Beat 4: No 3D. No plugin. (13.4s-17.0s)
- type: payoff
- object: the sphere returns alone and settles over the one light pool left
- shot: medium, the sphere in the upper third, the claim beneath it
- camera: none
- picture: one glass sphere holding a compressed blue pool, on black
- onscreen: "No 3D. No plugin." / "backdrop-filter, one SVG displacement map, three indices of refraction"
- mechanism: a rise-and-hold track · kinetic word reveal, the slowest in the film
- becomes: the object that has been crossing the frame for sixteen seconds finally stops, and is named
- trigger: the three claims are made, so the film owes the answer to what built them
- layout: the sphere in the upper third, type in the lower third, the sides deliberately empty
- style: pure black, one light pool, no bands and no grid. The quietest frame in the film
- rest: a slow 6% scale drift on the sphere through the hold
- why: name what it was actually built from, on the frame with nothing else competing
- duration: 3.6s
- transition_in: cut

Reveal model: every beat's shape is still travelling when its copy has settled, so the cue lands in the
back half of the beat. No two beats move alike: beat 1 is a horizontal pan, beat 2 is a drop and a
drift, beat 3 is a single sweep, beat 4 is a rise and a hold.
