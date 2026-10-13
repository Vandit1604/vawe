---
title: "Deterministic rendering in headless Chrome: same pixels twice"
description: "70 of 216 frames differed between two renders of one page. How we got deterministic rendering in headless Chrome: six sources of drift and six fixes."
date: 2026-10-10
section: speed
tags: "determinism, headless chrome, svg filter, gpu compositing, rendering"
keywords: "deterministic rendering, headless chrome rendering, svg filter gpu compositing, puppeteer same pixels, repeatable screenshots"
hero: /blog/determinism/hero.svg
heroAlt: "Bar chart of frames that differed between two renders: 70 of 216 in a shared Chrome, 1 of 1296 with a Chrome per lane, 0 of 648 with software compositing, 117 of 154 for a downscaled WebGL page."
---

We render the same page twice and compare the frames. For one move, 70 of 216 frames came out different. The page had not changed, and neither had the machine. That is the starting point for deterministic rendering in headless Chrome, and this post lists every source of drift we found.

A renderer that cannot produce the same frame twice cannot be debugged by a person or an agent. Every "it looks wrong" report has two possible causes, the page and the renderer, and you cannot tell them apart.

<figure>

![Share of frames or captures that differed between two renders, by cause](/blog/determinism/hero.svg)

<figcaption>Counts come from the commit messages and code comments listed at the end. Each row renders one page twice.</figcaption>
</figure>

## The problem

A vawe film is a web page that the renderer seeks to a time, screenshots, and moves on. Each frame must be a pure function of its time. The page itself is held to that by a virtual clock, which we cover in [time is the seek, never the clock](/blog/page-clock). The browser is a second, quieter source of randomness, because it makes its own choices about how to paint.

We found six places where those choices leaked into pixels.

<figure>

![Table of six sources of pixel drift and the fix for each](/blog/determinism/sources.svg)

</figure>

## The sources, one at a time

### GPU compositing and SVG filters

The gooey-filter move draws its tab bar through an SVG filter. In a shared draft browser, GPU compositing rasterized that filter in two different states, apparently at random. Two renders of the same page differed in 70 of 216 frames.

<figure>

![The gooey filter move: shapes merge into one soft outline](/blog/determinism/gooey-filter.webp)

<figcaption>The <a href="/moves/gooey-filter">gooey filter move</a>, the page that exposed the drift.</figcaption>
</figure>

Commit `0b1d35912` made two changes. Each draft lane now has its own Chrome, which took the difference down to 1 of 1,296 frames. A page that draws an SVG filter also composites in software, which gave 0 of 648. Software compositing costs a draft about 2.5 times as much, so only pages that need it pay. The renderer finds them by scanning the page source, and the modules it imports, for a `<filter>` element, an `fe*` primitive or a `filter: url(...)` rule.

### The timeline between load and first seek

The document timeline runs in real time from page load. The compositor rasterizes animated layers against that time before the first seek pauses them. A first seek 1.5 seconds after load painted different edge pixels than one at 0.05 seconds, so a frame depended on how slowly the tab started.

Commit `1454df446` sets the animation playback rate to 0 through the DevTools protocol. Only a seek moves an animation. How we seek in both directions is in [making CSS animations seekable](/blog/seekable-css).

### Which tab has focus

The tab that holds browser focus rasterizes sub-pixel edges differently from the others (SSIM 0.9994 in our measurement). With several workers, which slice was frontmost changed the pixels. Commit `586d132c4` turns on focus emulation for every page, so all of them paint as the focused one.

### Raster state kept between seeks

A page keeps raster state between seeks. The first frame on a fresh page differs from the same frame reached by seeking on: a sparse SSIM 0.99997 drift on gradient text. A final therefore uses fixed 60-frame slices, each on a fresh page. The slice boundaries come from a constant, never from the worker count, so a render with 2 workers and a render with 4 produce the same pixels. Drafts trade this away for speed and size their slices to the work.

### Software canvas for the lens source

The WebGL lens films the page as a flat screen. Commit `398fd7a7c` makes the lens draw its SVG screen into a software canvas, so the draft pixels match from run to run.

### Chrome's own downscale of WebGL

A half-size draft of a WebGL page used Chrome's downscale, and 117 of 154 captures differed between runs. Commit `a916e59d6` captures at full size and lets ffmpeg shrink the frames with `flags=area`. The whole story is in [drafts that lie](/blog/drafts-lie).

## How we keep it fixed

Every fix landed with a test that renders twice and compares. The ones to read are `tests/media/render-page-determinism.test.mjs`, `render-draft-filter-determinism.test.mjs`, `render-draft-halfsize-determinism.test.mjs` and `render-determinism-load.test.mjs`. Most checks in vawe only advise. Determinism is one of the few things that refuses a render.

## Result

| Case | Frames that differed |
| --- | --- |
| SVG filter, one shared draft Chrome | 70 of 216 |
| SVG filter, a Chrome per lane | 1 of 1,296 |
| SVG filter, software compositing | 0 of 648 |
| WebGL draft, browser downscale | 117 of 154 captures |

We have no number for how much debugging time this saved. A related case, where our own preview tool re-laid out the page during a final, is in [three reviewers said the box shrinks](/blog/judge-defect).

## What we would tell someone building the same thing

- Render the same frame twice before you trust any visual check. If the two renders differ, every later verdict is suspect.
- Name the cause before you pick a fix. For the filter case the cause was the compositor, and no change to the page would have helped.
- Pay for software compositing only where a page needs it. Detect the need from the page source rather than turning it on everywhere.
- Fix the slice boundaries with a constant. Anything derived from the worker count makes the output depend on the machine.
- Keep a test per source of drift.

For where this matters to buyers, see [when determinism matters](/when-determinism-matters), the [determinism docs](/docs/determinism), and how this compares with [Remotion](/remotion-alternatives). Source: [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/media/render-page.mjs`: `SVG_FILTER`, `usesSvgFilter`, `SLICE_FRAMES`, focus emulation and `Animation.setPlaybackRate`.
- Commit [0b1d35912](https://github.com/Vandit1604/vawe/commit/0b1d35912): a Chrome per draft lane, software compositing for SVG filters.
- Commit [1454df446](https://github.com/Vandit1604/vawe/commit/1454df446): freeze the document timeline.
- Commit [586d132c4](https://github.com/Vandit1604/vawe/commit/586d132c4): focus emulation.
- Commit [a916e59d6](https://github.com/Vandit1604/vawe/commit/a916e59d6): full-size capture, ffmpeg scaling.
