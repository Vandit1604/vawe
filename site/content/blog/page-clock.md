---
title: "Seed Math.random and freeze Date.now: a virtual clock"
description: "Seed Math.random from the seek time and fake Date.now, timers and requestAnimationFrame: a reference for the 75-line virtual clock in every page."
date: 2026-10-08
updated: 2026-10-13
section: architecture
tags: "virtual clock, math.random seed, deterministic rendering, headless chrome, javascript"
keywords: "math random seed javascript, virtual clock javascript, fake date.now, requestanimationframe seek"
hero: /blog/page-clock/hero.webp
heroAlt: "A seek time t enters a virtual clock that sets Date, performance.now, requestAnimationFrame, timers and Math.random, and one identical frame comes out."
---

Below is every browser API that our virtual clock replaces, what a page sees from each one, and the rules that make a seeded `Math.random` safe for video. The clock is `core/engine/page-clock.js`, 75 lines of JavaScript that run before any of the page's own scripts. With it, a page can call `Math.random()` and `Date.now()` and still render the same video twice.

It is one item of our [deterministic rendering checklist for headless Chrome](/blog/determinism). The rule behind it: every frame is a pure function of `t`, the film time in seconds. Ask for the frame at 4.2 s twice, in any order, and get the same pixels.

## What the clock replaces

| API | What the page sees |
|---|---|
| `Date`, `performance.now` | film time in milliseconds |
| `requestAnimationFrame` | callbacks queue up and flush once per `set(t)`, with film time |
| `setTimeout`, `setInterval` | fire when `set(t)` passes their due time, in due order |
| `Math.random` | a mulberry32 generator, reseeded from `t` on every `set(t)` |
| `window.__pageClock.real` | the real timers, kept for the renderer |
| `pending()` | the count of animation-frame callbacks and timers still waiting |

## How it gets in first

The renderer injects the clock with Puppeteer's `evaluateOnNewDocument`, so it runs before any page script. A script that loads later would already have captured the real functions.

## Date and performance.now

Both report film time in milliseconds. A page that measures elapsed time with `Date.now() - start` gets the elapsed film time, whatever the render order.

## requestAnimationFrame

Callbacks queue up and flush once per `set(t)`, called with the film time. A page that draws in a rAF loop draws exactly one frame per seek.

## setTimeout and setInterval

When `t` jumps ahead, every timer whose due time has passed fires, earliest first. One seek fires at most 1,000 timers, so a tight interval cannot hang the render.

## Math.random, seeded from t

`Math.random` is a mulberry32 generator, reseeded from `t` on every `set(t)`. The seed is derived from the time, so the same `t` always gives the same sequence, no matter what was rendered before.

Seed from time, not from a counter. A counter depends on how many calls came before, which depends on what you rendered first. With the seed tied to `t`, a page can scatter particles with `Math.random()` and they land in the same places every time.

## Fractional seconds, not frame numbers

The clock was lifted from one in the old JSON engine, which keyed on frame numbers. A page is seeked in fractional seconds because we render subframe motion blur and 59.94 fps masters, so the clock moved to `t`. Subframe blur is explained in [motion blur for HTML animation](/blog/motion-blur).

## The real timers, and pending()

The renderer needs a real wait to know a frame has painted, so the real timers stay reachable as `window.__pageClock.real`.

`pending()` reports the number of animation-frame callbacks and timers still waiting. At zero, only animations can change the page, so the renderer can reuse a capture when their state repeats.

## Why we did not ban the APIs

Agents write what they know, and that includes `setTimeout` and `Math.random`. Our rule is that if something an agent writes naturally fails, that is a framework bug, and a ban on common APIs breaks that rule. Running the page in real time and recording it was the other option, but every render would then be as slow as the film, and frames would depend on how busy the machine is.

## What the clock does not cover

The clock handles scripts. CSS animations and Web Animations run on the document timeline, a second clock the browser drives. We freeze it by setting the animation playback rate to 0 (commit `1454df446`), because the compositor rasterized animated layers against real time before the first seek: a first seek 1.5 s after load painted different edge pixels than one at 0.05 s. The seek side is in [how to seek CSS animations frame by frame](/blog/seekable-css).

![Six boxes in order: set the clock, call window.seek, seek animations, run onFrame hooks, settle, screenshot.](/blog/page-clock/diagram.webp)

## The test that holds it

We have no before-and-after number for the clock. What we have is `tests/media/render-page-determinism.test.mjs`. It renders each fixture page twice and compares the frame hashes from ffmpeg. One fixture is a `window.seek(t)` canvas page. The other reads `Date.now`, `performance.now` and `Math.random`. The test checks that the two renders match, that there are five frames, and that the frames are not all identical, so the page really moved with the seek time.

Determinism is also the one thing in vawe that can refuse a render; everything else advises, as [AI agent guardrails: when a check should refuse](/blog/advise-refuse) explains. The other sources of drift, from GPU compositing to tab focus, are in the [headless Chrome determinism checklist](/blog/determinism).

## Source files

| File or commit | What it holds |
|---|---|
| `core/engine/page-clock.js` | the virtual clock (75 lines) |
| `core/engine/page-seek.js` | the in-page seek that sets the clock and seeks every animation |
| `tests/media/render-page-determinism.test.mjs` | render twice, compare frame hashes |
| [`5a271307f`](https://github.com/Vandit1604/vawe/commit/5a271307f) (2026-09-30) | the virtual clock, `window.seek`, the settle barrier, aspect and a 60 fps final |
| [`f8eff86b0`](https://github.com/Vandit1604/vawe/commit/f8eff86b0) (2026-09-30) | `page-clock` added |
| [`1454df446`](https://github.com/Vandit1604/vawe/commit/1454df446) (2026-10-08) | freeze the document timeline |

User-facing rules are in the [determinism docs](/docs/determinism), and the public explanation is on [/determinism](/determinism).
