---
id: live-hold
step: motion
principle: A hold keeps life through a part that moves inside the frame: a line typing, a counter, a glint, a secondary action. A readable hold is good; a frozen frame is not a hold. A camera drift or push does not count, the camera holds still by default.
limit: no span longer than 0.5 s outside a declared hold where no part of the frame moves by itself (a whole-frame move does not count)
range: an element move with slow ease at both ends; a rest of 0.4 to 0.6 s after an element settles
break-when: a declared hold (static-window@a-b waiver with a reason): the held wordmark that is the last beat
instead: give the hold an element motion: type a line, tick a counter, pass a glint, start a secondary action, add a second key at the end of the hold. Do not fill the hold with a camera drift, push or pan, a scale or translate on a world or stage root, or parallax on the whole ground: the check leaves those out and constant-camera names a camera that never rests. Do not drift data: a chart whose bars drift lies. Judge local motion (something arrives in a small region), not global motion.
check: static-window, sheet-tiles
judge: Is there a 0.5 s span where nothing moves and no hold is declared?
prevents: doc TASTE-RULES "stillness is powerful" met card "never static in the last 1 s". Measured: a reference film had a quietest window at 0.42 against a median of 1.33; a bad recreation had ten dead windows, one of 2.5 s.
status: active
scored: yes
numbers: {"still_limit_s":0.5,"rest_min_s":0.4,"rest_max_s":0.6}
print-motion: keep one part moving in every hold (typing, a counter, a glint), not a frozen frame and not a camera drift
craft: motion-craft
---

## Example

The readable hold on the claim is 2 s: the figure counts up from 0.4 s, then a glint crosses the card, and the camera rests.

Why and sources: [motion-craft](../craft/motion-craft.md).

Draft check: pixels change under a camera drift, so the pixel check alone cannot tell it from life. The draft check reads the page's animations (harness/lib/camera-moves.mjs): a whole-frame transform (camera(), or a scale, translate or rotate on an element that covers 60 percent of the frame, for 0.6 s or more) is left out, and the seconds where only such a move runs count as still. A page that paints in window.seek or on a canvas has no animations to read, so only the pixels decide there.
