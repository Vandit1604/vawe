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
  STUDIED FROM refs/pin-16818198602994243.mp4. Measurements: engine-doctrine/CRAFT/REF-pin-16818198602994243.md.
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

    2. THEIR PALETTE, IN ITS MEASURED FORM. INVERTED, and still not a refusal of the discipline. The
       reference runs an 86% near-white field; this cut runs a near-black one, because the reviewer asked
       for cyberpunk and the studio has a real dark mode to give it (`8624ce0`: light is the default, dark
       is behind the ◐ toggle and THEME=dark). So the hero surface is `#tl` RE-CAPTURED under
       THEME=dark at the same 1440px viewport. It is the product, not the product repainted. Lane bars are
       mint text / slate rect / lime count / olive svg / rose group on the #0e1117 panel, the hazard band
       is the only saturated field in the frame, and one accent holds every emphasis. What we keep is the
       structure the reference is actually made of: ONE field, one accent, and ink that is not pure black,
       which here means paper that is not pure white.

       WHAT CYBERPUNK MEANS HERE, stated so it can be held to: LIGHT IN A DARK ROOM, not neon on black.
       The room is near-black and almost empty. The only bright things in the frame are the instrument and
       the monitor it is previewing, and the monitor is bright for an honest reason: the draft being
       previewed is a white film, which is exactly what the real studio shows in dark mode. Two hues carry
       meaning and nothing else is coloured. Mint #5ee0c8 is the accent and the state of a thing that has
       run. #ff4d6d is the studio's own alarm, and it is spent ONLY on the hazard band, its measurement
       and the word "nothing", so a red in this film always means a hole.
       REJECTED, each on purpose: gradient text, glass panels, a purple-to-blue hero, scanlines, glitch,
       chromatic fringing, and an outline glow on every element. Each is what the look degenerates into
       when it is a colour scheme rather than a lighting decision, and the first four are on the
       `impeccable` ban list.

    3. THEIR SPINE MOVE. At 2.0s their wordmark stands alone, and by 3.2s the camera has pulled back and
       that same wordmark IS the app's header logo. It is the best move in the film and WE CANNOT COPY
       IT: the studio's chrome carries no logo anywhere, only a filename in mono. Inventing one would
       mean the captured surface is no longer the product. So our match is the one the object already
       gives us: the text caret at hero scale becomes the studio's playhead, same bar, new job. It is a
       weaker reveal than theirs and it is honest. Their second match, the send circle becoming the
       service badge, we do reproduce in kind at beat 5: the playhead's leading edge becomes the leading
       edge of the render fill.
       HOW BEAT 1 STAGES IT, corrected against the build. The bar does not move to make room for the
       typed line, and it does not track the caret. It stands still in the world and the CAMERA trucks
       right, so the bar leaves dead centre and settles at the left of the frame with the line typing
       beside it. That is the reference's own move (it tracks left to hold a growing caret in frame),
       it costs one camera keyframe, and it starts the single rightward travel that runs to beat 4.

    4. THEIR CONTENT. Their product, their claim, their typo. Every word here is true of this repo.

  THREE WAYS THIS FILM COULD HOLD ITS SUBJECT, and the first one is rejected:
    1. REJECTED. One card that keys w and h across four beats. Eighteen films in this library already
       are that, engine-doctrine/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md says so, and it is the gate's minimum.
    2. CHOSEN. Camera travel over one plane. Every surface is a card on the same field and the
       camera moves between them; no beat is a new world.
    3. CHOSEN. A shape match on one small mark. A vertical bar is the text caret at 0s, the playhead
       from 3.4s, and the leading edge of the render fill at 14.2s. It is the same bar the whole
       way, it survives every junction, and it changes job at each one.
  Registers 2 and 3 are both things the gate can see, so this needs no waiver for continuity.

  HOW THE BAR IS BUILT, corrected against the render TWICE, because the bar is the film and the film
  kept not drawing it. Under the 3D rig the browser paints by DEPTH, not by layer order, so the tilted
  1440px capture stands partly in front of z = 0 and swallows anything flat that crosses it.

  The first build put one bar at z = 0 for all 16s and lost it from 3.28s on, 12.7 of 16 seconds.
  The fix was `phbar`, a group carrying the capture's exact box and the same 18-degree tilt: its child
  is COPLANAR with the surface, so paint order decides again, and the bar takes the lanes' own
  perspective, which a separately tilted layer cannot.

  That rescued the second half of the mark and left the first half at z = 0. Counted in magenta on
  2026-08-09, the caret was absent from 3.05s to 3.28s, seven frames, at the exact junction the film is
  built on. It read as a pop, not a hand-off, and every gate was green through both versions.
  `plane` depth was tried and rejected: it clears the occlusion, but depth is a real projection and the
  magnification moves with the camera dolly (1.60 to 1.43 across the dive), so no constant compensation
  exists and the move would have to be re-authored against a moving target.

  So the caret and the playhead are now ONE layer inside the coplanar group, resizing from the caret's
  box to the playhead's box with keyed `w`/`h`. There is no hand-off to hide, because there is no
  hand-off: it is the same mark the whole way, which is what this storyboard claimed from line 6.
  Proof is a pixel count, never an eye: `node harness/dev/bar-probe.mjs formats/scene/playhead.json`
  paints the subject a colour used nowhere else, renders, and fails on any frame that has none of it.

  THE CAPTURE THIS FILM DEPENDS ON. SETTLED, with numbers. The subject is
  `formats/scene/_playhead-subject.json`, a real renderable 16s draft built for this: fourteen layers of
  SIX types (text, rect, count, svg, group, and the component's own naming), and NO cuts, so `sceneUnits`
  never turns on and no authored duration is rewritten. Its dead-air hole is genuine, and beat-check
  names it 9.60s to 10.80s, 1.20s. Beat 4's copy is that measurement.
  Two things were learned by doing it. The LANE COUNT is not the only lever: capture WIDTH is, and it is
  the better one. `#tl` captured at an 1800px viewport is 1800x368 (4.9:1), at 1240px it is 1240x368
  (3.4:1) but the ruler's last two labels collide. 1440x368 (3.9:1) is the one used: a block, and the
  product's own label collision stays off the end of the ruler.
  The MIXED TYPES matter as much as the count. Fourteen `text` layers would draw fourteen identical
  cobalt bars and the stack would read as one block, which is fine for beat 2 and wrong for beat 3.
  Six types give six hues, and beat 3's playhead crosses bars a viewer can tell apart.

  THE SCALE LADDER, fixed after reading the first panels sheet. The first draft called beats 2 and 3
  wide and every other beat medium, so all five panels drew the same size box in the same place and the
  headline out-weighed the product in every one. That is the pure-type trap, and the reference is the
  opposite: it opens on one word in an empty frame and ends inside the product. So the film now pushes
  monotonically and never pulls out until the last shot:
    beat 1 WIDE, the emptiest frame  ->  2 MEDIUM  ->  3 MEDIUM  ->  4 CLOSE  ->  5 CLOSE, then out.
  Beat 5 opening CLOSE is not a preference, it is forced: the cut is a jump cut at the same scale, and
  the frame before it is beat 4's close. The first draft said medium and contradicted its own cut.

  BACKGROUND: the reference holds a byte-identical backdrop for 19.78 seconds and earns it, because its
  subject moves in every phrase. We do NOT copy that by default. Ours is the ROOM: a near-black field with
  two cool blooms drifting across the whole film at the pace the light cut used, so the two frames that
  hold longest are not dead. It then does one thing the light cut could not. A red bloom rises over 1.1s
  as the camera dives into the hazard band, and the film's one cut kills it at 12.44s; a mint bloom rises
  behind the render that follows. The room reacts to the alarm and then to the fix, so the argument is
  said in light as well as in type. Every value is driven from `var(--t)`; there is no fixed field here.

  `formats/scene/_lightfall.html` WAS CONSIDERED AND REJECTED. It is a good generated light field, 42
  seeded vertical bars with three incommensurate motion rates, and it is exactly wrong for this film. The
  subject is a stack of horizontal bars read against ONE vertical bar, and the whole spine of the film is
  that a viewer tracks that single mark from caret to playhead to render fill. Putting 42 vertical bars
  behind it hands the eye 42 decoys and makes the one thing the film asks you to follow indistinguishable
  from the wallpaper. The collision is structural, not a matter of opacity.

  THAT RISK IS CLOSED. The hazard band photographs. It draws as a red hatched column across the whole
  lane stack, labelled `dead air 1.20s`, with a matching alert chip above the ruler. Two things made it
  work: `c353920` records the authored duration per layer, so a beat-wrapped bar no longer swallows the
  hole; and the subject scene declares no cuts, so nothing is beat-wrapped at all and the band is
  undisputed rather than drawn with the studio's `disputed` caveat. Beat 4 needs no re-planning.
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
- picture: one vertical bar of light dead centre on a near-black field, with a soft bloom around it, the only thing emitting in the frame. `See the film` types beside it at ~13% of frame height, holds, and only then does `before you render it.` arrive beneath it at half that size
- mechanism: per-character typing on a text layer, caret visible · the line arriving in TWO stages, three words then four, so the frame is never holding seven words at one weight · a hard dead stop of 0.4s on the finished line · the line clearing right to left in 0.3s, leaving the bar alone
- becomes: an empty white field becomes a typed promise, and the promise collapses back into the single bar that wrote it
- onscreen: See the film before you render it.
- why: the viewer has to meet the bar as a caret before it can mean anything as a playhead, and a line that erases itself leaves the bar as the only thing on screen
- duration: 2.6s
- transition_in: none

## Beat 2: The bar lands on a clock (2.6s-5.6s)
- type: product_intro
- object: the caret drops onto a seconds ruler and becomes the playhead of the real studio timeline
- shot: medium, the tilted lane stack centred and owning the middle two thirds of the frame, receding to the right
- camera: pull back, hold dead for 0.4s, then travel right along the tilted plane
- picture: a captured vawe studio timeline of a fourteen-layer scene, centred, seconds ruler across the top, the lane stack filling the middle of the frame as a block, the playhead standing at 0s
- mechanism: the window does NOT slide in. It fades up in place, already tilted, exactly as the reference's app window does, while the camera pulls back · `plane` depth ACROSS the frame, not within the lane stack: the page slab stands 500px behind the picture plane and the timeline on it, so a 140px camera truck moves the slab 96px and the timeline 123px, measured · a full stop before the rightward travel starts
- corrected: the ruler cannot draw on and the lane bars cannot arrive staggered. The timeline is ONE captured component, so it arrives as one surface. Per-lane entrance would mean re-drawing the product by hand, which the capture-first rule forbids. The beat earns its motion from the camera instead.
- becomes: the caret becomes the playhead of a real clock, and an empty rule becomes fourteen layer bars with a shape
- onscreen: Every layer, on one clock.
- why: the claim only lands if the viewer sees the actual product surface making it, so this beat spends its seconds on captured UI and four words
- duration: 3.0s
- transition_in: none

## Beat 3: The scrub (5.6s-8.8s)
- type: feature_showcase
- object: in the lower two thirds the playhead runs across the lanes, and the preview above it changes as it passes each bar
- shot: medium, the lane stack holding the lower two thirds with a preview frame riding above it
- camera: track right with the playhead, stop dead, then lift up the lane stack
- picture: in the lower two thirds the playhead crosses the bars while a live preview above swaps frame for frame, then the camera rises up the stack and a red hazard band arrives at the far end of the ruler
- mechanism: a motion track carrying the playhead across x in three moves with a hard stop after each, the camera travelling right with it so the bar crosses frame centre rather than sitting on it · the camera then lifting UP the lane stack while pushing in, the film's largest single move, the same treatment the reference gives its model card · a preview card at `plane` +150, in FRONT of the timeline, cutting between three real frames of the subject scene
- corrected: the hazard band cannot arrive. It is drawn into the captured surface, so it is REVEALED by the camera reaching the far end of the ruler instead of animating in. The effect the beat wanted is intact, the mechanism is a camera move rather than an entrance.
- becomes: a static plan becomes a film playing, and an even run of bars becomes a run with a hole in it
- onscreen: Scrub it. No render.
- why: this is the turn, and it has to arrive while the viewer is enjoying the smoothness so the hole reads as a problem rather than a feature
- duration: 3.2s
- transition_in: none

## Beat 4: The hole (8.8s-12.4s)
- type: problem
- object: the playhead stops dead inside the hazard band, and the preview above it goes empty
- shot: close, the band filling the frame vertically with the measurement under it, the tightest frame in the film. It sits LEFT of centre with the type right, not centred: the camera has travelled one direction since beat 1 and centring the band here would mean reversing it
- camera: dive in on the band fast, about 0.3s, then a hard dead stop held for a full second
- picture: the red hatched band at hero scale, centred and filling the frame, the preview above it showing nothing but the backdrop, and a 1.2s measurement drawn across the band as a dimension line
- mechanism: a 0.36s camera dive to the band, then a 1.20s dead stop, then a very slow scale ramp, which is the shape `make measure` found in the reference's hero dolly · a dimension line drawing on beneath the band with its 1.20s label · the two lines of copy arriving word by word, the second line in the theme's `down` red · the empty preview card holding the frame the render actually produces at 10.0s, which is white
- corrected: the grey-to-ink word decay is NOT built. It needs one text layer per word with staggered windows or a bespoke composition, and the engine has no staged colour on a word split. This is debt, named rather than hidden.
- becomes: a stretch of timeline becomes a measured hole, and a film you thought was finished becomes 1.2 seconds of nothing
- onscreen: 1.2 seconds of nothing.
- why: the cost has to be a number the viewer can see the size of, so the band is measured on screen instead of described. The number is not written by hand: beat-check found this hole in a real scene and the studio drew it
- duration: 3.6s
- transition_in: none

## Beat 5: Fixed on the clock (12.4s-16.0s)
- type: payoff
- object: after the film's one cut the bar sits on the same span, now filled, and it runs the clock out and turns into the render fill
- shot: close, the same span centred at the identical scale as the frame before the cut, opening tight and only then pulling back to the whole clock
- camera: hold dead through the cut, then pull back to the whole clock
- picture: the identical timeline centred at the identical scale with a bar now spanning the gap, the playhead resuming, the preview above filling, and the bar's travel handing over to a render progress fill that completes
- mechanism: the film's ONLY hard cut, a jump cut on the same surface at the same scale, at 78% of the runtime · no camera move across the cut, so the only thing that changes is the content · the playhead resuming its travel · the progress fill inheriting the bar's leading edge and running to 100%, the second of the film's two shape matches, over a track so a growing bar reads as progress
- corrected: the fix is a SECOND CAPTURE, not paint. The first build covered the hazard band with a white rect and drew a blue bar by hand, and the payoff frame still carried the studio's `dead air 9.60s to 10.80s` alert chip and a red sliver of the band under the words "Fixed here": a film contradicting its own copy. So the subject's `closing-card` was extended to 10.80s IN THE SAME FILE, `#tl` was captured again at the same 1440px viewport, and the file was put back. The cut now swaps two real product surfaces that carry the same filename in their header, and the only things that change are the ones the fix changed: the band and its alert go, the closing-card bar spans the gap, `text end` arrives.
- becomes: an empty span becomes a filled one, and the playhead becomes the leading edge of the render it just authorised
- onscreen: Fixed here. Then rendered.
- why: the film must end on the fix happening rather than on a sentence about fixing, so the last thing that moves is the render completing
- duration: 3.6s
- transition_in: cut
