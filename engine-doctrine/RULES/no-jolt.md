---
name: no-jolt
when: a layer or the camera changes speed between two consecutive frames
holds: reports (`bin/vawe check page-check`, finding `dead-stop`)
answers: "why a fast move must decelerate, and why a declared cut is exempt"
group: look
codes: dead-stop
---

# A move never jumps speed frame to frame

A fast move that stops within one frame reads as a hard stop, not as a curve. `page-check` reports
it as `dead-stop`. Fix the curve that produced the stop: end the move on a spring or an ease-out.
Never smooth the number after the fact.

A hard cut is an intentional discontinuity. A frame that lands on a cut is never a jolt.
