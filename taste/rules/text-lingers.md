---
id: text-lingers
step: look
principle: A line stays long enough to read and no longer. A line that outstays its read time makes the beat feel stuck.
limit: a line on screen at most max(2.8 s, its read time + 1.5 s)
range: reference films hold a word on screen 0.7 to 2.8 s (p10 to p90); a line past its read time by 1.5 s is idle
break-when: the end card (rule cta-last-short asks 3 to 5 s); a line on screen at the last sample is not measured
instead: cut the line when its read time plus 1.5 s has passed, or give the held seconds a second thing to look at.
check: text-lingers
judge: Is any line still on screen well after it has been read?
prevents: measured: 22 reference films, harness/dev/bar-from-refs.mjs. The references hold a word 2.8 s or less at p90; two of our films held a word 3 to 4 s.
status: active
scored: no
numbers: {"hold_ref_p90_s":2.8,"read_margin_s":1.5}
print-storyboard: take a line off screen when it is read plus 1.5 s, not hold it for the beat
craft: reading
---

## Example

A 3 word line needs 1.2 s and may stay 2.8 s. A 10 word line needs 6 s and may stay 7.5 s.

Draft check: The draft check reads each line's time on screen from the text samples (words of one element that show together are one line). It never conflicts with readable-hold (a lower bound: 0.9 times the read time) or with the world limit (read time + 0.8 s): a line that passes both fits under this ceiling.
