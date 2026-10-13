---
title: "How to seek CSS animations frame by frame"
description: "How to seek CSS animation and Web Animations forward and back: keep finished animations, drop cancelled ones, freeze the timeline, wait 10 s for fonts."
date: 2026-10-09
updated: 2026-10-13
section: architecture
tags: "seek css animation, web animations api, css keyframes, headless chrome, rendering"
keywords: "seek css animation, web animations api currenttime, document.getanimations, svg smil seek"
hero: /blog/seekable-css/hero.svg
heroAlt: "One animation runs from 0 to 1 second on a 5 second axis. After a seek to 5 s and back to 0.25 s the effect must apply again, and it does because the renderer keeps every animation the page made."
---

By the end of this guide you have one function, `seekTo(t)`, that puts every CSS keyframe, CSS transition, `element.animate()` call and SVG `<animate>` on a page at time `t`. It works in any order: forward, backward, or the same `t` twice, with the same pixels each time. That is what you need to render a web page to video one screenshot at a time.

Seeking forward is easy. Seeking backward is the part of the Web Animations API that few people test, and we hit four bugs there. Each step below is one of them. The function is `core/engine/page-seek.js` in [vawe](https://github.com/Vandit1604/vawe), where agents write films as plain web pages, and it is one item on our [deterministic rendering checklist](/blog/determinism).

## What you need before you start

- A page whose scripts read time from a virtual clock, so `Date.now` and `requestAnimationFrame` follow the seek. Ours is described in [the virtual clock reference](/blog/page-clock).
- Access to the DevTools protocol (Puppeteer gives you this).
- No global rule that disables animation. Our early tokens file had `* { animation: none; transition: none }`, which stopped CSS animations before they existed, so there was nothing to seek. Commit `7baa223b9` (2026-09-27) removed it. The same commit made the seek drive SVG SMIL (`<animate>`) on its own separate timeline.

## Step 1: freeze the document timeline

The document timeline runs in real time from page load. Before the first seek paused anything, the compositor rasterized animated layers against that real time. A first seek at 1.5 s after load painted other edge pixels than a first seek at 0.05 s.

Set the animation playback rate to 0 through the DevTools protocol (`Animation.setPlaybackRate`, commit `874af4972`, 2026-10-08). After that, only a seek moves an animation.

## Step 2: remember every animation the page creates

`document.getAnimations()` drops a finished animation with `fill: none`. If a render seeks to 5 s and then back to 0.25 s, the list no longer contains that animation, so the element misses its effect.

Keep every animation the page made in a set, and seek all of them each time (commit `76d28ec1b`, 2026-10-07). Treat `getAnimations()` as a list of what is live now, not of everything the page made.

## Step 3: forget idle animations and removed targets

Once you keep everything, you must forget the right things. Drop an animation from the set if it is idle or its target is no longer in the document (commit `8e2200e05`). A cancelled animation then stays cancelled on later seeks, and a removed element stops being touched.

## Step 4: wait for fonts, and fail loudly

`awaitFonts` waits until every face in `document.fonts` has finished loading, including faces whose load starts while we wait. If a face is still loading after 10 seconds, the render fails and names the family (commit `be52c9a99`). A screenshot with a fallback font is a silent wrong answer, so we make it a loud error. The wait uses the real timer on purpose, because the virtual clock owns `setTimeout`.

## Step 5: run the seek in a fixed order

`seekTo(t)` does these things, in this order:

1. wait for fonts,
2. set the virtual clock,
3. call `window.seek(t)` if the page defines it,
4. wait for fonts again,
5. pause every remembered animation and set `currentTime` to `t * 1000`,
6. pause SVG animations and set their time,
7. await every `vawe.onFrame` hook.

The renderer and the studio both call this one function, so a scrub in the studio and a frame in the render cannot disagree about what time `t` means.

![Four fixes in order: stop killing animations, keep finished ones, drop cancelled and removed ones, freeze the document timeline. Fonts are awaited around each seek with a 10 second limit.](/blog/seekable-css/diagram.svg)

## Check that the seek works backward

Seek to the end, then to the middle, and compare with a fresh page seeked once to the middle. This one test found our `fill: none` bug.

Our version is `tests/media/seek-fill-none.test.mjs`. It uses a CSS animation and a `waapi` one, both with `fill: none`. It seeks to 0.25 s on a fresh page and expects opacities of 0.2 and 0.3. It then seeks to 5 s on a second page, back to 0.25 s, and expects the same two values.

## When a seeked frame still looks wrong

- An element shows its end state after a backward seek: the animation fell out of `getAnimations()`. See step 2.
- A cancelled animation comes back: the set still holds it. See step 3.
- Edge pixels differ between two renders of the first frame: the timeline ran before the first seek. See step 1.
- Text is in the wrong face: the font was not ready. Step 4 turns that into an error that names the family.
- An SVG filter outline flips by 1.5 px between frames on a still shape. This came from the gooey filter, one of our [motion moves](/moves/gooey-filter). The default filter region is 10 percent of the box and cuts the blur. The fix (`0e30c9513`, 2026-10-09) gave the filter a wide region (`x="-30%" y="-30%" width="160%" height="160%"`) and put `will-change: transform` on its wrapper.

<figure>
<video src="/blog/seekable-css/gooey-filter.mp4" poster="/blog/seekable-css/gooey-filter-poster.webp" muted loop playsinline autoplay width="680"></video>
<figcaption>The gooey filter move after the fix, rendered from a page that is seeked to each frame.</figcaption>
</figure>

We have no aggregate number for this work. The concrete figures are the 10-second font deadline and that 1.5 px flip.

## Next steps

The other sources of pixel drift, from GPU compositing to tab focus, are in [the headless Chrome determinism checklist](/blog/determinism). For curves to use in these animations, see the [easing pages](/easing) and the [motion docs](/docs/motion). Why our agents write plain CSS at all is the subject of [HTML vs a custom JSON video format](/blog/html-over-json), and a comparison with other tools is on [HyperFrames alternatives](/hyperframes-alternatives).

Commits: [`7baa223b9`](https://github.com/Vandit1604/vawe/commit/7baa223b9) seek instead of kill, [`76d28ec1b`](https://github.com/Vandit1604/vawe/commit/76d28ec1b) keep every animation, [`874af4972`](https://github.com/Vandit1604/vawe/commit/874af4972) freeze the timeline, [`0e30c9513`](https://github.com/Vandit1604/vawe/commit/0e30c9513) the gooey filter region.
