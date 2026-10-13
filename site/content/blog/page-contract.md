---
title: "An HTML video format that fits on one screen"
description: "Our HTML video format is a web page with a duration meta and one data-world element per beat. Twelve checks, the judge and the studio all read it. Here it is."
date: 2026-10-07
section: architecture
tags: "html video format, data attributes, web page, agents, architecture"
keywords: "html video format, html to video, video file format, data attribute contract, responsive video layout"
hero: /blog/page-contract/hero.svg
heroAlt: "An annotated film page: a duration meta, message and spectacle metas, data-aspect on the html element, root custom properties, one data-world element per beat, audio tags and an optional window.seek."
---

A whole HTML video format fits in one section of a README, because it is just a web page. There is no timeline file, no project file and no schema to learn. A film is `page.html` plus its own assets folder. A few `meta` tags and one `data-` attribute give the tools around it what they need. This post lays out that contract, what we learned about keeping it small, and what twelve layout and motion checks, a judge and a studio can do with so little.

## The problem: no private format, but the tools still need to read the film

When we [dropped our JSON scene format](/blog/html-over-json), we also lost the thing that told the framework what a film contained. In JSON, the scene file listed layers and times. In a web page, the framework sees a DOM and some CSS.

We still needed things only a contract can give:

- How long is the film?
- Where does each beat start and end, so a check can say "the second world holds for 4 seconds with nothing moving"?
- Which numbers can the studio edit in place?
- How does one page lay out for 16:9, 9:16, 1:1, 4:5 and 4:3 without being cropped?

## What we tried

We did not add a manifest file. A second file that describes the first is a second source of truth, and the two drift. We looked instead at what an agent already writes and asked for the smallest set of conventions on top of it. One house rule decided the rest: if something an agent writes naturally fails, that is a framework bug, not an agent mistake.

## What we built: the whole contract

This is an abridged page, with names taken from our public example `films/examples/colour-sting/page.html`:

```html
<html data-aspect="16:9">
<meta name="duration" content="5">
<meta name="message" content="onsen turns up the colour">
<meta name="spectacle" content="2.75">
<style>:root { --beat-2: 0.7s; --beat-3: 2.0s; }</style>
<div class="world w1" data-world="cold"></div>
<div class="world w2" data-world="warm"></div>
```

The rules, in the order an author meets them:

- A film is `films/<name>/page.html` plus its own assets folder, with relative paths only.
- `<meta name="duration">` gives the length in seconds. An optional `<meta name="fps">` is the frame-table rate. The render rate is separate: 60 for a final and 30 for a draft.
- Time is the seek. Use CSS keyframes, `element.animate`, or `window.seek(t)` that paints frame `t` as a pure function. See [Time is the seek, never the clock](/blog/page-clock).
- Each beat is one element with `data-world="<id>"`. The id is lowercase and matches the brief's shot ids. The checks and the judge read the worlds from it.
- Every tunable number is a literal in the page. That can be a `[[frame, value]]` table, a keyframe stop or a `:root` custom property. The studio edits those literals in place.
- `<meta name="message">` is the one thing to remember. `<meta name="spectacle">` is the second at which the one big moment lands, and we ask for quiet before it.
- Audio is `<audio>` tags, covered in [Audio as plain tags](/blog/audio-as-written).

### Aspect and size

The renderer sets `data-aspect` on `<html>`, and `--vw` and `--vh` (pixel lengths) on `:root` and on `window.vawe`, before any page script runs. The document element does not exist yet at that moment, so the code waits for the parser with a `MutationObserver` and applies the values the instant it appears (`core/engine/page-seek.js`). Authors lay out in CSS for the five aspects and never crop.

A brief can name a different length or aspect than the page. We made that an advice line, not a refusal (`7364cd097`). The page owns its length.

## The measured result

Twelve layout and motion checks now read the DOM from this contract. Commit `378aeea9f` added them: 28 files, +939 -66. Each check cites a taste rule and a number from one `limits.json`. A second commit, `de510594b`, made the checks agree on the same worlds: `world-held` reads the measured `data-world` spans when the page has them, and the tail check no longer fires when an animation runs on a visible element through the last second.

`vawe frames` renders one still for each `data-world` element, plus a contact sheet and a `frames.html` page, and runs the still-frame layout rules (`b5fb5ad33`). `vawe new` writes a starter with one `data-world` per beat (`c58276e14`) and fills the metas from `--length`, `--aspect` and `--title` (`2ccda3a22`).

![One page.html is read by the renderer, twelve draft checks, the frames verb, the judge and the studio.](/blog/page-contract/diagram.svg)

We have no number for how much faster agents write a film with this contract. We do know what it replaced: a format with its own vocabulary. For the cost of that, see [The biggest commit is a deletion](/blog/big-deletion).

## What we would tell you if you design a format

- Make the contract a handful of attributes on things people already write. `data-world` is one attribute on a `div`.
- Let every tool read the same marker. When the checks, the judge and the stills all find beats the same way, they stop disagreeing.
- Keep tunable numbers as literals. An editor that rewrites a literal needs no schema. Avoid computing a number the studio cannot find.
- Set the frame facts before the page runs. Pages that lay out from `--vw` and `--vh` do not need to measure the window.
- Let the page win over the brief. A mismatch is advice, not a stop.

The full list of rules is in the [docs page contract](/docs/the-page) and the [aspect ratio guide](/docs/aspect-ratios). The code is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe). If you are looking at other ways to turn a web page into video, see [/hyperframes-alternatives](/hyperframes-alternatives).

## In the code

- `AGENTS.md`: the contract agents read first.
- `core/engine/page-seek.js`: `installPageFrame` sets aspect, `--vw` and `--vh` before page scripts.
- `films/examples/colour-sting/page.html`: a public page that follows the contract.
- [`c58276e14`](https://github.com/Vandit1604/vawe/commit/c58276e14) (2026-10-07): the starter has one `data-world` per beat.
- [`de510594b`](https://github.com/Vandit1604/vawe/commit/de510594b) (2026-10-07): held worlds from `data-world` spans, so the checks agree.
- [`378aeea9f`](https://github.com/Vandit1604/vawe/commit/378aeea9f) (2026-10-07): twelve layout and motion checks read the DOM.
