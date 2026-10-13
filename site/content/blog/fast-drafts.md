---
title: "Puppeteer screenshot speed: what helped, what we undid"
description: "A Puppeteer screenshot speed checklist for draft renders: JPEG at quality 92, GPU compositing 1.5x faster, slices sized to the work, and what we undid."
date: 2026-10-10
updated: 2026-10-13
section: speed
tags: "headless chrome, screenshots, jpeg, gpu compositing, drafts, performance"
keywords: "puppeteer screenshot speed, headless chrome screenshots, jpeg screenshot quality, gpu compositing headless"
hero: /blog/fast-drafts/hero.webp
heroAlt: "Table comparing the draft path and the final path: JPEG against lossless PNG, GPU against software compositing, slices sized to the work against fixed 60-frame slices, x264 ultrafast against preset fast."
---

A draft render is the inner loop of an agent: edit the page, render a few seconds, look, repeat. Every second of screenshot time is paid on every pass. These are the steps that made Puppeteer screenshots cheaper for our drafts, each with why it helps and how to check it, including two we had to partly take back.

The final render keeps its own, slower settings. Our pillar post on [faster headless Chrome rendering with one browser per lane](/blog/chrome-per-lane) covers the final.

<figure>

![Table comparing the draft path and the final path](/blog/fast-drafts/hero.webp)

</figure>

## 1. Build a capture bench before you optimize

Why: you cannot pick a fix until you know where the time goes. We had been giving drafts the final's settings, scaled down: lossless PNG screenshots, software compositing and fixed slices. That is correct and slow.

How: commit `2d0805933` added `harness/dev/bench-capture.mjs`. It runs one render per child process, so every run reads its environment fresh, and prints a JSON line. It has two switches, GPU compositing and a browser per worker, both off by default, so each can be measured on its own. It also writes per-subframe timings for the seek, the settle, the screenshot call and the file write.

## 2. Capture drafts as JPEG at quality 92

Why: a draft does not need lossless frames. Commit `e0da1a9b7` made the draft its own path. At the time of the commit, the code comment said encoding and writing a half-size JPEG frame cost about half as much as PNG.

How: capture with `type: 'jpeg'`, quality 92 (`DRAFT_JPEG_QUALITY`) and `optimizeForSpeed`. Check the frame size: on `colour-sting` it is about 73 KB a frame. The final stays lossless.

## 3. Turn on GPU compositing for drafts only

Why: GPU compositing was 1.5 times faster at half size, and a draft's pixels differ from a final's by only about 44 dB PSNR.

A final keeps GPU compositing off. About 150 rapid seek-and-screenshot round trips crashed the GPU compositor there, and a final's pixels must not depend on the GPU. Do not use `--disable-gpu` for this: turning the GPU off entirely breaks WebGL context creation, so the flag is only for compositing (`pageArgs` in `harness/lib/render-harness.mjs`).

## 4. Send pages with SVG filters back to software

This is the first thing we took back. GPU compositing rasterized an SVG filter in two states at random: 70 of 216 frames differed between two renders. Commit `0b1d35912` moves any page that draws an SVG filter back to software compositing, which costs a draft about 2.5 times as much. Only those pages pay it.

How to check: render the page twice and compare frame hashes. The full account is in [the deterministic rendering checklist](/blog/determinism).

## 5. Size draft slices to the work

Why: a final cuts frames into fixed 60-frame slices so pixels do not depend on the worker count. A draft does not need that, and fixed slices leave workers idle on a short window.

How: split frames evenly over the lanes, with a floor of 15 frames per slice (`sliceFramesFor`), so a short window still uses every worker.

## 6. Keep a warm browser per capture mode

Why: launching Chrome on every draft is pure waste. A draft and a final need different browser flags, so one browser cannot serve both.

How: a preview daemon keeps one Chrome up between drafts, one per checkout and capture mode. Print the mode on the time line so no one compares a JPEG draft with a PNG final: `capture 18.0 s (draft: jpeg, gpu)`.

## 7. Capture at full size and let ffmpeg shrink WebGL frames

The second thing we took back. Chrome's downscale of WebGL gave different pixels per run, so drafts now capture at full size and ffmpeg scales them down. Why the page must still lay out at full size is in [Puppeteer deviceScaleFactor: lay out big, capture small](/blog/drafts-lie). This costs capture time that the JPEG and GPU steps give back.

## 8. Cache what is a pure function of its inputs

Smaller changes came from `586d132c4`: PNG `optimizeForSpeed` for finals, a low-resolution clip for the pixel speed pass, and a cached speed pass. The speed pass is a pure function of the page folder, `core/` and the render settings, so a second ship of an unchanged page reads the answer from disk.

## 9. Put every draft check in a tier, and time it

Capture is not the only cost of a draft. Commit `78e0e42d2` put every draft check in one of three tiers, from one table in `harness/lib/draft-tiers.mjs`:

- `fast` runs on every draft: motion, text, worlds, tail, video and sound.
- `settled` runs at settled frames only: contrast, layout, spec and speed.
- `ship` runs with `dev --full` and at ship: per-frame box tracks and object tracks.

Checks are timed and cached under `out/`. A test, `check-budget`, fails if a check grows past its stamped seconds, [scaled by the machine](/blog/test-suite). A check earns a place in every draft only when it is fast and changes the next edit.

## A number we dropped

Our planning notes quoted a "40 ms frame" from a bench stamp: a median of 9,077 ms for 228 frames, 39.8 ms per frame. That stamp was written on 2026-09-26 (`c4bb8d30a`) against a JSON sample film, `tests/fixtures/films/sample.json`.

The stamp in the repo today (`1039084f0`, 2026-10-10) is a median of 1,881 ms for 15 frames, 125.4 ms per frame, on a 15-frame canvas page, `seek-canvas.html`. The bench runs the whole render command as a child process, so that figure includes process and browser start. The two are not comparable. We have no like-for-like before and after for page drafts, and we do not present the 40 ms as one.

One timing we can quote: the `three-star` warm draft, from the layout change in `1f99365b6`, went from 1.4–1.5 s to 1.3 s of capture and from 2.7 s to 2.3 s of wall time.

## The checklist as a table

| Check | How to verify | Where in the code |
|---|---|---|
| Capture bench exists | one JSON line per variant | `harness/dev/bench-capture.mjs`, [2d0805933](https://github.com/Vandit1604/vawe/commit/2d0805933) |
| Drafts capture JPEG q92 | about 73 KB a frame on `colour-sting` | `frameFormat`, `DRAFT_JPEG_QUALITY`, [e0da1a9b7](https://github.com/Vandit1604/vawe/commit/e0da1a9b7) |
| GPU compositing in drafts only | time line prints `gpu` | `pageArgs` in `render-harness.mjs` |
| SVG filter pages in software | render twice, compare hashes | [0b1d35912](https://github.com/Vandit1604/vawe/commit/0b1d35912) |
| Draft slices sized to the work | every lane busy on a short window | `sliceFramesFor` |
| Warm browser per capture mode | mode on the time line | the preview daemon |
| WebGL scaled by ffmpeg | `render-draft-halfsize-determinism.test.mjs` | `flags=area` encode |
| Pure steps cached | second ship reads from disk | `586d132c4` |
| Draft checks tiered and timed | `check-budget` test | `harness/lib/draft-tiers.mjs`, [78e0e42d2](https://github.com/Vandit1604/vawe/commit/78e0e42d2) |

Where agents lose time waiting rather than capturing is in [reading AI agent traces](/blog/trace-reviews). Lane scaling is in [too many headless Chrome processes: slots and a reaper](/blog/slots-reaper), and the rest of the render pipeline is mapped in the [one-browser-per-lane benchmark](/blog/chrome-per-lane). The CLI verb is described in the [CLI docs](/docs/cli).
