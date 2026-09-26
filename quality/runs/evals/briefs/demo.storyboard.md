---
message: draw the route and the climb is already on the page, before the first step
audience: hikers deciding whether a route is worth the effort, judging a route-planning app in 15s
framework: hook - suspense - payoff
arc: name the mechanism; a hand draws a ridge route on the map and the elevation profile fills in under it in lockstep; a click saves the route and the real numbers land; state what was proven
object: the Trailhead route-planner panel, one continuous card that shrinks to a corner around the beat that names the mechanism and grows to fill the frame for the beat that proves it
threads: transforming object (scale + position), a real click with a caused consequence, motif (the panel's own corner slug never changes)
object_t0: a small route-planner thumbnail, top-right corner, 354x228
object_states: thumbnail top-right@354x228 -> grows to full-frame center@1180x760 as the cut lands -> holds full while the route is drawn, clicked and proven -> shrinks to a thumbnail again, bottom-right@378x243, for the payoff and close
object_last: the same thumbnail, bottom-right@378x243, holding under the close card
duration: 15.0s
format: 1920x1080 (16:9)
destination: web
source: vawe-type/reference/demo.md worked example, rebuilt per engine-doctrine/EVALS.md as a real demo (was 6 layers / 10s)
theme: satara: warm off-white paper, one trail-orange accent, geometric rounded sans (Plus Jakarta Sans), snappy easeOutBack motion; picked over the cooler/darker themes in themes/ because Trailhead's register is outdoor, warm and spatial, and satara is the one theme here that reads as paper-and-sunlight rather than a dashboard or a night mode
spectacle: the click at 8.7s on the panel (layer id `panel`), a `ripple` sting timed to the "Save route" click, because the click and the stat pill it causes are the one moment the film is FOR; every other beat (the pop-in growth, the draw, the shrink) stays a plain easeOutBack/easeInOutSine move with no sting of its own
not: no narration, no captured product screenshot (Trailhead is invented, per the owner's instruction), no dashboard chrome overload (one card, one route, one chart strip), no gradient hero on the hook/payoff text, no ruled grid on the map (contour lines only), no second click and no second consequence
---

<!--
  WHY THIS SHAPE. "A route planner shows elevation" is a feature list, not a film. The one thing worth
  proving is that the elevation is not a separate screen you check afterward: it is drawn INTO the
  page, live, under the line your own hand is still moving. So the whole film holds one object, the
  panel, and asks it to do the two things a real demo needs: change size across both cuts (so it reads
  as a shot, not a slide) and hold still and full-frame for exactly as long as the mechanism needs to
  be watched.

  THE CLICK'S CONSEQUENCE. "Save route" fires at the exact frame the drawn line and the filling profile
  both finish (8.5s), and the stat pill ("1,240 ft climb - 6.2 mi") pops at 8.8s, never before. If the
  numbers appeared before the click, or on their own timer, the demo would be decoration wearing a
  demo's clothes (skills/vawe-type/reference/demo.md's own warning).

  THE PROFILE FILLS AS THE ROUTE DRAWS, not after. The `parts drawOn` stroke on the route path and the
  `vars` width-mask on the elevation fill share one delay (3.5s) and one duration (5.0s), so the two
  reveals are the same five seconds, not two effects that happen to look similar.

  NO CAPTURED SITE. Trailhead is fictional and the panel is hand-authored HTML per the owner's
  instruction: invent it, reflect no real brand, use no captured assets. The figures (1,240 ft, 6.2 mi,
  Ridge Loop, Sequoia) are invented and plausible, never claimed as real data.

  SOUND: silent, stated with a reason (a worked-example fixture proving a visual mechanism, not a mix).
-->

## Beat 1: name the mechanism (0s-2.8s)
- type: hook
- object: the panel, small, top-right, not yet drawn on
- shot: wide
- camera: hold
- picture: warm paper ground; the panel sits as a quiet thumbnail in the top-right while the hook line owns the frame
- mechanism: none yet; the panel is present but inert, so its later growth reads as an arrival, not a pop
- becomes: a claim in type becomes a picture to check it against
- onscreen: "Draw the route. The climb comes with it."
- why: the payoff line names the same idea AFTER it has been shown, so the hook is allowed to promise it
- emotion: curiosity
- duration: 2.8s
- transition_in: none
- object_in: thumbnail top-right@354x228
- object_out: thumbnail top-right@354x228 (unchanged; the growth belongs to the cut into beat 2)

## Beat 2: the route drawn, the climb proven (2.8s-11.5s)
- type: demo (mechanism + click + consequence)
- object: the panel, growing to full-frame at the cut, then holding while the route is drawn, clicked and proven
- shot: wide, panel full-bleed within its own card
- camera: hold
- picture: the panel arrives at full size on a bouncy easeOutBack settle; a cursor eases onto the map, then draws a ridge-shaped route left to right while the elevation strip fills in underneath it, in the same five seconds; the cursor steps to "Save route" and clicks; a pill reading "1,240 ft climb - 6.2 mi" pops in immediately after
- mechanism: `parts drawOn` on the route path and a `vars` width-mask on the elevation fill share one delay (3.5s) and one duration (5.0s); the click at 8.7s (cursor `clicks`) is followed at 8.8s by the stat pill's `popIn`, never before it
- becomes: an undrawn map becomes a saved route with real numbers attached to it
- onscreen: none (the panel's own chrome: "Trailhead", "Ridge Loop · Sequoia", "Save route", "1,240 ft climb · 6.2 mi")
- why: this is the whole reason the film exists; it gets the most time and the only click
- emotion: satisfaction
- duration: 8.7s
- transition_in: fade (cut mech: seam)
- object_in: thumbnail top-right@354x228 (arriving)
- object_out: full-frame center@1180x760 (about to shrink at the next cut)

## Beat 3: what was proven, and the close (11.5s-15.0s)
- type: payoff + close
- object: the panel, shrunk back to a thumbnail, bottom-right, holding under the closing card
- shot: wide
- camera: hold
- picture: the panel settles into a bottom-right thumbnail, still showing the finished route and its stat pill; the payoff line lands center-left, then the wordmark and tagline arrive under it
- mechanism: one easeInOutSine shrink on the panel's own motion track, synced to the cut; two text layers arrive with a short overlap, matching the worked example's own close pattern
- becomes: a mechanism becomes a claim you can now trust, because you watched it happen
- onscreen: "The climb, visible before the first step." / "Trailhead" / "Plan the walk you can actually see."
- why: the payoff names what beat 2 showed, and lands last, per the hook-suspense-payoff spine
- emotion: resolve
- duration: 3.5s
- transition_in: punch (cut mech: seam)
- object_in: full-frame center@1180x760 (arriving, about to shrink)
- object_out: thumbnail bottom-right@378x243
