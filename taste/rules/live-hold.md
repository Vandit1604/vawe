---
id: live-hold
step: motion
principle: A hold keeps life. A readable hold is good, and it carries a slow drift or push; a frozen frame is not a hold. A fast beat earns a still one, and the still keeps moving slowly.
limit: no whole-frame still longer than 0.5 s outside a declared hold
range: slow ease at both ends; 1 to 3 percent scale or 6 to 14 px position over the hold; a rest of 0.4 to 0.6 s after an element settles
break-when: a declared hold (dead-air waiver with a reason): the held wordmark that is the last beat
instead: add a second key at the end of the hold; do not fill every flat segment with drift (a uniform churn made the number move and the film worse). Do not drift data: a chart whose bars drift lies. Judge local motion (something arrives in a small region), not global motion.
check: static-window, sheet-tiles
judge: Is there a 0.5 s span where nothing moves and no hold is declared?
prevents: doc TASTE-RULES "stillness is powerful" met card "never static in the last 1 s". Measured: a reference film had a quietest window at 0.42 against a median of 1.33; a bad recreation had ten dead windows, one of 2.5 s.
status: active
scored: yes
numbers: {"still_limit_s":0.5,"drift_scale_pct_min":1,"drift_scale_pct_max":3,"rest_min_s":0.4,"rest_max_s":0.6}
print-preship: keep one thing moving in every hold, not a frozen frame
craft: motion-craft
---

## Example

The readable hold on the claim is 2 s, with a 2 percent push the whole time.

Why and sources: [motion-craft](../craft/motion-craft.md).
