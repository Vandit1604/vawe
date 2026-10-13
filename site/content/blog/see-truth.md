---
title: "Test measurement tools against ground truth fixtures"
description: "Ground truth fixtures for video measuring tools: render pages whose answer you know, score each measure to one frame (0.0334 s) and print a p90 error bar."
date: 2026-10-10
updated: 2026-10-13
section: measurement
tags: "ground truth, test fixtures, calibration, video analysis, measurement"
keywords: "ground truth fixtures, calibrating measurement tools, measurement error bar, video analysis ground truth"
hero: /blog/see-truth/hero.svg
heroAlt: "A three-second timeline split into six worlds by cuts at 0.5, 0.6, 0.85, 1.85 and 2.25 seconds, with a one-frame tolerance."
---

To test a tool that measures video, render films whose every answer you already know. A cut at 0.85 s is at 0.85 s because you put it there. A flash lasts two frames because you wrote two frames. If the tool reports anything else, the tool is wrong.

At the end you have two things: a suite that prints one pass or fail row per measure, and an error bar (p50, p90 and bias) attached to every number the tool prints. We built both for vawe's film-reading tools, the calibration on 30 September and the truth suite on 10 October. The numbers below are from those runs. This is part of our series on [judging generated video](/blog/judge-design).

## Why measuring tools need ground truth

vawe renders an HTML page into a film, and an agent that makes a film needs to read it back: where the cuts fall, how long a flash lasts, whether the camera pans. A person scrubs the video. An agent needs numbers, and it trusts them. We had many tools that print them (`spec`, `strip`, `onion`, `velocity`, `timeline`, audio, `look` and `zoom`), and nobody knew which were right.

The cost of a wrong number is direct. `vawe spec` reads a reference film and prints when a move starts, how far it overshoots and how big an element is, and the agent matches those values. If a start time is 300 ms off, the agent builds a film that is 300 ms off and believes it matched.

Testing such a tool on a real film fails in a predictable way. You do not know the truth of a real film, so you compare the tool with your own impression, and your impression is what the tool was meant to replace.

## What you need for a fixture suite

- A renderer that gives the same frames twice. Without it, a fixture has no fixed answer. How we got there is in [deterministic rendering in headless Chrome](/determinism).
- The tools you want to grade, each callable from a script.
- A unit for each tolerance. For timing at 30 fps that unit is one frame.

## Step 1: write pages whose answer you know

Write the film from the answer. `harness/dev/see-truth.mjs` renders small fixture pages whose properties are known by construction. Four of them:

- `cuts`: six worlds with hard cuts at 0.5, 0.6, 0.85, 1.85 and 2.25 s. Worlds of 0.1, 0.25 and 1.0 s are there on purpose, because short shots are where a cut detector fails.
- `flash`: two full-frame flashes over a grey ground of luma 48. One lasts 2 frames at luma 200, the other 3 frames at luma 240.
- `motion`: one box overshoots 8% over 600 CSS px with an ease-out-back curve. A second box moves linearly over 400 CSS px after the first settles.
- `camera`: one textured picture that pans, then zooms from 1 to 1.3, then turns 12 degrees. A fourth world is a still slab tilted 8 degrees: a layout that is turned, which must not read as a camera that moves.

Put the awkward case in on purpose. A 0.1 s world is cheap to write, and it is the one a detector gets wrong.

The render is the same draft render that `vawe dev` runs (960x540, 30 fps), without the page checks, which cost minutes on a busy machine.

## Step 2: store the truth and the tolerance beside each page

Each fixture is a `page.html` plus a `truth.json` (in `tests/fixtures/truth/<family>/`) with the known values and the tolerance a good tool must meet. Set each tolerance from the unit of the thing. One frame at 30 fps is 0.0333 s, so the tolerance for a cut is 0.0334 s: the tool may be off by one frame and no more. A flash length may be off by one frame, and a flash start by 0.0334 s.

![Timeline of the cuts fixture: six worlds, five cuts at known seconds, and the one-frame tolerance.](/blog/see-truth/hero.svg)

## Step 3: score every measure with four states

The scorer prints one row per measure: truth, measured, error, tolerance, result and tool. Two rules matter more than the arithmetic.

A number passes only when the error is inside the tolerance, and a missing value fails.

The result has four states: pass, fail, "no tool" and "not available". A measure the repo has no tool for shows as "no tool". A measure whose verb is not on main yet shows as "not available". A gap in the tooling then looks like a gap and never like a pass.

![The flow: a fixture is rendered, each tool measures it, and the scorer prints one row per measure.](/blog/see-truth/flow.svg)

## Step 4: attach an error bar to every number

A pass or fail row tells you whether a tool is good enough. The agent also needs to know how wrong each number can be when it reads one. So we ran the same idea for `vawe spec` and kept the error.

`harness/media/ref-calibrate.mjs` renders known-truth fixtures. The baseline used twelve of them, at 960x540 and 60 fps: an audio click, a layout grid, moves with linear, bezier, spring and overshoot curves, a move with motion blur, a card that moves in and out, staggered and blurred text, and transitions. For each fixture it subtracts what the page was built to do from what the tool reports, and writes the p50, p90 and bias of the error per measure to `quality/baselines/ref-spec-error.json`, next to the error that measure must be able to detect.

The detection limits come from the decision the number feeds. For most timing measures it is one frame at 30 fps, 33.3 ms. For overshoot it is 0.02, for position 3% of the frame, for size 10%.

Then `harness/lib/ref-measure/error-table.mjs` attaches the error to every spec. Where the p90 error is larger than what the measure must detect, the spec prints "check by eye" for that line in place of a confident number. Put the error in the same output the agent reads: an error table in a separate file is a table nobody opens.

![Flow: known-truth fixtures go through ref-calibrate, which writes p50, p90 and bias per measure. Every spec carries that error.](/blog/calibrate-spec/flow.svg)

## Step 5: grade the combined reader too

Once the pieces were trusted, `vawe see` joined them. `vawe see <mp4 | page | ref-id> [--vs other]` reads a film completely: structure, motion, look, type, sound and images, side by side with a second film if you ask. The same commit made a drifting ground count as no transition, and gave one-frame shots a colour row ([86b51bd17](https://github.com/Vandit1604/vawe/commit/86b51bd17)).

Then we pointed the truth suite at `see` itself. That added fixtures for the slow camera (zoom, pan and turn between the ends of a run of frames, and a static tilt), for events inside a shot beside the nearest sound, and for the beat grid. The sound tool now names the kind of each hit (click, pop, swish, impact or sustained) and what moves in the frame at that moment ([e4fc42729](https://github.com/Vandit1604/vawe/commit/e4fc42729), [f80b3869c](https://github.com/Vandit1604/vawe/commit/f80b3869c)).

## Check that it worked

The truth suite reached 11 fixture families: cuts, flash, motion, camera, eye, ground, look, type, sound, events and beat ([23ed48a94](https://github.com/Vandit1604/vawe/commit/23ed48a94) added the fixtures and the scorer). The tolerances are written down: 0.0334 s for cuts, one frame for flash length, 6 video pixels for a pan of 60, 0.03 for a zoom of 1.3, 1.5 degrees for a turn of 12. We did not record a final pass count; the commits and notes carry none, so we give none here.

The calibration has a full table. Thirteen of 14 measures sit inside their limit ([f299477c3](https://github.com/Vandit1604/vawe/commit/f299477c3)):

| Measure | p90 error | Must detect |
|---|---|---|
| start time (`startMs`) | 8 ms | 33.3 ms |
| size (`sizeFrac`) | 4.5% | 10% |
| palette distance (`paletteDE`) | 0.909 | 6 |
| word start (`wordT0Ms`) | 33 ms | 33.3 ms |
| tail landing (`landMsTail`) | 304 ms | 33.3 ms |

![p90 error as a share of the error each measure may have. landMsTail is at 912 percent, wordT0Ms at 99 percent, all others under 52 percent.](/blog/calibrate-spec/hero.svg)

`wordT0Ms` passes by 0.3 ms, at 99% of its budget. Any change to the word timing code could tip it over, so watch measures that pass by a hair.

`landMsTail` fails at 912% of its limit. It is the landing time of a move that approaches rest slowly, where "when did it land?" has no sharp answer. The tool cannot see that number well enough to build a film from it, so the spec does not claim to: it prints "check by eye", and the agent opens the frames.

## Bugs the fixtures caught

Calibration is also a test of the parser. Three fixes came out of it, each a wrong number that would have looked plausible in a spec:

- A move that reverses at its peak was split into two tracks. Now it is one.
- Element size was read wrongly. It is now read as the flat-colour box at rest.
- Word font size follows the word's own letters.

A second commit stamped the matching thresholds used by the see-measured tools and marked them uncalibrated until a golden film exists ([9d3cf8089](https://github.com/Vandit1604/vawe/commit/9d3cf8089)). Printing "not calibrated yet" is better than printing a threshold with false confidence.

## Where to go next

The tools these fixtures grade are the ones an agent uses to read a reference; [can AI agents watch videos?](/blog/watch-a-film) shows what an agent missed before it had them. The reference ranges that the measures feed are in [our motion graphics quality benchmark](/blog/quality-bar), and the judge that reads the measured deltas is described in [LLM as a judge for video](/blog/judge-design). For how agents use vawe in general, start at [AI agents](/ai-agents).
