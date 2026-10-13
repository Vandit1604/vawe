---
title: "x264 preset fast vs medium: 25% faster, 15% larger"
description: "An x264 preset comparison on a dark 1080p ramp: fast is 25% faster than medium for a 15% larger file, 49 dB PSNR apart. Plus dither and 10-bit AV1."
date: 2026-10-11
updated: 2026-10-13
section: speed
tags: "x264, av1, ffmpeg, encoding, banding, dither"
keywords: "x264 preset comparison, x264 fast vs medium, ffmpeg dither banding, av1 10 bit web copy"
hero: /blog/encode/hero.svg
heroAlt: "Pipeline: captured frames are blended in one ffmpeg pass, dithered and encoded with x264 preset fast as the master, then encoded again as a 10-bit AV1 web copy."
---

x264 preset fast encoded our master 25% faster than preset medium, made a 15% larger file, and landed 49 dB PSNR away from it. Preset faster was about twice as quick again, and we rejected it because it banded: a 54 px flat run on a dark ramp. This benchmark covers that trade and three encode decisions measured with it: dither strength, a 10-bit AV1 web copy, and a 2 MB size budget for gallery clips.

Encoding is the last stage of our [headless Chrome video rendering pipeline](/blog/chrome-per-lane). A final captures lossless PNG frames, blends the subframes for [motion blur](/blog/motion-blur), and encodes them.

<figure>

![Encode pipeline: lossless frames, one x264 master with dither, and a separate 10-bit AV1 web copy](/blog/encode/hero.svg)

</figure>

## Setup

- Input for banding: a 1080p dark ramp. 8-bit x264 shows visible steps on a dark ramp, so it is the worst case for this encoder.
- Input for the web copy: the ramp plus two 5-second films.
- Master settings under test: CRF 16 with `aq-mode=3`, which spends bits on dark flat areas where 8-bit video bands.
- Drafts are out of scope: they use ultrafast at CRF 20 and skip the dither, so draft pixels stay comparable run to run.

## Method: the longest flat run

One number judged banding: the longest flat run, in pixels, on the dark ramp. A flat run is a band you can see. `tests/media/render-banding.test.mjs` measures it. Presets were compared on three axes at once: time, file size and PSNR against medium.

## Results

| Decision | What we measured |
| --- | --- |
| x264 preset fast vs medium | 25% faster, 15% larger, 49 dB PSNR apart |
| preset faster | about 2x quicker, 54 px flat run, rejected |
| dither strength 3 + `aq-mode=3` | 20 px longest flat run, half the size of strength 4 with `-tune film` |
| dither strength 2 | did not survive x264's smoothing on a test gradient |
| AV1 10-bit web copy | 1.7 and 3.6 MB for two 5 s films, 20 px flat run |
| x264 8-bit at the same size (CRF 22) | 121 px flat run |
| undithered 8-bit | 98 px flat run |
| lossless source | 14 px flat run |
| clip budget | 2 MB, CRF raised in steps of 3 from 16, capped at 31 |

<figure>

![Bar chart of the longest flat run on a dark ramp in pixels: lossless 14, AV1 10-bit 20, x264 dithered 20, preset faster 54, undithered 8-bit 98, x264 CRF 22 121](/blog/encode/flat-run.svg)

<figcaption>Lower is better. Values are from comments in render-page.mjs and from the render-banding test.</figcaption>
</figure>

## The master: preset fast with seeded dither

Commit `a99043c5c` moved the master from preset medium to preset fast. Before the encode, the final adds noise, `noise=alls=3:allf=t:all_seed=7`, which is dithering. The seed is fixed, so the master is repeatable.

## The web copy: 10-bit AV1 instead of dither

For the copy the site serves we skipped dither and used a 10-bit encode, which does not band. Ship writes the master first, then a second pass encodes an AV1 web copy with SVT-AV1 at CRF 30, preset 8, in 10-bit `yuv420p10le`, with no dither ([33038e674](https://github.com/Vandit1604/vawe/commit/33038e674)).

The extra encode no longer adds to the wait. Commit `8975651a5` makes the render report the mp4 as soon as the master is muxed, and the ship job starts the judge on it while the web copy encodes. `ship --status --wait` prints that the film is rendered but not judged, then the verdict.

## The gallery: a 2 MB budget per clip

Every move on the [moves gallery](/moves) has a clip. In `ef948c58c` we set a 2 MB budget per clip. The render encodes at CRF 16. If the file is over budget, it is encoded again from that file at CRF 19, 22, and so on up to a cap of 31, and the first one that fits is kept (`chooseCrf` in `harness/lib/clip-budget.mjs`). The CRF that won is written to `clips.lock.json` beside the source hash, so a reader can see how hard each clip was squeezed.

## A bug the benchmark found: frames dropped on a pixel format change

Chromium saves some frames as RGBA, for example when the page uses `mix-blend-mode`. When the pixel format changes in the middle of a frame sequence, ffmpeg rebuilds its filter graph. That resets the trims and drops frames, with no error. Commit `40091a783` keeps one pixel format through the whole encode, so every frame survives.

## What these numbers do not show

We did not measure absolute encode seconds for the preset change, only the ratio. The banding numbers come from one synthetic ramp and two short films. If your hardware or content differs, run the comparison on your own dark ramp before you copy the numbers.

## Reproduce it

- The encoder arguments live in `harness/media/render-page.mjs`: `x264Args`, `WEB_ARGS`, `DITHER` and `ffmpegWebEncode`.
- Run `tests/media/render-banding.test.mjs` to measure the longest flat run on the ramp.
- Commits: [a99043c5c](https://github.com/Vandit1604/vawe/commit/a99043c5c) preset fast, [33038e674](https://github.com/Vandit1604/vawe/commit/33038e674) the AV1 copy and dither measurements, [8975651a5](https://github.com/Vandit1604/vawe/commit/8975651a5) report the master before the judge, [ef948c58c](https://github.com/Vandit1604/vawe/commit/ef948c58c) the clip budget.

Capture time, which comes before all of this, is measured in [faster headless Chrome rendering: one browser per lane](/blog/chrome-per-lane). Draft capture settings are in [Puppeteer screenshot speed](/blog/fast-drafts). For a comparison with other render tools, see [Remotion alternatives](/remotion-alternatives).
