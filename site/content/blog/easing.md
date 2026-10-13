---
title: "CSS easing functions cheat sheet: nine named curves"
description: "A CSS easing functions cheat sheet for motion graphics: nine named curves with their jobs and peak speeds, a speed ramp for cuts, and 44 generated pages."
date: 2026-10-07
updated: 2026-10-13
section: taste
tags: "easing, css, motion, cubic-bezier, after effects"
keywords: "css easing functions, cubic-bezier easing, css linear() easing, easing curves cheat sheet, after effects easing in css"
hero: /blog/easing/hero.svg
heroAlt: "Large number 44 with the caption easing pages, 9 named curves, one vocabulary for every move"
---

Every vawe move uses one of nine named CSS easing functions. Below is what each one is for, how fast it peaks, and which two needed fixing on real clips. Every curve here also has its own page on the site, generated from the same source, at [/easing](/easing).

| Name | Job | Peak speed (vs linear) |
|---|---|---|
| `land` | entrance: fast start, long soft stop | 4.8x |
| `landSoft` | entrance under 0.4 s | 2.81x |
| `leave` | exit that settles | 1.95x |
| `launch` | exit that accelerates, capped at the cut | 3x |
| `pop` | arrival that overshoots its mark by 15.3% | 4.79x |

The other four names are `settle` and `swap` (two-sided eases), `glide` (a drift) and `carry`. Their numbers are on their [easing pages](/easing).

These curves are one part of our [motion design system](/blog/ten-looks): the looks decide how a clip is dressed, and these names decide how it moves.

## Why name a curve at all

Our moves, and the agents that wrote them, typed `cubic-bezier` numbers by hand. Across the library those numbers had no shared meaning. Short pops landed too hard, exits ran as long as their entrances, and two moves that should have felt related used unrelated curves.

A table of names is the common fix, and every motion system has one. We had an extra reason. Agents write these pages, and an agent that sees `EASE.launch` makes a better choice than one that sees four floats, because the name carries the purpose.

## How each curve is defined

Each name is two After Effects keyframe handles: an influence (how far along the time axis the handle reaches) and a speed (how steep the curve is at the key). The vocabulary lives in one file, `core/motion/presets.js`. Each curve converts to a CSS `linear()` string, and every page also shows the nearest `cubic-bezier` with its fit error.

<figure>
<img src="/blog/easing/curves.svg" alt="Progress curves for land, land-soft, launch, leave and pop plotted on one chart" width="720" height="400" loading="lazy">
<figcaption>The five curves that matter most, plotted from the sampled data on the easing pages. Peak speed is relative to a straight line.</figcaption>
</figure>

## land and landSoft: entrances

`land` is a fast start with a long soft stop. It peaks at 4.8 times average speed, and on a move shorter than 0.4 s that reads as a jump (the README note in the fix commit says so). `landSoft` keeps the long stop and drops the peak to 2.81 times average ([`70069b63d`](https://github.com/Vandit1604/vawe/commit/70069b63d)). A later commit lengthened the short pops and exits that the energy measure had flagged (`7a8b902c7`).

<figure>
<video src="/blog/easing/land.mp4" poster="/blog/easing/land.webp" muted loop playsinline autoplay width="640" height="360"></video>
<figcaption><a href="/easing/land">land</a>: a fast start and a long soft stop, against linear.</figcaption>
</figure>

## leave and launch: exits

Exits are shorter than entrances and accelerate. The house range is 0.35 to 0.6 of the entrance duration, and `leave()` in the presets uses 0.6. The rule is written once, in `taste/rules/exits-shorter.md`, and a check flags an exit as long as its entrance.

`launch` is the exit that speeds up into a cut. The first version ended at 4.8 times average speed at the cut, and the README note says it read as a vanish. We capped it at 3x at the cut in the same commit as `landSoft`.

<figure>
<video src="/blog/easing/launch.mp4" poster="/blog/easing/launch.webp" muted loop playsinline autoplay width="640" height="360"></video>
<figcaption><a href="/easing/launch">launch</a>: an exit that starts gently and speeds up, capped at 3x at the cut.</figcaption>
</figure>

## pop: the one that overshoots

`pop` passes its mark by 15.3 percent and settles back, the shape a button press or a notification wants. Across 22 reference films, the median share of arrivals that overshoot is 30.5 percent (p10 21.1, p90 40.9), and our overshoot-share check is built on that range. How that range was measured is in [average shot length in motion graphics](/blog/quality-bar).

## settle, swap, glide and carry

The first set had six names: `land`, `leave`, `launch`, `settle`, `swap` and `glide`. `settle` and `swap` are two-sided eases and `glide` is a drift. The vocabulary now has nine: those six plus `landSoft`, `carry` and `pop`.

## ramp(): matching speed across a cut

`ramp()` is a speed ramp across a cut. The outgoing element accelerates into the cut, and the incoming one leaves it at the same speed and slows down, so velocity matches on both sides ([`3e6b5eb4d`](https://github.com/Vandit1604/vawe/commit/3e6b5eb4d)). Matching velocity across a cut is the part people get wrong by eye. See [the speed-ramp move](/moves/speed-ramp), and for other ways to carry motion over a seam, [motion graphics transitions](/blog/transitions).

## Where the handle values came from

We did not pick the handles by taste. We measured 1,339 animation segments from open-source Lottie projects (the lottie-android, lottie-ios and lottie-web repositories) and 27 segments from HyperFrames carousels. In that sample 65.05 percent of segments used the default handles, 468 were tuned, 616 were entrances and 57 were exits. No exit in the sample ran faster than 1.5 times at its end. Our rule that exits accelerate is a deliberate step away from that, which is why `launch` is capped at 3x.

## The 44 easing pages

A script reads the motion library and writes one JSON file per ease with the curve, its velocity, the `linear()` string, a cubic-bezier fit and the After Effects handle values. The site renders 44 pages from it: the nine vawe curves, 30 classic ones (ten families, each in, out and in-out) and the 5 CSS keywords including `linear` ([`e32a4f38b`](https://github.com/Vandit1604/vawe/commit/e32a4f38b)). Only the words are typed by hand. Each vawe page carries a 2 s clip of the curve moving a square next to a linear one.

## What this list cannot tell you

We have no before-and-after score. We did not render one film with ad hoc curves and again with named ones and compare. The clips were re-rendered with the names, and the short-move fixes came from a measurement, but there is no number for how much better films got. Because the names live in one file and everything else is generated from it, the duplicates that came before are gone; [single source of truth in code](/blog/one-owner) covers that cleanup. The rest of the motion craft posts are listed in our [motion design system](/blog/ten-looks) overview.

## Source files

| File | What it holds |
|---|---|
| `core/motion/presets.js` | the `EASE` vocabulary, `leave()` and `ramp()` |
| `scripts/site/easing.mjs` | builds the easing page data from the motion library |
| `site/app/easing/` | the 44 pages and [the index](/easing) |
| `taste/rules/exits-shorter.md` | the exit duration rule |
