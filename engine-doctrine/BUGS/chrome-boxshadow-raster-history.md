---
when: "two renders of the same film disagree on a handful of frames and nothing in our code explains it"
answers: "the reduced case for an upstream Chrome raster bug: what splits two tabs, what does not, and what is still needed to make it minimal"
group: engine
---

# Chrome: a blurred `box-shadow` rasterises differently depending on the tab's paint history

Status: **reduced, not yet minimal. NOT filed anywhere.** File it upstream only after the last step
below is done, because a report that needs a whole motion-graphics engine to reproduce will be closed.

Chrome version measured: whatever `CHROME_BIN` resolves to on this machine, headless, macOS 15.6 on an
Apple M4. `renderer/internal/scene.allocOpts` is the flag set; `TestGLRenderer` in that package prints the
renderer string, which is `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)` with canvas, compositing and
rasterisation all hardware accelerated.

## What Chrome does that it should not

Two tabs of the SAME browser are driven to the SAME frame through DIFFERENT earlier frames. Their DOM
at the moment of the screenshot is identical: 118 lines of rects to six decimal places, computed
transform, filter, font, letter-spacing and text, compared line for line, `filter: none` on both. The
screenshots differ on 695 of 2,073,600 pixels, max channel delta 10, inside the box
`876,450..1055,633`, which is exactly the disc that one fragment draws.

So the display list is the same and the raster is not, and the only input that separates the two tabs
is what was painted into that tab before.

## Reproduce it as it stands today

From the repo root, with the engine's own instrument:

```
go run ./harness/dev/tabprobe -root . -data /formats/scene/higgsfield-recreation.json \
  -tabs 2 -frame 114 -pre 0,6,12,18,24,30,36,42,48,54,60,66,72,78,84,90,96,102,108 -pre1 0-113
tab 0  sha=b76078e918fa84091d61b1fcd39e7dff80a69c8551880a73164478eeb222867d  bytes=97038
tab 1  sha=1b75eecba8698bb04aa76849ed449e0950c03257c19fbf87919d1871902952e1  bytes=97026
```

`-pre` is tab 0's paint history (every sixth frame, what worker 5 of a six-worker render drew) and
`-pre1` is tab 1's (every frame, what a one-worker render drew). Both end on frame 114. Those two
hashes are the same ones `engine-doctrine/MISTAKES.md` #531 recorded, so this reproduces unchanged.

## The reduction, and what each step proved

Every row is the same command against a one-layer scene derived from `higgsfield-recreation`, and
"splits" means the two tabs returned different hashes.

| scene | change | result |
|---|---|---|
| `_shadowmin` | only the `btn` layer survives, 1 of 8 | splits |
| `_sm_noblur` | `motionBlur` removed | splits |
| `_sm_novars` | the CSS custom properties driving width and radius removed | splits |
| `_sm_noshadow` | `box-shadow` removed | **converges** |
| `_sm_nomotion` | the `motion` track removed, so the element never travels | **converges** |
| `_sm_bare` | motion track and shadow only: a fixed-size solid disc, no vars, no anim, no blur | splits |

So the condition is TWO things together, and neither alone: **a blurred `box-shadow`, on an element
that MOVES to sub-pixel positions under a sub-pixel scale.** #531 had already shown the fragment's
gradient, its border-radius and its changing size are all irrelevant.

The derived scenes are `_`-prefixed scratch and gitignored; `harness/dev/tabprobe` plus the table above
regenerates any of them in one `node -e`.

## Where it stops, honestly

`chrome-boxshadow-raster-history.html` beside this file is the standalone strip: one wrapper element
at the same sub-pixel left, the same uniform scale and the same shadow, over a full-screen 2D canvas,
shimmed so the same `tabprobe` command drives it.

```
go run ./harness/dev/tabprobe -tabs 2 -frame 114 \
  -url "file://$PWD/engine-doctrine/BUGS/chrome-boxshadow-raster-history.html" \
  -pre 0,6,12,18,24,30,36,42,48,54,60,66,72,78,84,90,96,102,108 -pre1 0-113
```

**It does not split.** Three shapes were tried and all three converge: a scale-only history, a
sub-pixel left plus scale, and the same with a full-screen canvas behind it. Something the engine page
still has and this page does not is part of the trigger, and it has not been found. Naming it is the
remaining work, and it is the whole difference between a report a Chromium triager can run and one
they cannot.

The next things to carry across, cheapest first: the stage's own stacking context and its second
canvas, the layer wrapper's `will-change` and `contain` (both were removed from the engine but the
stage may still carry one), the exact left and scale per frame read off the real page rather than
interpolated, and the viewport resize `tabprobe` performs between load and shot.

## What is NOT worth trying again

Recorded so the next person does not re-spend the runs. Against the repro at the top, none of these
changes it: `num-raster-threads=1`, `disable-composited-antialiasing`, `disable-gpu`,
`disable-gpu-rasterization`, `disable-low-res-tiling`, `default-tile-width/height=4096`,
`skia-resource-cache-limit-mb=0`, `deterministic-mode`. `disable-threaded-compositing` hangs the
capture and `force-gpu-mem-available-mb=1` only agrees because it breaks the page.

Note the third one on that list: `disable-gpu-rasterization` is what `renderer/internal/scene/scene.go` now
sets, and it fixes a DIFFERENT defect (`engine-doctrine/MISTAKES.md` #552, the supersampled raster). This one
survives it, which is the evidence that they are two bugs and not one.
