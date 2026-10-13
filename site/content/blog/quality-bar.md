---
title: "Motion graphics quality benchmark: 167 cuts measured"
description: "A motion graphics quality benchmark from 167 cuts in 17 reference films: median eye jump 0.185 frame heights, 30.5% of arrivals overshoot, four checks."
date: 2026-10-07
updated: 2026-10-13
section: measurement
tags: "motion graphics, quality metrics, benchmark, video analysis, agents"
keywords: "motion graphics quality benchmark, measure motion design, shot cut analysis, reference film measurement"
hero: /blog/quality-bar/hero.webp
heroAlt: "Large number 167 with the caption cuts measured, the quality bar is a range, not an opinion"
---

We measured 167 cuts in 17 reference films we consider excellent, and the median film moves the viewer's eye by less than a fifth of the frame height at a cut (0.185 frame heights). About three in ten of its arrivals overshoot their mark. Our own early drafts fell outside the reference range on all four checks we wrote from these numbers.

This page gives the setup, the method, the full ranges, and what the numbers cannot tell you. It is the outside bar our [LLM judge for video](/blog/judge-design) compares films against.

## Why a benchmark from other people's films

Until 7 October our film judge compared a new film with our own earlier films. A judge that only sees your films can only rank your films. If all of them share a habit (a slow drift, too much text, motion that is too fast), the judge reads the habit as normal. We wanted a bar taken from films outside our work, and a code path that measured it, so the answer would not depend on who looked.

## Setup: the reference set and the tools

`vawe refs` indexes the reference films and picks them by film type and length. The films live in a folder outside the repo and are never committed; we publish the measurement and keep the films private ([10f9e5ebf](https://github.com/Vandit1604/vawe/commit/10f9e5ebf)).

`vawe spec` measures any film deterministically: its cuts and flashes, and since [576d7c9ff](https://github.com/Vandit1604/vawe/commit/576d7c9ff) two more groups.

- The eye group: where the focus sits in each shot, how far it jumps at a cut, how far it travels, and how often it sits near the centre.
- The ground group: the edge tone, whether the ground changes at a cut, and how much the light drifts. [2a1e5fb32](https://github.com/Vandit1604/vawe/commit/2a1e5fb32) later made a cut compare the border cells of the two worlds.

How far each of those numbers can be trusted is its own question; we calibrated the tools against [ground truth fixtures](/blog/see-truth) before relying on them.

## Method: one value per film, then percentiles

`bar-from-refs` takes one value per film for each metric and prints the p10, median and p90 ([78a282e7c](https://github.com/Vandit1604/vawe/commit/78a282e7c)). The output is a committed file, `taste/build/ref-range.json`. One value per film comes first so that a long film with many cuts does not decide the range on its own.

The range covers 17 in-scope films and 167 cuts. Overshoot was measured over 22 films.

## Results: the reference ranges

| Metric | p10 | Median | p90 |
|---|---|---|---|
| Eye jump at a cut (frame heights) | 0.152 | 0.185 | 0.396 |
| Cuts with the eye near the centre | 32.7% | 50% | 69.48% |
| Cuts where the ground changes | 0% | 56.3% | 100% |
| Arrivals that overshoot (22 films) | 21.1% | 30.5% | 40.9% |

<figure>
<img src="/blog/quality-bar/ref-range.webp" alt="Range bars from the reference films: eye jump median 0.185 frame heights, eye near centre median 50 percent, ground change median 56.3 percent, overshoot median 30.5 percent" width="720" height="410" loading="lazy">
<figcaption>p10 to p90 as a bar and the median as a tick, drawn from <code>taste/build/ref-range.json</code>. Each row has its own axis.</figcaption>
</figure>

Read across, the median reference film keeps the eye nearly still at a cut, puts half its cuts near the centre, and changes the ground at a little more than half of them. The overshoot share is the number behind our [CSS easing curves](/blog/easing) and the `pop` curve.

## Results: our early drafts against the range

The same commit wrote four checks straight from the ranges ([9fd9a76e2](https://github.com/Vandit1604/vawe/commit/9fd9a76e2)). Each limit comes from a percentile, and each rule file records what our films looked like when we measured them.

| Check | Reference | Our early films |
|---|---|---|
| `overshoot-share`: arrivals that overshoot | 21 to 61% (p10 to 1.5 x p90) | 0 to 11% |
| `speed-ceiling`: p90 peak speed, frame heights per second | references peak at 4 to 13; limit 12.6 | 14 to 30 |
| `text-breathing`: share of the film with readable text | 3 to 84%, median 61; limit 84% | 94% in two films |
| `text-lingers`: how long one word holds | 0.7 to 2.8 s | 3 to 4 s in two films |

<figure>
<img src="/blog/quality-bar/ours-vs-ref.webp" alt="Four rows comparing our early films with the reference range: overshoot 0 to 11 against 21 to 41 percent, peak speed 14 to 30 against at most 12.6 frame heights per second, readable text 94 against 84 percent or less, and a word held 3 to 4 seconds against 2.8" width="720" height="320" loading="lazy">
<figcaption>Early drafts against the same range.</figcaption>
</figure>

The gap on speed is the largest: our films reached 30 frame heights per second at p90, against a reference ceiling near 13.

The checks advise and do not block, and each rule has a break-when line. A kinetic type film where the words are the picture says so in its brief. A percentile describes films; turned into a hard gate it invites agents to game it, which is what happened with another check in [reward hacking in AI agents](/blog/loophole-audit). The judge changed at the same time: it now compares sheets side by side with two reference films per dial and caps its scores when we lose ([4e4aa7ed6](https://github.com/Vandit1604/vawe/commit/4e4aa7ed6)).

## What the numbers do not show

The range is not a definition of good. It is the spread of 17 films that we picked as good, one value per film. Seventeen is a small set, and the p10 and p90 of a small set move when you add one film. Overshoot rests on 22.

A film inside the range is typical of films we admire on those four dials. That does not make it good, and a deliberately strange film can break all four and be right. That is why every rule has a break-when line.

You also cannot reproduce the ranges from the films, because the films stay on one machine. What you can check is the file and the code that wrote it. We think a published method and a published range beat a published opinion, but the claim is weaker than "here are the films".

## Reproduce it with your own references

The method runs on any folder of films you choose:

1. Index the films with `vawe refs`.
2. Measure each one with `vawe spec` (the code is `harness/media/ref-spec.mjs`).
3. Summarise with `harness/dev/bar-from-refs.mjs`, which writes the p10, median and p90 per metric.

The four rules live in `taste/rules/overshoot.md`, `speed-bands.md`, `text-breathing.md` and `readable-hold.md` (they were four separate files when first written). The agent workflow that uses these numbers is on [/ai-agents](/ai-agents), and the judge that reads them is explained in [LLM as a judge for video](/blog/judge-design).
