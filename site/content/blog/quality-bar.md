---
title: "Measuring motion graphics quality across 167 cuts"
description: "We stopped asking if a film was good and measured 167 cuts in 17 reference films. The ranges became four checks, and our early drafts fell outside all four."
date: 2026-10-07
section: measurement
tags: "motion graphics, quality metrics, benchmark, video analysis, agents"
keywords: "motion graphics quality, video quality benchmark, measure motion design, shot cut analysis, reference film measurement"
hero: /blog/quality-bar/hero.svg
heroAlt: "Large number 167 with the caption cuts measured, the quality bar is a range, not an opinion"
---

Our film judge used to compare a new film with our own earlier films. That gave it no outside bar, so on 7 October we changed the question. Instead of asking whether a film was good, we measured 167 cuts in 17 reference films and asked whether a draft sits inside that range. Measuring motion graphics quality this way gave us four new checks. Our early films fell outside the range on all four.

## The problem: the bar was our own taste

A judge that only sees your films can only rank your films. If all of them share a habit (a slow drift, too much text, motion that is too fast), the judge reads the habit as normal. We wanted a bar from films we consider excellent, and a code path that measured it, so the answer would not depend on who looked.

## What we tried: put numbers on reference films

Three pieces made it work.

`vawe refs` indexes the reference films. They live in a folder outside the repo and are never committed, so we publish the measurement and keep the films private (`10f9e5ebf`). It picks references by film type and length.

`vawe spec` measures any film deterministically: its cuts, its flashes and, from `576d7c9ff`, two more groups of numbers. The eye group is where the focus sits in each shot, how far it jumps at a cut, how far it travels, and how often it sits near the centre. The ground group is the edge tone, whether the ground changes at a cut, and how much the light drifts (`2a1e5fb32` later made a cut compare the border cells of the two worlds).

`bar-from-refs` takes one value per film and prints the p10, median and p90 of each metric (`78a282e7c`). The output is a committed file, `taste/build/ref-range.json`.

<figure>
<img src="/blog/quality-bar/ref-range.svg" alt="Range bars from the reference films: eye jump median 0.185 frame heights, eye near centre median 50 percent, ground change median 56.3 percent, overshoot median 30.5 percent" width="720" height="410" loading="lazy">
<figcaption>p10 to p90 as a bar and the median as a tick, drawn from <code>taste/build/ref-range.json</code>. Each row has its own axis.</figcaption>
</figure>

## Motion graphics quality, in numbers

The range file covers 17 in-scope films and 167 cuts, with overshoot measured over 22 films. The medians:

<table>
<thead><tr><th>Metric</th><th>p10</th><th>Median</th><th>p90</th></tr></thead>
<tbody>
<tr><td>Eye jump at a cut (frame heights)</td><td>0.152</td><td>0.185</td><td>0.396</td></tr>
<tr><td>Cuts with the eye near the centre</td><td>32.7%</td><td>50%</td><td>69.48%</td></tr>
<tr><td>Cuts where the ground changes</td><td>0%</td><td>56.3%</td><td>100%</td></tr>
<tr><td>Arrivals that overshoot (22 films)</td><td>21.1%</td><td>30.5%</td><td>40.9%</td></tr>
</tbody>
</table>

Reading across: the median reference film keeps the eye still at a cut (a jump of under a fifth of the frame height), puts half its cuts near the centre and changes the ground at a little more than half of them. About three in ten arrivals overshoot their mark. That last one is the number behind our [easing vocabulary](/blog/easing) and the `pop` curve.

## What we built: four checks from the data

The same commit wrote four checks straight from the ranges (`9fd9a76e2`). Each limit comes from a percentile, and each rule file records what our own films looked like when we measured them.

<figure>
<img src="/blog/quality-bar/ours-vs-ref.svg" alt="Four rows comparing our early films with the reference range: overshoot 0 to 11 against 21 to 41 percent, peak speed 14 to 30 against at most 12.6 frame heights per second, readable text 94 against 84 percent or less, and a word held 3 to 4 seconds against 2.8" width="720" height="320" loading="lazy">
<figcaption>Early drafts against the same range.</figcaption>
</figure>

- `overshoot-share`: A film should overshoot on 21 to 61 percent of the arrivals that move. The low end is the reference p10, and the high end is 1.5 times the reference p90. Our films overshot on 0 to 11 percent.
- `speed-ceiling`: The p90 of the peak speed of the moving elements should stay at or under 12.6 frame heights per second. The references peak between 4 and 13. Ours peaked between 14 and 30.
- `text-breathing`: Readable text should be on screen for at most 84 percent of the film. The references show text between 3 and 84 percent of the time, with a median of 61. Two of our films showed it for 94 percent.
- `text-lingers`: A word should not stay on screen far past its read time. The references hold a word between 0.7 and 2.8 s. Two of our films held a word for 3 to 4 s.

The checks give advice and do not block, and each rule has a break-when line. A kinetic type film where the words are the picture says so in its brief. The judge also changed. It now compares sheets side by side with two reference films per dial and caps its scores when we lose. The design of that judge is in [its own post](/blog/judge-design).

## What the measurement does not say

The range is not a definition of good. It is the range of 17 films that we picked as good, measured one value per film. Seventeen is small, and the p10 and p90 of a small set move when you add one film. Overshoot rests on 22.

The numbers also do not say that a film inside the range is good. They say it is typical of films we admire on those four dials. A deliberately strange film can break all four and be right, which is why every rule has a break-when line.

And you cannot reproduce the ranges. The films stay on one machine, so what you can check is the file and the code that wrote it, `bar-from-refs`. We think a published method and a published range beat a published opinion, but it is a weaker claim than "here are the films".

## What we would tell someone building the same thing

Measure the references before you write the rules. Our limits and the measured ones were far apart: our early films reached 30 frame heights per second at p90, against a reference ceiling near 13.

Take one value per film, not per cut, before you take percentiles. Otherwise a long film with many cuts decides the range.

Keep the checks advisory. A percentile is a description. If you make it a gate, agents will game it, which is the subject of [our loophole audit](/blog/loophole-audit).

## In the code

- `harness/media/ref-spec.mjs` and `harness/dev/bar-from-refs.mjs`: measure a film, then summarise the references
- `taste/build/ref-range.json`: the committed range file
- `taste/rules/overshoot.md`, `speed-bands.md`, `text-breathing.md` and `readable-hold.md`: where the four rules live today (they were four separate files when first written)
- [`576d7c9ff`](https://github.com/Vandit1604/vawe/commit/576d7c9ff): eye point and ground measured per shot
- [`78a282e7c`](https://github.com/Vandit1604/vawe/commit/78a282e7c): `bar-from-refs` prints the p10, median and p90
- [`9fd9a76e2`](https://github.com/Vandit1604/vawe/commit/9fd9a76e2): the four checks from the measured bar
- [`4e4aa7ed6`](https://github.com/Vandit1604/vawe/commit/4e4aa7ed6): the judge compares with two reference films per dial

The repo is [Vandit1604/vawe](https://github.com/Vandit1604/vawe). The agent workflow that uses these numbers is on [/ai-agents](/ai-agents).
