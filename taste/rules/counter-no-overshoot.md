---
id: counter-no-overshoot
step: motion
principle: A counting number never overshoots. A number has no mass and an overshoot paints a number that is not true for several frames.
limit: none
range: roll-up 0.8 to 1.4 s; the last 30 percent of the time covers the last 5 percent of the count
break-when: never
instead: ease the count with expo-out or quart-out: the deceleration is the weight. Counting to a small number is a stunt: cut it.
check: judge
judge: Does a count pass its final figure and fall back?
prevents: doc MOTION-CRAFT and TASTE-RULES: a film that says 1,822 and paints 1,900 on the way breaks the rule to use real figures.
status: active
scored: no
numbers: {"count_min_s":0.8,"count_max_s":1.4}
craft: motion-craft
---

## Example

0 to 1,822 over 1.1 s on an expo-out.

Why and sources: [motion-craft](../craft/motion-craft.md).
