# recreation-worked: recreation guide

Reference: reference.mp4 (640x360, 30 fps, 5 s, 1 shots). Numbers are in SPEC.md and spec.json next to this file.
Private if the reference is: keep the folder out of git.

## Palette

| token | hex |
| --- | --- |
| --c1 | #0d171f |
| --c2 | #ffffff |
| --c3 | #dae2d9 |
| --c4 | #7d8889 |
| --c5 | #2e373d |
| --c6 | #d1dbd8 |

## Font candidates

The pixels do not name a font. The starter uses Geist; try PlusJakartaSans, Manrope, HankenGrotesk, ModernEra-Bold (assets/fonts). Match the word widths first: the builder fits each word to its measured width.

## Cuts

| # | at s | type | dir | frames |
| --- | --- | --- | --- | --- |

## Words by line

- L1 0.5 s (left-to-right, 166 ms): Good motion design travels
- L2 1.533 s (right-to-left, 200 ms): Simple systems always scale
- L3 3.033 s (all-at-once): Good ideas Good ideas

## The loop

1. `vawe dev page.html --from <s> --to <s>` for a draft of your seconds.
2. `vawe critique page.html --ref <ref.mp4>`: fix the worst delta first.
3. Judge taste and the look; the numbers are already measured.
