---
title: "CSS easing curves need names: 44 pages of easing data"
description: "We replaced hand-typed cubic-bezier numbers with nine named CSS easing curves and 44 pages of velocity data. What the names fixed and what we could not measure."
date: 2026-10-07
section: taste
tags: "easing, css, motion, cubic-bezier, after effects"
keywords: "css easing curves, cubic-bezier easing, linear() easing, after effects easing in css, motion graphics easing"
hero: /blog/easing/hero.svg
heroAlt: "Large number 44 with the caption easing pages, 9 named curves, one vocabulary for every move"
---

Our moves and the agents that wrote them typed `cubic-bezier` numbers by hand, so exits, landings and short pops felt inconsistent. The fix was names. We gave nine curves names, put the names in one file, and published every curve we use, plus 35 more, as 44 easing pages with the numbers behind them. This post covers the CSS easing curves we ended up with, the two that went wrong at first, and the one number we could not measure.

## The problem: easing written as raw numbers

A vawe film is one HTML page that animates with CSS keyframes and Web Animations. Easing is the part of an animation that an agent or a person writes without thinking: a four-number `cubic-bezier` or a CSS keyword. Across the moves library, those numbers had no shared meaning. Short pops landed too hard, exits ran as long as their entrances, and two moves that should have felt related used unrelated curves.

The common fix is a table of names, which every motion system has. Ours had one extra requirement. Agents write these pages, and an agent that sees `EASE.launch` makes a better choice than one that sees four floats. A name carries a purpose.

## What we tried first, and where it broke

We started with six names built from After Effects keyframe handles: an influence (how far along the time axis the handle reaches) and a speed (how steep the curve is at the key). `land` is a fast start with a long soft stop, `leave` and `launch` are exits, `settle` and `swap` are two-sided eases, `glide` is a drift.

Two of them failed on real clips.

`land` peaks at 4.8 times average speed. On a move shorter than 0.4 s that reads as a jump, and the README note in the fix commit says so. We added `landSoft`, which keeps the long soft stop but drops the peak speed to 2.81 times average (`70069b63d`), then lengthened the short pops and exits the energy measure had flagged (`7a8b902c7`).

`launch` had the opposite problem. An exit that accelerates into a cut is right, but our first version ended at 4.8 times average speed at the cut, and the same README note says it read as a vanish. We capped `launch` at 3 times at the cut.

<figure>
<img src="/blog/easing/curves.svg" alt="Progress curves for land, land-soft, launch, leave and pop plotted on one chart" width="720" height="400" loading="lazy">
<figcaption>The five curves that matter most, plotted from the sampled data on the easing pages. Peak speed is relative to a straight line.</figcaption>
</figure>

## The CSS easing curves we built: names, a ramp, 44 pages

The vocabulary is nine entries in `core/motion/presets.js`: `land`, `landSoft`, `settle`, `swap`, `glide`, `carry`, `leave`, `launch` and `pop`. Each is two handles. Each converts to a CSS `linear()` string, and the pages show the nearest `cubic-bezier` with its error. `pop` is the one that overshoots. It passes its mark by 15.3 percent and settles back, which is the shape a button press or a notification wants.

<table>
<thead><tr><th>Name</th><th>Job</th><th>Peak speed</th></tr></thead>
<tbody>
<tr><td><code>land</code></td><td>entrance, fast start, long stop</td><td>4.8x</td></tr>
<tr><td><code>landSoft</code></td><td>entrance under 0.4 s</td><td>2.81x</td></tr>
<tr><td><code>launch</code></td><td>exit that accelerates, capped at the cut</td><td>3x</td></tr>
<tr><td><code>leave</code></td><td>exit that settles</td><td>1.95x</td></tr>
<tr><td><code>pop</code></td><td>arrival that overshoots by 15.3%</td><td>4.79x</td></tr>
</tbody>
</table>

The same pass added `ramp()`, a speed ramp across a cut. The outgoing element accelerates into the cut and the incoming one leaves it at the same speed and slows down, so the velocity matches on both sides (`3e6b5eb4d`). Matching velocity across the cut is the part people get wrong by eye. See [the speed-ramp move](/moves/speed-ramp).

Then we generated the pages. A script reads the motion library and writes one JSON file with the curve, its velocity, the `linear()` string, a cubic-bezier fit and the After Effects handle values for every ease. The site renders 44 pages from it: the nine vawe curves, 30 classic ones (ten families, in, out and in-out) and the 5 CSS keywords including `linear` (`e32a4f38b`). Nothing on a page is typed by hand except the words. Each vawe page carries a 2 s clip of the curve moving a square next to a linear one.

<figure>
<video src="/blog/easing/land.mp4" poster="/blog/easing/land.webp" muted loop playsinline autoplay width="640" height="360"></video>
<figcaption><a href="/easing/land">land</a>: a fast start and a long soft stop, against linear.</figcaption>
</figure>

<figure>
<video src="/blog/easing/launch.mp4" poster="/blog/easing/launch.webp" muted loop playsinline autoplay width="640" height="360"></video>
<figcaption><a href="/easing/launch">launch</a>: an exit that starts gently and speeds up, capped at 3x at the cut.</figcaption>
</figure>

## Where the numbers came from

We did not pick the handle values by taste. We pulled 1,339 animation segments from open-source Lottie projects (from the lottie-android, lottie-ios and lottie-web repositories) and 27 segments from HyperFrames carousels, and measured them. In that sample 65.05 percent of segments used the default handles, 468 were tuned, 616 were entrances and 57 were exits. No exit in the sample ran faster than 1.5 times at its end. Our rule that exits accelerate is a deliberate step away from that, which is why `launch` is capped at 3x.

The same data gave the exit rule. Exits are shorter than entrances and accelerate. The house range is 0.35 to 0.6 of the entrance duration, and `leave()` in the presets uses 0.6. That rule is written once in `taste/rules/exits-shorter.md`, and a check flags an exit as long as its entrance.

## What the names measured, and what they did not

Fact: the library has 44 easing pages, every number computed from `core/motion`. Fact: across 22 reference films, the median share of arrivals that overshoot is 30.5 percent (p10 21.1, p90 40.9), and the overshoot-share check is built on that range. The measured bar is the subject of [a separate post](/blog/quality-bar).

What we do not have is a before and after. We did not render the same film with ad hoc curves and then with named ones and compare scores. The commit history shows the clips were re-rendered with the new names, and the short-move fixes came from a measurement (the energy measure flagged them), but there is no number for "films got better by X". We would rather say that than invent one.

## What we would tell someone building the same thing

Start with the jobs, not the curves. We named `land`, `leave` and `launch` for what the element is doing, and the curve falls out of the job. Then test each name on the shortest move that will use it, because that is where a curve with a high peak speed fails first.

Cap what the cut can see. A curve that ends fast reads as a vanish at a cut, however nice it looks in isolation. And publish the numbers. Writing the pages made us compute peak speed, the time to 50 and 90 percent, and a bezier fit for every curve, so each name now has numbers a reviewer can check.

Last, keep one owner. The names live in one file, the pages are generated from it, and a rule file cites it. See [one owner per rule](/blog/one-owner) for how we cleaned up the duplicates that came before.

## In the code

- `core/motion/presets.js`: the `EASE` vocabulary, `leave()` and `ramp()`
- `scripts/site/easing.mjs`: builds the data for the easing pages from the motion library
- `site/app/easing/`: the 44 pages, plus [the index](/easing)
- [`70069b63d`](https://github.com/Vandit1604/vawe/commit/70069b63d): `EASE.landSoft`, and `launch` capped at 3x at the cut
- [`3e6b5eb4d`](https://github.com/Vandit1604/vawe/commit/3e6b5eb4d): `ramp()` with matched velocity on both sides
- [`e32a4f38b`](https://github.com/Vandit1604/vawe/commit/e32a4f38b): the 44 easing pages

The repo is [Vandit1604/vawe](https://github.com/Vandit1604/vawe). 
