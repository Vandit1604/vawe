---
id: stagger
step: motion
principle: A group reads as one beat with an inner rhythm: not a chord on one frame and not a queue.
limit: no 3 or more elements landing on one frame at 60 fps; the whole run at most 0.5 s
range: 30 to 80 ms between siblings (engine default 45 ms); calm 80 to 120 ms; the total (n minus 1) times the gap, so delay = 0.5 / (n minus 1) capped at 80 ms; past about 7 items stagger a few and bring the rest as a block; board cards 60 to 90 ms
break-when: the group must read as one object (a logo locks): then 0 ms, and say so in the page
instead: stagger(els) from core/motion/presets.js. Use a seeded shuffle for the order when you want it organic; a gap over 150 ms reads as sluggish. Eight items at 0.10 s run 0.7 s, over the cap.
check: group-landing
judge: Do siblings land on one frame, or does the last land in another beat?
prevents: doc banned-defaults, MOTION-STANDARDS, TASTE-RULES, TRANSITIONS and presets.js held this in 8 places. Past 0.5 s the last unit lands in a different beat from the first. doc: a group that lands on one frame pops like a screenshot.
status: active
scored: yes
numbers: {"gap_min_s":0.03,"gap_max_s":0.08,"gap_default_s":0.05,"calm_min_s":0.08,"calm_max_s":0.12,"total_max_s":0.5,"same_frame_group":3}
print-motion: stagger a group 30 to 80 ms, not a group that lands on one frame
digest: Stagger a group 30 to 80 ms; never a group that lands on one frame.
craft: motion-craft
---

## Example

Six chips, 50 ms apart: the run is 0.25 s.

Why and sources: [motion-craft](../craft/motion-craft.md).
