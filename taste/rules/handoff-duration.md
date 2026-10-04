---
id: handoff-duration
step: transitions
principle: A handoff where the outgoing element's final pose becomes the incoming element's first pose reads as one object travelling. Give it time to read as travel.
limit: none
range: 0.8 to 1.0 s on EASE.carry or EASE.glide; a 0.4 s handoff is too fast to read as travel
break-when: never
instead: travel eases at both ends; EASE.land on a handover reads as two objects. Every element has a designed enter, hold and exit, or a handoff: an element simply gone in the next frame is dropped, not finished.
check: judge
judge: Does a handoff read as one object moving?
prevents: doc MOTION-CRAFT and ease-direction.
status: active
scored: no
numbers: {"handoff_min_s":0.8,"handoff_max_s":1}
craft: motion-craft
---

## Example

A headline travels 0.9 s on EASE.carry into the next label.

Why and sources: [motion-craft](../craft/motion-craft.md).
