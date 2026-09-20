---
message: draw the route and the climb is already on the page, before the first step
audience: hikers deciding whether a route is worth the effort, scrolling a phone feed
framework: hook - suspense - payoff
arc: name the mechanism; a hand draws a ridge route on the map and the elevation profile fills in under it in lockstep; a click saves the route and the real numbers land; state what was proven
object: the Trailhead route-planner panel, one continuous card that shrinks to a corner around the beat that names the mechanism and grows to fill the frame for the beat that proves it
threads: transforming object (scale + position), a real click with a caused consequence, motif (the panel's own corner slug never changes)
object_t0: a small route-planner thumbnail, top-right corner, 258x300
object_states: thumbnail top-right@258x300 -> grows to full-frame center@860x1000 as the cut lands -> holds full while the route is drawn, clicked and proven -> shrinks to a thumbnail again, bottom-right@258x300, for the payoff and close
object_last: the same thumbnail, bottom-right@258x300, holding under the close card
duration: 24.1s
format: 1080x1920 (9:16)
destination: reels
source: rebuilt from the 15s/16:9 worked example at quality/runs/evals/briefs/demo.json for a postable vertical feed: same one mechanism, longer hold so the draw and the click both get room to read, real sound instead of silence
theme: satara: warm off-white paper, one trail-orange accent, geometric rounded sans (Plus Jakarta Sans), snappy easeOutBack motion; the only theme in themes/ that reads as paper-and-sunlight (outdoor, warm, spatial) rather than a dashboard or a night mode, confirmed against `make theme-sheet THEME=satara`
spectacle: the click at 13.8s on the panel (layer id `panel`), a `ripple` sting on the click, immediately followed by the stat pill ("1,180 ft climb · 5.4 mi") at 14.1s; every other beat (the bounce-in arrival, the draw, the shrink to a corner) stays a plain eased move with no sting of its own
not: no narration, no captured product screenshot (Trailhead is invented), no dashboard chrome overload (one card, one route, one chart strip), no gradient hero on the hook/payoff text, no ruled grid on the map (contour lines only), no second click and no second consequence, no zoom-and-push (the panel is already large enough full-bleed that a push would add motion without adding legibility)
craft:
  captions: "no spoken word, so no caption track; the only on-screen copy is the hook/kicker and the payoff stack, both hard-left at x:90, clear of the reels top/bottom/right chrome"
  direction: "restraint is every beat but one: the arrival bounce, the draw and the shrink are all plain eases with no sting; the spectacle beat (13.8s click -> 14.1s pill) is the only one that earns a `ripple` sting and a dedicated cue, which is what makes it read as the loud moment instead of one of several"
  typography: "Plus Jakarta Sans throughout (satara's own face, a geometric rounded sans, chosen for the outdoor/brand register), one size scale: 72px hook, 54/42/28px payoff stack, 22-34px panel chrome; mono only for the kicker and tagline, never the headline"
  color: "satara's own palette only: warm paper bg, near-black ink text, one trail-orange accent used for the route line, the save button, the stat pill and the kicker/tagline; no colour introduced outside the theme"
  layout: "off-center, hard-left text column (x:90) against a right-anchored corner thumbnail; the panel is the one asymmetric hero, full-bleed at 860x1000 inside a 1080x1920 frame, never centered-everything"
  imagery: "no captured or stock imagery; the map, route and elevation chart are hand-authored SVG/HTML because Trailhead is invented and has no real product to capture"
  density: "beat 1 carries three sized elements (kicker, hook line, thumbnail panel) rather than a bare headline on a flat field; beat 2's panel alone carries five readable pieces of chrome (title, route name, map, save button, elevation strip)"
  show-dont-tell: "the elevation claim is never set in type, it is a real filling chart synced to a real drawn route; the climb figure only appears as a caused consequence of the click, never asserted in advance"
  motion-craft: "the panel's motion track is hand-keyed (6 keys: hold, arrive on easeOutBack, hold, shrink on easeInOutSine, hold), not a single named preset fired once; the cursor follows a 8-point hand-placed path, not a canned move"
  transitions: "fade (seam) into the demo because the hook's claim dissolves straight into the picture that proves it; cinematicZoom (seam) out of the demo because the proof deserves a push, not a plain cut, into the close"
  sound: "sounded by default: a warm synth bed under the whole film, plus an explicit `impact` cue at 13.8s and a `chime` at 14.1s so the one consequence in the film has its own sound (engine-doctrine/CRAFT/SOUND.md)"
  html-fragments: "the panel is one hand-authored html fragment using `parts` (riseIn/drawOn/popIn) and a `vars` width-mask for the elevation fill; no CSS animation/transition anywhere, the engine owns every seeked frame (engine-doctrine/CRAFT/HTML-FRAGMENTS.md)"
---

<!--
  WHY THIS SHAPE. The worked example proved the mechanism read in 15s at 16:9. This film exists to ask
  whether it reads as something you would actually post: vertical, long enough that the draw does not
  feel rushed, and with sound. So the beat spine is unchanged (name it, prove it, state it), and the one
  thing added is TIME: the draw+fill window grew from 5.0s to 7.0s and the full-frame hold grew from
  8.7s to ~13s, so the eye has time to track the line as it goes rather than catch it mid-motion.

  THE CLICK'S CONSEQUENCE. "Save route" fires at 13.8s, 0.2s after the drawn line and the filling
  profile both finish (13.6s). The stat pill pops at 14.1s, never before. If the numbers appeared
  before the click, or on their own timer, the demo would be decoration wearing a demo's clothes.

  THE PROFILE FILLS AS THE ROUTE DRAWS, not after. The `parts drawOn` stroke on the route path and the
  `vars` width-mask on the elevation fill share one delay (6.6s) and one duration (7.0s), so the two
  reveals are the same seven seconds, not two effects that happen to look similar.

  VERTICAL PLACEMENT. Every safe-area number below (671/192/929/1498) is read off `resolvePx()`, the
  same function the engine uses to place a `pin`, not eyeballed: the reels chrome reserves the top 10%
  (192px), the bottom 22% (422px) and the right 14% (151px) of a 1080x1920 canvas, so both thumbnail
  states (top-right and bottom-right) sit flush against the safe box's own corner rather than a guess.

  NO CAPTURED SITE. Trailhead is fictional and the panel is hand-authored HTML per the owner's
  instruction: invent it, reflect no real brand. The figures (1,180 ft, 5.4 mi, Ridge Loop, Sierra) are
  invented and plausible, never claimed as real data.

  SOUND: on by default (a warm synth bed matching the outdoor register), plus an explicit `impact` cue at
  13.8s so the one consequence in the film has its own sound, and a `chime` at 14.1s under the pill.

  THE LONG HOLD IS THE POINT, NOT A GAP. Beat 2 spends 13s in one continuous full-frame state on
  purpose (waived in the scene as `slow-pace`): a demo's whole argument is that the draw and the fill
  are the SAME seven seconds, and cutting away early would undercut the very claim being proven.
-->

## Beat 1: name the mechanism (0s-5.3s)
- type: hook
- object: the panel, small, top-right, not yet drawn on
- shot: wide
- camera: hold
- picture: warm paper ground; a small mono kicker sits above the hook line; the panel sits as a quiet thumbnail in the top-right corner of the safe box while the hook line owns the middle of the frame
- mechanism: none yet; the panel is present but inert, so its later growth reads as an arrival, not a pop
- placement: top-right
- object_in: top-right@258x300
- object_out: top-right@258x300 (unchanged; the growth belongs to the cut into beat 2)
- becomes: a claim in type becomes a picture to check it against
- onscreen: "ROUTE PLANNING" / "Draw the route. The climb comes with it."
- why: the payoff line names the same idea AFTER it has been shown, so the hook is allowed to promise it
- duration: 5.3s
- transition_in: fx:none

## Beat 2: the route drawn, the climb proven (5.3s-18.3s)
- type: demo (mechanism + click + consequence)
- object: the panel, growing to full-frame at the cut, then holding while the route is drawn, clicked and proven
- shot: wide, panel full-bleed within its own card
- camera: hold
- picture: the panel arrives at full size on a bouncy easeOutBack settle; a cursor eases onto the map, then draws a switchback route top to bottom while the elevation strip fills in underneath it, in the same seven seconds; the cursor steps to "Save route" and clicks; a pill reading "1,180 ft climb · 5.4 mi" pops in immediately after and the cursor lingers before easing out into the next cut
- mechanism: `parts drawOn` on the route path and a `vars` width-mask on the elevation fill share one delay (6.6s) and one duration (7.0s); the click at 13.8s (cursor `clicks`) is followed at 14.1s by the stat pill's `popIn`, never before it
- trigger: the hook line finishes making its claim at the exact frame the cut lands, so the panel's growth reads as the claim being tested immediately, not after a pause
- placement: center
- object_in: top-right@258x300 (arriving)
- object_out: center@860x1000 (about to shrink at the next cut)
- becomes: an undrawn map becomes a saved route with real numbers attached to it
- onscreen: none (the panel's own chrome: "Trailhead", "Ridge Loop · Sierra", "Save route", "1,180 ft climb · 5.4 mi")
- why: this is the whole reason the film exists; it gets the most time and the only click
- duration: 13.0s
- transition_in: fx:fade mech=seam

## Beat 3: what was proven, and the close (18.3s-24.1s)
- type: payoff + close
- object: the panel, shrunk back to a thumbnail, bottom-right, holding under the closing card
- shot: wide
- camera: hold
- picture: the panel settles into a bottom-right thumbnail, still showing the finished route and its stat pill; the payoff line lands upper-left, then the wordmark and tagline arrive under it
- mechanism: one easeInOutSine shrink on the panel's own motion track, synced to the cut; three text layers arrive with a short overlap
- trigger: the stat pill finishes settling and the cursor has already eased out, so the cut away from the proof to the statement of what it means lands on a clean beat, not mid-motion
- placement: bottom-right
- object_in: center@860x1000 (arriving, about to shrink)
- object_out: bottom-right@258x300
- becomes: a mechanism becomes a claim you can now trust, because you watched it happen
- onscreen: "The climb, visible before the first step." / "Trailhead" / "Plan the walk you can actually see."
- why: the payoff names what beat 2 showed, and lands last, per the hook-suspense-payoff spine
- duration: 5.8s
- transition_in: fx:cinematicZoom mech=seam
