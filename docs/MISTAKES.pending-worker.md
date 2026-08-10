---
when: you are asked whether two renders of the same scene produce the same picture, or you hit a frame with content missing
answers: "why a 4-worker render damaged 4x as many frames as a 1-worker one; the deferred-image-decode race and its fix; what is still open"
group: engine
---

# Pending mistakes — capture determinism across workers

Written on the `wt-worker-variance` branch, to be folded into `docs/MISTAKES.md` by whoever merges it.
It continues #258, which measured the difference between two renders of `brew-launch` and left the
gap between 373 (one worker) and 1078 (four workers) undiagnosed.

## #261 — Chrome painted a blank placeholder where a captured component's images should be, and the screenshot kept it

**What.** Two 4-worker renders of `formats/scene/brew-launch.json`, identical code, differed on **925
of 1890 frames**. Not by a rounding error: the median differing frame moved **0.37% of its pixels**,
the worst moved **17.0%** with a **max channel delta of 189**, and what was different was **whole
product screenshots present in one render and absent in the other**. #258 called this class "rasteriser
antialiasing on a border radius, 0.001% to 0.007% of pixels, invisible". For the 4-worker gap that was
wrong. It is missing content, and it ships in the mp4.

**How it was found, and it was one crop again.** `scripts/dev/framediff` ranked the differing frames
by pixel count and wrote the worst four as stacked crops of the same region from both runs. Frame 856
showed three feature cards, each with a product screenshot, in run A; in run B two of the three cards
had lost their screenshot entirely while keeping their heading and body copy. Nothing else needed
arguing after that. This is the second time in two days that one crop settled what three rounds of
reasoning about frame indices could not.

**Root cause.** Chrome defers image decoding off the raster thread ("checker imaging") and paints a
blank placeholder until the decode lands, and the compositor may draw a frame before every stage has
finished. Neither is visible to anything the capture can ask:

- `renderFrame(n)` has returned.
- The double `requestAnimationFrame` has fired.
- `document.images` all report `complete && naturalWidth > 0`. An audit added for this, printing every
  frame where any image was not ready, printed **nothing** across a whole render while the render was
  still dropping screenshots.

So the capture had no signal at all, and simply screenshotted the placeholder.

**Why four workers cost four times as much.** The failure is a race against wall time, and every worker
browser runs it independently. Measured on the entrance of a three-card beat, sampling the mean
luminance of one card's region per frame:

```
frame  worker  Y      frame  worker  Y
853    w1      13     853    w3      13     <- card region empty
854    w3      14     854    w1      14
855    w0      15     855    w3      76     <- correct
856    w1      94     856    w0      14
857    w2      14     857    w2      14
858    w3     126     858    w1     126
      run A                    run B
```

The correct curve is 36, 57, 76, 94, 111, 126. In both runs each worker's **first** frame in the
entrance window is blank and its later frames are right, so four workers lose four frames and one
worker loses one. That is the whole 373-to-1078 gap: the same defect, paid once per browser.

**What did not fix it, and it is worth knowing.**

- **A warm sweep.** Every worker ran `renderFrame(f)` over the entire timeline before capturing, so no
  layer could be seen for the first time during a kept frame. The blank frames stayed. The defect is
  not first attach; it is raster.
- **Waiting longer.** Running `renderFrame` + a double rAF twice before the screenshot turned "always
  blank on first visit" into "sometimes blank on first visit". It moves the odds. It cannot close a
  race.

**Fix.** Two Chrome flags in `allocOpts`, `internal/scene/scene.go`:

```go
chromedp.Flag("disable-checker-imaging", true),
chromedp.Flag("run-all-compositor-stages-before-draw", true),
```

The entrance window then produces the exact ramp 36, 57, 76, 94, 111, 126 with no holes, and the
whole-render difference between two renders falls from **925 differing frames to 250**, worst case
from **17.0% of pixels to 1.8%**. Measured cost: none. Two timed renders, 76s with the flags against
84s without, on a loaded machine; the flags are not the expensive part of a capture.

**Which gate catches it.** None, and that is honest rather than fixed. `make probe` compares the DOM
and stays green through all of this, because the DOM was always right. The tool below is what catches
it, and someone has to run it.

## #262 — the worker that drew a frame was decided by a race, so no two renders could be compared

**What.** Capture workers pulled from one shared job channel, so frame 856 was drawn by a different
browser in every render. Verified: the dedup representative map was byte-identical between two runs
and the worker column was not.

**Why it matters even though it changed no pixel by itself.** It is the amplifier's accomplice. It
makes every measurement of the kind above impossible, because a frame that differs between two runs
could always be blamed on "a different browser drew it", and there was no way to rule that out.

**Fix.** The jobs are dealt round-robin before any browser starts (`perWorker[i%workers]`), not raced
for. Same balanced interleave, decided once. Two renders now produce byte-identical frame maps, which
is what let the residue below be attributed with confidence.

## Still open — a second cause, and it is not antialiasing either

With the raster race closed and the worker assignment fixed, **250 of 1890 frames still differ between
two renders**, and the frame map is identical, so the *same browser* drew each of those frames in both
runs. The residue is therefore nothing to do with workers, and it is what #258 measured as 373 at one
worker.

**It is two things, not one.** The 250 frames sit in two spans and three strays:

| span | frames differing | typical ratio | typical max delta |
|---|---|---|---|
| 666-834 | 125 | 0.005% to 0.6% | 14 |
| 1098-1259 | 122 | ~1.8% | ~150 |
| 105, 149, 153 | 3 | tiny | tiny |

The first span is the small, plausibly-invisible class #258 described. The second is not: it is
consistent across 122 frames of one beat, at the same magnitude every time, which is a systematic
difference rather than noise.

**It is bigger than #258 recorded.** Median differing frame moves 0.47% of its pixels; the worst moves
1.8% with a max channel delta of 171. Looking at the worst frame (1105): the content is identical, and
the whole integrations grid sits about **60 supersampled pixels higher** in one run than the other,
under a headline that has not moved. That is a position difference of roughly 30 output pixels on a
single frame mid-entrance. It is not a rounded corner and it is not invisible; on a slide-in it would
read as a stutter.

The shape of it points at motion driven by wall time rather than by frame number: something is eased
toward its target by the browser after `renderFrame(n)` has set it, and the double rAF advances it by
an unpredictable amount. That is a hypothesis. It has not been proven, and the fix would live in
`core/` or `scene.html`, which this branch does not touch.

**What #258 should be corrected to say.** "The 373 is understood and closed, it is invisible
antialiasing" is not supported. One crop of one frame was used to characterise 373 frames, and the
worst of them are two orders of magnitude larger than the number that crop produced. The class is open.

## How to re-measure any of this

```bash
VAWE_KEEP_FRAMES=1 VAWE_FRAME_MAP=/tmp/mapA.txt ./bin/vawe formats/scene/brew-launch.json
cp -R "$(printf %s "$TMPDIR")frames_brew-launch" /tmp/runA
# repeat for run B
go run ./scripts/dev/framediff -a /tmp/runA -b /tmp/runB \
  -mapa /tmp/mapA.txt -mapb /tmp/mapB.txt -crops /tmp/crops -csv /tmp/diff.csv
```

`-crops` writes the worst frames as the two runs' versions of the differing region, stacked. **Read
them.** Every wrong conclusion in this family came from reasoning about frame numbers instead.
