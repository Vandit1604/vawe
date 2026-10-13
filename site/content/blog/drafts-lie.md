---
title: "Puppeteer deviceScaleFactor: lay out big, capture small"
description: "Puppeteer deviceScaleFactor lets a half-size draft keep the final's layout. Our draft-to-final frame diff fell from 10.07 to 0.86. Where it fails: WebGL."
date: 2026-10-10
updated: 2026-10-13
section: speed
tags: "puppeteer, devicescalefactor, rendering, drafts, webgl"
keywords: "puppeteer devicescalefactor, puppeteer setviewport, half-size screenshot, draft render"
hero: /blog/drafts-lie/hero.svg
heroAlt: "Before: the same translateX(600px) box lands at 62.5 percent of a 960 pixel draft and 31 percent of a 1920 pixel final. After: both lay out at 1920 pixels and the draft is captured at scale 0.5."
---

`deviceScaleFactor` is the option of Puppeteer's `page.setViewport` that sets how many screenshot pixels the browser paints per CSS pixel. A 1920x1080 viewport with a factor of 0.5 gives a 960x540 screenshot of a page that still lays out at 1920x1080. That is the right way to make a small preview of a page: keep the layout, shrink the capture.

We learned it the hard way. Our half-size video drafts shrank the viewport instead, and the draft showed an agent a different layout from the final. This explainer covers why, what the factor fixed, and the one case, WebGL, where we stopped trusting it. It belongs to our [deterministic rendering checklist for headless Chrome](/blog/determinism).

<figure>

![Before and after layout: the same pixel offset lands at 62.5 percent of the draft and 31.25 percent of the final, then both lay out at 1920 by 1080](/blog/drafts-lie/hero.svg)

<figcaption>Schematic. The box and the 600 px offset are an example, not a frame from a film.</figcaption>
</figure>

## Why does a smaller viewport move things?

A vawe film is a web page. A draft is a quick, half-size render that an agent uses to check its edits, and a final is the full 1920x1080 render. For speed, the first version rendered a draft by opening the page in a 960x540 CSS viewport.

That works for percentages and `vw` units. It breaks for any pixel value. A keyframe that translates by 600 px, or a fixed `left: 900px`, is 62.5% of the draft width but only 31.25% of the final width.

The page's own size variables followed the viewport too. A page reads `--vw` and `--vh` to size things, so in a draft they described a 960x540 page and in a final a 1920x1080 one.

It cost us real time. An agent fixed a draft that looked right, and the final then showed a block left on screen. The agent had done nothing wrong; the tool had shown it a different layout.

## What does deviceScaleFactor change?

Commit `992aed43c` changed what a draft means. The page now always lays out at the aspect's full CSS size, and the browser captures it at a device scale of 0.5 for a draft and 1 for a final. `resolveFrame` returns the full size plus the scale.

The values `--vw`, `--vh`, `data-aspect` and `window.vawe.width` and `height` always report the full size, so a page cannot tell it is in a draft. The commit message notes that Chromium honored the factor for screenshots even under `--force-device-scale-factor=1`, so there was one capture path and no downscale step.

| | Old draft | Draft with deviceScaleFactor |
|---|---|---|
| CSS layout size | 960x540 | 1920x1080 |
| Capture scale | 1 | 0.5 |
| Screenshot size | 960x540 | 960x540 |
| What `--vw` reports | half size | full size |
| Frame 5 mean diff vs final | 10.07 | 0.86 |

## How did we measure the difference?

`tests/media/render-page-draft-layout.test.mjs` renders a fixture laid out in px as a draft and as a final, then compares frame 5. The mean difference was 0.86 with the fix and 10.07 on the previous code. One frame and one fixture caught the bug.

<figure>

![Bar chart of the mean pixel difference at frame 5: 10.07 with a 960x540 draft layout, 0.86 with a 1920x1080 layout](/blog/drafts-lie/frame-diff.svg)

</figure>

The commit also records a timing on the `three-star` example, a warm draft: capture went from 1.4–1.5 s to 1.3 s, and wall time from 2.7 s to 2.3 s. That is one film and one run, so read it only as a sign that the fix did not cost speed.

## When is deviceScaleFactor the wrong tool?

On a WebGL page. Ten days later (`166771b93`) we found that Chrome's own downscale of a WebGL page gave different pixels from run to run. On the `colour-sting` example, 117 of 154 captures differed between two renders. A full-size capture of the same page was repeatable.

A draft that changes on each run cannot be debugged, so we changed the capture again. A draft now captures at device scale 1, and the encode scales the result down with ffmpeg's `scale` filter and `flags=area`. The layout rule stays: the page still sees the full size. Only the place where the pixels shrink moved, from the browser to ffmpeg.

`tests/media/render-draft-halfsize-determinism.test.mjs` holds it. It renders a one-and-a-half-second window of `colour-sting` twice and compares the per-frame hashes. The output must be 960x540, 45 frames, and identical across runs.

Correct and repeatable are two separate checks. A scale that is right but different each run is still a bug.

## What did the full-size capture cost?

Capturing at full size costs more than capturing at half. We accepted that for correctness, and won the time back elsewhere with JPEG capture and slices sized to the work (commit [f12b7955b](https://github.com/Vandit1604/vawe/commit/f12b7955b)). Those settings are in [Puppeteer screenshot speed: what helped, what we undid](/blog/fast-drafts).

## Where the idea goes next

The page must not know it is in a draft, just as it must not know the wall time. The same idea drives the [virtual clock that seeds Math.random and freezes Date.now](/blog/page-clock), and both are items in the [full determinism checklist](/blog/determinism). The code lives in `harness/media/render-page.mjs` (`resolveFrame`, and the draft encode with `flags=area`); the two commits are [992aed43c](https://github.com/Vandit1604/vawe/commit/992aed43c) and [166771b93](https://github.com/Vandit1604/vawe/commit/166771b93). See also the [determinism docs](/docs/determinism) and [HyperFrames alternatives](/hyperframes-alternatives).
