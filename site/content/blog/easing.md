---
title: "CSS easing functions cheat sheet: 10 curves"
description: "CSS easing functions: ten named curves with peak speeds, a spring as a linear() easing, a speed ramp for cuts, and a page for each curve."
date: 2026-10-07
updated: 2026-10-16
section: motion-sound
tags: "easing, css, motion, cubic-bezier, after effects"
keywords: "css easing functions, cubic-bezier easing, css linear() easing, easing curves cheat sheet, after effects easing in css"
hero: /blog/easing/hero.webp
heroAlt: "Large number 44 with the caption easing pages, 9 named curves, one vocabulary for every move"
---

This is a CSS easing functions cheat sheet for motion graphics. Every vawe video component uses one of ten named easing curves. Below is what each one is for, how fast it peaks, and which two needed a fix on real clips. Each curve has its own page at [/easing](/easing), generated from the same source file.

## What we found

Peak speed is the top speed of the curve compared with a straight line (linear) over the same time. We read all values from the generated data in `site/lib/easing.json`.

| Name | Job | Peak speed | Overshoot |
| --- | --- | --- | --- |
| `land` | entrance: fast start, long soft stop | 4.8x | none |
| `landSoft` | entrance under 0.4 s | 2.81x | none |
| `settle` | heavy object that starts and ends at rest | 2.5x | none |
| `swap` | replace one thing with another | 4x | none |
| `glide` | slow drift, such as a camera push | 1.47x | none |
| `carry` | a move that runs into a cut | 4.79x | none |
| `leave` | exit that settles | 1.95x | none |
| `launch` | exit that accelerates, capped at the cut | 3x | none |
| `pop` | arrival that overshoots its mark | 4.79x | 15.3% |
| `nudge` | the same shape as `pop`, less of it | 4.79x | 6.34% |

![Progress curves for land, landSoft, launch, leave and pop plotted on one chart.](/blog/easing/curves.webp "The five curves that matter most. Peak speed is relative to a straight line.")

## Why name a curve

Our video components, and the agents that wrote them, typed `cubic-bezier` numbers by hand. Across the library those numbers had no shared meaning. Short pops landed too hard. Exits ran as long as their entrances. Two video components that should feel alike used unrelated curves.

A table of names is the usual fix. We had one more reason. Agents write these pages. An agent that sees `EASE.launch` chooses better than one that sees four floats, because the name carries the purpose.

## How a curve is defined

Each name is two After Effects keyframe handles. A handle has an influence (how far along the time axis it reaches) and a speed (how steep the curve is at the key). The whole vocabulary lives in one file, `core/motion/presets.js`. Each curve converts to a CSS `linear()` string, and every page also shows the nearest `cubic-bezier` with its fit error.

## Entrances: land and landSoft

`land` is a fast start with a long soft stop. At 0.1 of the time it has already covered 0.395 of the distance. It peaks at 4.8 times average speed, and on a move shorter than 0.4 s that reads as a jump. So `landSoft` keeps the long stop and drops the peak to 2.81 times average speed.

<figure>
<video src="/blog/easing/land.mp4" poster="/blog/easing/land.webp" muted loop playsinline autoplay width="640" height="360"></video>
<figcaption><a href="/easing/land">land</a>: a fast start and a long soft stop, against linear.</figcaption>
</figure>

## Exits: leave and launch

Exits are shorter than entrances and they accelerate. The range is 0.35 to 0.6 of the entrance time, and `leave()` in the presets uses 0.6. The rule lives once, in `taste/rules/exits-shorter.md`, and a check flags an exit as long as its entrance.

`launch` is the exit that speeds up into a cut. The first version ended at 4.8 times average speed at the cut, and it read as a vanish. We capped it at 3x at the cut, the same change that added `landSoft`.

<figure>
<video src="/blog/easing/launch.mp4" poster="/blog/easing/launch.webp" muted loop playsinline autoplay width="640" height="360"></video>
<figcaption><a href="/easing/launch">launch</a>: a gentle start, then a fast exit, capped at 3x.</figcaption>
</figure>

## Overshoot: pop and nudge

`pop` passes its mark by 15.3 percent and settles back. A button press or a notification wants that shape. `nudge` has the same shape with 6.34 percent overshoot. Use it for the items next to a `pop` hero.

How much overshoot is normal? Across 22 reference films, the median share of arrivals that overshoot is 30.5 percent (p10 21.1, p90 40.9). Our overshoot-share check uses that range. The method is in [motion graphics benchmark: 167 cuts measured](/blog/quality-bar).

## Match speed across a cut with ramp()

`ramp()` is a speed ramp across a cut. The outgoing element accelerates into the cut. The incoming element leaves the cut at the same speed and slows down. So the velocity matches on both sides, which is the part people get wrong by eye. See [the speed-ramp video component](/video-components/speed-ramp), and read [motion graphics transitions](/blog/transitions) for other ways to carry motion over a seam.

## Where the handle values came from

We did not pick the handles by taste. We measured 1,339 animation segments from open-source Lottie projects (the lottie-android, lottie-ios and lottie-web repositories) and 27 segments from HyperFrames carousels. In that sample, 65.05 percent of segments used the default handles and 468 had tuned handles. There were 616 entrances and 57 exits. No exit ran faster than 1.5 times at its end. Our rule that exits accelerate departs from that sample, so we cap `launch` at 3x.

## Use a curve in your page

Import `EASE` from `core/motion/presets.js` and pass a name as the `easing` of a Web Animation:

```js
import { EASE, easeFn } from "./core/motion/presets.js";

el.animate(
  [{ translate: "0 40px", opacity: 0 }, { translate: "0 0", opacity: 1 }],
  { duration: 600, easing: EASE.land, fill: "both" },
);

console.log(easeFn("land")(0.1).toFixed(3)); // 0.395
```

We ran the last line in Node and it printed 0.395. `easeFn(name)` gives the same curve as a function of 0 to 1. Use it in pages that paint with `window.seek(t)`, where a `linear()` string cannot run.

## Spring animation in CSS

CSS has no spring keyword. It has `linear()`, an easing function that takes a list of points. Sample a spring at 40 points, and CSS draws the spring. The result is a plain CSS value, so a Web Animation or a CSS `transition` can use it.

```js
function spring(t, k, d) {
  if (t <= 0) return 0;
  const w = Math.sqrt(k), z = d / (2 * w);
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

function springEasing(k, d, seconds, samples = 40) {
  const pts = Array.from({ length: samples + 1 }, (_, i) =>
    i === 0 ? 0 : i === samples ? 1 : Math.round(spring((i / samples) * seconds, k, d) * 1e4) / 1e4);
  return `linear(${pts.join(", ")})`;
}

el.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }],
  { duration: 1040, easing: springEasing(220, 12, 1.04), fill: "both" });
```

Here `k` is the stiffness and `d` is the damping. A higher `d` removes the bounce. We ran this in headless Chrome with `k` 220 and `d` 12. The easing string is 319 characters, and the scale peaks at 1.248 before it settles at 1. The four springs in `core/motion/springs.js` settle in 0.43 s (snappy), 0.71 s (default), 1.34 s (heavy) and 1.04 s (playful). Only snappy (1.015) and playful (1.249) overshoot by more than 0.1 percent.

## The 45 easing pages

A script reads the motion library and writes one JSON file per curve. Each holds the curve, its velocity, the `linear()` string, a cubic-bezier fit and the After Effects handle values. The site renders 45 pages from it. They cover the ten vawe curves, 30 classic ones (ten families, each in, out and in-out) and the 5 CSS keywords including `linear`. A person types only the words. Each vawe page carries a 2 s clip of the curve moving a square next to a linear one.

We have no before-and-after score. We did not render one film with ad hoc curves and again with named ones. The short-move fixes came from a measurement, but no number says how much better the films got. The names live in one file and the rest is generated, so the duplicate curves are gone. The looks that dress a clip are in [CSS animation library: 126 copyable video components](/blog/site-after-json).

| File | What it holds |
| --- | --- |
| `core/motion/presets.js` | the `EASE` vocabulary, `leave()` and `ramp()` |
| `scripts/site/easing.mjs` | builds the easing page data from the motion library |
| `site/app/easing/` | the 45 pages and [the index](/easing) |
| `taste/rules/exits-shorter.md` | the exit time rule |

## FAQ

**How do I make a spring animation in CSS?**
Sample a spring formula at about 40 points and put the numbers in a `linear()` easing. The code above does this, and it works in a Web Animation and in a CSS `transition`.

**What is the best easing for UI animation?**
Use a fast start and a long soft stop for things that arrive, such as `land` here. Make exits shorter than entrances and let them accelerate.

**What is the difference between cubic-bezier and linear() in CSS?**
`cubic-bezier()` describes one smooth curve with four numbers. `linear()` lists many points. So it can draw an overshoot or a bounce that one bezier cannot.

**How long should an exit take compared with an entrance?**
We use 0.35 to 0.6 of the entrance time. A card that takes 0.4 s to appear leaves in about 0.25 s.

**How do I use After Effects easing in CSS?**
Treat each keyframe handle as an influence and a speed, then convert the curve to a `linear()` string. The pages at [/easing](/easing) show the handle values and the matching `linear()` and `cubic-bezier` for each curve.
