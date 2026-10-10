---
id: moving-tail
step: finish
principle: The film keeps moving to the last frame: the last second carries a move on a part of the held lockup (a caret, a value that ticks, a highlight that moves on) or one last arrival. A wordmark may land and hold, but something on it still moves.
limit: no static frame in the last 1 s; at most 4 near-identical tail tiles, unless an animation runs on a visible part (not the camera or a whole-frame transform) through the last 1 s on the sheet
range: a move on a part through the last second, or one last arrival in it
break-when: a declared hold on the final lockup (dead-air waiver with a reason)
instead: give one part of the held lockup its own last key (a caret blinks, a value ticks, a highlight moves to the next item), or time one last arrival into the final second. A camera push or a drift on the ground is not a part move (constant-camera). The film has one accent: do not add a second. Do not fade the payoff and do not freeze it.
check: sheet-tiles
judge: Does anything move in the last second?
prevents: judge1: static 1.1 s tail. judge2: 1.4 s static lockup. A logo slam with the wordmark held still 1.5 s was dropped from the doc rows for this reason.
status: active
scored: yes
numbers: {"tail_seconds":1,"tail_tiles_max":4}
print-check: end on motion in the last 1 s, not a frozen lockup
digest: Nothing static in the last 1 s: a part of the lockup moves (not the camera).
craft: failure-modes
---

## Example

The arch, wordmark and tagline land by 3.9 s; the tagline's last word lands at 4.4 s and a highlight crosses the wordmark to 5.0 s.

Why and sources: [failure-modes](../craft/failure-modes.md).
