---
title: "Depth of field in the browser: a virtual lens for HTML"
description: "Depth of field in the browser, plus bloom and halation: we film a flat HTML page with one WebGL lens. A text-shadow is not a bloom. The source shrank 10x."
date: 2026-10-11
section: taste
tags: "depth of field, bloom, webgl, html to video, lens"
keywords: "depth of field in the browser, bloom effect html, webgl lens shader, halation, html to video"
hero: /blog/real-lens/hero.svg
heroAlt: "Pipeline diagram. A flat HTML screen becomes an SVG image, then a GL texture, then one lens shader applies perspective, depth of field, palette, LED mask, bloom, halation, aberration and grain."
---

A `text-shadow` is not a bloom. We found that out when we put our first HUD film next to a reference that had been filmed off a real monitor. Ours read as fake, and we could point at the reason: our glow was a CSS shadow, and our depth of field was one blur per plane. This post is about how we got depth of field in the browser, along with bloom and halation, by filming the page instead of styling it.

## The problem: CSS effects imitate the result, not the optics

Our early films faked light with the tools a web page has. Glow was `text-shadow`. Depth of field was `filter: blur()` on a layer, so every pixel in a plane got the same blur. Neither of those can do what a lens does. A real bloom spreads from every bright pixel and has a tight core and a wide tail. A real defocus blur depends on distance, and bright points turn into the shape of the aperture. A CSS shadow has none of that.

We made a rule from it: optical effects belong to the framework. A film that needs bloom gets one bloom, applied to the whole image the way a camera would.

## What we tried

Tuning the CSS was the obvious first move, and it has a ceiling: each fake works on its own element and has its own idea of the image. So we inverted it. The page stays plain HTML and CSS. We treat it as a flat screen, and one WebGL shader films that screen. The page does not know it is being filmed.

## What we built: depth of field in the browser

The first lens commit (`c91ee96cf`) added `core/surfaces/lens.js` at 546 lines, a source adapter, a demo page, a test file and a move clip. The chain has four steps:

1. The page draws a 1920 by 1080 `#screen` element, parked behind the lens canvas.
2. `htmlSource` inlines the computed styles and fonts into an SVG image.
3. The image is uploaded as a GL texture on every seek.
4. One shader applies the camera.

The shader does perspective (tilt, zoom, a ray hitting a tilted plane, so the far side is smaller and softer by geometry), depth of field with aperture-shaped bokeh, palette mapping, an LED panel mask, bloom, aberration, tear and grain. Later commits added halation, anamorphic streaks, diffusion, soft focus, tilt-shift, distortion and gate weave. Every option is a literal in the page: a number, an array, or a function of the seek time. The lens also has `project()`, which runs the same camera on the CPU. A label drawn in HTML on top of the canvas can sit on the right pixel of the filmed screen.

<figure>
<video src="/blog/real-lens/lens.mp4" poster="/blog/real-lens/lens.hd.webp" muted loop playsinline controls></video>
<figcaption>The lens move clip. Six stages, each turned on for one second: flat, perspective, depth of field, palette and aberration, bloom and LED grid, tear and grain.</figcaption>
</figure>

### Two fixes that were not about looks

The SVG screen source was large. Commit `7d3d83855` inlines only the styles that differ from a bare element and its parent clone, and the SVG image became about one tenth of its old size. That matters because the image is rebuilt and uploaded on every frame of a seek.

The second was determinism. Commit `8f153f31b` draws the SVG screen into a software canvas so that a draft's pixels match from run to run. All noise in the lens (grain, tear, weave) is hashed from a seed and `floor(t * fps)`, so a frame is a pure function of `t`. We have a test that renders a lens page whose HTML changes every frame twice, on several lanes, and compares the frames. If you want the reasoning for this, see [our post on deterministic rendering](/blog/determinism).

### Looks instead of fifteen knobs

Once the lens worked, agents had a new problem: a long list of options. We replaced the long tail with named looks. Commit `6e3635043` added a `LOOKS` table with ten entries: `clean`, `dream-bloom`, `film-halation`, `anamorphic`, `pro-mist`, `tilt-shift`, `soft-focus`, `vintage`, `cyanotype` and `crt`. A look names every effect it uses and nothing else is on. The page's own options go over the look, and a preview override goes over both.

![Three layers of options. The preview override wins over the page options, which win over the named look. Ten look names are listed.](/blog/real-lens/looks.svg)

`vawe looks` (commit `0800a139f`) renders a page frame under every named look and prints one labelled grid per second, so an agent picks by looking rather than by guessing numbers. The starter brief now has a Look line that names the command (`191285f5d`).

## The measured result

We measured the demo against the reference at 1080p. The lens doc records these numbers:

| Measure | Lens | Reference |
|---|---|---|
| Bloom, 90 to 10 percent width | 24.9 px | 20.7 px |
| LED panel period | 6.9 px | 7.1 px |
| Colour fringe, edges off by 1 px or more | 35 percent | 20 to 28 percent |

Bloom and panel period are close. The colour fringe is further off, and we say so. A frame costs about 17 ms on the GPU at 1080p (12 ms in a draft), and a 6 second final of 360 frames captures in about 20 seconds.

What we cannot show is a score. We have no judge number that says films got better with the lens. The gain is our own side-by-side judgement against the reference, which is a weaker kind of evidence, and we want you to know that.

## What we would tell someone building the same thing

- Do the optics in image space, once. Per-element fakes disagree with each other when the camera moves.
- Keep the source a normal page. The agent then writes the screen in the language it already knows, and the lens is a separate decision.
- Make the lens a pure function of time. The software-canvas fix was a one-line change to how the canvas is created, and it is what makes a draft match a final.
- Give agents named presets and a contact sheet. The options still exist, and a named look is the one that gets used.
- Shrink what you upload per frame. The style-diff change made the per-frame image a tenth of its old size.

You can see the clip and its code on the [lens move page](/moves/lens). For a framework that treats the browser as the renderer from the start, compare [vawe with Remotion](/remotion-alternatives). A related post covers the ten token sets behind our move clips: [One design system, ten looks, 70 clips](/blog/ten-looks). The repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `core/surfaces/lens.js`: the shader, options, `LOOKS`, `resolveOptions`.
- `core/surfaces/lens-source.js`: `htmlSource` and the style-diff inlining.
- `harness/media/looks.mjs`: the `vawe looks` contact sheet.
- Commits: [`c91ee96cf`](https://github.com/Vandit1604/vawe/commit/c91ee96cf) the lens, [`7d3d83855`](https://github.com/Vandit1604/vawe/commit/7d3d83855) style-diff source, [`8f153f31b`](https://github.com/Vandit1604/vawe/commit/8f153f31b) software canvas, [`6e3635043`](https://github.com/Vandit1604/vawe/commit/6e3635043) the looks table.
