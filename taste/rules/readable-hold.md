---
id: readable-hold
step: look
principle: A line the viewer must read holds fully legible long enough to be read. When a hold is short, add hold time; never slow the move.
limit: no held frame under 1.2 s; short or non-prose text max(1.2 s, words / 3); prose (4 or more words) words x 0.6 s
range: one line holds at most about 5 s; past 8 words cut the line
break-when: text is a counter, an axis label, a chip, a credit or a watermark: looked at, not read
instead: add seconds before the exit, or give the beat a second thing to look at. The clock starts when the last character settles. Motion stays quick; exits still run shorter than entrances.
check: read-hold
judge: Count the legible tiles per line on the sheet: five or more at 4 fps?
prevents: feedback vawe-flow-2: "a little too fast", "still too fast", chose the 15 percent slower cut. doc readable-hold: "the fix is always a hold".
status: active
scored: yes
numbers: {"hold_floor_s":1.2,"prose_s_per_word":0.6,"short_words_per_s":3,"prose_min_words":4,"ceiling_s":5}
digest: Read lines: cap height 6 percent of the frame or more, held max(1.2 s, words / 3); prose words x 0.6 s. Add hold, never slow the move.
craft: reading
---

## Example

A 3 word line holds 1.2 s. A 10 word line holds 6 s, so cut it to 8 words or fewer.

Why and sources: [reading](../craft/reading.md).
