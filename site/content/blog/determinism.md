---
title: "Deterministic rendering in headless Chrome: a checklist"
description: "A deterministic rendering checklist for headless Chrome: six sources of pixel drift we found, from 70 of 216 frames differing to 0 of 648, and each fix."
date: 2026-10-10
updated: 2026-10-13
section: speed
featured: true
featuredOrder: 2
tags: "determinism, headless chrome, svg filter, gpu compositing, rendering"
keywords: "deterministic rendering, headless chrome rendering, repeatable screenshots, svg filter gpu compositing"
hero: /blog/determinism/hero.webp
heroAlt: "Bar chart of frames that differed between two renders: 70 of 216 in a shared Chrome, 1 of 1296 with a Chrome per lane, 0 of 648 with software compositing, 117 of 154 for a downscaled WebGL page."
---

Deterministic rendering means one page, seeked to one time, gives the same pixels on every run. In headless Chrome that does not come for free. We rendered one move twice with no change to the page or the machine, and 70 of 216 frames came out different.

Each item below is one source of drift we found while turning web pages into video with [vawe](https://github.com/Vandit1604/vawe), with the fix and the test that holds it. Work through them in order. The first two cover the page, the rest cover the browser.

<figure>

![Share of frames or captures that differed between two renders, by cause](/blog/determinism/hero.webp)

<figcaption>Counts come from the commit messages and code comments named below. Each row renders one page twice.</figcaption>
</figure>

Why bother: a renderer that cannot produce the same frame twice cannot be debugged by a person or an agent. Every "it looks wrong" report then has two possible causes, the page and the renderer, and nothing tells them apart.

<figure>

![Table of six sources of pixel drift and the fix for each](/blog/determinism/sources.webp)

</figure>

## 1. Replace the page's clock before its scripts run

A vawe film is a web page that the renderer seeks to a time, screenshots, and moves on, so each frame must be a pure function of its time. Pages call `Date.now()`, `setTimeout` and `Math.random()`, and all of them depend on when the page runs.

We do not ban those APIs. A 75-line virtual clock, injected before any page script, makes them functions of the seek time and reseeds `Math.random` from `t`. The full table of what it fakes is in our [virtual clock reference for Math.random, Date.now and timers](/blog/page-clock).

How to check: `tests/media/render-page-determinism.test.mjs` renders a page that reads `Date.now`, `performance.now` and `Math.random` twice and compares the frame hashes.

## 2. Freeze the document timeline, then seek every animation

The document timeline runs in real time from page load. The compositor rasterizes animated layers against that time before the first seek pauses them. A first seek 1.5 seconds after load painted different edge pixels than one at 0.05 seconds, so a frame depended on how slowly the tab started.

Commit `1454df446` sets the animation playback rate to 0 through the DevTools protocol. Only a seek moves an animation after that. Seeking backward has its own traps (finished `fill: none` animations drop out of `document.getAnimations()`), and the steps are in [how to seek CSS animations frame by frame](/blog/seekable-css).

How to check: seek to the end, back to the middle, and compare with a fresh page seeked once to the middle.

## 3. Give each render lane its own Chrome, and composite SVG filters in software

The gooey-filter move draws its tab bar through an SVG filter. In a shared draft browser, GPU compositing rasterized that filter in two different states, with no pattern we could find. Two renders of the same page differed in 70 of 216 frames.

<figure>

![The gooey filter move: shapes merge into one soft outline](/blog/determinism/gooey-filter.webp)

<figcaption>The <a href="/moves/gooey-filter">gooey filter move</a>, the page that exposed the drift.</figcaption>
</figure>

Commit `0b1d35912` made two changes. Each draft lane now has its own Chrome, which took the difference down to 1 of 1,296 frames. A page that draws an SVG filter also composites in software, which gave 0 of 648.

Software compositing costs a draft about 2.5 times as much, so only pages that need it pay. The renderer finds them by scanning the page source, and the modules it imports, for a `<filter>` element, an `fe*` primitive or a `filter: url(...)` rule. A Chrome per lane also made renders faster, which we measured in [one headless Chrome per render lane](/blog/chrome-per-lane).

How to check: `render-draft-filter-determinism.test.mjs` renders a filter page twice.

## 4. Emulate focus on every page

The tab that holds browser focus rasterizes sub-pixel edges differently from the others (SSIM 0.9994 in our measurement). With several workers, which slice was frontmost changed the pixels. Commit `586d132c4` turns on focus emulation for every page, so all of them paint as the focused one.

How to check: render with two workers and with four, and compare the hashes.

## 5. Start each final slice on a fresh page, with fixed slice boundaries

A page keeps raster state between seeks. The first frame on a fresh page differs from the same frame reached by seeking on: a sparse SSIM 0.99997 drift on gradient text.

A final therefore uses fixed 60-frame slices, each on a fresh page. The slice boundaries come from a constant (`SLICE_FRAMES`), never from the worker count, so a render with 2 workers and a render with 4 produce the same pixels. Drafts trade this away for speed and size their slices to the work.

How to check: `render-determinism-load.test.mjs` renders under different worker counts.

## 6. Keep WebGL capture out of Chrome's own scaling

Two fixes here. The WebGL lens films the page as a flat screen, and commit `398fd7a7c` makes it draw its SVG screen into a software canvas, so the draft pixels match from run to run.

Then the downscale. A half-size draft of a WebGL page used Chrome's downscale, and 117 of 154 captures differed between runs. Commit `a916e59d6` captures at full size and lets ffmpeg shrink the frames with `flags=area`. Why a draft must lay out at full size in the first place is explained in [Puppeteer deviceScaleFactor: lay out big, capture small](/blog/drafts-lie).

How to check: `render-draft-halfsize-determinism.test.mjs` renders a window of `colour-sting` twice and compares per-frame hashes.

## 7. Own every tab you touch in a shared browser

This one is not drift inside Chrome, but it produced wrong frames that looked like drift. Listing tabs with `browser.pages()` attached to a running render's tab and reset it to Puppeteer's default 800x600 viewport. Our judge saw the result as a shrinking box. The full timeline is in the [Puppeteer default viewport postmortem](/blog/judge-defect).

How to check: render while another process opens and lists pages in the same browser.

## The numbers, before and after

| Case | Frames that differed |
| --- | --- |
| SVG filter, one shared draft Chrome | 70 of 216 |
| SVG filter, a Chrome per lane | 1 of 1,296 |
| SVG filter, software compositing | 0 of 648 |
| WebGL draft, browser downscale | 117 of 154 captures |

We have no number for how much debugging time this saved.

## The checklist on one screen

Every fix landed with a test that renders twice and compares. Most checks in vawe only advise. Determinism is one of the few things that refuses a render.

| Check | How to verify | Where in the code |
| --- | --- | --- |
| Page clock owns time and random | render twice, compare hashes | `core/engine/page-clock.js`, `render-page-determinism.test.mjs` |
| Timeline frozen, all animations seeked | seek back and compare with a fresh page | `Animation.setPlaybackRate`, [1454df446](https://github.com/Vandit1604/vawe/commit/1454df446) |
| Chrome per lane, SVG filters in software | render a filter page twice | `SVG_FILTER`, `usesSvgFilter`, [0b1d35912](https://github.com/Vandit1604/vawe/commit/0b1d35912) |
| Focus emulated | compare 2 and 4 workers | [586d132c4](https://github.com/Vandit1604/vawe/commit/586d132c4) |
| Fixed 60-frame final slices | `render-determinism-load.test.mjs` | `SLICE_FRAMES` in `harness/media/render-page.mjs` |
| WebGL captured at full size, scaled in ffmpeg | `render-draft-halfsize-determinism.test.mjs` | [a916e59d6](https://github.com/Vandit1604/vawe/commit/a916e59d6), `398fd7a7c` |
| Only your own tabs attached | render beside a compare run | `harness/media/preview-server.mjs` |

## Deeper posts on each source of drift

- [Seed Math.random and freeze Date.now: a virtual clock](/blog/page-clock): a reference for every API the clock replaces.
- [How to seek CSS animations frame by frame](/blog/seekable-css): forward and backward seeks, cancelled animations and fonts.
- [Puppeteer deviceScaleFactor: lay out big, capture small](/blog/drafts-lie): why a half-size draft must not shrink the viewport.
- [Puppeteer default viewport: the 800x600 bug in our renders](/blog/judge-defect): a shared browser, a tab we did not own, and wrong frames.

Two lessons sit under all of them. Name the cause before you pick a fix: for the filter case the cause was the compositor, and no change to the page would have helped. And never derive anything that affects pixels from the machine, such as the worker count.

For where this matters to buyers, see [when determinism matters](/when-determinism-matters) and the [determinism docs](/docs/determinism). How this compares with other tools is on [Remotion alternatives](/remotion-alternatives).
