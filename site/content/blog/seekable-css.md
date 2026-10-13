---
title: "How to seek CSS animation, forward and backward"
description: "To seek CSS animation and Web Animations frame by frame, you must handle seek-back, cancelled animations, fonts and a running timeline. Four bugs we fixed."
date: 2026-10-09
section: architecture
tags: "seek css animation, web animations api, css keyframes, headless chrome, rendering"
keywords: "seek css animation, web animations api currenttime, css keyframes render video, svg smil seek, document.getanimations"
hero: /blog/seekable-css/hero.svg
heroAlt: "One animation runs from 0 to 1 second on a 5 second axis. After a seek to 5 s and back to 0.25 s the effect must apply again, and it does because the renderer keeps every animation the page made."
---

Seeking an animation forward is easy. Seeking it backward is the part of Web Animations that nobody tests. We render video by setting `currentTime` on every animation on a page, then taking a screenshot. That works on the first pass. It breaks when a render revisits an earlier time, when a page cancels an animation, when a font arrives late, or when the browser keeps its own clock running. This post is a short field guide to how to seek CSS animation reliably, from four bugs we hit and fixed.

## The problem: agents write CSS keyframes and `element.animate`

Our agents write films as plain web pages ([HTML to video beat our own JSON scene format](/blog/html-over-json)). They use CSS `@keyframes`, CSS transitions, `element.animate()` and SVG. We want the renderer to accept all of it. The renderer has to put every animation at time `t`, in any order, and screenshot the result. That means forward seeks, backward seeks and repeated seeks to the same `t`, all giving the same pixels.

A page can also create and cancel animations whenever it likes. The renderer cannot assume the list of animations is stable.

## What we tried, and what broke

### 1. We were killing animations

Our early tokens file had a global `* { animation: none; transition: none }`. It stopped CSS animations before they existed, so there was nothing to seek. Commit `7baa223b9` (2026-09-27) removed it. After that, a CSS keyframe loop or transition on a page is seeked like any other animation. The same commit made the seek drive SVG SMIL (`<animate>`) on its own separate timeline.

### 2. Finished animations disappeared

`document.getAnimations()` drops a finished animation with `fill: none`. If a render seeks to 5 s and then back to 0.25 s, the list no longer contains that animation, so the element misses its effect. Commit `76d28ec1b` (2026-10-07) keeps every animation the page made in a set, and seeks all of them each time. The regression test `tests/media/seek-fill-none.test.mjs` uses a CSS animation and a `waapi` one, both with `fill: none`. It seeks to 0.25 s on a fresh page and expects opacities of 0.2 and 0.3. It then seeks to 5 s on a second page, back to 0.25 s, and expects the same two values.

### 3. Dead animations stayed in the set

Once we kept everything, we had to forget the right things. Commit `8e2200e05` drops an animation from the set if it is idle or its target is no longer in the document. A cancelled animation then stays cancelled on later seeks, and a removed element stops being touched.

### 4. The browser's own clock kept running

The document timeline runs in real time from page load. Before our first seek paused anything, the compositor rasterized animated layers against that real time. A first seek at 1.5 s after load painted other edge pixels than a first seek at 0.05 s. We set the animation playback rate to 0 through the DevTools protocol (`874af4972`, 2026-10-08), so only a seek moves an animation. The same pass is described from the clock side in [Time is the seek, never the clock](/blog/page-clock).

![Four fixes in order: stop killing animations, keep finished ones, drop cancelled and removed ones, freeze the document timeline. Fonts are awaited around each seek with a 10 second limit.](/blog/seekable-css/diagram.svg)

## What we built: one seek function

The seek is a single function, `seekTo(t)` in `core/engine/page-seek.js`. The renderer and the studio both use it, so a scrub in the studio and a frame in the render cannot disagree about what time `t` means. In order, it:

1. waits for fonts,
2. sets the virtual clock,
3. calls `window.seek(t)` if the page defines it,
4. waits for fonts again,
5. pauses every remembered animation and sets `currentTime` to `t * 1000`,
6. pauses SVG animations and sets their time,
7. awaits every `vawe.onFrame` hook.

Fonts get their own rule. `awaitFonts` waits until every face in `document.fonts` has finished loading, including faces whose load starts while we wait. If a face is still loading after 10 seconds, the render fails and names the family. A screenshot with a fallback font is a silent wrong answer, so we make it a loud error (commit `be52c9a99`). It uses the real timer on purpose, because the virtual clock owns `setTimeout`.

## The measured result

There is no aggregate number for this work, and we do not want to invent one. The concrete figures are two: a 10-second font deadline, and a 1.5 px frame-to-frame flip.

The 1.5 px case came from the gooey filter, one of our [motion moves](/moves/gooey-filter). On a still shape the outline flipped by 1.5 px between frames. The fix (`0e30c9513`, 2026-10-09) gave the SVG filter a wide region (`x="-30%" y="-30%" width="160%" height="160%"`) and put `will-change: transform` on its wrapper. The default filter region is 10 percent of the box and cuts the blur. Here is the move after the fix:

<figure>
<video src="/blog/seekable-css/gooey-filter.mp4" poster="/blog/seekable-css/gooey-filter-poster.webp" muted loop playsinline autoplay width="680"></video>
<figcaption>The gooey filter move, rendered from a page that is seeked to each frame.</figcaption>
</figure>

## What we would tell you if you build a seekable renderer

- Test the way back. Seek to the end, then to the middle, and compare with a fresh page seeked once to the middle. This one test found our `fill: none` bug.
- Do not trust `getAnimations()` as a long-term list. It reports what is live now, not everything the page made.
- Pause the browser's timeline. If a second clock runs, you have a second source of nondeterminism.
- Fail loudly on fonts. A 10-second wait with a named family is easier to debug than a quietly wrong frame.
- Seek, do not kill. Banning an API removes an authoring path. Seeking it keeps the page natural to write.

For the rest of the picture, see the [easing pages](/easing) for curves you can use in these animations, the [docs on motion](/docs/motion), and the source at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe). We compare this approach to other tools on [/hyperframes-alternatives](/hyperframes-alternatives).

## In the code

- `core/engine/page-seek.js`: `seekTo` and `awaitFonts`.
- `tests/media/seek-fill-none.test.mjs`: seek past the end and back.
- [`7baa223b9`](https://github.com/Vandit1604/vawe/commit/7baa223b9) (2026-09-27): CSS animation, transition and Web Animations are seeked, not killed.
- [`76d28ec1b`](https://github.com/Vandit1604/vawe/commit/76d28ec1b) (2026-10-07): keep every animation so a finished `fill: none` one applies again.
- [`874af4972`](https://github.com/Vandit1604/vawe/commit/874af4972) (2026-10-08): freeze the document timeline.
- [`0e30c9513`](https://github.com/Vandit1604/vawe/commit/0e30c9513) (2026-10-09): the gooey filter region and wrapper.
