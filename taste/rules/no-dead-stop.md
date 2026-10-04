---
id: no-dead-stop
step: motion
principle: A move never jumps speed from one frame to the next. A fast move decelerates; a hard cut is the only intended discontinuity.
limit: speed change of 600 px/s for position or 0.6 scale units per second for zoom in one frame is a jolt
range: none
break-when: a declared cut: a frame that lands on a cut is never a jolt
instead: fix the curve that produced the stop: end the move on a spring or EASE.land; never smooth the number after the fact. A linear camera station or a slow-start curve straight into a hold is the classic shape.
check: dead-stop
judge: Does any move stop within one frame?
prevents: doc no-jolt and MOTION-CRAFT: smooth on a storyboard, jerky on screen.
status: active
scored: no
numbers: {"jolt_px_per_s":600,"jolt_zoom_per_s":0.6}
craft: motion-craft
---

## Example

A pan ends on EASE.settle, not at full speed.

Why and sources: [motion-craft](../craft/motion-craft.md).
