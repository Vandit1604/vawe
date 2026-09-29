# SPEC: page-render.mp4

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

### Line 1: "Good motion designtravels" (y 61 px, 0.5-4.9 s), stagger left-to-right, 233 ms between words

| # | word | t0 s | t0 f | t1 s | x | y | h |
|---|---|---|---|---|---|---|---|
| 1 | Good | 0.5 | 15 | 4.9 | 152 | 61 | 26 |
| 2 | motion | 0.7 | 21 | 4.9 | 254.8 | 60.8 | 25.5 |
| 3 | designtravels | 0.933 | 28 | 4.9 | 424 | 65.8 | 33.5 |

### Line 2: "Simple systems always always scale" (y 175.5 px, 1.567-4.9 s), stagger mixed, 492 ms between words

| # | word | t0 s | t0 f | t1 s | x | y | h |
|---|---|---|---|---|---|---|---|
| 1 | scale | 1.567 | 47 | 4.9 | 501.3 | 169.3 | 24.5 |
| 2 | always | 1.75 | 53 | 1.833 | 400.8 | 175.5 | 29 |
| 3 | Simple | 2.125 | 64 | 4.9 | 153 | 174.5 | 29 |
| 4 | always | 2.633 | 79 | 4.9 | 400.8 | 175.5 | 29 |
| 5 | systems | 3.125 | 94 | 4.9 | 276.5 | 176.5 | 27 |

### Line 3: "systerabvays" (y 176 px, 1.767-2.25 s), stagger single

| # | word | t0 s | t0 f | t1 s | x | y | h |
|---|---|---|---|---|---|---|---|
| 1 | systerabvays | 1.767 | 53 | 2.25 | 355.3 | 176 | 30 |

### Line 4: "Good ideas Good ideas" (y 277 px, 3.067-4.9 s), stagger all-at-once

| # | word | t0 s | t0 f | t1 s | x | y | h |
|---|---|---|---|---|---|---|---|
| 1 | Good | 3.067 | 92 | 4.9 | 185 | 277 | 26 |
| 2 | ideas | 3.067 | 92 | 4.9 | 276.8 | 276.8 | 25.5 |
| 3 | Good | 3.067 | 92 | 4.9 | 365 | 277 | 26 |
| 4 | ideas | 3.067 | 92 | 4.9 | 456.8 | 276.8 | 25.5 |

## On-screen text (every 0.25 s, whole film)

Every row must exist in the rebuild at its time. OCR spelling can be off; the timing and the line breaks are right.

| from s | to s | text (lines split by /) |
|---|---|---|
| 0.00 | 0.38 | (no text) |
| 0.50 | 0.63 | Good |
| 0.75 | 0.75 | Good motion |
| 0.88 | 0.88 | Good motiesign |
| 1.00 | 1.00 | Good motion desigravels |
| 1.13 | 1.50 | Good motion designtravels |
| 1.63 | 1.63 | Good motion designtravels / scale |
| 1.75 | 1.88 | Good motion designtravels / always scale |
| 2.00 | 2.00 | Good motion designtravels / systerabvays scale |
| 2.13 | 2.13 | Good motion designtravels / Simple systeralvays scale |
| 2.25 | 3.00 | Good motion designtravels / Simple systerabvays scale |
| 3.13 | 4.88 | Good motion designtravels / Simple systems always scale / Good ideas Good ideas |

## Shot 1: frames 0-149 (150 f, 5 s)

palette: #0b171e 94%, #ffffff 3%, #888d90 1%, #3e4850 1%, #adb3b5 1%
camera: zoom x1 (peak 0/f), pan 0,0 px (peak 0 px/f) (static, no table)

### E1.1: f16-32, (151,62) -> (241,66.4) px, size 108x29.9, 7 moving f, peak 149.6 px/f; overshoot x1.144; blur f16-31 dir radial min sharp 0
- easing bezier x1=0.98 y1=-0.26 x2=0.03 y2=1.89 durMs=121: rmse 4.23 px, r2 0.99, runner-up spring 7.67 px
- css (121 ms): cubic-bezier(0.98, -0.26, 0.03, 1.89)
- starts f19.02 (0.634 s); at rest (within 0.5 px) f22.64 (0.755 s), plus or minus 0.25 f; check by eye: f23

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 16 | 151 | 62 | 88 | 30 | 0 | 0 | 0.502 | radial |
| 17 | 152 | 60 | 86 | 29.9 | 0 | -2.1 | 0.766 |  |
| 18 | 151 | 60 | 84 | 26 | 0 | 0 | 0.91 |  |
| 19 | 151 | 60 | 80 | 26 | 0 | 0 | 0.97 |  |
| 20 | 151 | 60 | 80 | 26 | 0 | 0 | 0.973 |  |
| 21 | 254 | 63 | 110 | 28 | 0 | 76 | 0.511 | radial |
| 22 | 254 | 100 | 110 | 4 | 0 | 76 | 0 | radial |
| 23 | 241 | 66.5 | 108 | 26 | 0 | 0 | 0.879 |  |
| 24 | 254 | 60 | 106 | 26 | 0 | 0 | 0.895 |  |
| 25 | 254 | 60 | 106 | 26 | 0 | 0 | 0.899 |  |
| 26 | 241 | 66.5 | 104 | 32.9 | 0 | 1.1 | 0.726 | radial |
| 27 | 240.5 | 66.4 | 138 | 36 | 0 | 82 | 0.71 | radial |
| 28 | 241.1 | 66.6 | 140 | 36 | 0 | 82 | 0.713 | radial |
| 29 | 240.9 | 66.5 | 138 | 36 | 0 | 82 | 0.72 | radial |
| 30 | 241 | 66.5 | 188 | 40 | 0 | 83 | 0.669 | radial |
| 31 | 241 | 66.5 | 184 | 38 | 2 | -0.1 | 0.692 | radial |
| 32 | 241 | 66.4 | 140 | 30 | -130 | 74 | 0.811 |  |

### E1.2: f53-68, (400,174) -> (152,171) px, size 126x28, 3 moving f, peak 112.1 px/f; overshoot x1; blur f53-67 dir radial min sharp 0.457
- easing bezier x1=1 y1=0.92 x2=1 y2=0.18 durMs=614: rmse 17 px, r2 0.969, runner-up linear 39.45 px
- css (614 ms): cubic-bezier(1, 0.92, 1, 0.18)
- starts f47.57 (1.586 s); at rest (within 0.5 px) f66.07 (2.202 s), plus or minus 0.25 f; check by eye: f66

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 53 | 400 | 174 | 110 | 34 | -112.1 | 4.1 | 0.457 | radial |
| 54 | 400 | 174 | 106 | 30 | 0 | 0 | 0.714 | radial |
| 55 | 400 | 174 | 106 | 30 | 0 | 0 | 0.78 |  |
| 56 | 400 | 175 | 106 | 28 | 0 | 0 | 0.835 |  |
| 57 | 400 | 175 | 106 | 28 | 0 | 0 | 0.839 |  |
| 58 | 400 | 175 | 106 | 28 | 0 | 0 | 0.839 |  |
| 59 | 319 | 177 | 132 | 32 | 0 | 0 | 0.544 | radial |
| 60 | 320 | 177 | 130 | 28 | 0 | 0 | 0.753 |  |
| 61 | 320 | 177 | 130 | 28 | 0 | 0 | 0.803 |  |
| 62 | 320 | 176 | 126 | 26 | 0 | 0 | 0.871 |  |
| 63 | 320 | 176 | 126 | 26 | 0 | 0 | 0.875 |  |
| 64 | 320 | 176 | 126 | 26 | 0 | 0 | 0.876 |  |
| 65 | 320 | 176 | 126 | 26 | 0 | 0 | 0.876 |  |
| 66 | 157.9 | 171 | 130 | 34 | -20.7 | 0 | 0.556 | radial |
| 67 | 152 | 171 | 116 | 34 | -5.8 | 0 | 0.676 | radial |
| 68 | 152 | 171 | 106 | 24 | 0 | 0 | 0.971 |  |

### E1.3: f92-95, (342,278) -> (319,276.7) px, size 314x34, 1 moving f, peak 88.6 px/f; overshoot x1; blur f92-92 dir radial min sharp 0.591
- easing approach k=0.34: rmse 0.38 px, r2 0.664, runner-up bezier 0.29 px
- css (567 ms): linear(0, 0.162, 0.297, 0.411, 0.506, 0.586, 0.653, 0.709, 0.756, 0.796, 0.829, 0.857, 0.88, 0.899, 0.916, 0.929, 0.941, 0.95, 0.958, 0.965, 0.971, 0.975, 0.979, 0.983, 0.986, 0.988, 0.99, 0.991, 0.993, 0.994, 0.995, 0.996, 0.996, 0.997, 0.998, 0.998, 0.998, 0.999, 0.999, 0.999, 1)
- starts f82.23 (2.741 s); at rest (within 0.5 px) f94.73 (3.158 s), plus or minus 1.75 f; check by eye: f95

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 92 | 342 | 278 | 314 | 34 | 0 | -88.6 | 0.591 | radial |
| 93 | 343 | 278 | 312 | 34 | 0 | 0 | 0.821 |  |
| 94 | 342 | 278 | 314 | 30 | 0 | 0 | 0.97 |  |
| 95 | 319 | 276.7 | 360 | 31.4 | 0 | -0.6 | 1 |  |

### E1.4: f147-149, (321,65) -> (320,65) px, size 424x36, 2 moving f, peak 76.9 px/f; blur f148-149 dir radial min sharp 0.101

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 147 | 321 | 65 | 424 | 36 | 0 | 0 | 1 |  |
| 148 | 321 | 65 | 424 | 36 | 0 | 76.9 | 0.547 | radial |
| 149 | 320 | 65 | 426 | 36 | 0 | 75.6 | 0.101 | radial |

### E1.5: f147-149, (321,172) -> (321,173) px, size 444x36, 1 moving f, peak 24.5 px/f; blur f148-149 dir radial min sharp 0.094

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 147 | 321 | 172 | 444 | 34 | 0 | 0 | 1 |  |
| 148 | 321 | 173 | 444 | 36 | 0 | 0 | 0.521 | radial |
| 149 | 321 | 173 | 444 | 36 | 0 | -24.5 | 0.094 | radial |

### E1.6: f147-149, (320,276) -> (320,276) px, size 358x28, 1 moving f, peak 89.5 px/f; blur f148-149 dir radial min sharp 0.09

| f | x | y | w | h | vx | vy | sharp | blur |
|---|---|---|---|---|---|---|---|---|
| 147 | 320 | 276 | 358 | 26 | 0 | 0 | 1 |  |
| 148 | 320 | 277 | 358 | 28 | 0 | 0 | 0.511 | radial |
| 149 | 320 | 276 | 358 | 30 | 0 | -89.5 | 0.09 | radial |

text: "Good" f15-147 box 26 px (font ~34.7 px); "motion" f21-147 box 25.5 px (font ~34 px); "designtravels" f28-147 box 33.5 px (font ~34.9 px); "scale" f47-147 box 24.5 px (font ~32.7 px); "always" f53-55 box 29 px (font ~30.2 px); "systerabvays" f53-68 box 30 px (font ~31.3 px); "Simple" f64-147 box 29 px (font ~30.2 px); "Good" f92-147 box 26 px (font ~34.7 px); "systems" f94-147 box 27 px (font ~28.1 px); "ideas" f92-147 box 25.5 px (font ~34 px); "Good" f92-147 box 26 px (font ~34.7 px); "always" f79-147 box 29 px (font ~30.2 px); "ideas" f92-147 box 25.5 px (font ~34 px)

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

