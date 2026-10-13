---
title: "Depth of field in the browser: CSS fakes vs a WebGL lens"
description: "Depth of field in the browser: CSS blur and text-shadow against one WebGL lens that films the page. Bloom measured 24.9 px against 20.7 px on a reference."
date: 2026-10-11
updated: 2026-10-13
section: taste
tags: "depth of field, bloom, webgl, html to video, lens"
keywords: "depth of field in the browser, webgl depth of field, bloom effect css, halation, webgl lens shader"
hero: /blog/real-lens/hero.webp
heroAlt: "Pipeline diagram. A flat HTML screen becomes an SVG image, then a GL texture, then one lens shader applies perspective, depth of field, palette, LED mask, bloom, halation, aberration and grain."
---

For one element and a still frame, CSS is enough: `filter: blur()` and `text-shadow` are cheap and easy. For a film where the camera moves, or a frame you will put next to footage shot through a real lens, a single image-space shader is the better tool. It treats the whole page as a flat screen and films it, so every effect agrees with every other.

We learned this when we set our first HUD film next to a reference filmed off a real monitor. Ours read as fake, and we could point at why: the glow was a CSS shadow and the depth of field was one blur per plane. Optical effects are now a framework job in vawe, one of the decisions behind our [motion design system](/blog/ten-looks).

| | CSS on each element | One WebGL lens on the page |
|---|---|---|
| Depth of field | `filter: blur()` per layer; every pixel in a plane gets the same blur | blur from distance, with aperture-shaped bokeh |
| Bloom | `text-shadow` on the element that asks for it | spreads from every bright pixel, tight core and wide tail |
| Perspective | CSS 3D transforms | a ray hits a tilted plane, so the far side is smaller and softer by geometry |
| Consistency under camera moves | each fake has its own idea of the image | one image, one camera |
| What the author writes | the effect on every element | a normal page, plus one lens choice |
| Cost | none beyond the browser | about 17 ms a frame on the GPU at 1080p |

## Depth of field: blur per plane against blur by distance

A real defocus depends on distance from the focal plane, and bright points take the shape of the aperture. `filter: blur()` gives every pixel in a layer the same radius and has no bokeh. Tuning it has a ceiling, because each blurred element works alone.

The lens does depth of field in one shader, together with perspective. The first lens commit, [`eaa5cdf46`](https://github.com/Vandit1604/vawe/commit/eaa5cdf46), added `core/surfaces/lens.js` at 546 lines, a source adapter, a demo page, a test file and a move clip. The page does not know it is being filmed. The chain has four steps:

1. The page draws a 1920 by 1080 `#screen` element, parked behind the lens canvas.
2. `htmlSource` inlines the computed styles and fonts into an SVG image.
3. The image is uploaded as a GL texture on every seek.
4. One shader applies the camera.

## Bloom and halation: text-shadow against image-space light

A `text-shadow` lights the element that asks for it and nothing else. A real bloom spreads from every bright pixel in the frame. The shader applies bloom, palette mapping, an LED panel mask, aberration, tear and grain. Later commits added halation, anamorphic streaks, diffusion, soft focus, tilt-shift, distortion and gate weave.

<figure>
<video src="/blog/real-lens/lens.mp4" poster="/blog/real-lens/lens.hd.webp" muted loop playsinline controls></video>
<figcaption>The lens move clip. Six stages, each turned on for one second: flat, perspective, depth of field, palette and aberration, bloom and LED grid, tear and grain.</figcaption>
</figure>

## Accuracy against a filmed reference

We measured the demo against the reference at 1080p. The lens doc records:

| Measure | Lens | Reference |
|---|---|---|
| Bloom, 90 to 10 percent width | 24.9 px | 20.7 px |
| LED panel period | 6.9 px | 7.1 px |
| Colour fringe, edges off by 1 px or more | 35 percent | 20 to 28 percent |

Bloom and panel period are close. The colour fringe is further off. We have no judge score that says films got better with the lens; the gain is our own side-by-side judgement against the reference, which is weaker evidence.

## Cost per frame

A frame costs about 17 ms on the GPU at 1080p (12 ms in a draft), and a 6 second final of 360 frames captures in about 20 seconds. The CSS route costs nothing extra, which is its real advantage.

The upload was the first cost to cut. The SVG screen source was large, and it is rebuilt and uploaded on every frame of a seek. Commit [`4821e1780`](https://github.com/Vandit1604/vawe/commit/4821e1780) inlines only the styles that differ from a bare element and its parent clone, and the SVG image became about one tenth of its old size.

## Determinism: will a draft match the final?

A film renderer needs a frame to be a pure function of time. Commit [`398fd7a7c`](https://github.com/Vandit1604/vawe/commit/398fd7a7c) draws the SVG screen into a software canvas so a draft's pixels match from run to run; it was a one-line change to how the canvas is created. All noise in the lens (grain, tear, weave) is hashed from a seed and `floor(t * fps)`. A test renders a lens page whose HTML changes every frame twice, on several lanes, and compares the frames. The wider reasoning is in [deterministic rendering in headless Chrome](/blog/determinism).

## Control: one property per element against named looks

Every lens option is a literal in the page: a number, an array or a function of the seek time. The lens also has `project()`, which runs the same camera on the CPU, so a label drawn in HTML on top of the canvas can sit on the right pixel of the filmed screen.

The long option list became its own problem for agents, so commit [`3920d8220`](https://github.com/Vandit1604/vawe/commit/3920d8220) added a `LOOKS` table with ten entries: `clean`, `dream-bloom`, `film-halation`, `anamorphic`, `pro-mist`, `tilt-shift`, `soft-focus`, `vintage`, `cyanotype` and `crt`. A look names every effect it uses and nothing else is on. The page's own options go over the look, and a preview override goes over both.

![Three layers of options. The preview override wins over the page options, which win over the named look. Ten look names are listed.](/blog/real-lens/looks.webp)

`vawe looks` (commit `73b687aef`) renders a page frame under every named look and prints one labelled grid per second, so an agent picks by looking instead of guessing numbers. The starter brief now has a Look line that names the command (`4004bac38`).

## When to choose which

Use CSS when one element needs a soft glow, the camera does not move, and nobody will compare the frame with real footage. Use an image-space lens when the camera moves, when several effects must agree (blur, bloom and perspective on one plane), or when a reference was shot through glass. The [image to particles](/blog/image-points) post shows a point cloud filmed through the same lens with the `film-halation` look.

You can see the clip and its code on the [lens move page](/moves/lens). For a framework that treats the browser as the renderer, compare [vawe with Remotion](/remotion-alternatives). The other craft posts are collected in the [motion design system](/blog/ten-looks) overview.

| File | What it holds |
|---|---|
| `core/surfaces/lens.js` | the shader, options, `LOOKS`, `resolveOptions` |
| `core/surfaces/lens-source.js` | `htmlSource` and the style-diff inlining |
| `harness/media/looks.mjs` | the `vawe looks` contact sheet |
