---
id: entrance-ease
step: motion
principle: An entrance is a landing: it decelerates on EASE.land and shows most of its move by frame 1. It never starts from nothing.
limit: no scale(0) start; no slow-start curve (the CSS keywords ease-in or ease-in-out) on an entrance
range: EASE.land to arrive, EASE.landSoft for a move under 0.4 s; start scale at 0.9 to 0.97 with opacity 0
break-when: a handover between two positions the viewer already sees travels: use EASE.carry or EASE.glide, not EASE.land
instead: enter(el) from core/motion/presets.js. EASE.land on a handover decelerates through the whole travel and reads as two objects, not one that moved.
check: judge
judge: Does frame 1 of an entrance already show most of the move? Does any entrance start at scale 0?
prevents: doc MOTION-STANDARDS and ease-direction: a slow-start entrance delays the exact moment the eye is watching; scale(0) has no physical start.
status: active
scored: yes
numbers: {"scale_start_min":0.9,"scale_start_max":0.97}
craft: motion-craft
---

## Example

translate 0 40px to 0 0 over 700 ms with EASE.land.

Why and sources: [motion-craft](../craft/motion-craft.md).
