# MEASURE — read a transition's real motion, in our own vocabulary

Eyeballing frames tells you "a slide with some easing." It does not tell you `duration: 0.43s, ease:
easeOutSine`. Those are **measured, not seen** — and if you guess them you will confabulate. `make measure`
measures them, and (the part that matters for us) reports the answer as **the nearest preset the engine
actually has**, not an arbitrary bezier we can't use.

Two jobs, one tool:
- **Reference analysis** — "what is this transition in a video I want to reproduce, and which of our
  presets gets closest?"
- **Self-verification** — "did the transition I authored actually render as the curve I asked for?"
  (point it at `out/<ours>.mp4` with `EXPECT=<preset>`).

```bash
make measure VIDEO=twitter.mp4 FROM=47.55 TO=48.35            # what is the "Send" whip?
make measure VIDEO=out/brew.mp4 FROM=9.7 TO=10.3 EXPECT=snappy # did my cut render as snappy?
```

## How it works (and why it's dependency-free)

ffmpeg (already required) extracts the window as raw **grey frames at native fps** (`-vsync 0`, so no
VFR-dropped frames corrupt the timing). Then, in plain JS:
1. **Track the moving element per frame** — foreground = pixels whose luma differs from the background
   (median of the four corners, so polarity is automatic) by a threshold. From that mask: centroid
   (`cx`,`cy`), bounding box (`w`,`h`), area, and whole-frame mean luma.
2. **Pick the dominant channel** — the one that travels most: `cx`/`cy` (slide/whip), `area` (scale/zoom),
   `luma` (dissolve/flash/opacity). A rigid channel that moves < ~2% of frame is treated as noise (a word
   blurring in place jitters the centroid a few px) so a real channel wins.
3. **Trim to the active window** — drop leading/trailing frames where nothing moves → the true duration.
4. **Fit against OUR easing library** — `core/motion.js` EASINGS + `core/cuts.js` TIMINGS. Normalise the
   channel 0→1 and RMS-compare to every preset; report the nearest + residual + runners-up. Overshoot
   past 1.0 → an anticipation ease (`pop`/`easeOutBack`/`spring-bouncy`).

No OpenCV/numpy — same stack the renderer already uses. The output prints a report + an ASCII curve, and
writes a machine-readable `measure.json` (dominant channel, duration, delta, best preset, residual, top-5,
and the `EXPECT` check) for downstream use.

## Reading the result

- **residual < 0.03 (tight) / < 0.07 (close)** → trust the named preset; author with it directly.
- **residual > 0.07 (loose)** → the motion is **not one eased tween**. Usual causes, in order: the window
  spans **two beats** (tighten it); two **stacked tweens** (position + scale — split and measure each);
  a **discrete stagger** (typing, a list cascade — not a curve at all, measure cadence instead); or a
  **mask/dissolve** the single-channel tracker can't separate. The loose flag is a real signal, not a
  failure — believe it.

## What it CANNOT see (re-author these by intent, not measurement)

- **Mask vs clip-path** — a wipe reveal and a clip-path scale look identical in stills. Guess from edge
  geometry: straight edge → clip-path; soft/organic → a mask/shader.
- **Blend modes** — screen vs add vs plus-lighter differ only at the clipping shoulder.
- **True 3D depth** — an in-plane tracker collapses perspective; converging edges = `rx/ry`/`uiParallax`,
  not a 2D skew.
- **Shader distortion** — a displacement field needs optical flow to characterise.
- **Discrete staggers** — per-character typing / per-item cascades are a cadence, not a single curve.

**Future upgrade (needs OpenCV):** per-frame `estimateAffinePartial2D` optical flow would recover full
tx/ty/scale/rotation for multi-element scenes and let us fit **stagger** (crop into bands, diff the
per-band start frames ÷ fps). Deferred — the single-element tracker covers title/card/whip beats, which
is most of what we author and all of what we self-verify.

## Worked reference — the "Brew" launch film (`twitter.mp4`, 30fps)

Measured signature transitions, to seed a faithful recreation (see the recreation plan):

| Beat | Window | Dominant | Duration | Nearest preset | Residual | Read |
|---|---|---|---|---|---|---|
| "Send" hero | 47.55–48.35 | area (scale) | **0.43s** | `spring-stiff` / `easeOutSine` | 0.034 tight | a fast ease-out scale-in; author as a `text` scale-in @0.43s `snappy`, or a `whipPan` seam `snappy` |
| Deel→Revolut card morph | 47.5–48.2 | area | **0.57s** | `smooth` / `easeInOutCubic` / `ramp` | 0.058 close | a ~0.57s ease-in-out cross-dissolve of the card content (a `cut:blur`/dissolve, `smooth`) |
| "Today" hero | 0.0–1.0 | — | — | — | loose | window spanned two beats (the black "6 days" card crashes in); blur-in-place → tighten + use luma |
| Typed reveal "Let's change" | 6.4–7.2 | — | — | — | loose | discrete typing + caret + marker highlight — a stagger/cadence, not one tween (author as a `type` layer) |

The tight fits are directly authorable numbers; the loose ones are the tool correctly refusing to invent
a curve for motion that isn't one. That distinction is the whole point.

## Self-verification workflow (use this on our own renders)

1. Author a transition (say `timing: "snappy"` on a cut/seam).
2. `make video`, then `make measure VIDEO=out/<name>.mp4 FROM=<cut-0.1> TO=<cut+dur+0.1> EXPECT=snappy`.
3. Read the `EXPECT` line: a low residual means the render is faithful to the authored intent; a high one
   with a different `best` preset means what shipped isn't what you asked for — a real bug to chase.

This closes the loop the static gates can't: `make direct`/`make slop` check *choice*; `make measure`
checks that the **rendered motion** matches the choice.
