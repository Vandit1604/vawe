---
id: readable-text-size
step: look
principle: A line the viewer must read has a cap height of at least 6 percent of the frame height (about 65 px at 1080p).
limit: cap height at least 6 percent of frame height; product UI labels shown as texture (data-chrome) at least 2.5 percent
range: none
break-when: text is texture: aria-hidden or data-chrome text that is also texture by measure (cap height under 2 percent of the frame, the same words 3 or more times on the page, or a data-texture="reason" of 12 characters or more)
instead: raise the font size until the cap height passes; do not shrink the line to fit more words, and do not hide a line from the check with aria-hidden or data-chrome: a hidden text that reads as copy is checked as copy.
check: text-cap-height
judge: Measure the cap-height band in one full frame: is it at least 6 percent?
prevents: judge1: 50 px tagline, fix 64 to 72 px. judge2: "about 4% of frame height".
status: active
scored: yes
numbers: {"cap_height_pct":6,"chrome_cap_height_pct":2.5,"held_min_s":0.5,"texture_cap_pct_max":2,"texture_repeats_min":3,"texture_reason_min_chars":12,"texture_share_max_pct":50}
print-frames: set a read line at a 6% cap height and hold it max(1.2 s, words/3), not a small tagline that flashes by
craft: reading
---

## Example

At 1080p a 6 percent cap height is about 65 px, a font near 93 px.

Why and sources: [reading](../craft/reading.md).
