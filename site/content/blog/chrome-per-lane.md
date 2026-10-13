---
title: "Headless Chrome video rendering: 4 workers, 1 lock"
description: "Our four render workers shared one browser and took turns at a single queue. One headless Chrome per lane cut capture from 140 s to 47 s on a 20 s film."
date: 2026-10-08
section: speed
tags: "headless chrome, puppeteer, rendering, parallelism, performance"
keywords: "headless chrome render video, puppeteer screenshot parallel, html to video, chrome per worker, render speed"
hero: /blog/chrome-per-lane/hero.svg
heroAlt: "Left: four capture lanes feed one queue that feeds one Chrome. Right: four lanes each feed their own Chrome."
---

Our four render workers were really one worker taking turns. They shared a browser, and every screenshot, page open and page close went through one queue. Adding cores did nothing. When we gave each worker its own Chrome, capture for one 20 s film dropped from 140 s to 47 s.

This is the story of a small change in a headless Chrome video renderer, and why sharing less helped more than tuning.

## The problem

vawe renders a film by seeking an HTML page to each frame and taking a screenshot. A 60 fps film is thousands of screenshots, so the renderer splits the film into slices and runs several lanes (workers) at once. The default is `min(4, cpus - 1)`.

The lanes ran in parallel on paper. In practice they all talked to one browser, and the code serialized the calls that could not safely overlap. Screenshots, page opens and page closes shared a single queue. Four lanes waiting on one queue is one lane of work. More cores gave us a longer line, not a faster one.

## Two changes before this one

Two earlier changes made this one possible.

Fixed slices. Capture slices are 60 frames long, each on a fresh page, so the pixels do not depend on how many workers ran. `--workers` changes the speed and never the frames ([b70389ff6](https://github.com/Vandit1604/vawe/commit/b70389ff6)).

Focus emulation. The tab that holds browser focus rasterizes edges slightly differently from the others (sub-pixel text and shape edges, SSIM 0.9994), so which slice was in front changed pixels with `--workers`. We emulate focus so every tab renders the same ([586d132c4](https://github.com/Vandit1604/vawe/commit/586d132c4)).

Both are about [determinism](/determinism): the number of workers must not change the film.

## What we built: one headless Chrome per lane

A final now opens one Chrome per worker. A lane launches its own browser and serves the repo to it, takes slices from the shared list, and closes the browser when it runs out. Inside a lane there is no queue: each lane calls the page directly. Drafts keep the shared browser and are unchanged ([8efe38cad](https://github.com/Vandit1604/vawe/commit/8efe38cad)).

![Four lanes sharing one queue and one Chrome, compared with four lanes that each own a Chrome.](/blog/chrome-per-lane/hero.svg)

The code comment that sits at the change says it in one line: lanes in one browser queue every screenshot, open and close, and a 20 s film captured 3x slower.

## What this does not change

Drafts still share one browser, so the speed-up is for finals. The lane serves the repo to its own Chrome, so a page outside the repo root falls back to the shared browser. Each extra Chrome costs memory. And the numbers come from one film on one machine: we did not sweep film types or core counts.

## The second hot spot: base64

With real parallelism, a new cost showed. `page.screenshot` decoded its base64 payload with a per-character `Uint8Array.from`. That is about 70 ms per 1 MB PNG, on the one Node thread that all lanes share.

We take the base64 string and decode it with `Buffer`. The bytes are identical. Capture got 11% faster on a quiet machine and about 40% faster under load ([4ffdb23b4](https://github.com/Vandit1604/vawe/commit/4ffdb23b4)).

The same commit fixed a bug in the old design that we had worked around. Opening or closing a page while another lane took a screenshot gave that frame a corrupt tile. In the shared browser, page open and close now join the same queue as the shots, so no lane opens a page during another lane's screenshot.

## The measured result

![Capture time 140 s with one shared Chrome and 47 s with one Chrome per lane; Buffer decode 11% faster on a quiet machine and about 40% faster under load.](/blog/chrome-per-lane/chart.svg)

- Capture, one 20 s film: 140 s to 47 s, about 3x.
- Buffer decode: 11% faster on a quiet machine, about 40% under load.

We quote both as the commits record them.

## What we would tell you if you build this

- If your parallel workers share one browser, check for a queue. A lock around "screenshot" is easy to add and easy to forget. The symptom is that adding workers does nothing.
- Give each worker its own browser and its own page, and measure. A Chrome costs memory, so the lane count has to follow free memory and process slots. That became its own piece of work, in [render slots and a lane budget](/blog/slots-reaper).
- Make the output independent of the worker count before you parallelize, with fixed slices and a single focus state. Otherwise you cannot tell a speed-up from a different film.
- Look at the single thread afterwards. Once the lanes ran in parallel, a base64 decode on the shared Node thread was suddenly 70 ms per frame, and it became the next cost to remove.
- If you are choosing a renderer, the page-seek model is the reason a screenshot per frame is the cost that matters. [Remotion alternatives](/remotion-alternatives) and [HyperFrames alternatives](/hyperframes-alternatives) set out how vawe compares.

For the next problem in the same code, a final that loses one slice and the whole render with it, read [resumable finals](/blog/resumable-finals).

## In the code

- `harness/media/render-page.mjs`: `openLane`, `openLanePage`, and the lane loop in `runShards`
- `tests/media/render-final-lanes.test.mjs`: the test for a Chrome per lane
- [8efe38cad](https://github.com/Vandit1604/vawe/commit/8efe38cad): one Chrome per worker, 140 s to 47 s
- [4ffdb23b4](https://github.com/Vandit1604/vawe/commit/4ffdb23b4): Buffer decode and the open/close queue
- [b70389ff6](https://github.com/Vandit1604/vawe/commit/b70389ff6): fixed 60-frame slices and `--workers`
- [586d132c4](https://github.com/Vandit1604/vawe/commit/586d132c4): focus emulation

The repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).
