---
message: the process is what catches the thing a confident measurement got wrong, and its middle looks like failure
audience: engineers who are two failed passes into a fix and are about to revert it
framework: hook - suspense - payoff
arc: a gate fails a shape that never came near the edge; the obvious fix makes the film worse; the middle makes the numbers worse still; only the third pass lands
object: the arc in its element box, and the measured rectangle drawn around it
threads: transforming object, bookend, open question, motif
object_t0: a near-closed arc inscribed in a dashed square box, turning, with a red measured rectangle around it that is already too big
object_states: the red rectangle swells to 1.414x while the ink never moves -> the whole object shrinks 40 percent so the rectangle fits -> the object holds still while the error is measured to scale beside it -> the object dims under seven red failures -> the rectangle snaps onto the ink and turns mint
object_last: the same shot as the first frame, measured correctly
duration: 15.0s
format: 1080x1920
destination: feed
source: docs/MISTAKES.md #211 (the layout audit measured a rotating layer's empty corners, not the ink it draws)
---

<!--
  WHY THIS SHAPE. "Trusting the process" is an abstract idea and the default failure is a slogan in 90pt
  type. So the film does not argue the idea. It shows one true, measured instance of it from this repo's
  own record, and the idea is what is left over.

  FOUR THREADS, and the first one I thought of is not the load-bearing one.
   1. Transforming object. One subject, on screen for the whole film: a semicircle in a square box, and
      the rectangle a gate drew around it. Every beat is a new STATE of that pair, never a new shot.
      This is the right device here because the CONTENT is continuous: it is one measurement, fixed.
   2. Bookend. The last frame is the first frame with the measurement corrected. Nothing else changes.
   3. Open question. The hook states a contradiction (nothing near the edge, failed anyway) and the
      answer is withheld until the 394px error is drawn to scale.
   4. Motif, in the light. The engine's own light field is the world; a dark radial mass slides in
      behind the panels for the two beats where the work is going backwards, and leaves at the payoff.
      The backdrop carries the arc rather than decorating it.

  WHAT IT SHOWS RATHER THAN STATES. The measured rectangle is drawn at true canvas scale, so a viewer
  can see it cross the safe edge while the ink inside it does not move at all. The 394px error is a bar
  394 real pixels tall between the two lines it separates. The regression is seven tiles, struck one at
  a time. No claim in this film is set in type without the picture that proves it.

  SOUND IS THE SPINE, NOT DECORATION. A synth bed sits under everything at 0.3, and the cue pattern is
  the argument: an error on the false failure, a press on the wrong fix, two dry ticks that resolve
  nothing, seven errors in a burst, one success. You can follow the story with your eyes shut.

  NO ROOT CUTS. The film is one take. Nothing here is a new shot, so a root cut would have been a
  transition between a thing and itself. The two stings mark the joints the content does not.
-->

## Beat 1: nothing came near the edge (0s-3.2s)
- type: hook
- object: the semicircle turning in its box, the red rectangle swelling around it
- shot: wide
- camera: hold
- picture: a dashed frame-edge rectangle, a mint arc inscribed in a square element box turning steadily, its silhouette unchanged, and a red measured rectangle growing to 1.414x until it crosses the safe edge on both sides
- mechanism: the arc draws on, then rotates; the red box scales on the same clock, so growth and rotation are visibly the same event
- becomes: a correctly measured shape becomes a failing one without moving
- onscreen: "Nothing came near the edge." / "The safe-zone audit failed it at every rotation."
- why: the contradiction is the open loop, and the picture states it before the words do
- emotion: unease
- duration: 3.2s
- transition_in: none

## Beat 2: shrink it 40 percent (3.2s-6.1s)
- type: problem
- object: the whole pair scales to 0.6, the red box now fits
- shot: wide
- camera: hold
- picture: the same frame with the subject small and stranded in the middle of it, the red rectangle comfortably inside the safe edge
- mechanism: one scale key on the object; the gate is satisfied and the composition is ruined, in the same move
- becomes: a passing measurement becomes a worse film
- onscreen: "Shrink it 40 percent." / "The only change that passed. The film got worse."
- why: the wrong answer has to be shown working, or the middle of the film has no cost
- emotion: resignation
- duration: 2.9s
- transition_in: content turnover (no root cut; the film is one take)

## Beat 3: 255px of clearance (6.1s-9.2s)
- type: evidence
- object: the object returns to full size and holds still while the error is drawn against it
- shot: wide
- camera: hold
- picture: three horizontal rules at true scale, the arc's crown, the frame edge 255px above it, and the red measured bound 139px above that, with the 394px gap drawn as a bar exactly 394 pixels tall
- mechanism: the rules arrive top down; the bar wipes open between the two it separates; a count runs to 394
- becomes: a disagreement becomes a distance you can see
- onscreen: "255px of clearance." / "Measured as 139px over the edge."
- why: this is the payoff of the open question, and it is a quantity, so it is a length and not a numeral
- emotion: recognition
- duration: 3.1s
- transition_in: content turnover (no root cut; the film is one take)

## Beat 4: fix two of three (9.2s-12.0s)
- type: reversal
- object: the object dims to a quarter and the failures land on top of it
- shot: wide
- camera: hold
- picture: seven red tiles struck in one at a time over the dimmed subject, under a mono line naming the scene that went from zero failures to seven
- mechanism: seven staggered pops, each with its own error cue, faster than the eye counts
- becomes: a partial fix becomes a bigger regression than the bug
- onscreen: "Fix two of three. Nothing moves." / "Unclamped, one clean scene became seven failures."
- why: the most counterintuitive moment goes last before the payoff, and the middle of a process is where it looks like a mistake
- emotion: alarm
- duration: 2.8s
- transition_in: content turnover (no root cut; the film is one take)

## Beat 5: only fixing all three worked (12.0s-15.0s)
- type: payoff
- object: the red rectangle snaps from 933 square onto the 660 element box and turns mint
- shot: wide
- camera: hold
- picture: the first frame again, the light back, the bound hugging the arc exactly
- mechanism: one scale key collapsing the bound from 1.414 onto the ink, a mint bound crossing under the red one, the dark mass leaving, and the only camera move in the film, a 5 percent push
- becomes: a rectangle that was measuring the empty corners becomes one measuring the ink
- onscreen: "Only fixing all three worked." / "Two scenes changed. Fail to pass. Zero regressions."
- why: the bookend closes on the corrected shot, and the idea is what is left over rather than what is said
- emotion: settling
- duration: 3.0s
- transition_in: content turnover (no root cut; the film is one take)
