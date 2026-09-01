---
message: the film is a text file, and the terminal that renders it becomes the pictures it made
audience: developers and designers on X who have never seen a video written as JSON
framework: BAB
arc: hook (a command types itself) → build (the render reports its own states) → turn (the terminal's interior becomes a shader in place) → proof (two more panels rise from behind it and the three cycle through different looks) → payoff (from one text file)
threads: a continuous object (the terminal's own body is on screen from frame one to the payoff and is never replaced, only changed) and an escalation of light (dim panel → a beam lapping its border → its interior IS the light → three of them)
object: the terminal's body
object_t0: a dark panel on a white ground with an empty prompt and a caret
object_states: empty prompt → a real vawe command typed into it → the command's own render states listed under it → a light travelling its border → its interior IS the shader → it folds to one panel and two more rise from behind it → all three cycle through different shaders
object_last: three equal panels on one baseline, dissolving as the wordmark arrives on the white it started on
pace: showreel, 2 seconds per idea
spectacle: beat 5 · the two new shader panels · they rise from behind the folded one and fan out like a folder opening, landing aligned · the film stops showing one specimen and shows range
not: no voiceover, no zoom or push into the shader, no dark film (the ground is white, vawe.dev's own register), no camera on the terminal, no breathing idle on anything that is meant to be a screen, no gradient hero, no centred type, no stock footage, no dots-in-a-title-bar terminal cliche
format: 1920x1080
theme: themes/vawe.json
duration: 14s
---

<!--
  NO VOICEOVER. The four lines that were narration are on-screen type, one at a time, in the mono
  face, in a fixed slot above the picture (the fourth moves under the right panel, into the space the
  fan opens). The type is the only voice this film has, so each line arrives differently: word rise ·
  per-character blur · one whole line · word unfold.

  Beat edges sit on the bed's own grid (assets/music/bed.wav, mixkit 292): 178.2 BPM, first bar 0.30s,
  so a beat is 0.3367s and a bar is 1.3468s. The command types 0.637 to 2.320, the output lines land
  one per beat from 2.657, the beam runs 5.014 to 6.361 (one bar, one lap), the interior turns on
  6.361, the fold starts on 7.034, the fan launches on 7.708 and lands on 8.381, the panels swap shader
  on 9.728, 9.812 and 9.896 (a three-frame ripple), and the only cut is the downbeat at 11.074, which the
  panels' own exit straddles so the seam sits inside the move rather than on a still frame. `audio.beatSync` is NOT set:
  core/beat-bind.js refuses this bed at confidence 1.54 against a floor of 1.6, so the grid is applied
  by hand at author time rather than by the engine at boot.

  THE GROUND IS WHITE and the terminal is a dark panel on it, which is what vawe.dev is. The three
  shader panels keep a dark plate for the same reason: they are pictures on paper, and a shader that
  reads on black vanishes on white without one.

  SOUND is the bed, the command's own key clicks (a `typing` layer, so the clicks are derived from the
  formula that draws the characters), and `audio.tactile` at maxPerSec 2 for the arrivals.
-->

## Beat 1: The command (0s-2.99s)
- type: hook
- object: the panel sits alone on white and a real vawe command types itself at its prompt
- shot: medium (the panel fills the middle two thirds, the white around it deliberately empty)
- camera: none. A camera move scales every layer under it, and a terminal whose text creeps is a fake terminal
- layout: one line of type above the panel in ink, sharing its left edge; the panel in the middle band
- picture: a dark terminal on white paper, one hairline at 0.10 alpha, a cobalt prompt sigil, a caret
- mechanism: a `typing` text layer at 22 characters a second, which is also what makes the key clicks
- style: white ground, one dark panel, one mono face, one cobalt accent
- rest: the backdrop's dot field drifts five pixels a second
- becomes: an empty prompt becomes a real command with a real scene path in it
- onscreen: You write the film as a text file. | vawe formats/scene/shader-path.json
- why: the claim of the film is on screen in beat one, as a command rather than as a sentence
- emotion: curiosity
- duration: 2.99s
- transition_in: cut

## Beat 2: It runs (3.33s-5.01s)
- type: proof
- object: the same panel, listing what the render did, line by line under the command
- shot: medium (unchanged: the panel has not moved)
- camera: none
- layout: the same type slot above, the panel's lower half filling with output
- picture: five status lines and a progress track, each with a mark, a dim key and a bright value
- mechanism: `parts`, one line per beat of the bed; the track fills on the scene clock
- style: unchanged, so the only new thing in the frame is information
- rest: the track fills for two beats under the render line
- trigger: the command in beat 1 was submitted
- becomes: a command becomes its own output, with real counts in it
- onscreen: No timeline. No motion designer.
- why: the states are the evidence that a text file is really the input, and they are true numbers
- emotion: recognition
- duration: 1.68s
- transition_in: none (the object never leaves)

## Beat 3: The border (5.01s-6.36s)
- type: turn
- object: the same panel, with a light travelling its border
- shot: medium (unchanged)
- camera: none
- layout: unchanged; the border is the only thing that moves
- picture: a conic light masked to 2.5px of the panel's own border, with a cobalt bloom
- mechanism: the `beam` layer, one lap in exactly one bar
- style: the first light in the film that is not type
- rest: the panel holds still and lets the light move
- trigger: the render finished writing its file in beat 2
- becomes: a panel that was reporting becomes a panel that is charged
- onscreen: none
- narration: none, and there is none anywhere: this film has no voice
- why: the lap is the promise that the panel itself is about to do something
- emotion: anticipation
- duration: 1.35s
- transition_in: none

## Beat 4: The interior turns (6.36s-7.71s)
- type: reveal
- object: the panel's own fill drops to nothing over one beat and the shader is what is underneath
- shot: medium (unchanged: nothing moves, nothing scales, the picture changes inside the same box)
- camera: hold
- layout: unchanged, which is the point of the beat
- picture: a banded field, cobalt to white, FITTED to the terminal's body, with the chrome and the output still over it
- mechanism: the body's `background` alpha is a `var(--t)` ramp across one beat; the shader layer is born at the body's exact box, one track under it
- style: the turn, and it is quiet: no push, no cut, no flash
- rest: the type above holds while the picture under it changes
- trigger: the beam completed its lap of the border
- becomes: the thing describing the render becomes the render
- onscreen: This is what comes out.
- why: the transformation has to happen in place, or it is a cut to a second thing
- emotion: surprise
- duration: 1.35s
- transition_in: none

## Beat 5: The fan (7.71s-9.73s)
- type: payoff
- object: the body folds down to one panel and two more rise from behind it
- shot: medium wide (three panels on one baseline, the frame's middle band)
- camera: hold
- layout: three equal panels, 540x380, on one baseline, filling the middle band of the frame
- picture: the folded terminal in the centre, Worley cells on the left, a domain-warped marble on the right
- mechanism: the centre's own `w`/`h` keys fold it; the other two carry a hand-keyed track from the centre's position at 0.86 scale and 7 degrees of rotation out to their slots at 1.0 and 0
- style: the loud beat, and the only one
- rest: none
- trigger: the interior turned in beat 4, so there is now something to have three of
- becomes: one panel becomes three
- onscreen: none
- why: range is the argument, and range cannot be shown with one specimen
- emotion: delight
- duration: 2.02s
- transition_in: none

## Beat 6: The cycle (9.73s-11.07s)
- type: feature_showcase
- object: the three panels, each changing what it is showing
- shot: medium wide (unchanged: the panels do not move again)
- camera: hold
- layout: unchanged, with one line of type under the right panel, right-aligned to its edge
- picture: merging metaballs, a matrix rain, a starfield nebula: three looks nobody could mistake for each other
- mechanism: a HARD swap on a scale punch. The plate under each panel draws 1 -> 1.07 -> 1 with `hang`
  and `fling` handles, the outgoing shader ends on the apex and the incoming one is born on it, so the
  content changes on the steepest frame of a move the eye is already following. Crossfading two windows
  puts both states at half strength and neither reads (AE-TECHNIQUES #1)
- style: unchanged, so the only new thing is the content of the panels
- rest: every panel is a moving field
- trigger: the three landed, so they can now be compared
- becomes: three panels become three different films
- onscreen: Same file, any shape.
- why: the swap is the proof of the claim the line makes
- emotion: proof
- duration: 1.34s
- transition_in: none

## Beat 7: From one text file (11.07s-14.0s)
- type: cta
- object: dissolving, leaving the black it started on
- shot: medium (the wordmark in the left half, the right half deliberately empty)
- camera: a 1.03 push over the last three seconds
- layout: the payoff line, the wordmark and the url stacked in the left half
- picture: a 200px wordmark in ink with the panels dissolving behind it
- mechanism: a hand-keyed rise and settle on the wordmark, then a slow drift upward
- style: white, ink, one cobalt line
- rest: the backdrop's faint cobalt pool opens slowly behind the wordmark
- trigger: the cycle finished, so the film can name itself
- becomes: the pictures become the name of the thing that made them
- onscreen: From one text file. | vawe | vawe.dev
- why: the payoff lands only after the viewer has watched the file turn into the pictures
- emotion: settled
- duration: 2.93s
- transition_in: rise
