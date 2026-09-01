---
message: the film is a text file, and the terminal that renders it turns into the picture it made
audience: developers and designers on X who have never seen a video written as JSON
framework: BAB
arc: hook (a command types itself) → build (the render reports its own states) → proof (the panel becomes the shader) → payoff (it came out of a text file)
threads: a continuous object (the panel is on screen from frame one to the payoff and changes at every junction) and an escalation of light (dim panel → travelling border beam → the panel's own body becomes the light source)
object: the terminal panel
object_t0: a dark panel on true black with an empty prompt and a caret
object_states: empty prompt → a real vawe command typed in → the command's own render states listed under it → a light travelling its border → its body IS the shader, and the box grows through the frame
object_last: gone through the camera, leaving the wordmark on the black it started on
pace: showreel, 2.8 seconds per idea
spectacle: beat 4 · the shader layer, born at the panel's inner box · the panel's own fill dissolves into it over one beat and the box then travels through the camera · the terminal stops describing the render and becomes it
not: no gradient hero, no stock footage, no centred type on the end card, no claim about hardware the code does not make, no dots-in-a-title-bar terminal cliche
format: 1920x1080
theme: themes/vawe.json
duration: 14s
---

<!--
  Beat edges are the owner's, moved onto the music's own grid. The bed (assets/music/bed.wav, mixkit
  292) measures 178.2 BPM with its first bar at 0.30s, so a beat is 0.3367s and a bar is 1.3468s. Every
  joint here sits on a point of that grid: the command types from 0.637s to 2.320s, the output lines
  land one per beat from 2.657s, the border beam runs 5.014s to 6.361s (exactly one bar, exactly one
  lap), the panel becomes the shader on 6.361s, and the only hard cut is the downbeat at 11.074s.
  `audio.beatSync` is NOT set: core/beat-bind.js refuses this bed at confidence 1.54 against a floor
  of 1.6, so the grid is applied by hand at author time instead of by the engine at boot.
-->

## Beat 1: The command (0s-2.5s)
- type: hook
- object: the panel sits alone on black, and a real vawe command types itself at its prompt
- shot: medium (the panel fills the middle two thirds of the frame, the black around it deliberately empty)
- camera: hold
- layout: the panel fills the middle two thirds of the frame width, centred, on black
- picture: a dark terminal panel, one hairline of white at 0.1 alpha, a title bar, a cobalt prompt sigil and a caret riding the end of the typed path
- mechanism: the command's width is clipped on the scene clock in whole character cells, so it types rather than fades
- style: true black, one mono face, one cobalt accent, nothing else on screen
- rest: the backdrop's dot field drifts five pixels a second
- becomes: an empty prompt becomes a real command with a real scene path in it
- onscreen: vawe formats/scene/shader-path.json
- narration: You write the film as a text file.
- why: the whole claim of the film is on screen in beat one, as a command rather than as a sentence
- emotion: curiosity
- duration: 2.5s
- transition_in: cut

## Beat 2: It runs (2.5s-5.0s)
- type: proof
- object: the same panel, now listing what the render did, line by line under the command
- shot: medium (unchanged: the panel has not moved)
- camera: hold
- layout: the same middle two thirds, the lower half of the panel filling with output
- picture: five status lines and one progress track, each with a status mark, a dim key and a bright value
- mechanism: engine-driven staggered entrances on each line (`parts`), and the progress track fills on the scene clock
- style: unchanged from beat 1, so the only new thing in the frame is information
- rest: the track fills for 1.35s under the render line
- trigger: the command in beat 1 was submitted
- becomes: a command becomes its own output, with real counts in it
- onscreen: parse · theme · shader · render · write
- narration: No timeline. No motion designer.
- why: the states are the evidence that a text file is really the input, and they are true numbers
- emotion: recognition
- duration: 2.5s
- transition_in: none (the object never leaves)

## Beat 3: The border (5.01s-6.36s)
- type: turn
- object: the same panel, with a light travelling its border
- shot: medium (unchanged)
- camera: hold
- layout: the same middle two thirds; the border is the only thing that changes
- picture: a conic light ring masked to 2.5px of the panel's own border, with a soft cobalt bloom
- mechanism: the `beam` layer, whose head angle is a closed-form function of local time
- style: the first light in the film that is not type
- rest: the panel holds completely still and lets the light move
- trigger: the render finished writing its file in beat 2
- becomes: a panel that was reporting becomes a panel that is charged
- onscreen: none
- narration: none (the silence here is doing the work before the peak)
- why: the border is the promise that the panel itself is about to do something
- emotion: anticipation
- duration: 1.35s
- transition_in: none

## Beat 4: The panel becomes the shader (6.36s-11.07s)
- type: payoff
- object: the panel's own body turns into the shader field, and the whole box grows through the frame
- shot: medium becoming full bleed (the panel's inner box grows to fill the frame and past it)
- camera: hold (the growth is the object's, not the camera's)
- layout: the shader starts at the panel's inner box, the middle two thirds, and ends full bleed
- picture: a banded shader field, cobalt to ice to white, exactly inside the terminal's body
- mechanism: the shader layer and the panel carry the SAME hand-keyed scale ramp, so they grow as one object, and the panel's chrome dissolves over 1.9s while it travels
- style: the loud beat, and the only one: everything before it is one mono face on black
- rest: none
- trigger: the beam in beat 3 completed its travel of the border
- becomes: the thing describing the render becomes the render
- onscreen: none
- narration: This is what comes out. Same file, any shape.
- why: the transformation is the argument, and any cut here would turn it into two shots of two things
- emotion: surprise
- duration: 4.71s
- transition_in: none

## Beat 5: It came out of a text file (11.07s-14.0s)
- type: cta
- object: gone through the camera, leaving the black it started on
- shot: medium (the wordmark against the left third, the right of the frame empty and holding the eye)
- camera: hold
- layout: the wordmark and url in the left half, on black, the right half deliberately empty
- picture: the payoff line, a 200px wordmark, and the url in the mono face in cobalt
- mechanism: a hand-keyed rise and settle on the wordmark, then a slow continued drift upward
- style: black, white, one cobalt line
- rest: the backdrop's cobalt pool opens slowly behind the wordmark
- trigger: the shader travelled past the camera and left the frame empty
- becomes: the picture becomes the name of the thing that made it
- onscreen: From one text file. | vawe | vawe.dev
- narration: vawe dot dev.
- why: the payoff is stated only after the viewer has watched the file turn into the picture
- emotion: settled
- duration: 2.93s
- transition_in: rise
