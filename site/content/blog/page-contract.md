---
title: "Render HTML to video: the whole page contract"
description: "To render HTML to video, vawe needs one page.html, a duration meta and one data-world element per beat. Twelve checks and the judge read the same contract."
date: 2026-10-07
updated: 2026-10-13
section: architecture
tags: "html to video, html video format, data attributes, web page, architecture"
keywords: "render html to video, html video format, data attribute contract, responsive video layout"
hero: /blog/page-contract/hero.svg
heroAlt: "An annotated film page: a duration meta, message and spectacle metas, data-aspect on the html element, root custom properties, one data-world element per beat, audio tags and an optional window.seek."
---

To render HTML to video with vawe, you write one web page: `page.html` plus its own assets folder. A `<meta name="duration">` gives the length, one `data-world` attribute marks each beat, and the renderer seeks the page frame by frame into a film. There is no timeline file, no project file and no schema to learn. The whole contract fits in one section of a README.

This page is the reference for that contract and the hub for our posts on how we got here. Each rule below links to the post that explains why it exists.

## What does a renderable page look like?

This is an abridged page, with names from our public example `films/examples/colour-sting/page.html`:

```html
<html data-aspect="16:9">
<meta name="duration" content="5">
<meta name="message" content="onsen turns up the colour">
<meta name="spectacle" content="2.75">
<style>:root { --beat-2: 0.7s; --beat-3: 2.0s; }</style>
<div class="world w1" data-world="cold"></div>
<div class="world w2" data-world="warm"></div>
```

| Rule | What the tools get from it |
|---|---|
| A film is `films/<name>/page.html` plus its own assets folder, relative paths only | A film can be copied or moved as one folder |
| `<meta name="duration">` in seconds; optional `<meta name="fps">` for the frame-table rate | The length; the render rate stays separate (60 for a final, 30 for a draft) |
| Time is the seek: CSS keyframes, `element.animate`, or `window.seek(t)` painting frame `t` as a pure function | Any frame can be rendered in any order |
| One element per beat with `data-world="<id>"`, lowercase, matching the brief's shot ids | The checks and the judge find the beats the same way |
| Every tunable number is a literal: a `[[frame, value]]` table, a keyframe stop or a `:root` custom property | The studio edits those literals in place |
| `<meta name="message">` and `<meta name="spectacle">` | The one thing to remember, and the second the big moment lands (with quiet before it) |
| `<audio>` tags | The mix, read as written |

## Why is the contract a web page and not a format?

We started with a JSON scene format of our own. When we [dropped that JSON video format](/blog/html-over-json) after an A/B test, we also lost the file that told the framework what a film contained. In JSON the scene listed layers and times. In a web page the framework sees a DOM and some CSS.

We still needed answers only a contract gives. How long is the film? Where does each beat start and end, so a check can say "the second world holds for 4 seconds with nothing moving"? Which numbers can the studio edit? How does one page lay out for 16:9, 9:16, 1:1, 4:5 and 4:3 without a crop?

We did not add a manifest. A second file that describes the first is a second source of truth, and the two drift. We looked at what an agent already writes and asked for the smallest set of conventions on top of it. One house rule decided the rest: if something an agent writes naturally fails, that is a framework bug and not an agent mistake.

## How does the renderer turn the page into frames?

The renderer never lets the page run on its own clock. It sets the time and asks for a picture. CSS keyframes and Web Animations are seeked through their `currentTime`, and a page can add `window.seek(t)` for canvas or three.js work. A virtual clock owns `Date`, `requestAnimationFrame`, timers and `Math.random`, so a page that calls them still paints the same frame twice. The [virtual clock reference](/blog/page-clock) lists what it fakes, and the [deterministic rendering checklist](/blog/determinism) covers the other sources of drift.

## How does one page fit five aspect ratios?

The renderer sets `data-aspect` on `<html>`, and `--vw` and `--vh` (pixel lengths) on `:root` and on `window.vawe`, before any page script runs. The document element does not exist yet at that moment, so the code waits for the parser with a `MutationObserver` and applies the values the instant it appears (`core/engine/page-seek.js`). Authors lay out in CSS for the five aspects and never crop. The [aspect ratio guide](/docs/aspect-ratios) has the details.

A brief can name a different length or aspect than the page. We made that an advice line and not a refusal (`fcb47d203`). The page owns its length.

## What can tools do with so little?

Twelve layout and motion checks read the DOM from this contract. Commit [b6e60d817](https://github.com/Vandit1604/vawe/commit/b6e60d817) (2026-10-07) added them: 28 files, +939 -66. Each check cites a taste rule and a number from one `limits.json`. A second commit, [b03c92817](https://github.com/Vandit1604/vawe/commit/b03c92817), made the checks agree on the same worlds: `world-held` reads the measured `data-world` spans when the page has them, and the tail check no longer fires when an animation runs on a visible element through the last second.

`vawe frames` renders one still for each `data-world` element, plus a contact sheet and a `frames.html` page, and runs the still-frame layout rules (`c02c355d6`). `vawe new` writes a starter with one `data-world` per beat ([080c37756](https://github.com/Vandit1604/vawe/commit/080c37756)) and fills the metas from `--length`, `--aspect` and `--title` (`f346fe089`).

![One page.html is read by the renderer, twelve draft checks, the frames verb, the judge and the studio.](/blog/page-contract/diagram.svg)

The design choices that made this work are small ones. `data-world` is one attribute on a `div`. Every tool finds beats through the same marker, so the checks, the judge and the stills stop disagreeing. Numbers stay literals, so an editor can rewrite them with no schema. The frame facts are set before the page runs, so a page that lays out from `--vw` and `--vh` never measures the window.

## What does this contract not tell us?

We have no number for how much faster agents write a film with it. We know what it replaced: a format with its own vocabulary, a 24-type schema and a test suite that mostly guarded it. Audio follows the same idea of plain tags, and the [LUFS for video](/blog/audio-as-written) post covers how that mix is measured.

## The road from a JSON format to a web page

These posts tell how the contract came to be and what the switch cost:

- [HTML vs a custom JSON video format](/blog/html-over-json): the blind A/B test that ended our own format.
- [How to delete dead code safely](/blog/big-deletion): the 205,163-line commit that removed it, and the order of the follow-ups.
- [How to speed up e2e tests](/blog/test-suite): the end-to-end run fell from about 175 s to 4.3 s once the old format was gone.
- [A CSS animation library agents can copy](/blog/site-after-json): what the public site became when it had no engine to sell.
- [Single source of truth in code](/blog/one-owner): one owner per rule, so two copies of a formula cannot drift.

If you are comparing other ways to turn a web page into video, see the [HyperFrames alternatives](/hyperframes-alternatives) and [Remotion alternatives](/remotion-alternatives) pages. The full rules are in the [docs page contract](/docs/the-page); agents read the same text first in `AGENTS.md`, and `films/examples/colour-sting/page.html` is a public page that follows it.
