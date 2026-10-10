---
id: speed-bands
step: motion
principle: Speed is a voice. Every move sits in a named band, and the slowest move runs at least 3 times the fastest move. Never every move at one duration.
limit: the slowest move at least 3 times the fastest move; not all moves in one band; the p90 of the peak speed of the moving elements at most 12.6 frame heights per second
range: energy 0.15 to 0.3 s; professional 0.3 to 0.5 s; gravity 0.5 to 0.8 s; cinematic 0.8 to 2 s only when the film has the seconds. Reference films peak at 4 to 13 frame heights per second (p10 to p90 of each film's p90). By role: ambient 0.8 to 1.2 s, thesis line 0.5 to 0.8 s, heavy title 0.5 to 0.7 s, caption 0.25 to 0.4 s, payoff snap 0.25 to 0.35 s. Frame counts at 60 fps (finals) or in seconds
break-when: a film that has one deliberate tempo (a metric-cut list) or a whip transition the brief names as the pulse; a step much longer than the steps beside it is a cut, not a slide
instead: use bandSeconds(name) and the presets; give the hero gravity or cinematic and the payoff energy. Too many distinct durations read as drift: hold to a few named bands. Give the fastest moves more seconds (the next band) or less distance; keep a quick move for the one element the beat is about.
check: one-band, duration-size, speed-ceiling
judge: List each move's duration on the sheet: is the longest at least 3 times the shortest? Which elements cross the frame in a blink? Can the eye follow each one?
prevents: feedback: "more done in 5 seconds, quick continuous motion". doc TASTE.md: uniform-cadence reads as template. measured over 22 reference films (harness/dev/bar-from-refs.mjs): our films peaked at 14 to 30 frame heights per second at p90, the references stay at 12.6 or less. A film that uses one band reads as monotone narration; the library median followed move was about 700 px/s.
dial: band
status: active
scored: yes
numbers: {"energy_min_s":0.15,"energy_max_s":0.3,"professional_max_s":0.5,"gravity_max_s":0.8,"cinematic_max_s":2,"slowest_to_fastest_min":3,"eye_speed_px_per_s":700,"area_ratio":4,"duration_ratio":2,"ceiling_fh_s":12.6,"isolated_ratio":3,"moving_floor_fh_s":0.2,"moving_min":5,"moving_steps_min":3}
print-motion: put each move in a speed band with the slowest move 3x the fastest and the fastest under 12 frame heights a second, not every move at one duration
digest: Speed bands: 0.15 to 0.3 s, 0.3 to 0.5 s, 0.5 to 0.8 s; the slowest move runs 3 times the fastest.
craft: motion-craft
---

## Example

Right: a 0.25 s hook entrance, then a 1.0 s reveal. Wrong: every entrance at 0.45 s. A card that slides 40 percent of the frame in 0.25 s peaks near 6 frame heights per second; the same slide in 0.1 s peaks near 15.

Why and sources: [motion-craft](../craft/motion-craft.md).

Draft check: duration-size reads the animation records (and the runs read from boxes). An element 4 times larger in area than another that moves in under half the time of the smaller one fires, once for the worst pair. Decorative and full-frame elements are left out. Material gives duration growing with size and distance; no reference measure pairs size with duration, so 4 and 2 are conservative.

Draft check, speed-ceiling: boxes every element at up to 300 moments, drops elements that cover 60 percent of the frame (a camera or a ground) and the motion they carry, and measures only elements visible in two samples in a row. An element that peaks under 0.2 frame heights per second is a drift and is not counted. A step more than 3 times longer than both steps beside it is a cut and is not counted.
