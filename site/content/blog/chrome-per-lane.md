---
title: "Faster headless Chrome rendering: one browser per lane"
description: "Rendering video in headless Chrome, our four workers shared one browser and one queue. One Chrome per lane cut capture of a 20 s film from 140 s to 47 s."
date: 2026-10-08
updated: 2026-10-13
section: speed
tags: "headless chrome, puppeteer, rendering, parallelism, performance"
keywords: "headless chrome render video, puppeteer parallel screenshots, chrome per worker, html to video render speed"
hero: /blog/chrome-per-lane/hero.svg
heroAlt: "Left: four capture lanes feed one queue that feeds one Chrome. Right: four lanes each feed their own Chrome."
---

Capture of one 20 s film fell from 140 s to 47 s, about 3x, when we gave each render worker its own headless Chrome instead of one shared browser. A second change, decoding screenshots with `Buffer`, made capture 11% faster on a quiet machine and about 40% faster under load.

Before the change, our four workers were one worker taking turns. They shared a browser, and every screenshot, page open and page close went through one queue. Adding cores gave us a longer line.

## The renderer under test

[vawe](https://github.com/Vandit1604/vawe) turns an HTML page into video by seeking the page to each frame and taking a screenshot. A 60 fps film is thousands of screenshots, so the renderer splits the film into slices and runs several lanes (workers) at once. The default lane count is `min(4, cpus - 1)`.

The lanes ran in parallel on paper. In practice they all talked to one browser, and the code serialized the calls that could not safely overlap. The code comment at the change says it in one line: lanes in one browser queue every screenshot, open and close, and a 20 s film captured 3x slower.

## Two conditions before measuring

A speed number means nothing if the output changes with it, so two earlier changes came first.

Fixed slices. Capture slices are 60 frames long, each on a fresh page, so the pixels do not depend on how many workers ran. `--workers` changes the speed and never the frames ([09177897c](https://github.com/Vandit1604/vawe/commit/09177897c)).

Focus emulation. The tab that holds browser focus rasterizes edges slightly differently from the others (sub-pixel text and shape edges, SSIM 0.9994), so which slice was in front changed pixels with `--workers`. We emulate focus so every tab renders the same ([169fdc5d6](https://github.com/Vandit1604/vawe/commit/169fdc5d6)). Both appear in our [deterministic rendering checklist](/blog/determinism).

## The change: each lane launches its own Chrome

A final now opens one Chrome per worker. A lane launches its own browser and serves the repo to it, takes slices from the shared list, and closes the browser when it runs out. Inside a lane there is no queue: each lane calls the page directly. Drafts keep the shared browser and are unchanged ([5ec9d4712](https://github.com/Vandit1604/vawe/commit/5ec9d4712)).

![Four lanes sharing one queue and one Chrome, compared with four lanes that each own a Chrome.](/blog/chrome-per-lane/hero.svg)

## The second hot spot: base64 on the shared Node thread

With real parallelism, a new cost showed. `page.screenshot` decoded its base64 payload with a per-character `Uint8Array.from`. That is about 70 ms per 1 MB PNG, on the one Node thread that all lanes share.

We take the base64 string and decode it with `Buffer`. The bytes are identical ([71d432bde](https://github.com/Vandit1604/vawe/commit/71d432bde)).

The same commit fixed a bug in the old design that we had worked around. Opening or closing a page while another lane took a screenshot gave that frame a corrupt tile. In the shared browser, page open and close now join the same queue as the shots, so no lane opens a page during another lane's screenshot.

## Results

| Change | Before | After |
|---|---|---|
| One Chrome per lane, capture of one 20 s film | 140 s | 47 s (about 3x) |
| `Buffer` decode, quiet machine | baseline | 11% faster |
| `Buffer` decode, under load | baseline | about 40% faster |
| `Uint8Array.from` decode cost | about 70 ms per 1 MB PNG | removed |

![Capture time 140 s with one shared Chrome and 47 s with one Chrome per lane; Buffer decode 11% faster on a quiet machine and about 40% faster under load.](/blog/chrome-per-lane/chart.svg)

We quote the numbers as the commits record them.

## What the benchmark does not show

The numbers come from one film on one machine. We did not sweep film types or core counts.

Drafts still share one browser, so the speed-up is for finals. The lane serves the repo to its own Chrome, so a page outside the repo root falls back to the shared browser. Each extra Chrome costs memory, so the lane count has to follow free memory and process slots. That became its own piece of work, in [too many headless Chrome processes: slots and a reaper](/blog/slots-reaper).

## Reproduce it

- The lane code is in `harness/media/render-page.mjs`: `openLane`, `openLanePage`, and the lane loop in `runShards`.
- `tests/media/render-final-lanes.test.mjs` checks a Chrome per lane.
- Render a final with `--workers 1` and with `--workers 4` on the same page: the frames must match and only the time should change.

If your parallel workers share one browser, look for a lock around "screenshot". The symptom is that adding workers does nothing.

## More on render speed and reliability

Each post below takes one part of the same pipeline:

- [Puppeteer screenshot speed: what helped, what we undid](/blog/fast-drafts): JPEG capture, GPU compositing and slice sizes for drafts.
- [Too many headless Chrome processes: slots and a reaper](/blog/slots-reaper): two render slots, a lane budget and a reaper for orphaned Chromes.
- [Puppeteer hangs: a 60 s watchdog that names the step](/blog/stall-watchdog): renders that hung for 600 s and 400 s.
- [Resumable video rendering: the final that died at 97%](/blog/resumable-finals): slice markers, retries and a content key.
- [x264 preset fast vs medium: 25% faster, 15% larger](/blog/encode): the encode after the capture.
- [Motion blur for HTML animation: subframes by travel](/blog/motion-blur): where the extra screenshots go.

If you are choosing a renderer, the page-seek model is the reason a screenshot per frame is the cost that matters. [Remotion alternatives](/remotion-alternatives) and [HyperFrames alternatives](/hyperframes-alternatives) set out how vawe compares.
