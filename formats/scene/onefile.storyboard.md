---
message: one JSON file becomes one video, and the same file always makes the same video
audience: people who build product videos by hand and re-do them every time a number changes
framework: BAB
arc: a file nobody would look twice at turns out to be the whole film, and then makes it on screen
object: the JSON card
object_t0: one line of JSON in a small dark card, centred, alone
object_states: card (one line) → file (the whole document) → tile (one cell of its own output) → hands over to the frame it rendered
object_last: gone from the frame, replaced by the hero frame it produced, with a ribbon orbiting it
duration: 14.6s
format: 1920x1080
---

<!--
  Beat edges are the OBJECT's shape changes, taken from the build script's clock (grow 3.0, deal 6.6,
  hero 11.0, end 14.6) rather than round numbers. A junction the plan invents is a junction the render
  has no event at, which is exactly what plan-vs-render fails on.
-->

## Beat 1: One file (0s-3.0s)
- type: hook
- object: the card sits alone in a quiet field, one line long
- shot: medium (the card owns the middle, the rest of the frame is deliberately empty)
- camera: hold
- picture: a small dark JSON card, centred, six lines of real scene JSON in a mono face
- mechanism: per-word rise on the headline · the card fading up under it · a drifting gradient field
- becomes: an empty field becomes a file small enough to dismiss
- onscreen: One file.
- narration: This is the whole video. One file.
- why: establish the object at its smallest so every later shape reads as the same thing growing
- emotion: curiosity
- duration: 3.0s
- transition_in: cut

## Beat 2: The file opens (3.0s-6.6s)
- type: product_intro
- object: the card widens and deepens into the whole file; the copy around it stays put
- shot: medium
- camera: hold
- picture: the card grows from one line to the whole file, keyed on its box rather than scaled
- mechanism: box track (w/h keyed, contents reflow) on a braked ease · two-line cascade beneath
- becomes: the small card becomes the entire file, and the file becomes the thing making the claim
- onscreen: Every frame it names, | rendered the same way twice.
- narration: Change one number in here and the whole film re-cuts itself.
- why: the claim is spoken while the object is doing the thing the claim describes
- emotion: recognition
- duration: 3.6s
- transition_in: none (the object never leaves)

## Beat 3: The output (6.6s-11.0s)
- type: feature_showcase
- object: the card shrinks to one cell of a grid of real rendered frames, its own output around it
- shot: wide (five stills open outward from where the card was)
- camera: hold
- picture: five frames pulled from films this engine actually rendered, dealt out around the card
- mechanism: five boxes unfolding from the card's footprint, staggered · the card tracking down to tile size
- becomes: the file becomes one tile among the frames it produced
- onscreen: Six frames. One source.
- narration: What comes out is not a preview. It is the film.
- why: show the product of the claim rather than restate the claim in bigger type
- emotion: proof
- duration: 4.4s
- transition_in: none

## Beat 4: One video (11.0s-14.6s)
- type: payoff
- object: the grid collapses inward and one frame grows into the hero; the card fades out behind it
- shot: medium (one frame, centred, with a ribbon around it)
- camera: hold
- picture: a single hero frame with two ribbon arcs orbiting, one passing behind it and one in front
- mechanism: keyed depth (the arcs swap track mid-orbit so the ring passes behind) · converge-and-grow
- becomes: the grid becomes one frame, and the file becomes the video it made
- onscreen: One video.
- narration: No timeline. No re-export. Just the file.
- why: the payoff lands on the thing the file made, so the last frame is output and not a promise
- emotion: settled
- duration: 3.6s
- transition_in: none
