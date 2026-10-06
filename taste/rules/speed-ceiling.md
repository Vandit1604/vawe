---
id: speed-ceiling
step: motion
principle: Elements move at a speed the eye can follow. The fastest tenth of the moving elements stays under the pace the reference films keep.
limit: the p90 of the peak speed of the moving elements at most 12.6 frame heights per second
range: reference films peak at 4 to 13 frame heights per second (p10 to p90 of each film's p90)
break-when: a metric cut list or a whip transition the brief names as the pulse; a step much longer than the steps beside it is a cut, not a slide
instead: give the fastest moves more seconds (the next speed band) or less distance. Keep a quick move for the one element the beat is about.
check: speed-ceiling
judge: Which elements cross the frame in a blink? Can the eye follow each one?
prevents: measured: 22 reference films, harness/dev/bar-from-refs.mjs. Our films peaked at 14 to 30 frame heights per second at p90; the references stay at 12.6 or less.
status: active
scored: no
numbers: {"ceiling_fh_s":12.6,"isolated_ratio":3,"moving_floor_fh_s":0.2,"moving_min":5,"moving_steps_min":3}
print-motion: keep the fastest moves under 12 frame heights a second, not every move at full speed
craft: motion-craft
---

## Example

A card that slides 40 percent of the frame in 0.25 s peaks near 6 frame heights per second. The same slide in 0.1 s peaks near 15.

Draft check: The draft check boxes every element at up to 300 moments, drops elements that cover 60 percent of the frame (a camera or a ground) and the motion they carry, and measures only elements visible in two samples in a row. An element that peaks under 0.2 frame heights per second is a drift and is not counted. A step more than 3 times longer than both steps beside it is a cut and is not counted.
