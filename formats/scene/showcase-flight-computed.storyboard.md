---
message: this map is arithmetic, not artwork, and one JSON computed every frame of it
audience: people who make product video by hand, and who assume a map on screen was drawn by a designer
framework: show-then-name
arc: a dark ocean resolves into a real chart, a route is computed across it, the world turns into dawn while you watch, and only then does the film say what it was
threads: camera travel (a oner following the arc), a colour through-line (night to dawn, one continuous ramp), a continuous object (the chart survives every cut)
object: the North Atlantic chart
object_t0: nothing but dark water and a graticule fading up over New York
object_states: graticule -> coastlines drawn on -> JFK lit and the arc computing itself -> the aircraft flying the arc while the terminator sweeps west and the whole frame lightens -> CDG in daylight with the finished track behind it
object_last: the complete route in dawn light, the frame it spent twenty seconds becoming
duration: 20.0s
format: 1920x1080
destination: web
---

<!--
WHY THIS EXISTS, and what was wrong with showcase-flight.json.

The old film is not badly made. Its chart is the best thing in this library: one linear lon/lat
mapping, real coast vertices, both airports where they actually are, an arc through the true
great-circle midpoint near 36W 51.5N, and a terminator that sweeps WEST because that is the direction
the real one moves. None of that is being rebuilt.

What is wrong is everything around it, read off twelve timestamped frames of the render:

1. The explanation is the faintest thing on screen. Pale grey chart on near-white paper, with large
   black type above it. The film's own note calls the chart its only explanation.
2. Text collides with itself, twice. At 10.0s "Then six hours of nothing to look at." overlaps
   "3635 mi"; at 12.0s "Somewhere over the water." runs into the stats row.
3. It ends on nothing. The last three seconds are a near-white card with one line of type. Fourteen
   seconds of map, discarded for the payoff.
4. The copy indicts the picture: "Then six hours of nothing to look at." over a mostly empty map is
   an accurate description of the frame instead of a fix for it.
5. Two unrelated visual worlds: a navy starfield for three seconds, then white paper for sixteen. A
   night flight rendered as a printed timetable, and the starfield never returns.

THE ONE IDEA. The terminator is the film. An eastbound redeye flies INTO sunrise, so the frame goes
from night to dawn across twenty seconds. That is a colour arc no cut can fake, it makes the existing
geometry the payoff rather than the wallpaper, and it fixes the palette problem by putting the two
worlds in the right order and connecting them: the navy IS the start and the light IS the end.

WHY IT IS AN ENGINE SHOWCASE AND NOT A FLIGHT FILM. The distinction was asked and answered. A film
that SAYS "245 effects" is the weakest kind of showcase, and scripts/gates/critique.mjs has a
false-claim rule aimed at exactly that sentence. This one shows one hard thing done exactly, and
names it once at the end, by which point the frame has already proved it.

WHAT IT IS SHOWING, none of which is stated on screen until the last beat:
  · a continuous object that survives every cut and CHANGES across each one
  · a camera that travels rather than a stack of held wide shots
  · a count layer whose number is the arc's own length, so the picture IS the figure
  · a colour ramp running the length of the film, driven by the same clock as the geometry
  · determinism: the same JSON gives the same 600 frames, which is why a map can be arithmetic
-->

## Beat 1: The water (0s-3.2s)
- placement: centred. No type at all; the map is the whole subject
- type: hook
- object: the chart, at its first state — a graticule over dark water, then coastlines
- shot: wide
- camera: slow push
- picture: dark ocean. The 20-degree graticule fades up, then every coast path DRAWS ON west to east, so the first thing on screen is a map building itself
- mechanism: each coast path's dash offset is a clamp on --t, staggered west to east; camera slowPush
- becomes: dark water becomes a graticule, and a graticule becomes a coastline
- becomes_2: an empty grid becomes a recognisable North Atlantic, at the moment the second coast lands
- onscreen: (none)
- why: a title card spends the opening telling. A map assembling itself spends it showing, and the engine claim is about computation, so the computation should be the first thing visible
- emotion: attention
- duration: 3.2s
- transition_in: cut

## Beat 2: The departure (3.2s-6.8s)
- placement: HUD on the top edge, left, never over water the arc will cross
- type: setup
- object: the chart — the arc begins to exist on it
- shot: medium
- camera: travel east, beginning
- picture: JFK lights on the American coast and the great-circle arc computes itself outward from it, the distance counting up as the line grows
- mechanism: one clamp on --t drives BOTH the arc's draw-on and the count layer, so they cannot disagree
- becomes: a chart becomes a route, and a number becomes a length
- onscreen: NEW YORK · JFK · 22:40
- why: the first capability shown is a figure that is a picture. The arc IS the distance, never a caption for it
- emotion: anticipation
- duration: 3.6s
- transition_in: cut

## Beat 3: The crossing (6.8s-13.0s)
- placement: HUD on the top edge, left, the same slot as beat 2 so the eye does not re-find it
- type: turn
- object: the chart — the track grows, and its colour changes under moving light
- shot: medium
- camera: travelling, locked to the aircraft
- picture: the aircraft flies the arc laying a solid track behind it while the terminator sweeps west and the WHOLE frame lightens with it, ocean included
- mechanism: camera x follows the aircraft's position on the arc; the terminator's x and the frame's colour ramp are the same clamp on --t
- becomes: a route becomes a crossing, and night becomes dawn
- onscreen: 38,000 ft · 512 mph
- why: the old film called this six hours of nothing to look at. It is the only beat that HAD to be worth looking at, and the dawn is what makes it so
- emotion: absorption
- duration: 6.2s
- transition_in: cut

## Beat 4: The arrival (13.0s-15.0s)
- placement: HUD on the top edge, right. The one deliberate move, mirroring the direction of travel
- type: payoff
- object: the chart — the aircraft meets CDG
- shot: medium
- camera: brake to a stop over the European coast
- picture: CDG in daylight. The aircraft closes the last of the arc and stops on the airport
- mechanism: the camera BRAKES rather than cutting, so the arrival is the end of one move and not a new shot
- becomes: a crossing becomes an arrival
- onscreen: PARIS · CDG · 11:55
- why: the payoff of the loop the first frame opened. Where did the night go
- emotion: arrival
- duration: 2.0s
- transition_in: cut

## Beat 5: The track (15.0s-16.6s)
- placement: centred. No type at all; the finished line is the only thing on screen
- type: payoff
- object: the chart — the finished route, whole
- shot: medium
- camera: hold
- picture: the solid track behind the aircraft is the entire crossing, readable in one look for the first time
- mechanism: the aircraft stops and the eye is handed the line it drew; nothing new enters, the existing object is simply now complete
- becomes: a moving aircraft becomes a finished track
- onscreen: (none)
- why: the object has been changing for sixteen seconds. This is the one moment it is allowed to be still, and it earns it by being complete
- emotion: satisfaction
- duration: 1.6s
- transition_in: cut

## Beat 6: The whole ocean (16.6s-18.3s)
- placement: centred, the same framing as beat 1, which is what makes it a bookend
- type: close
- object: the chart — pulled back to the full map
- shot: wide
- camera: pull back
- picture: the camera retreats to the shot the film opened on, now carrying a route across it
- mechanism: the pull-back is a BOOKEND: the same framing as beat 1, so the change is the only difference between them
- becomes: a tight coast becomes the whole ocean again, with everything the film added still on it
- onscreen: (none)
- why: returning to the first shot is what makes the twenty seconds measurable. The viewer compares without being asked to
- emotion: recognition
- duration: 1.7s
- transition_in: cut

## Beat 7: The name (18.3s-20.0s)
- placement: the claim sits on the lower third, over open ocean south of the arc, so it never crosses the route
- type: close
- object: the chart — whole, still on screen, never replaced
- shot: wide
- camera: hold
- picture: the full route in dawn light with the claim over it, the map still doing the arguing
- mechanism: the copy arrives OVER the map, never instead of it; the film ends on the picture it built
- becomes: a map becomes a claim about the map
- onscreen: Every vertex <b>computed</b>. Not one drawn.
- onscreen_sub: one JSON · 600 frames · identical every run
- why: a showcase that states a feature count is the weakest kind, and critique.mjs has a rule aimed at that sentence. This names the arithmetic, and the frame behind it is already the proof
- emotion: conviction
- duration: 1.7s
- transition_in: cut

<!--
COPY, all of it, so it can be argued with before it is built:
  beat 2   NEW YORK · JFK · 22:40
  beat 3   38,000 ft · 512 mph
  beat 4   PARIS · CDG · 11:55
  beat 5   Every coast vertex, both airports and the arc are computed, not drawn.
           One JSON. 600 frames. The same every time.
  footer   sample route · figures are illustrative

  Nothing here tells the viewer what to feel about the picture, and nothing describes the frame back
  to them. The old film's worst line was a caption for its own emptiness.

SOUND. Not silent. A low bed under the crossing that lifts as the light does, so the ear gets the
same night-to-dawn ramp the eye does. If it ships silent, audio._why has to say so, and "we did not
get to it" is not a reason.
-->
