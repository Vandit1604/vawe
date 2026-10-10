---
id: real-physics
step: motion
principle: Real physics, not an imitation: a spring or an exponential as sampled keyframes or linear() with 8 or more stops, and a named effect that looks like its real-world thing.
limit: none
range: a spring as duration plus bounce (springLinear, springDuration)
break-when: never
instead: a flap has a hinge, perspective and shading; do not sell a glyph scramble as a flap or one cubic-bezier as an exponential.
check: judge
judge: Does a full frame mid-effect match the physical object? Does the move stop early?
prevents: feedback: "a flap must look like a flap" (commit f67c43549).
status: active
scored: yes
numbers: {"linear_stops_min":8}
print-motion: sample a spring or exponential with 8 or more stops, not one cubic-bezier sold as physics
craft: motion-craft
---

## Example

A split-flap digit with a hinge line and a shaded lower half.

Why and sources: [motion-craft](../craft/motion-craft.md).
