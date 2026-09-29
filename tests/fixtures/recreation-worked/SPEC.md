# SPEC: reference.mp4

640x360 · 30 fps native, analysed at 30 fps · 150 frames · 5 s · 1 shots
Measured by harness/media/ref-spec.mjs. Frames are 0-based. Positions are element centres in reference px. `x`/`y` and sizes are measured, never eyeballed;
camera pan is how far the content moves (positive = right/down), zoom above 1 = push in. Element numbers are the change region between frames, tracked after camera compensation.

## KEEP / CHANGE (edit this before rebuilding)

KEEP (copy from the numbers below, frame for frame): timing, cuts, camera, easing, positions, blur, transitions.
CHANGE (make your own): brand, logo, colours, fonts, copy, product screens, faces, platform UI.

Add or remove items per film. A KEEP item is checked with `bin/vawe critique <page.html> --ref <ref.mp4>`.

## Cuts

| # | type | dir | frames | at frames | conf | evidence | audio hit lead f | beat lead f |
|---|---|---|---|---|---|---|---|---|


frames = steps the change takes (a hard cut is 1; a 6-frame crossfade is 6). at frames = first changed frame to first fully new frame. The shot cut point in spec.json is the last of them.
lead = frames the sound comes before the cut (positive), within 0.3 s.

## Audio

no audio stream.

## Words by line (reveal order)

One row per appearance of a word, so a repeated word keeps every appearance. t0 is the first frame the word shows (pixels, plus or minus 1 frame); x, y are the box centre and h the box height AT REST, in reference px.

### Line 1: "Good motion design travels" (y 61.5 px, 0.5-4.875 s), stagger left-to-right, 166 ms between words

| # | word | t0 s | t0 f | t1 s | x | y | h |
|---|---|---|---|---|---|---|---|
| 1 | Good | 0.5 | 15 | 4.875 | 152 | 61.3 | 25.5 |
| 2 | motion | 0.667 | 20 | 4.875 | 254.5 | 61.5 | 25 |
| 3 | design | 0.833 | 25 | 4.875 | 367 | 64.5 | 31 |
| 4 | travels | 0.967 | 29 | 4.875 | 477.8 | 61.5 | 25 |

### Line 2: "Simple systems always scale" (y 172.5 px, 1.533-4.875 s), stagger right-to-left, 200 ms between words

| # | word | t0 s | t0 f | t1 s | x | y | h |
|---|---|---|---|---|---|---|---|
| 1 | scale | 1.533 | 46 | 4.875 | 501 | 169.5 | 25 |
| 2 | always | 1.733 | 52 | 4.875 | 400.5 | 172.5 | 31 |
| 3 | systems | 1.933 | 58 | 4.875 | 276 | 173.3 | 29.5 |
| 4 | Simple | 2.133 | 64 | 4.875 | 152.3 | 172.3 | 31.5 |

### Line 3: "Good ideas Good ideas" (y 277.5 px, 3.033-4.875 s), stagger all-at-once

| # | word | t0 s | t0 f | t1 s | x | y | h |
|---|---|---|---|---|---|---|---|
| 1 | Good | 3.033 | 91 | 4.875 | 185 | 277.3 | 25.5 |
| 2 | ideas | 3.033 | 91 | 4.875 | 276 | 277.5 | 25 |
| 3 | Good | 3.033 | 91 | 4.875 | 365 | 277.3 | 25.5 |
| 4 | ideas | 3.033 | 91 | 4.875 | 456 | 277.5 | 25 |

## On-screen text (every 0.25 s, whole film)

Every row must exist in the rebuild at its time. OCR spelling can be off; the timing and the line breaks are right.

| from s | to s | text (lines split by /) |
|---|---|---|
| 0.00 | 0.38 | (no text) |
| 0.50 | 0.63 | Good |
| 0.75 | 0.75 | Good motion |
| 0.88 | 1.00 | Good motion design |
| 1.13 | 1.50 | Good motion design travels |
| 1.63 | 1.63 | Good motion design travels / scale |
| 1.75 | 1.88 | Good motion design travels / always scale |
| 2.00 | 2.13 | Good motion design travels / systems always scale |
| 2.25 | 3.00 | Good motion design travels / Simple systems always scale |
| 3.13 | 4.88 | Good motion design travels / Simple systems always scale / Good ideas Good ideas |

## Shot 1: frames 0-149 (150 f, 5 s)

palette: #0d171f 95%, #ffffff 2%, #7d8889 1%, #dae2d9 1%, #2e373d 1%
camera: zoom x1 (peak 0/f), pan 0,0 px (peak 0 px/f) (static, no table)

### E1.1: f16-34, (151,66) -> (475.9,63) px, size 104x27.9, 7 moving f, peak 145.4 px/f; overshoot x1; blur f16-33 dir radial min sharp 0
- easing linear durMs=421: rmse 22.15 px, r2 0.972, runner-up bezier 21.31 px
- css (421 ms): linear
- starts f19.96 (0.665 s); at rest (within 0.5 px) f32.58 (1.086 s), plus or minus 1 f; check by eye: f33
- shutter 0 deg, plus or minus 9 (4 moving f)

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 16 | 151 | 66 | 84 | 26 | 0 | 0 | 0.166 | radial |
| 17 | 151 | 64.4 | 84 | 26.8 | 0 | -1.2 | 0.336 | radial |
| 18 | 151 | 64.4 | 84 | 26.9 | 0 | -1.1 | 0.515 | radial |
| 19 | 151 | 61 | 84 | 27.9 | 0 | -2.1 | 0.673 | radial |
| 20 | 151 | 61 | 84 | 27.9 | 0 | 0 | 0.841 |  |
| 21 | 151 | 61 | 84 | 27.9 | 0 | 0 | 1 |  |
| 22 | 254 | 65 | 106 | 28 | 0 | 78 | 0.375 | radial |
| 23 | 254 | 102 | 106 | 4 | 0 | 76 | 0 | radial |
| 24 | 254 | 100 | 106 | 4 | 0 | 76 | 0 | radial |
| 25 | 254 | 100 | 106 | 4 | 0 | 0 | 0 | radial |
| 26 | 254 | 100 | 106 | 4 | 0 | 0 | 0 | radial |
| 27 | 366 | 67.5 | 101.9 | 33.1 | 0.1 | -0.9 | 0.435 | radial |
| 28 | 365 | 66 | 104 | 38 | 0 | 82 | 0.499 | radial |
| 29 | 365 | 66 | 104 | 38 | 0 | 0 | 0.619 | radial |
| 30 | 365 | 66 | 104 | 38 | 0 | 0 | 0.742 | radial |
| 31 | 476 | 66 | 104 | 28 | 0 | 78 | 0.37 | radial |
| 32 | 476 | 64.9 | 106 | 30 | -123.9 | 76 | 0.477 | radial |
| 33 | 476 | 64 | 106 | 30 | 0 | 0 | 0.625 | radial |
| 34 | 475.9 | 63 | 106 | 30 | 0 | 76 | 0.764 |  |

### E1.2: f20-30, (208,64) -> (421.3,64) px, size 216x36, 4 moving f, peak 80 px/f; overshoot x1; blur f20-30 dir radial min sharp 0.522
- easing linear durMs=231: rmse 23.49 px, r2 0.923, runner-up bezier 21.27 px
- css (231 ms): linear
- starts f23.14 (0.771 s); at rest (within 0.5 px) f30.14 (1.005 s), plus or minus 0.75 f; check by eye: f30

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 20 | 208 | 64 | 198 | 34 | 0 | 78 | 0.522 | radial |
| 21 | 208 | 63 | 198 | 36 | 0 | 78 | 0.687 | radial |
| 22 | 208 | 63 | 198 | 36 | 0 | 0 | 0.792 |  |
| 23 | 208 | 63 | 198 | 36 | 0 | 0 | 0.889 |  |
| 24 | 208 | 63 | 198 | 36 | 0 | 0 | 1 |  |
| 25 | 310 | 64.9 | 216 | 38 | 0 | 77.5 | 0.588 | radial |
| 26 | 309 | 65.5 | 216 | 40.9 | 0 | -1.1 | 0.699 | radial |
| 27 | 309 | 65.5 | 216 | 40.9 | 0 | 0 | 0.792 |  |
| 28 | 309 | 65.5 | 216 | 40.9 | 0 | 0 | 0.883 |  |
| 29 | 421 | 65 | 216 | 36 | 0 | -1.1 | 0.535 | radial |
| 30 | 421.3 | 64 | 216 | 36 | 0 | 80 | 0.724 | radial |

### E1.3: f46-69, (500,174) -> (151,171.5) px, size 106x32, 20 moving f, peak 2 px/f; overshoot x1; blur f46-67 dir radial min sharp 0.164
- easing linear durMs=559: rmse 26.83 px, r2 0.96, runner-up bezier 26.3 px
- css (559 ms): linear
- starts f49.5 (1.65 s); at rest (within 0.5 px) f66.25 (2.208 s), plus or minus 1.25 f; check by eye: f66
- shutter 0 deg, plus or minus 9 (3 moving f)

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 46 | 500 | 174 | 82 | 26 | 0 | 0 | 0.18 | radial |
| 47 | 500 | 174 | 82 | 26 | 0.1 | -1.2 | 0.365 | radial |
| 48 | 500 | 172.5 | 82 | 26.9 | 0 | -1.1 | 0.561 | radial |
| 49 | 500 | 170 | 82 | 30 | 0 | -2 | 0.712 | radial |
| 50 | 500 | 170 | 82 | 30 | -0.1 | -1.1 | 0.823 |  |
| 51 | 487.9 | 171.5 | 82 | 31 | 0 | -1 | 0.848 |  |
| 52 | 400 | 177 | 106 | 32 | 0 | 0 | 0.164 | radial |
| 53 | 400 | 177 | 106 | 32 | 0 | -0.9 | 0.327 | radial |
| 54 | 400 | 175.5 | 106 | 33 | 0 | -1 | 0.498 | radial |
| 55 | 399 | 172 | 108 | 34 | 0 | -2 | 0.655 | radial |
| 56 | 400 | 172.5 | 106 | 34.9 | 0 | -1.1 | 0.779 |  |
| 57 | 399 | 171.5 | 108 | 37 | 0 | -1 | 0.888 |  |
| 58 | 275 | 178 | 128 | 30 | 0 | 0 | 0.174 | radial |
| 59 | 275 | 176.4 | 128 | 30.8 | 0 | -1.2 | 0.356 | radial |
| 60 | 275 | 176.5 | 127.9 | 31 | 0.1 | -1 | 0.525 | radial |
| 61 | 276 | 175 | 130 | 32 | 0 | -2 | 0.667 | radial |
| 62 | 275.9 | 173.5 | 129.9 | 32.9 | -0.1 | -1.1 | 0.828 |  |
| 63 | 276 | 173.5 | 130 | 33.1 | 0 | -0.9 | 0.984 |  |
| 64 | 152 | 177 | 106 | 32 | 0 | 0 | 0.179 | radial |
| 65 | 152 | 175 | 106 | 32 | 0 | -1.2 | 0.351 | radial |
| 66 | 151 | 175.5 | 105.9 | 32.9 | -0.1 | -1.1 | 0.525 | radial |
| 67 | 151 | 173.5 | 108 | 34 | 0 | -2 | 0.67 | radial |
| 68 | 151 | 172.5 | 107.9 | 34.9 | -0.1 | -1.1 | 0.829 |  |
| 69 | 151 | 171.5 | 108 | 37 | 0 | -1 | 0.949 |  |

### E1.4: f91-93, (320,282) -> (320,280.5) px, size 170x26.8, 1 moving f, peak 88 px/f; overshoot x1; blur f91-92 dir radial min sharp 0.33
- easing approach k=0.369: rmse 0.6 px, r2 0.783, runner-up bezier 0.35 px
- css (533 ms): linear(0, 0.168, 0.308, 0.424, 0.521, 0.601, 0.668, 0.724, 0.77, 0.809, 0.841, 0.868, 0.89, 0.908, 0.924, 0.937, 0.947, 0.956, 0.964, 0.97, 0.975, 0.979, 0.983, 0.985, 0.988, 0.99, 0.992, 0.993, 0.994, 0.995, 0.996, 0.997, 0.997, 0.998, 0.998, 0.998, 0.999, 0.999, 0.999, 0.999, 1)
- starts f84.01 (2.8 s); at rest (within 0.5 px) f95.38 (3.179 s), plus or minus 0.75 f; check by eye: f95

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 91 | 320 | 282 | 170 | 26 | 0 | -88 | 0.33 | radial |
| 92 | 320 | 281.5 | 170 | 26.8 | 0 | -1.2 | 0.664 | radial |
| 93 | 320 | 280.5 | 170 | 27 | 0 | -1 | 1 |  |

### E1.5: f91-96, (455,282) -> (456,276.5) px, size 80x27, 4 moving f, peak 1.2 px/f; overshoot x1; blur f91-94 dir radial min sharp 0.185
- easing linear durMs=169: rmse 0.31 px, r2 0.976, runner-up bezier 0.3 px
- css (169 ms): linear
- starts f90.96 (3.032 s); at rest (within 0.5 px) f95.59 (3.186 s), plus or minus 1 f; check by eye: f96

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 91 | 455 | 282 | 80 | 26 | 0 | 0 | 0.185 | radial |
| 92 | 455 | 280.4 | 79.9 | 26.8 | 0.1 | -1.2 | 0.372 | radial |
| 93 | 456.1 | 280.5 | 79.9 | 27 | 0.1 | -1 | 0.56 | radial |
| 94 | 456.1 | 278.5 | 79.9 | 27 | 0 | 0 | 0.75 | radial |
| 95 | 456 | 277.6 | 82 | 28.9 | 0 | -1.1 | 0.884 |  |
| 96 | 456 | 276.5 | 82 | 31 | 0 | -1 | 1 |  |

### E1.6: f94-96, (319,278) -> (274,276.5) px, size 262x30, 3 moving f, peak 2 px/f; overshoot x1; blur f94-94 dir radial min sharp 0.656
- easing bezier x1=1 y1=-0.55 x2=0.06 y2=1 durMs=67: rmse 0 px, r2 1, runner-up spring 5.03 px
- css (67 ms): cubic-bezier(1, -0.55, 0.06, 1)
- starts f93.02 (3.101 s); at rest (within 0.5 px) f94.77 (3.159 s), plus or minus 0.25 f; check by eye: f95

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 94 | 319 | 278 | 356 | 30 | 0 | -2 | 0.656 | radial |
| 95 | 274 | 277.5 | 262 | 30 | 0 | -1.2 | 0.84 |  |
| 96 | 274 | 276.5 | 262 | 31 | 0 | -1 | 1 |  |

layout at f149, boxes as fractions of the frame (plus or minus 0.007):0: x 0.156 y 0.433 w 0.691 h 0.089; 1: x 0.172 y 0.133 w 0.656 h 0.089; 2: x 0.225 y 0.733 w 0.55 h 0.072
alignment (edge at, boxes): centre 0.501 [1,2,0]
margins to the frame: left 15.6%, right 15.3%, top 13.3%, bottom 19.5%

text: "Good" f15-146 box 25.5 px (font ~34 px); "motion" f20-146 box 25 px (font ~33.3 px); "design" f25-146 box 31 px (font ~32.3 px); "travels" f29-146 box 25 px (font ~33.3 px); "scale" f46-146 box 25 px (font ~33.3 px); "always" f52-146 box 31 px (font ~32.3 px); "systems" f58-146 box 29.5 px (font ~30.7 px); "Simple" f64-146 box 31.5 px (font ~32.8 px); "Good" f91-146 box 25.5 px (font ~34 px); "ideas" f91-146 box 25 px (font ~33.3 px); "Good" f91-146 box 25.5 px (font ~34 px); "ideas" f91-146 box 25 px (font ~33.3 px)

## Measurement error

Calibrated 2026-09-29 against pages with known truth (tests/fixtures/ref-measure). Ms is milliseconds, Frac a share of the frame or size, DE a colour distance. bias is the median signed error.

| measure | p50 | p90 | bias | must detect | verdict |
|---|---|---|---|---|---|
| attackMs | 0 | 1 | 0 | 40 | trust |
| layoutFrac | 0.004 | 0.007 | 0.004 | 0.02 | trust |
| paletteDE | 0.898 | 0.909 | 0.898 | 6 | trust |
| posFrac | 0.003 | 0.004 | 0.003 | 0.03 | trust |
| sizeFrac | 0.011 | 0.045 | 0.011 | 0.1 | trust |
| startMs | 0 | 8 | 0 | 33.333 | trust |
| landMsTail | 11 | 304 | 6 | 33.333 | check by eye |
| overshoot | 0 | 0.001 | 0 | 0.02 | trust |
| landMs | 1 | 14 | 1 | 33.333 | trust |
| wordT0Ms | 17 | 33 | 17 | 33.333 | trust |
| textSizeFrac | 0.029 | 0.049 | 0.029 | 0.12 | trust |
| textPosFrac | 0.003 | 0.01 | 0.003 | 0.03 | trust |
| cutMs | 0 | 17 | 0 | 33.333 | trust |
| sizeFracBlur | 0.011 | 0.011 | 0.011 | 0.1 | trust |

