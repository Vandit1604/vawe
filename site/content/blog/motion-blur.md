---
title: "Motion blur for HTML animation: subframes by travel"
description: "Motion blur for CSS and HTML animation by blending 1 to 32 subframes per frame from measured travel. A 5 s film took 4,017 subframes at a cap of 16."
date: 2026-10-09
updated: 2026-10-13
section: speed
tags: "motion blur, subframes, ffmpeg, headless chrome, rendering"
keywords: "motion blur css, subframe motion blur, 180 degree shutter, ffmpeg frame blend"
hero: /blog/motion-blur/hero.webp
heroAlt: "Schematic: three subframes of a fast circle show as three separate ghosts, eight subframes overlap into one streak."
---

A browser has no shutter, so CSS cannot give an animation real motion blur. To get it in a video, you capture several subframes per output frame and blend them. We pick the count per frame from how far things move in that frame: neighbouring subframes sit at most 3 px apart, so a fast frame gets up to 32 subframes and a still frame gets one.

This explainer covers how the count is chosen, how the blend is built, and what it cost. It is part of our [headless Chrome video rendering pipeline](/blog/chrome-per-lane), where every subframe is a screenshot.

<figure>

![Schematic of 3 subframes showing ghost copies against 8 subframes forming a streak](/blog/motion-blur/hero.webp)

<figcaption>A schematic of the failure and the fix. Positions are drawn for clarity, not taken from a render.</figcaption>
</figure>

## Why does a fixed subframe count fail?

Our first blur used one count for every frame. On a fast move, 3 subframes show 3 separate objects, because neighbouring copies sit far apart. On a slow move or a held frame, the same count wastes capture time: the copies are identical.

Capture is the expensive part of a render. Each subframe is a seek, a settle (fonts, image decode, two paints) and a screenshot. Each frame should get what its own motion needs.

## How many subframes does a frame need?

Commit `75fa04dc6` made the count follow each frame's travel. The rule lives in `subframesForTravel`:

- The blur spans half the frame interval, a 180 degree shutter (`SHUTTER = 0.5`).
- Neighbouring subframes should sit at most 3 px apart (`STEP_PX = 3`).
- Start at one subframe and double it while `travel * 0.5 / k` is above 3, up to a cap.

| Travel in one frame | Swept distance | Subframes | Gap between neighbours |
|---|---|---|---|
| 48 px | 24 px | 1 | 24 px |
| 48 px | 24 px | 2 | 12 px |
| 48 px | 24 px | 4 | 6 px |
| 48 px | 24 px | 8 | 3 px (chosen) |
| 4 px | 2 px | 1 | 2 px (chosen) |

A target in pixels reads better than "16 samples" because it does not depend on the scene.

## Where does the travel number come from?

From the page, before any screenshot. A pre-pass reads the bounding boxes of paused animations at consecutive frame times and takes the largest move or resize over all animated elements.

When the boxes cannot be read, a cheaper pixel estimate bands frames by mean luma difference into still (1 subframe), medium (up to 4) and fast (up to 16).

## How are the subframes blended?

Counts are powers of two and run-length encoded before capture. The ffmpeg filter graph then has one trim, tmix and select chain per run of equal counts, all in one ffmpeg process. If the counts alternate so often that the graph would pass 200 segments, the renderer falls back to one uniform count rather than build the graph.

## When can a subframe skip its screenshot?

Commit `086276b67` raised the cap to 32 subframes and added reuse. After a seek, the page reports whether anything still pending can change the pixels: timers, animation frame callbacks, canvas, video or SMIL. If nothing can, two subframes with the same animation state paint the same pixels, and the second one reuses the first capture. A held frame costs one screenshot however many subframes it asks for. The pending count comes from the [virtual clock that owns timers and requestAnimationFrame](/blog/page-clock).

A `--profile` flag prints a table of frames, subframes, screenshots (and how many were reused) and capture seconds per second of film. That table shows which second of a film is expensive.

## What does a cap of 16 or 32 cost?

The pixel estimate cannot tell a frame that needs 32 subframes from one that needs 16, so its fast band stops at 16. A code comment records the measurement for a 5 second three.js film: 4,017 subframes at 16 and 7,805 at 32, a drop of about 49%.

<figure>

![Bar chart: 4,017 subframes with the fast band capped at 16 and 7,805 with a cap of 32](/blog/motion-blur/subframes.webp)

</figure>

We have not compared the two renders side by side for quality, so we cannot claim the 16 band looks the same on every film.

For big finals, commit `cc6c9b05b` prints advice when a final asks for more than 8,000 subframes: the count, an estimate in minutes (1,000 subframes per minute) and the `--blur` option that lowers the cap. The code comment records one measurement: 19,200 subframes took 15 to 23 minutes.

## What can go wrong in the encode?

Frames can vanish. The blended frames are encoded as segments, and each segment restarts its timestamps, so a one-frame segment carries no duration and the next segment overlaps it. With `-r` set to the frame rate, ffmpeg rate-converted the stream and dropped the overlapped frames: 7 to 24 frames per 6 seconds. Films came out short and drifted away from their audio, which is how we noticed.

Commit `3c8d7a692` re-stamps the timestamps after the concat with `setpts=N/fps/TB` and uses `-fps_mode passthrough`, so ffmpeg never rate-converts. A later commit (`958f17f9d`) fixed a similar loss from a pixel-format change mid-sequence, covered in the [x264 preset benchmark](/blog/encode). Count your frames after encoding.

## Limits, and where to try it

The quality cost of the 16 cap is unmeasured, and the minutes estimate comes from one measurement. The code is in `harness/media/render-page.mjs` (`subframesForTravel`, `bucketize`, `clampSegments`, `blendGraph`), with tests in `tests/media/render-blur-travel.test.mjs` and `tests/media/render-reuse.test.mjs`. Commits: [75fa04dc6](https://github.com/Vandit1604/vawe/commit/75fa04dc6), [086276b67](https://github.com/Vandit1604/vawe/commit/086276b67), [3c8d7a692](https://github.com/Vandit1604/vawe/commit/3c8d7a692), [cc6c9b05b](https://github.com/Vandit1604/vawe/commit/cc6c9b05b).

The [smear stretch](/moves/smear-stretch) move is a fast motion to try this on. For how to ask for blur from the command line, see the [CLI docs](/docs/cli). The capture loop that spends these subframes is benchmarked in [faster headless Chrome rendering: one browser per lane](/blog/chrome-per-lane).
