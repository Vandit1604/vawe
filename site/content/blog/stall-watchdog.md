---
title: "Puppeteer hangs: a 60 s watchdog that names the step"
description: "Two Puppeteer renders hung silently for 600 s and 400 s, then passed on retry. A 60 s watchdog now names the stuck step; a healthy step takes 0.38 s."
date: 2026-10-10
updated: 2026-10-13
section: speed
tags: "puppeteer, headless chrome, watchdog, timeouts, rendering"
keywords: "puppeteer hangs, puppeteer timeout, headless chrome hang, document.fonts.ready hang"
hero: /blog/stall-watchdog/hero.webp
heroAlt: "Flow: each slice step marks progress, an idle timer fires at 60 seconds, the worker, frame and step are printed, the page is replaced and the slice runs again, up to 4 attempts."
---

| | |
|---|---|
| Impact | Two renders hung with no output, one for 600 s and one for 400 s. Both passed when run again. |
| Why it was silent | The only bound on a DevTools protocol call was the protocol timeout, 30 minutes. |
| One cause found | `awaitFonts` awaited `document.fonts.ready` before its own 10 s deadline started. |
| Fix | A 60 s per-slice watchdog that names the stuck step and retries on a fresh page, up to 4 attempts ([`72a65ec3a`](https://github.com/Vandit1604/vawe/commit/72a65ec3a), [`7fcf92913`](https://github.com/Vandit1604/vawe/commit/7fcf92913)). |

A Puppeteer hang that fixes itself on retry is the worst kind. You cannot reproduce it, and an agent waiting on the render cannot tell whether to wait or kill the process. This postmortem covers how our renders hung, the font bug behind one hang, and the watchdog that bounds the rest. It is one piece of our [headless Chrome rendering pipeline](/blog/chrome-per-lane).

<figure>

![Watchdog flow: mark progress, idle timer at 60 s, print worker, frame and step, retry on a fresh page, error after 4 stalls](/blog/stall-watchdog/hero.webp)

</figure>

## How a render hung for 600 seconds

Our renderer drives headless Chrome through Puppeteer. A final is cut into slices of frames, and each worker takes a slice and loops over seek, settle and screenshot. Every call to the browser goes through the DevTools protocol.

When a call never returned, nothing happened for up to half an hour. The agent saw no output and had no way to know whether it was a slow frame or a dead one. Twice it was dead: 600 s and 400 s of silence, then a clean pass on the next run.

## Root cause of one hang: fonts.ready with no deadline

Our font wait, `awaitFonts` in `core/engine/page-seek.js`, awaited `document.fonts.ready` before its own 10-second deadline started. If a face first shown mid-film never arrived, `fonts.ready` never resolved, so the deadline never ran.

A new test showed that the old code sat in `seek` until the watchdog fired. The fix races `fonts.ready` against the deadline too. Any wait that has no deadline of its own deserves the same suspicion.

That explained one hang. The next one could come from anywhere, so we also needed a general bound.

## The fix: a watchdog that names the step

Commit `72a65ec3a` adds a watchdog around every slice. Before each await, the slice calls `mark('<step>')` with a name such as `seek`, `screenshot`, `settle` or `open page`. A timer checks every second (or a quarter of the limit, if smaller) how long the slice has gone without a new mark. After 60 seconds with no progress it prints one line:

```
render stalled: worker 1, frame 6 (0.20 s), in seek for 60 s; retrying slice 0.00-0.50s on a fresh page (attempt 2 of 4)
```

It then closes the stuck page, opens a fresh one and runs the slice again from its first frame. A seek is a pure function of time, so a rerun gives the same pixels. If your slices are not pure functions of time, a restart will hide the bug instead.

The first version restarted a slice once and made a second stall an error. When we made finals resumable (`7fcf92913`), the limit became 4 attempts. If every attempt stalls, the render fails with an error that names the step and lists the usual causes: a `window.seek` or `onFrame` hook that never resolves, a font or image that never loads, or a starved browser.

## How we chose 60 seconds

We measured before choosing. The slowest legitimate step we saw was 0.38 seconds, a screenshot in a colour-sting draft. A 60-second limit is about 160 times that, so a loaded laptop will not trip it, and it is far below either hang.

<figure>

![Bar chart in seconds: slowest real step 0.38, stall limit 60, hangs of 400 and 600](/blog/stall-watchdog/seconds.webp)

</figure>

The limit is a default (`STALL_MS`), and `renderPage` takes a `stallMs` option. Our stall test, `tests/media/render-stall.test.mjs`, renders the same page once with no stall to learn its capture time, then sets its limit to twice that, with a floor of 1.5 seconds. That keeps the test fast on a quick machine and stable on a slow one, the approach described in [how to speed up e2e tests](/blog/test-suite).

## Why the hang went unnoticed

Nothing in the loop knew what "progress" meant. The protocol timeout bounded a single call at 30 minutes, which is longer than any agent will wait, and the render printed nothing while it waited. A hang and a slow frame looked the same from outside.

## Follow-ups

- A page with several WebGL canvases slows down over a long render until one protocol call times out. Commit [`3df26fcd0`](https://github.com/Vandit1604/vawe/commit/3df26fcd0) recycles the capture page every 300 subframes (`RECYCLE_SUBFRAMES`) and raises the protocol timeout to 30 minutes.
- Puppeteer's navigation limit is 30 seconds. On two drafts beside a loaded machine it fired when nothing was wrong. Now `gotoLoaded` checks why the load stalled: an unfinished request, a blocked main thread or a console error fails at once with the reason. If nothing explains it, the load retries with a 120-second limit ([`6bea1e806`](https://github.com/Vandit1604/vawe/commit/6bea1e806)).
- We have no count of how often the watchdog has fired since. The render summary line lists any retried slices, and we have not summed them.

The retry is safe because a seek is a pure function of time, which our [virtual clock reference](/blog/page-clock) explains. How a final survives a slice that fails for good is in [resumable video rendering: the final that died at 97%](/blog/resumable-finals), and the [troubleshooting docs](/docs/troubleshooting) list the usual causes. The rest of the pipeline is mapped in [faster headless Chrome rendering](/blog/chrome-per-lane).
