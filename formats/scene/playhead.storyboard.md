---
message: the studio timeline shows you the holes in a film before you spend a render on it
audience: people who render a 60 second mp4 to find out a beat was empty
framework: PAS
arc: a caret that types a promise turns into the playhead that keeps it
object: the playhead, a single vertical bar
thread: camera travel + one surface revisited + a shape match on the bar
sentence: See the film before you render it.
object_t0: a bare text caret blinking on empty white, the only mark in the frame
object_states: caret -> playhead on a timeline -> a scrubber crossing a hazard band -> a marker on the fixed span -> the fill of a render bar
object_last: the bar has run the whole clock and become the progress fill of the render it authorised
duration: 16.0s
format: 1920x1080
destination: web
---

<!--
  STUDIED FROM refs/pin-16818198602994243.mp4. Measurements: docs/CRAFT/REF-pin-16818198602994243.md.

  WHAT WE TAKE from that film: the grammar, not the content.
    - cadence: a state change every ~1.4s, with hard dead stops between changes
    - ONE hard cut in the whole film, at ~78% of the runtime, and it is a jump cut inside one object
    - white-first discipline: near-white backdrop, dark pixels under a few percent, ONE accent under 1%
    - the word-level reveal: an arriving word sits grey until the next lands, then settles to ink
    - big type, 11-15% of frame height for a single line, in a face that does not ask for attention
    - asymmetry when a surface shares the frame: type left, product right
    - a shape match carrying the spine (their wordmark became their header logo)

  WHAT WE DO NOT TAKE: their product, their claim, their palette, their typo. This film is about vawe
  studio and every word in it is true of this repo.

  THREE WAYS THIS FILM COULD HOLD ITS SUBJECT, and the first one is rejected:
    1. REJECTED. One card that keys w and h across four beats. Eighteen films in this library already
       are that, docs/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md says so, and it is the gate's minimum.
    2. CHOSEN. Camera travel over one white plane. Every surface is a card on the same field and the
       camera moves between them; no beat is a new world.
    3. CHOSEN. A shape match on one small mark. A vertical bar is the text caret at 0s, the playhead
       from 3.4s, and the leading edge of the render fill at 14.2s. It is the same 8px bar the whole
       way, it survives every junction, and it changes job at each one.
  Registers 2 and 3 are both things the gate can see, so this needs no waiver for continuity.

  BACKGROUND: the reference holds a byte-identical backdrop for 19.78 seconds and earns it, because its
  subject moves in every phrase. We do NOT copy that by default. Ours is a near-white field with a very
  slow drift, so the two frames that hold longest are not dead. If the subject motion lands as measured,
  the drift can come out; that is a decision for the render pass with beats in hand, not a decision here.
-->

## Beat 1: See it first (0s-2.6s)
- type: hook
- object: the caret is the whole frame; it blinks alone on white, types the line, then the line clears and it stays
- shot: medium, the caret dead centre with the frame deliberately empty around it
- camera: slow push, about 4% over the beat
- picture: one vertical ink bar on a near-white field, then seven words typed beside it at ~13% of frame height
- mechanism: per-character typing on a text layer, caret visible · the line clearing right to left · a hard dead stop of 0.4s before it clears
- becomes: an empty white field becomes a typed promise, and the promise collapses back into the single bar that wrote it
- onscreen: See the film before you render it.
- why: the viewer has to meet the bar as a caret before it can mean anything as a playhead, and a line that erases itself leaves the bar as the only thing on screen
- emotion: curiosity
- duration: 2.6s
- transition_in: none

## Beat 2: The bar lands on a clock (2.6s-5.6s)
- type: product_intro
- object: the caret drops onto a horizontal rule and becomes the playhead of the studio timeline
- shot: wide, the timeline tilted out of the picture plane and receding to the right
- camera: pull back and travel right along the tilted plane
- picture: a real captured vawe studio timeline, seconds ruler across the top, one bar per layer stacked beneath it, the playhead standing at 0s
- mechanism: tilt on the group so all rows share one vanishing point · the ruler drawing on left to right · the layer bars filling in staggered, 60ms apart · the camera pulling back on a braked ease
- becomes: the caret becomes the playhead of a real clock, and an empty rule becomes eleven layer bars with a shape
- onscreen: Every layer, on one clock.
- why: the claim only lands if the viewer sees the actual product surface making it, so this beat spends its seconds on captured UI and four words
- emotion: recognition
- duration: 3.0s
- transition_in: none

## Beat 3: The scrub (5.6s-8.8s)
- type: feature_showcase
- object: the playhead runs right across the timeline, and the preview above it changes as it passes each bar
- shot: wide, the timeline holding the lower two thirds, a preview frame riding above it
- camera: track right, matched to the playhead so the bar stays near frame centre
- picture: the playhead crossing the bars while a live preview above swaps frame for frame, then a red hazard band arriving under it at the 9s mark of the film being scrubbed
- mechanism: a motion track carrying the playhead across x · the preview layer cross-cutting on each bar boundary · the hazard band arriving late, after the eye has settled into the rhythm
- becomes: a static plan becomes a film playing, and an even run of bars becomes a run with a hole in it
- onscreen: Scrub it. No render.
- why: this is the turn, and it has to arrive while the viewer is enjoying the smoothness so the hole reads as a problem rather than a feature
- emotion: unease
- duration: 3.2s
- transition_in: none

## Beat 4: The hole (8.8s-12.4s)
- type: problem
- object: the playhead stops dead inside the hazard band, and the preview above it goes empty
- shot: medium, pushing into the band until it holds the width of the frame
- camera: dive in on the band, then a hard dead stop
- picture: the red band at hero scale with the preview above showing nothing but the backdrop, and a 1.2s measurement drawn across the band as a dimension line
- mechanism: camera dive to the band's centre · a dimension line drawing outward from both ends · the words arriving one at a time, each grey until the next lands then settling to ink
- becomes: a stretch of timeline becomes a measured hole, and a film you thought was finished becomes 1.2 seconds of nothing
- onscreen: 1.2 seconds of nothing.
- why: the cost has to be a number the viewer can see the size of, so the band is measured on screen instead of described
- emotion: sinking
- duration: 3.6s
- transition_in: none

## Beat 5: Fixed on the clock (12.4s-16.0s)
- type: payoff
- object: after the film's one cut the bar sits on the same span, now filled, and it runs the clock out and turns into the render fill
- shot: medium, the same timeline at the same scale as the frame before the cut
- camera: hold, then pull back to the whole clock
- picture: the identical timeline with a bar now spanning the gap, the playhead resuming, the preview above filling, and the bar's travel handing over to a render progress fill that completes
- mechanism: the film's ONLY hard cut, a jump cut on the same surface at the same scale, at 78% of the runtime · the playhead resuming its travel · the progress fill inheriting the bar's leading edge and running to 100%
- becomes: an empty span becomes a filled one, and the playhead becomes the leading edge of the render it just authorised
- onscreen: Fixed here. Then rendered.
- why: the film must end on the fix happening rather than on a sentence about fixing, so the last thing that moves is the render completing
- emotion: relief
- duration: 3.6s
- transition_in: cut
