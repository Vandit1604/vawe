---
title: "Image to particles in three.js: a seeded point cloud"
description: "Turn an image into particles for three.js: weight pixels by luma and edges, draw seeded points, light them by normal. 120,000 points in a 1.3 MB clip."
date: 2026-10-11
updated: 2026-10-13
section: taste
tags: "image to particles, point cloud, three.js, seeded random, particles"
keywords: "image to particles three.js, photo to point cloud, seeded point cloud, deterministic particles"
hero: /blog/image-points/hero.webp
heroAlt: "Timeline. Photo parallax was removed on 2026-10-01. imagePoints was added on 2026-10-11. Both decisions follow one question: does the move depend on processing the image?"
---

Here is how to turn a photo into a cloud of lit, coloured points that you can animate in three.js, and that render the same way every time. The end state is our `photo-particles` move: a public-domain Hubble mosaic of the Crab Nebula sampled into 120,000 points that gather from a seeded scatter over 1.5 seconds, then hold and breathe for 1.5 seconds. The function is `imagePoints(image, options)` in `core/surfaces/image-points.js`, 144 lines, added in commit [`727e944f6`](https://github.com/Vandit1604/vawe/commit/727e944f6).

It is one of the image techniques in our [motion design system](/blog/ten-looks), which collects the other craft posts.

## What you need for a photo point cloud

- A photo with detail the eye reads: veins, scales, fibres, filaments. A hand-modelled shape cannot give you those, which is why we wanted a photo.
- Optionally a mask, a depth image and a flat label image.
- A seeded random generator. We use the seeded `rng` from our motion module, never `Math.random`.
- A licence you have written down. Ours lists the source (NASA, ESA, J. Hester and A. Loll) in a credits file.

![Pipeline. A photo, with an optional mask, depth and label image, becomes a weight per pixel. Seeded draws from the cumulative weight give the points. Each point has a position, a colour, a normal and a luma.](/blog/image-points/pipeline.webp)

## Step 1: weight every pixel by what the eye reads

The density of points follows a weight per pixel:

- start from the luma above a threshold, raised to a gamma;
- multiply by one plus an edge boost times the edge strength, where the edge is the Sobel magnitude scaled to 1 at the strongest edge;
- multiply by the mask, if there is one.

Brightness above a threshold, plus extra points on edges, keeps veins and silhouettes crisp.

## Step 2: draw the points with a seeded generator

Each point is a seeded draw from the cumulative weight. Because the draw uses a seeded generator, the same photo gives the same cloud on every render. That matters in vawe, where the page contract requires that a frame is a pure function of time; the reasons are in [deterministic rendering in headless Chrome](/blog/determinism).

## Step 3: give each point a colour, a position and a normal

Each point keeps the photo's own colour. Its position puts the long side of the image from -1 to 1, with y up, and z from the depth image or from luma. Its normal is tilted by the luma gradient, so a key light can shape the form by the dot product of the normal and the light.

## Step 4: split the cloud into parts with regions

The `regions` helper takes a flat label image and gives each point the index of the colour under it. A film can then move parts apart: an eye's lid and iris, a manta's wings and body.

## Step 5: load the photo inside the frame hook

Load the photo inside the frame hook, not with a top-level `await`. The renderer seeks the first frame before a module that waits has finished, and that first frame comes out black.

## Step 6: film it and fit the clip in a budget

We filmed the cloud through [our WebGL lens](/blog/real-lens) with the `film-halation` look (see also the [lens move](/moves/lens)). The clip was dense, so it was large. Commit [`817edeee7`](https://github.com/Vandit1604/vawe/commit/817edeee7) added the move and a 2 MB size budget per clip. The renderer encodes again at higher CRF steps until the file fits, and logs the CRF in `clips.lock.json`. The steps start at 16, go up by 3 and stop at 31. This clip ended at CRF 31 and 1,342,076 bytes, about 1.3 MB.

![Clip sizes. The removed photo parallax clip was 29.96 MB. The new photo particles clip is 1.34 MB, under a 2 MB budget.](/blog/image-points/size.webp)

## Check that it worked

- Same input, same cloud. Commit [`753ad2e5a`](https://github.com/Vandit1604/vawe/commit/753ad2e5a) added ten tests: seed, threshold, the gamma ratio, edge boost, mask, regions, depth and unit-length normals.
- Speed. From the move's doc, 1,000,000 points from a 2048 by 1536 image take about 0.5 s. The demo builds its cloud on the first seek of each page, so every render slice pays about 1 s once.
- Size. The clip is 1.34 MB, under the 2 MB budget.

We did not measure whether films made with the point cloud score higher. The move came from a direct request for detailed particle subjects, and we judged it by looking at the clip.

## Why a photo move was allowed ten days after we deleted one

On 1 October we removed `photo-parallax-2.5d` (commit [`26e8d99d9`](https://github.com/Vandit1604/vawe/commit/26e8d99d9)). The reason in the commit: parallax on captured photos is not motion design. vawe animates designed things (type, shapes, UI, illustration, colour fields). A move that cuts a captured image into depth layers, fakes camera depth inside it, tracks it or rotoscopes it is a footage technique. It depends on the photo and fails on an illustration. Its clip was 29,964,958 bytes, about 30 MB, which would have failed the later budget by a wide margin.

We could have written an exception, "photos are allowed for particles", but that is a second way to say one thing and leaves the next case unclear. We replaced the rule with a question: does the move depend on processing the image? Parallax depth cuts do. A card, a tile, a window or a carousel item that shows a photo whole does not. A particle form that uses the photo as a source of detail, and never shows it as footage, does not either. The moves README follows this question, and no agent prompt says "no photos".

## Next

For a public example film that puts a three.js scene through the same lens, see the [moth photogram example](https://github.com/Vandit1604/vawe/tree/main/films/examples/moth-photogram). The page rules for images are in the [backgrounds and images docs](/docs/backgrounds-and-images), and the move is documented in `prompts/moves/photo-particles.md`; the budget code is `harness/lib/clip-budget.mjs`. For looks, curves and cuts around a move like this one, go back to the [motion design system](/blog/ten-looks) overview.
