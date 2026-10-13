---
title: "Faster headless Chrome screenshots for draft video renders"
description: "JPEG at quality 92, GPU compositing, slices sized to the work and a warm browser made our draft renders cheap. GPU was 1.5x faster. Here is where it broke."
date: 2026-10-10
section: speed
tags: "headless chrome, screenshots, jpeg, gpu compositing, drafts, performance"
keywords: "headless chrome screenshots, puppeteer screenshot speed, jpeg screenshot, gpu compositing headless, draft render"
hero: /blog/fast-drafts/hero.svg
heroAlt: "Table comparing the draft path and the final path: JPEG against lossless PNG, GPU against software compositing, slices sized to the work against fixed 60-frame slices, x264 ultrafast against preset fast."
---

A draft is the inner loop of an agent: edit the page, render a few seconds, look, repeat. Every second of capture is paid on every pass. This post is about how we made headless Chrome screenshots cheaper for drafts, which parts held up, and which part we had to take back.

<figure>

![Table comparing the draft path and the final path](/blog/fast-drafts/hero.svg)

</figure>

## The problem

A final needs pixels that never depend on the machine. A draft needs an answer fast. We had been giving the draft the final's settings, scaled down, which meant lossless PNG screenshots, software compositing and fixed slices. That is correct and slow.

The first question was where the time went. Commit `92990647f` added `harness/dev/bench-capture.mjs`, a bench that runs one render per child process, so every run reads its environment fresh, and prints a JSON line. It has two switches, GPU compositing and a browser per worker, both off by default, so we could measure each on its own. It also writes per-subframe timings for the seek, the settle, the screenshot call and the file write.

## What we changed

Commit `f12b7955b` made the draft its own path.

### JPEG instead of PNG

A draft captures JPEG at quality 92, with `optimizeForSpeed`. On `colour-sting` that is about 73 KB a frame. At the time of the commit the comment said encoding and writing a half-size frame cost about half as much as PNG. The final stays lossless.

### GPU compositing for drafts

A final keeps GPU compositing off. About 150 rapid seek-and-screenshot round trips crashed the GPU compositor there, and a final's pixels must not depend on the GPU. A draft composites on the GPU, which was 1.5 times faster at half size, and its pixels differ from a final's by about 44 dB PSNR. Turning the GPU off entirely with `--disable-gpu` would break WebGL context creation, so the flag is only for compositing.

### Slices sized to the work

A final cuts frames into fixed 60-frame slices so pixels do not depend on the worker count ([why](/blog/determinism)). A draft does not need that. It splits frames evenly over the lanes, with a floor of 15 frames per slice, so a short window still uses every worker.

### A warm browser

A preview daemon keeps one Chrome up between drafts, one per checkout and capture mode, because a draft and a final need different browser flags. The time line a draft prints now says which mode captured it: `capture 18.0 s (draft: jpeg, gpu)`.

Smaller changes came from `169fdc5d6`: PNG `optimizeForSpeed` for finals, a low-resolution clip for the pixel speed pass, and a cached speed pass, which is a pure function of the page folder, `core/` and the render settings. A second ship of an unchanged page reads the answer from disk.

### Checks in tiers

Capture is not the only cost of a draft. Commit `ad5a4cbe9` put every draft check in one of three tiers, from one table in `harness/lib/draft-tiers.mjs`. The `fast` checks run on every draft: motion, text, worlds, tail, video and sound. The `settled` checks (contrast, layout, spec, speed) run at settled frames only. The `ship` checks (per-frame box tracks and object tracks) run with `dev --full` and at ship. Checks are timed and cached under `out/`, and a test, `check-budget`, fails if a check grows past its stamped seconds ([scaled by the machine](/blog/test-suite)). The rule in the file is that a check earns a place in every draft only when it is fast and changes the next edit.

## What we took back

The GPU claim did not survive SVG filters. GPU compositing rasterized a filter in two states at random: 70 of 216 frames differed between two renders. Commit `60bc38dc4` moves any page that draws an SVG filter back to software compositing, which costs a draft about 2.5 times as much. Only those pages pay it. The full account is in [deterministic rendering in headless Chrome](/blog/determinism).

The half-size capture also changed. Chrome's downscale of WebGL gave different pixels per run, so drafts now capture at full size and ffmpeg scales them down ([drafts that lie](/blog/drafts-lie)). That costs capture time that the JPEG and the GPU path give back.

## Result, and a number we dropped

What we can show from commits:

- GPU compositing in drafts: 1.5 times faster at half size (comment in `render-harness.mjs`).
- JPEG capture: about 73 KB a frame on `colour-sting`, and a cost about half of PNG at half size.
- `three-star` warm draft, from the layout change in `992aed43c`: capture 1.4–1.5 s to 1.3 s, wall time 2.7 s to 2.3 s.

Our planning notes quoted a "40 ms frame" from a bench stamp: a median of 9,077 ms for 228 frames, 39.8 ms per frame. We checked it. That stamp was written on 2026-09-26 (`db1a1af86`) against a JSON sample film, `tests/fixtures/films/sample.json`. The stamp in the repo today (`33c2cf28a`, 2026-10-10) is a median of 1,881 ms for 15 frames, 125.4 ms per frame, measured on a 15-frame canvas page, `seek-canvas.html`. The bench runs the whole render command as a child process, so that figure includes process and browser start. The two are not comparable. We do not have a like-for-like before and after for page drafts, and we will not present the 40 ms as one.

## What we would tell someone building the same thing

- Build the bench before the optimization. Ours runs each variant in a child process and logs per-subframe times, so we saw where the time went.
- Give drafts their own settings. The final's constraints (lossless, no GPU, fixed slices) exist for a reason that a draft does not share.
- Say which capture mode produced a number. We print it on the time line so no one compares a JPEG draft with a PNG final.
- Put each check in a tier and time it. A draft that waits on a per-frame check that never changes the next edit is paying for nothing.
- Expect to take some of it back. Every speed-up here had a case that broke it, and we found them by rendering twice and comparing.

For waiting rather than capturing, see [making the wait cheap](/blog/cheap-wait). Lane scaling is in [slots and a reaper](/blog/slots-reaper). The CLI verb is described in the [CLI docs](/docs/cli). Source: [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/media/render-page.mjs`: `frameFormat`, `sliceFramesFor`, `DRAFT_JPEG_QUALITY`.
- `harness/lib/render-harness.mjs`: `pageArgs`.
- `harness/lib/draft-tiers.mjs`: the tier table.
- `harness/dev/bench-capture.mjs` and `harness/dev/bench.mjs`.
- Commit [f12b7955b](https://github.com/Vandit1604/vawe/commit/f12b7955b): JPEG on GPU compositing, slices sized to the work.
- Commit [92990647f](https://github.com/Vandit1604/vawe/commit/92990647f): the capture bench.
- Commit [ad5a4cbe9](https://github.com/Vandit1604/vawe/commit/ad5a4cbe9): tiered, timed, cached draft checks.
- Commit [60bc38dc4](https://github.com/Vandit1604/vawe/commit/60bc38dc4): software compositing for SVG filters.
