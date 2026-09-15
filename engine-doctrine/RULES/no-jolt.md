---
name: no-jolt
when: a layer or the camera's speed changes between two consecutive rendered frames
holds: reports (make speed; author-check jolt step; TASTE=1 gives it teeth); `velocity-spike`
answers: "how much a layer's or the camera's speed may jump frame to frame before it reads as a jolt, and why a declared cut is exempt"
group: look
codes: velocity-spike
---

# A move never jumps speed frame to frame

A layer or the camera may not jump more than 600 px/s or 0.6 scale/s between two frames outside a cut.
Above that, motion stops reading as a curve and reads as a jolt: a hard stop, a station a camera never
actually eased into, or an arrival adapt that skipped an authored ease handle.

The fix is never to smooth the number after the fact. It is to check the keyframe that produced the
jump: a `through` or eased station instead of a linear one, or an ease handle the arrival adapt is
allowed to keep rather than override.

A hard cut IS an intentional discontinuity, so a frame that lands on a declared cut is never flagged.
`quality/gates/speed.mjs` owns the two thresholds and the frame-by-frame scan; this rule only names
when they apply.
