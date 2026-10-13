---
title: "Puppeteer deviceScaleFactor: why our half-size draft lied"
description: "Our draft laid the page out at 960x540 and the final at 1920x1080, so px values moved. Puppeteer deviceScaleFactor cut the frame diff from 10.07 to 0.86."
date: 2026-10-10
section: speed
tags: "puppeteer, devicescalefactor, rendering, drafts, webgl"
keywords: "puppeteer deviceScaleFactor, draft render, css viewport, screenshot scale, deterministic screenshot"
hero: /blog/drafts-lie/hero.svg
heroAlt: "Before: the same translateX(600px) box lands at 62.5 percent of a 960 pixel draft and 31 percent of a 1920 pixel final. After: both lay out at 1920 pixels and the draft is captured at scale 0.5."
---

The draft looked fine, the final did not, and the bug was the word "half". Our drafts rendered at half size by shrinking the browser viewport. A box moved with `translateX(600px)` landed in a different place in the draft than in the final. This post explains how `deviceScaleFactor` in Puppeteer fixed it, and why we later stopped relying on it for WebGL.

<figure>

![Before and after layout: the same pixel offset lands at 62.5 percent of the draft and 31.25 percent of the final, then both lay out at 1920 by 1080](/blog/drafts-lie/hero.svg)

<figcaption>Schematic. The box and the 600 px offset are an example, not a frame from a film.</figcaption>
</figure>

## The problem

A vawe film is a web page. A draft is a quick, half-size render that an agent uses to check its edits, and a final is the full 1920x1080 render. For speed, the first version rendered a draft by opening the page in a 960x540 CSS viewport.

That works for percentages and `vw` units. It breaks for any pixel value. A keyframe that translates by 600 px, or a fixed `left: 900px`, is 62.5% of the draft width but only 31.25% of the final width. The two renders put things in different places.

The page's own size variables followed the viewport too. A page reads `--vw` and `--vh` to size things, so in a draft they described a 960x540 page and in a final a 1920x1080 one.

It cost us real time. An agent fixed a draft that looked right, and the final then showed a block left on screen. The agent had done nothing wrong. The tool had shown it a different layout.

## The fix: lay out big, capture small

Commit `1f99365b6` changed what a draft means. The page now always lays out at the aspect's full CSS size, and the browser captures it at a device scale of 0.5 for a draft and 1 for a final. `resolveFrame` returns the full size plus the scale. The values `--vw`, `--vh`, `data-aspect` and `window.vawe.width` and `height` always report the full size, so a page cannot tell it is in a draft.

In Puppeteer this is the `deviceScaleFactor` option of `page.setViewport`. A 1920x1080 viewport with a factor of 0.5 gives a 960x540 screenshot. The commit message notes that Chromium honored the factor for screenshots even under `--force-device-scale-factor=1`, so there was one capture path and no downscale step.

We added a test, `tests/media/render-page-draft-layout.test.mjs`. It renders a fixture laid out in px as a draft and as a final, then compares frame 5. The mean difference was 0.86 with the fix and 10.07 on the previous code.

<figure>

![Bar chart of the mean pixel difference at frame 5: 10.07 with a 960x540 draft layout, 0.86 with a 1920x1080 layout](/blog/drafts-lie/frame-diff.svg)

</figure>

The commit also records a timing on the `three-star` example, a warm draft: capture went from 1.4–1.5 s to 1.3 s, and wall time from 2.7 s to 2.3 s. That is one film and one run, so read it as a sign that the fix did not cost speed.

## What failed: a downscale that was not repeatable

The scale factor worked for DOM pages. On a WebGL page it did not. Ten days later (`a916e59d6`) we found that Chrome's own downscale of a WebGL page gave different pixels from run to run. On the `colour-sting` example, 117 of 154 captures differed between two renders. A full-size capture of the same page was repeatable.

Because a draft that changes on each run cannot be debugged, we changed the capture again. A draft now captures at device scale 1 and the encode scales the result down with ffmpeg's `scale` filter and `flags=area`. The layout fix stays as it was: the page still sees the full size. Only the place where the pixels shrink moved, from the browser to ffmpeg.

We added `tests/media/render-draft-halfsize-determinism.test.mjs`. It renders a one-and-a-half-second window of `colour-sting` twice and compares the per-frame hashes. The output must be 960x540, 45 frames, and identical across runs.

Capturing at full size costs more than capturing at half. We accepted that for correctness, and gave the time back elsewhere: JPEG capture and slices sized to the work. That story is in [fast drafts](/blog/fast-drafts).

## Result

- Frame 5 mean diff between draft and final: 0.86, down from 10.07.
- WebGL captures that differed between two draft renders: 117 of 154 before the full-size capture, repeatable after.
- `three-star` warm draft: 2.7 s down to 2.3 s from the first change.

## What we would tell someone building the same thing

- Never change the layout viewport to make a preview smaller. Change the capture scale. Any pixel value in the page depends on the viewport.
- Expose the full size to the page (`--vw`, `--vh`) in every mode, so authors have one number to design against.
- Test the draft against the final with one frame and one fixture laid out in px. A single number caught this bug.
- Check repeatability separately from correctness. A scale that is right but different each run is still a bug, and WebGL found it for us.

The same principle sits behind the clock: the page must not know it is in a draft, just as it must not know the wall time. See [time is the seek, never the clock](/blog/page-clock) and the [determinism docs](/docs/determinism). For a comparison with other tools, see [HyperFrames alternatives](/hyperframes-alternatives). Source: [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/media/render-page.mjs`: `resolveFrame`, and the draft encode with `flags=area`.
- `tests/media/render-page-draft-layout.test.mjs` and `tests/media/render-draft-halfsize-determinism.test.mjs`.
- Commit [1f99365b6](https://github.com/Vandit1604/vawe/commit/1f99365b6): lay out at full CSS size, capture at device scale 0.5.
- Commit [a916e59d6](https://github.com/Vandit1604/vawe/commit/a916e59d6): capture at scale 1 and scale in ffmpeg.
- Commit [e0da1a9b7](https://github.com/Vandit1604/vawe/commit/e0da1a9b7): JPEG capture and slices sized to the work.
