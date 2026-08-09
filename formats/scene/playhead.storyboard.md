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
  CORRECTED against the reference shot by shot, and against the real studio surface, on 2026-08-09.

  WHAT WE TAKE from that film: the grammar, not the content.
    - the mechanism, which is the real lesson: MOVE HARD, THEN STOP DEAD. Measured, the plane travel at
      3.85s is 0.37s of movement inside a 0.70s shot. Roughly half of every shot is motion and the other
      half is a full stop. That duty cycle is what makes the film read fast, not the beat length.
    - ONE hard cut in the whole film, at ~78% of the runtime, and it is a jump cut inside one object
    - restraint in colour: one dominant field, almost no furniture, ONE accent holding every emphasis
    - the word-level reveal, corrected: the FIRST word arrives in the accent colour and decays to ink;
      every word after it arrives grey and settles to ink when the next lands. The line re-centres as it
      grows, so the sentence is being thought rather than filled into a slot.
    - big type, 11-15% of frame height for a single line, in a face that does not ask for attention
    - asymmetry when a surface shares the frame: type left, product right
    - a shape match carrying the spine

  WHAT WE DO NOT TAKE, and why. Each of these is a deliberate refusal, not an oversight.

    1. THEIR CADENCE. The reference changes state every 1.41s. This film runs about eight state changes
       across 16s, roughly one every 2.0s. The reviewer has already judged 1.41s as too fast for this
       material, and the material agrees: a timeline is read, not glanced at, and a viewer who cannot
       finish reading a lane has learned nothing. We keep their duty cycle and drop their frequency.

    2. THEIR PALETTE, IN ITS MEASURED FORM. The reference is 86% near-white with 1.56% of pixels under
       128 luma. Our hero surface is the real vawe studio, and the real vawe studio is dark: stage
       #0b0d12, timeline panel #0e1117, teal #5ee0c8, a red playhead. Verified by screenshot, not
       assumed. We cannot have both the real product and their measurement.
       THE CHOICE MADE HERE: keep the near-white page, and let it hold one dark instrument. The page is
       white, the type is ink, the only saturated thing in the frame is the hazard band. That keeps the
       reference's actual discipline, which is one field and one accent, and abandons its specific
       percentage, which was never the point. It also means the studio appears as the product ships,
       which the launch rules require.
       THE REVIEWER MAY OVERRULE THIS. The two alternatives are: give the studio a light mode and
       capture that (engine work, and it advertises a UI that does not ship), or draw a light timeline
       by hand (breaks the rule that the hero surface must be the product). Both are worse. Say so if
       you disagree, because it decides the look of every frame.

    3. THEIR SPINE MOVE. At 2.0s their wordmark stands alone, and by 3.2s the camera has pulled back and
       that same wordmark IS the app's header logo. It is the best move in the film and WE CANNOT COPY
       IT: the studio's chrome carries no logo anywhere, only a filename in mono. Inventing one would
       mean the captured surface is no longer the product. So our match is the one the object already
       gives us: the text caret at hero scale becomes the studio's playhead, same bar, new job. It is a
       weaker reveal than theirs and it is honest. Their second match, the send circle becoming the
       service badge, we do reproduce in kind at beat 5: the playhead's leading edge becomes the leading
       edge of the render fill.

    4. THEIR CONTENT. Their product, their claim, their typo. Every word here is true of this repo.

  THREE WAYS THIS FILM COULD HOLD ITS SUBJECT, and the first one is rejected:
    1. REJECTED. One card that keys w and h across four beats. Eighteen films in this library already
       are that, docs/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md says so, and it is the gate's minimum.
    2. CHOSEN. Camera travel over one white plane. Every surface is a card on the same field and the
       camera moves between them; no beat is a new world.
    3. CHOSEN. A shape match on one small mark. A vertical bar is the text caret at 0s, the playhead
       from 3.4s, and the leading edge of the render fill at 14.2s. It is the same 8px bar the whole
       way, it survives every junction, and it changes job at each one.
  Registers 2 and 3 are both things the gate can see, so this needs no waiver for continuity.

  THE CAPTURE THIS FILM DEPENDS ON, and its one hard constraint. The studio timeline of an 8-layer
  scene is 1500x225, a 6.7:1 sliver. Tilted, a sliver is invisible, and there is nothing to travel up.
  Capture the timeline of a scene with AT LEAST 14 LAYERS so the lane stack is a block, not a strip.
  That single choice is what makes beat 2's tilt and beat 3's vertical lift possible at all. Verified
  by screenshotting the running studio; the lane area scrolls, so lane count is the only lever.

  THE SCALE LADDER, fixed after reading the first panels sheet. The first draft called beats 2 and 3
  wide and every other beat medium, so all five panels drew the same size box in the same place and the
  headline out-weighed the product in every one. That is the pure-type trap, and the reference is the
  opposite: it opens on one word in an empty frame and ends inside the product. So the film now pushes
  monotonically and never pulls out until the last shot:
    beat 1 WIDE, the emptiest frame  ->  2 MEDIUM  ->  3 MEDIUM  ->  4 CLOSE  ->  5 CLOSE, then out.
  Beat 5 opening CLOSE is not a preference, it is forced: the cut is a jump cut at the same scale, and
  the frame before it is beat 4's close. The first draft said medium and contradicted its own cut.

  BACKGROUND: the reference holds a byte-identical backdrop for 19.78 seconds and earns it, because its
  subject moves in every phrase. We do NOT copy that by default. Ours is a near-white field with a very
  slow drift, so the two frames that hold longest are not dead. If the subject motion lands as measured,
  the drift can come out; that is a decision for the render pass with beats in hand, not a decision here.

  KNOWN RISK, unresolved, and the reviewer should know it before approving beat 4. The hazard band is
  the picture beat 4 rests on, and it could not be produced this pass. The studio draws lane bars from
  the RENDERED DOM while it draws hazard bands from beat-check, which reads the JSON, and under
  `sceneUnits` the engine overwrites every non-final layer's authored duration with its beat's end
  (formats/scene/scene.js:394). So the bars stretch and the hole the gate found has no gap to sit in.
  Beat 4 needs a capture where the band is visibly drawn. If it cannot be, beat 4 must be re-planned.
-->

<!--
  TYPE SCALE, stated because the panels exposed its absence: the first draft carried the same headline
  size and position in all five beats, and the reference this film recreates varies its type enormously.
  A held size across a whole film reads as a template, and it wastes the one axis that costs nothing.

  The scale follows the shot, so the type gets smaller exactly as the picture gets closer and takes over:

    beat 1  WIDE    13% of frame height, then 6.5% for the second clause   the type IS the frame
    beat 2  MEDIUM  9%                                                     the product arrives, type yields
    beat 3  MEDIUM  9%                                                     held, because the beat before it earned the size
    beat 4  CLOSE   15%, the largest in the film                           the hole is the turn and it shouts
    beat 5  CLOSE   7%, the smallest                                       the picture answers, so the words stop trying

  Beat 4 is deliberately larger than the hook. A recreation whose loudest frame is its opening has no
  turn, and the measured reference puts its own peak at the problem, not at the promise.
-->

## Beat 1: See it first (0s-2.6s)
- type: hook
- object: the caret is the whole frame; it blinks alone on white, types the line, then the line clears and it stays
- shot: wide, the caret dead centre and the frame deliberately empty around it, the emptiest frame in the film
- camera: slow push, about 4% over the beat
- picture: one vertical ink bar dead centre on a near-white field. `See the film` types beside it at ~13% of frame height, holds, and only then does `before you render it.` arrive beneath it at half that size
- mechanism: per-character typing on a text layer, caret visible · the line arriving in TWO stages, three words then four, so the frame is never holding seven words at one weight · a hard dead stop of 0.4s on the finished line · the line clearing right to left in 0.3s, leaving the bar alone
- becomes: an empty white field becomes a typed promise, and the promise collapses back into the single bar that wrote it
- onscreen: See the film before you render it.
- why: the viewer has to meet the bar as a caret before it can mean anything as a playhead, and a line that erases itself leaves the bar as the only thing on screen
- emotion: curiosity
- duration: 2.6s
- transition_in: none

## Beat 2: The bar lands on a clock (2.6s-5.6s)
- type: product_intro
- object: the caret drops onto a seconds ruler and becomes the playhead of the real studio timeline
- shot: medium, the tilted lane stack centred and owning the middle two thirds of the frame, receding to the right
- camera: pull back, hold dead for 0.4s, then travel right along the tilted plane
- picture: a captured vawe studio timeline of a fourteen-layer scene, centred, seconds ruler across the top, the lane stack filling the middle of the frame as a block, the playhead standing at 0s
- mechanism: the window does NOT slide in. It fades up in place, already tilted, exactly as the reference's app window does, while the camera pulls back · per-layer `plane` depth so the near lanes travel further than the far ones and the perspective changes as the camera moves · the ruler drawing on left to right · the lane bars arriving staggered 60ms apart, top to bottom · a full stop before the rightward travel starts
- becomes: the caret becomes the playhead of a real clock, and an empty rule becomes fourteen layer bars with a shape
- onscreen: Every layer, on one clock.
- why: the claim only lands if the viewer sees the actual product surface making it, so this beat spends its seconds on captured UI and four words
- emotion: recognition
- duration: 3.0s
- transition_in: none

## Beat 3: The scrub (5.6s-8.8s)
- type: feature_showcase
- object: in the lower two thirds the playhead runs across the lanes, and the preview above it changes as it passes each bar
- shot: medium, the lane stack holding the lower two thirds with a preview frame riding above it
- camera: track right with the playhead, stop dead, then lift up the lane stack
- picture: in the lower two thirds the playhead crosses the bars while a live preview above swaps frame for frame, then the camera rises up the stack and a red hazard band arrives at the far end of the ruler
- mechanism: a motion track carrying the playhead across x, the camera matching it so the bar stays near frame centre · a hard stop when it reaches the far lane · the camera then lifting UP the lane stack, the film's largest single move, the same treatment the reference gives its model card · the preview cross-cutting on each bar boundary · the hazard band arriving last, after the eye has settled into the rhythm
- becomes: a static plan becomes a film playing, and an even run of bars becomes a run with a hole in it
- onscreen: Scrub it. No render.
- why: this is the turn, and it has to arrive while the viewer is enjoying the smoothness so the hole reads as a problem rather than a feature
- emotion: unease
- duration: 3.2s
- transition_in: none

## Beat 4: The hole (8.8s-12.4s)
- type: problem
- object: the playhead stops dead inside the hazard band, and the preview above it goes empty
- shot: close, the band centred and filling the frame with the measurement reading across it, the tightest frame in the film
- camera: dive in on the band fast, about 0.3s, then a hard dead stop held for a full second
- picture: the red hatched band at hero scale, centred and filling the frame, the preview above it showing nothing but the backdrop, and a 1.2s measurement drawn across the band as a dimension line
- mechanism: a fast camera dive to the band's centre, then a stop long enough to read · a dimension line drawing outward from both ends · the words arriving one at a time, the first in the accent colour decaying to ink and each one after it grey until the next lands · the line re-centring as it grows rather than sitting in a fixed slot
- becomes: a stretch of timeline becomes a measured hole, and a film you thought was finished becomes 1.2 seconds of nothing
- onscreen: 1.2 seconds of nothing.
- why: the cost has to be a number the viewer can see the size of, so the band is measured on screen instead of described
- emotion: sinking
- duration: 3.6s
- transition_in: none

## Beat 5: Fixed on the clock (12.4s-16.0s)
- type: payoff
- object: after the film's one cut the bar sits on the same span, now filled, and it runs the clock out and turns into the render fill
- shot: close, the same span centred at the identical scale as the frame before the cut, opening tight and only then pulling back to the whole clock
- camera: hold dead through the cut, then pull back to the whole clock
- picture: the identical timeline centred at the identical scale with a bar now spanning the gap, the playhead resuming, the preview above filling, and the bar's travel handing over to a render progress fill that completes
- mechanism: the film's ONLY hard cut, a jump cut on the same surface at the same scale, at 78% of the runtime · no camera move across the cut, so the only thing that changes is the content · the playhead resuming its travel · the progress fill inheriting the bar's leading edge and running to 100%, the second of the film's two shape matches
- becomes: an empty span becomes a filled one, and the playhead becomes the leading edge of the render it just authorised
- onscreen: Fixed here. Then rendered.
- why: the film must end on the fix happening rather than on a sentence about fixing, so the last thing that moves is the render completing
- emotion: relief
- duration: 3.6s
- transition_in: cut
