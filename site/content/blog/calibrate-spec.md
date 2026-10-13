---
title: "Calibrating measurement tools: every number gets an error bar"
description: "Calibrating measurement tools: 13 of 14 measures passed on known-truth fixtures (start-time p90 error 8 ms). One failed at 304 ms, so spec says check by eye."
date: 2026-09-30
section: measurement
tags: "calibration, measurement error, p90, agents, reference films"
keywords: "calibrating measurement tools, measurement error bar, p90 error, ground truth calibration, ai agent measurement"
hero: /blog/calibrate-spec/hero.svg
heroAlt: "Bar chart of 14 measures, each shown as p90 error as a share of the error it may have. Thirteen bars sit under 100 percent. One, landMsTail, sits at 912 percent."
---

A measurement without an error bar is a guess with decimals. We found that out on a tool that agents trust: `vawe spec` reads a reference film and prints numbers (when a move starts, how far it overshoots, how big an element is), and the agent matches them. If a number is wrong by 300 ms, the agent builds a film that is wrong by 300 ms and believes it matched.

This post is about calibrating measurement tools with fixtures you can check. We ran 14 measures through calibration. Thirteen passed. One did not, and we changed how the spec reports it.

## The problem

`vawe spec` measures a reference film: shots, motion, text and palette. The agent treats the output as a target. That makes the spec's error part of the film's error. A start time that is 100 ms late becomes a film whose motion starts 100 ms late.

Nobody had asked how wrong each number could be. A tool can be accurate for one kind of move and loose for another, and a single printed value hides that.

## Calibrating measurement tools with fixtures

`harness/media/ref-calibrate.mjs` renders known-truth fixtures. The baseline in this commit used twelve of them, at 960x540 and 60 fps: an audio click, a layout grid, moves with linear, bezier, spring and overshoot curves, a move with motion blur, a card that moves in and out, staggered and blurred text, and transitions.

For every fixture the script measures what the tool reports and subtracts what the page was built to do. It writes the result to `quality/baselines/ref-spec-error.json`: the p50, the p90 and the bias of the error, per measure, next to the error that measure must be able to detect.

For most timing measures the detection limit is one frame at 30 fps, 33.3 ms. For overshoot it is 0.02, for position 3% of the frame, for size 10%.

Then the error gets attached to every spec. Where the p90 error is larger than what the measure must detect, the spec prints "check by eye" for that line instead of a confident number.

![Flow: known-truth fixtures go through ref-calibrate, which writes p50, p90 and bias per measure. Every spec carries that error.](/blog/calibrate-spec/flow.svg)

## What the calibration found

Thirteen of 14 measures are inside their limit. The chart shows each p90 error as a share of its limit:

![p90 error as a share of the error each measure may have. landMsTail is at 912 percent, wordT0Ms at 99 percent, all others under 52 percent.](/blog/calibrate-spec/hero.svg)

A few numbers from the table in the commit:

| Measure | p90 error | Must detect |
|---|---|---|
| start time (`startMs`) | 8 ms | 33.3 ms |
| size (`sizeFrac`) | 4.5% | 10% |
| palette distance (`paletteDE`) | 0.909 | 6 |
| word start (`wordT0Ms`) | 33 ms | 33.3 ms |
| tail landing (`landMsTail`) | 304 ms | 33.3 ms |

`wordT0Ms` passes by 0.3 ms. It passes with no margin: any change to the word timing code could tip it over. We left it and we know where it sits.

`landMsTail` fails. It is the landing time for a move that approaches its rest position slowly, where "when did it land?" has no sharp answer. The p90 error is 304 ms against a 33.3 ms need. The tool cannot see that number well enough to build a film from it. So the spec does not claim to. It prints "check by eye" for that line, and the agent opens the frames.

## Bugs the fixtures found

Calibration was also a test run. Three fixes came out of it:

- A move that reverses at its peak was split into two tracks. Now it is one.
- Element size is read as the flat-colour box at rest. It was read wrongly before.
- Word font size follows the word's own letters.

Each of these was a wrong number that would have looked plausible in a spec.

A second commit stamped the matching thresholds used by the see-measured tools, and marked them uncalibrated until a golden film exists ([9d3cf8089](https://github.com/Vandit1604/vawe/commit/9d3cf8089)). We chose to say "not calibrated yet" over printing a threshold with false confidence.

## What we would tell you if you build this

- Put the error next to the number, in the same output the agent reads. An error table in a separate file is a table nobody opens.
- Let a measure fail in the open. Ours has a defined fallback, "check by eye", which beats a bad number.
- Define the limit from what the decision needs. One frame at 30 fps is the smallest timing difference we care about, so it is the bar for timing measures.
- Watch the measures that pass by a hair. `wordT0Ms` is at 99% of its budget.
- Treat the fixtures as a test of your parser too. Three of our bugs were in how the tool read the render, not in the render.

The partner post, [before we trusted our film-reading tool, we marked its homework](/blog/see-truth), does the same for the tools that read a film from the outside. For the other side of the loop, how an agent uses a reference at all, see [the quality bar is a measured set of real films](/blog/quality-bar). Both rest on renders that repeat: [determinism](/determinism) explains how.

## In the code

- `harness/media/ref-calibrate.mjs`: renders the fixtures and writes the error table
- `harness/lib/ref-measure/error-table.mjs`: attaches the error to a spec
- `quality/baselines/ref-spec-error.json`: the p50, p90 and bias per measure
- [f299477c3](https://github.com/Vandit1604/vawe/commit/f299477c3): calibrated error per measure, and the three fixes
- [9d3cf8089](https://github.com/Vandit1604/vawe/commit/9d3cf8089): thresholds stamped, uncalibrated until the golden film

The repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).
