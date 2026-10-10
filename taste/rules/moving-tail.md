---
id: moving-tail
step: finish
principle: The world keeps moving to the last frame: the last second carries a small move on a part or the ground. A wordmark may land and hold, but something still moves.
limit: no static frame in the last 1 s; at most 4 near-identical tail tiles, unless an animation runs on a visible element through the last 1 s on the sheet
range: a slow part or ground move through the last second
break-when: a declared hold on the final lockup (dead-air waiver with a reason)
instead: keep the ground or a part of the held lockup alive with a slow move (2 to 4 percent over the last second), or end on one last move; a camera push is a camera move (constant-camera). The film has one accent: do not add a second. Do not fade the payoff and do not freeze it.
check: sheet-tiles
judge: Does anything move in the last second?
prevents: judge1: static 1.1 s tail. judge2: 1.4 s static lockup. A logo slam with the wordmark held still 1.5 s was dropped from the doc rows for this reason.
status: active
scored: yes
numbers: {"tail_seconds":1,"tail_tiles_max":4}
print-check: end on motion in the last 1 s, not a frozen lockup
digest: Nothing static in the last 1 s: end on a small move on a part or the ground.
craft: failure-modes
---

## Example

The arch, wordmark and tagline land by 3.9 s; the ground keeps drifting to 5.0 s.

Why and sources: [failure-modes](../craft/failure-modes.md).
