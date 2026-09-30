---
name: stagger-total
when: a group of items arrives with a stagger
holds: eye
answers: "the cap on a staggered group's total arrival time, and why past it the last item lands in a different beat"
group: look
---
# A staggered group's total arrival stays at or under 0.5 seconds

A stagger's total run is `(units - 1) x stagger`. Past 0.5 s the last unit lands in a different beat
from the first, so the group stops reading as one arrival and reads as a slow trickle. Derive the
per-unit delay from the unit count: `delay = 0.5 / (n - 1)`, capped at 80 ms (AGENTS.md: stagger
30 to 80 ms). Eight items at 0.10 s each run 0.7 s, over the cap.
