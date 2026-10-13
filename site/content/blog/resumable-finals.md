---
title: "Resumable video rendering: the final that died at 97%"
description: "Resumable rendering for headless Chrome video: a final died at 97% and left 3.7 GB of frames. Slice markers, four retries and a content key fix it."
date: 2026-10-10
updated: 2026-10-13
section: speed
tags: "resumable rendering, checkpoints, headless chrome, retries, agents"
keywords: "resumable rendering, resume failed render, render checkpoint, ffmpeg mux failure"
hero: /blog/resumable-finals/hero.webp
heroAlt: "Eight capture slices: six have finish markers, one is marked lost after four attempts, one has not run. A resume skips the six and runs the last two."
---

Our worst render died at 97%, after 20,768 of 21,504 subframes, and the only record of it was 3.7 GB of orphaned PNGs on disk. Nothing could tell which film they belonged to, so nothing could reuse them. In one later session, failed finals cost 49 minutes, 45% of the session. This case study follows how we made a final render resumable, and the three ways it still failed after that.

A final render in [vawe](https://github.com/Vandit1604/vawe) takes about 16 minutes. The renderer cuts the film into slices, captures each slice on a page in headless Chrome, and encodes at the end. How those slices run in parallel is in [faster headless Chrome rendering: one browser per lane](/blog/chrome-per-lane).

## A final with no memory

Before the change, if a slice lost its page twice, the final exited with code 2 and left its frames behind. Nothing reported them, and a new run started from zero in a new place. A directory of frames with no key can only be deleted.

## Markers, keys and four attempts

Commit [7fcf92913](https://github.com/Vandit1604/vawe/commit/7fcf92913) changed four things in `render-page.mjs`.

The frames directory is named by the page and a key of its settings, so the same film at the same settings finds its own frames. A finished slice leaves a marker, and the next run skips every slice that has one. A slice gets four attempts (`SLICE_ATTEMPTS = 4`), each on a fresh page, since a page that failed once is a bad page. Only after the fourth does the render throw.

A failed final also records its percent and its reason in the ship event. `ship --status`, `dev`, `runs` and `new` print one line that names the failure and the command that resumes it.

After a successful encode the frames are removed. Frames directories untouched for three days are swept, so a forgotten failure does not keep gigabytes forever.

![Eight capture slices: six with markers, one lost after four attempts, one not run. A resume skips the six.](/blog/resumable-finals/hero.webp)

## The key that moved under a rebase

The marker design assumed the key would be stable. It was not. The key hashed the size and the mtime of every file in the page folder and in `core/`. A checkout, a rebase or an edit by another session changed the hash between a failed final and its resume, so the resume opened a new directory and captured from 0%.

We changed the hash to cover file bytes instead ([7d840bb3e](https://github.com/Vandit1604/vawe/commit/7d840bb3e)). Anything git can touch, such as mtimes, paths or sizes, will move a key; content will not.

![Before: the key hashed size and mtime, so a rebase changed it and the resume started over. After: the key hashes file bytes, so the same content finds the same directory.](/blog/resumable-finals/key.webp)

## A dead browser and a dead mux

If a lane's browser died, the retry had no page to use. A final now opens a new Chrome for that lane ([b872c194a](https://github.com/Vandit1604/vawe/commit/b872c194a)).

Some finals were 100% captured and then lost at the last step, mixing the page audio. We now read the page audio before the capture, keep the frames when the mux fails, and record the real stage in the ship event ([e1b944267](https://github.com/Vandit1604/vawe/commit/e1b944267)). `tests/media/render-mux-retry.test.mjs` covers the retry, and `tests/media/render-resume.test.mjs` covers the resume.

## Where the 49 minutes went

We read the trace of one 110-minute session. Three of its five ships failed. The failed finals cost 2,967 s, which is 49 minutes and 45% of the session.

![A 110 minute session bar: 49 minutes in failed finals, 61 minutes everything else.](/blog/resumable-finals/cost.webp)

Two of the failures sat at "0%" in the record, after the log had shown `capturing 19198/19200`. The capture was finished. The last step lost its browser frame while mixing the audio ("detached Frame"), and the ship record said 0%. The two ships ran for 1,411.5 s and 1,034.2 s and both ended with a recorded failure at 0. The agent also wrote a keep-alive of its own to stop the preview server from going idle.

So the record had a bug as well as the render. A film that is fully captured should not be reported as 0%, because the next person or agent reads that percent to decide whether to start over. The mux commit records the real stage. The cheapest work to protect turned out to be the frames, since the captures were fine and the audio mux killed the render. The wider trace review that this session came from is in [reading AI agent traces](/blog/trace-reviews).

## What we still do not know

We did not measure the time the fixes save, and the commit messages carry no figure for it. What we have is the cost before: 49 minutes in one session, and a 97% film that would now resume instead of being lost. A step that hangs rather than fails is a separate problem, which [the 60 s Puppeteer watchdog](/blog/stall-watchdog) bounds, and the machine-wide side is in [slots and a reaper for headless Chrome](/blog/slots-reaper). The rendering model that makes a resume safe is on [/determinism](/determinism), and the other speed and reliability fixes in the same renderer are collected in the [one-browser-per-lane benchmark](/blog/chrome-per-lane).
