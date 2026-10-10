---
id: no-dead-stop
step: motion
principle: A move never jumps speed from one frame to the next. A fast move decelerates; a hard cut is the only intended discontinuity.
limit: a move that stops within one step from over 600 px/s (position) or 0.6 scale units per second (zoom) is a jolt
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

Draft check: dead-stop reads the element boxes the draft check samples (60 a second, at most 300 samples). A step over 600 px/s (frame of 1080 px, scaled) followed by a step that holds still fires, once for the film with the worst case. A cut (a step much longer than both neighbours) and an element that leaves the frame or fades out are no stop. Only position and size are read; zoom is not. The reference films are mp4 files with no element boxes, so the 600 px/s is the rule's own number, not a measured one. The pixel twin is the acceptance row "jerky steps" (harness/lib/smoothness.mjs).
