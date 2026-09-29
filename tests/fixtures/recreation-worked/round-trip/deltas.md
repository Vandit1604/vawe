# Measured deltas: page.html vs reference.mp4

Every number below was measured with code, on the reference and on the page render by the same pixel code, so no line is one instrument disagreeing with another. They are settled facts; do not re-measure them by eye.
Judge taste, composition, hierarchy and brand. Look only at lines marked "confirm by eye".

## Page against reference (6 delta(s), worst first; frames at the page's 30 fps)

| axis | score | worst delta |
|---|---|---|
| timing | 13 | S1 element 1.6: lands f149, ref f95 -> 54 frames late | #1e2930 vs #0d171f (dE 9) | size 358x28 vs ref 262x30 |
| layout | 43 | S1 element 1.3: curve approach vs ref spring (k 213 d 19.4) | size 314x34 vs ref 80x27 |
| colour | 64 | S1 span.w: lands f23, ref f33 -> 10 frames early | spring k 2000 d 40 vs k 36 d 8.5 -> stiffer, more damped | overshoot x1.14 vs x1.00 | #ffffff vs #d1dbd8 (dE 14) |
| text | 86 | T2 "Simple systems always scale": stagger mixed vs ref right-to-left | "systems" 36 f off against the line's own offset |
| transitions | 100 | - |
| audio | 100 | - |

1. S1 element 1.6: lands f149, ref f95 -> 54 frames late | #1e2930 vs #0d171f (dE 9) | size 358x28 vs ref 262x30 [confirm by eye: ref f95, page f149, tests/fixtures/recreation-worked/round-trip/sheets/delta-1.png]
2. S1 span.w: lands f23, ref f33 -> 10 frames early | spring k 2000 d 40 vs k 36 d 8.5 -> stiffer, more damped | overshoot x1.14 vs x1.00 | #ffffff vs #d1dbd8 (dE 14) [confirm by eye: ref f33, page f23, tests/fixtures/recreation-worked/round-trip/sheets/delta-2.png]
3. S1 element 1.3: curve approach vs ref spring (k 213 d 19.4) | size 314x34 vs ref 80x27 [confirm by eye: ref f96, page f95, tests/fixtures/recreation-worked/round-trip/sheets/delta-3.png]
4. S1: ref moves something 216x36 px to (421, 64), f20-f30; no page move matches [confirm by eye: ref f30, page f30, tests/fixtures/recreation-worked/round-trip/sheets/delta-4.png]
5. S1 span.w: #ffffff vs #dfebe0 (dE 11) [confirm by eye: ref f66, page f66, tests/fixtures/recreation-worked/round-trip/sheets/delta-5.png]
6. T2 "Simple systems always scale": stagger mixed vs ref right-to-left | "systems" 36 f off against the line's own offset

## Page self-checks (1)

- `text-moves-before-hold`: S1 "Good ideas Good ideas" is still for 1.67s and needs 2.40s [f97 (3.23s)]. Fix: delay the exit to 5.63s, or start the text earlier.
