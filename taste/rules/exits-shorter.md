---
id: exits-shorter
step: motion
principle: An exit is a launch: it runs shorter than its entrance and accelerates. A card takes 0.4 s to appear and 0.25 s to leave.
limit: an exit shorter than its entrance (the lint flags an exit as long as or longer)
range: exit 0.35 to 0.6 of the entrance duration; the presets leave() at 0.6
break-when: the exit is a settle or a hand-off into the next shot and the page says so: then EASE.leave (a decelerating exit) is allowed
instead: exit on EASE.launch (accelerating) with leave(el) from core/motion/presets.js. An exit on the entrance's own ease arrives while leaving.
check: exit-length
judge: Count the frames of one entrance and its exit on the sheet: is the exit shorter?
prevents: feedback 2026-09-11: "exits faster than entrances, with an accelerating ease" (owner rule). doc banned-defaults: an exit as slow as its entrance. Shipped themes ran an exit ratio of 0.35 to 0.6.
status: active
scored: yes
numbers: {"exit_share_min":0.35,"exit_share_max":0.6,"preset_leave_share":0.6}
print-motion: exit shorter than the entrance on EASE.launch, not an exit as long as its entrance
digest: Exits run shorter than the entrance on EASE.launch (EASE.leave only for a settle or hand-off the page names).
craft: motion-standards
---

## Example

Entrance 0.5 s on EASE.land, exit 0.3 s on EASE.launch.

Why and sources: [motion-standards](../craft/motion-standards.md).
