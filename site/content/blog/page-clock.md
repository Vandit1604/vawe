---
title: "Deterministic rendering: time is the seek, never the clock"
description: "How a 75-line virtual clock makes a web page that calls Math.random and Date.now render the same video twice, and the test that checks it on every run."
date: 2026-10-08
section: architecture
tags: "deterministic rendering, virtual clock, headless chrome, web animations, architecture"
keywords: "deterministic rendering, virtual clock javascript, headless chrome render video, math.random seed, requestanimationframe"
hero: /blog/page-clock/hero.svg
heroAlt: "A seek time t enters a virtual clock that sets Date, performance.now, requestAnimationFrame, timers and Math.random, and one identical frame comes out."
---

Your page can call `Math.random()` and `Date.now()` and still render the same video twice. We got there with 75 lines of JavaScript that run before any of the page's own scripts. This post explains the idea behind deterministic rendering for a web page, shows how our virtual clock works, and describes the check that keeps it honest. If you render video from a browser, the same trick should work for you.

## The problem: a page is full of wall-clock behaviour

A web page does not know it is being filmed. It reads the time from `Date.now()` and `performance.now()`. It schedules work with `setTimeout`, `setInterval` and `requestAnimationFrame`. It picks a random starting position with `Math.random()`. Each of these depends on when you happen to run the page.

That is fine when a person watches. It is not fine when you capture a video frame by frame. If frame 120 is a function of "how long since the page loaded", then rendering frame 120 on its own, or rendering in a different order, or rendering with parallel workers, gives you a different picture. A render you cannot repeat is a render you cannot debug, cache or split across machines.

The rule we wanted is simple: every frame is a pure function of `t`, the film time in seconds. Ask for the frame at 4.2 s twice, in any order, and get the same pixels.

## What we tried

The obvious fix is to tell authors not to use those APIs. We did not want that. Agents write what they know, and that includes `setTimeout` and `Math.random`. Our rule is that if something an agent writes naturally fails, that is a framework bug. A ban on common APIs is the opposite of that rule.

The second option is to run the page in real time and record it. That makes every render as slow as the film, and frames then depend on how busy the machine is.

So we replaced the clock instead of banning it.

## What we built: a clock the renderer owns

`core/engine/page-clock.js` is injected with `evaluateOnNewDocument`, so it runs before any page script. After that the page sees time and randomness as functions of the seek.

| API | What the page sees |
|---|---|
| `Date`, `performance.now` | film time in milliseconds |
| `requestAnimationFrame` | callbacks queue up and flush once per `set(t)`, with film time |
| `setTimeout`, `setInterval` | fire when `set(t)` passes their due time, in due order |
| `Math.random` | a mulberry32 generator, reseeded from `t` on every `set(t)` |

Reseeding from `t` is the part that makes random safe. The seed is derived from the time, so the same `t` always gives the same sequence, no matter what was rendered before. A page can scatter particles with `Math.random()` and they land in the same places every time.

Three details matter more than they look:

- It keys on fractional seconds, not frame numbers. The clock was lifted from one in the old JSON engine, which keyed on frame numbers. A page is seeked in fractional seconds because we render subframe motion blur and 59.94 fps masters, so the clock moved to `t`.
- It fires timers in due order, with a cap. When `t` jumps ahead, every timer whose time has passed fires, earliest first. One seek fires at most 1,000 timers, so a tight interval cannot hang the render.
- The real timers stay reachable as `window.__pageClock.real`, because the renderer itself needs a real wait to know a frame has painted.

The clock also reports `pending()`, the number of animation-frame callbacks and timers still waiting. At zero, only animations can change the page, so the renderer can reuse a capture when their state repeats.

The clock handles scripts. The other half is CSS and Web Animations, which the browser drives from the document timeline. We freeze that timeline too. The browser's compositor was rasterizing animated layers against real time before our first seek, so a first seek at 1.5 s after load painted different edge pixels than a first seek at 0.05 s. Setting the playback rate to 0 fixes it (commit `874af4972`). That story, and the backward-seek bugs, are in [Making CSS animations seekable](/blog/seekable-css).

![Six boxes in order: set the clock, call window.seek, seek animations, run onFrame hooks, settle, screenshot.](/blog/page-clock/diagram.svg)

## The measured result

We do not have a before-and-after number for the clock, and we will not make one up. What we have is a test. `tests/media/render-page-determinism.test.mjs` renders each fixture page twice and compares the frame hashes from ffmpeg. One fixture is a `window.seek(t)` canvas page. The other reads `Date.now`, `performance.now` and `Math.random`. The test checks three things: the two renders match, there are five frames, and the frames are not all identical, so the page really moved with the seek time.

Determinism is also the one thing in vawe that can refuse a render. Everything else advises, which we explain in [Advise on everything, refuse on exactly three things](/blog/advise-refuse).

## What we would tell you if you render video from a browser

- Replace the clock; do not ask for good behaviour. Authors and agents will use `setTimeout`. Make it deterministic for them.
- Seed random from time, not from a counter. A counter depends on how many calls came before, which depends on what you rendered first.
- Inject before the page runs. `evaluateOnNewDocument` is the right place. A script that loads later has already captured the real functions.
- Freeze the document timeline. CSS animations are a second clock. If you leave it running, you still have a render that depends on timing.
- Test it by rendering twice. Hash the frames and compare. It is cheap, and it catches the leaks.

You can read the public explanation on [/determinism](/determinism) and the longer note on [when determinism matters](/when-determinism-matters). The user-facing rules are in the [determinism docs](/docs/determinism). The source is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe), and we compare approaches on [/remotion-alternatives](/remotion-alternatives).

## In the code

- `core/engine/page-clock.js`: the virtual clock (75 lines).
- `core/engine/page-seek.js`: the in-page seek that sets the clock and seeks every animation.
- `tests/media/render-page-determinism.test.mjs`: render twice, compare frame hashes.
- [`f92f5f59c`](https://github.com/Vandit1604/vawe/commit/f92f5f59c) (2026-09-30): the virtual clock, `window.seek`, the settle barrier, aspect and a 60 fps final.
- [`06d63c5ce`](https://github.com/Vandit1604/vawe/commit/06d63c5ce) (2026-09-30): `page-clock` added.
- [`874af4972`](https://github.com/Vandit1604/vawe/commit/874af4972) (2026-10-08): freeze the document timeline so a frame does not depend on the time before the first seek.
