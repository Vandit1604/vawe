---
id: overshoot-share
step: motion
principle: Some arrivals land with a spring: the value goes past rest and returns. A film where none do reads stiff.
limit: 21 to 61 percent of the arrivals that move overshoot
range: reference films overshoot 21 to 41 percent of their arrivals (p10 to p90)
break-when: the film has one deliberate stiff register (a terminal, a ticker) the brief names
instead: give about 1 in 3 arrivals a spring: EASE.pop, or curveToLinear(CURVES.overshoot) from core/motion/springs.js. Land the rest on EASE.land.
check: overshoot-share
judge: Does any arrival settle past its rest position and return? Do all of them?
prevents: measured: 22 reference films, harness/dev/bar-from-refs.mjs. The references overshoot 21 to 41 percent of arrivals; our films 0 to 11 percent.
status: active
scored: no
numbers: {"share_min_pct":21,"share_max_pct":61,"arrivals_min":6,"tolerance":0.01,"min_travel_px":4,"past_share":0.03,"past_px_min":1}
print-motion: land about 1 in 3 arrivals with a spring (EASE.pop), not every arrival on one soft stop
craft: motion-craft
---

## Example

Of nine card arrivals, three use EASE.pop and six use EASE.land.

Draft check: The draft check reads the easing of each element's entering moves from its animations (a fade alone cannot overshoot, and a curve it cannot read is not counted). A page that paints in window.seek has no animations to read: its arrivals are read from element boxes (a move that starts faded out and ends faded in, past its end by 3 percent of its length or 1 px). It needs 6 arrivals. Under the range or over 61 percent (1.5 times the reference p90) it gives advice.
