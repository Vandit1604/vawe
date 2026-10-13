---
title: "Ground truth fixtures: how we graded our video tools"
description: "Ground truth fixtures for our video tools: 11 families with known cuts, flashes, pans and zooms, scored per measure. The bar was one frame at 30 fps, 0.0334 s."
date: 2026-10-10
section: measurement
tags: "ground truth, test fixtures, video analysis, agents, measurement"
keywords: "ground truth fixtures, video analysis ground truth, test measuring tools, ai agent video review, vawe see"
hero: /blog/see-truth/hero.svg
heroAlt: "A three-second timeline split into six worlds by cuts at 0.5, 0.6, 0.85, 1.85 and 2.25 seconds, with a one-frame tolerance."
---

We made films where we already knew every answer, then graded our own tools against them. A cut at 0.85 s is at 0.85 s because we put it there. A flash lasts two frames because we wrote two frames. If a tool says anything else, the tool is wrong.

Ground truth fixtures turn "the tool printed a number" into "the tool printed the right number". We built ours on 2026-10-10 for `vawe see`.

## The problem: an agent could not see its own film

vawe renders an HTML page into a film. An agent that makes a film needs to read it back: where the cuts fall, how long a flash lasts, whether the camera pans. A person scrubs the video. An agent needs numbers.

We had many tools for that: `spec`, `strip`, `onion`, `velocity`, `timeline`, audio, `look` and `zoom`. Each printed numbers. Nobody knew which of them were right. An agent that trusts a wrong number builds a wrong film, and the error is invisible because the output looks tidy.

## Why a real film does not work as a test

Checking a tool on a real film fails in a predictable way. On a real film you do not know the truth, so you compare the tool to your own impression, and your impression is what the tool was supposed to replace.

## What we built: ground truth fixtures

The fix was to invert the setup. Write the film from the answer.

`harness/dev/see-truth.mjs` renders small fixture pages whose properties are known by construction. Each fixture is a `page.html` plus a `truth.json` with the known values and the tolerance a good tool should meet. A few of them:

- `cuts`: six worlds with hard cuts at 0.5, 0.6, 0.85, 1.85 and 2.25 s. Worlds of 0.1, 0.25 and 1.0 s are included on purpose, because short shots are where a cut detector fails.
- `flash`: two full-frame flashes over a grey ground of luma 48. One lasts 2 frames at luma 200, the other 3 frames at luma 240.
- `motion`: one box overshoots 8% over 600 CSS px with an ease-out-back curve. A second box moves linearly over 400 CSS px after the first settles.
- `camera`: one textured picture that pans, then zooms from 1 to 1.3, then turns 12 degrees. A fourth world is a still slab tilted 8 degrees, which is a layout that is turned, not a camera that moves.

The render is the same draft render that `vawe dev` runs (960x540, 30 fps), without the page checks, which cost minutes on a busy machine.

![Timeline of the cuts fixture: six worlds, five cuts at known seconds, and the one-frame tolerance.](/blog/see-truth/hero.svg)

The tolerance for a cut is 0.0334 s. One frame at 30 fps is 0.0333 s, so a tool may be off by one frame and no more. The tolerance for a flash length is one frame, and for a flash start 0.0334 s.

The scorer prints one row per measure: truth, measured, error, tolerance, result and tool.

![The flow: a fixture is rendered, each tool measures it, and the scorer prints one row per measure.](/blog/see-truth/flow.svg)

Two details in the scorer matter more than the arithmetic. A number passes when the error is inside the tolerance, and a missing value fails. And the result has four states: pass, fail, "no tool" and "not available". A measure the repo has no tool for shows as "no tool". A measure whose verb is not on main yet shows as "not available". A gap in the tooling is visible instead of looking like a pass.

## Then the suite graded the report

Once we trusted the pieces, `vawe see` joined them. `vawe see <mp4 | page | ref-id> [--vs other]` reads a film completely: structure, motion, look, type, sound and images, side by side with a second film if you ask. The same commit made a drifting ground count as no transition, and gave one-frame shots a colour row ([86b51bd17](https://github.com/Vandit1604/vawe/commit/86b51bd17)).

Then we pointed the truth suite at `see` itself. That added fixtures for the slow camera (zoom, pan and turn between the ends of a run of frames, and a static tilt), for events inside a shot beside the nearest sound, and for the beat grid. The sound tool now names the kind of each hit (click, pop, swish, impact or sustained) and what moves in the frame at that moment ([e4fc42729](https://github.com/Vandit1604/vawe/commit/e4fc42729), [f80b3869c](https://github.com/Vandit1604/vawe/commit/f80b3869c)).

## The result

The suite reached 11 fixture families: cuts, flash, motion, camera, eye, ground, look, type, sound, events and beat. Tolerances are tight and written down: 0.0334 s for cuts, one frame for flash length, 6 video pixels for a pan of 60, 0.03 for a zoom of 1.3, 1.5 degrees for a turn of 12.

We did not record a final pass count. The commits and notes do not carry one, so we will not invent a number here. What the suite gave us is a place where a regression in a measuring tool shows up as a failed row.

## What we would tell you if you build this

- Build the answer first. Write a page whose truth you know, then render it. A wrong measure that shapes a film is much harder to find than a failed fixture row.
- Include the awkward case in the fixture. A 0.1 s world is cheap to write and it is the one a detector gets wrong.
- Set the tolerance from the unit of the thing. For cuts at 30 fps that is one frame. A tolerance you cannot explain is a tolerance you will loosen.
- Report gaps as gaps. "No tool" should never print the same as "pass".
- Calibrate the reference measurements too. The companion post, [every measure ships with its own error bar](/blog/calibrate-spec), does that for `vawe spec`.

This is the groundwork for a harness an agent can lean on. If you are looking at how agents use vawe, start with [AI agents](/ai-agents). For the idea that a film can be rendered the same way twice, which makes fixtures possible at all, read [determinism](/determinism). The tool that cuts frames into strips for the agent is covered in [teaching an agent to watch a film](/blog/watch-a-film).

## In the code

- `harness/dev/see-truth.mjs`: the scorer and the fixture runner
- `tests/fixtures/truth/*/truth.json`: the known values and tolerances, one folder per family
- [23ed48a94](https://github.com/Vandit1604/vawe/commit/23ed48a94): ground-truth fixtures and a scorer
- [86b51bd17](https://github.com/Vandit1604/vawe/commit/86b51bd17): `vawe see` reads a film completely
- [e4fc42729](https://github.com/Vandit1604/vawe/commit/e4fc42729): slow camera measures and a camera fixture
- [f80b3869c](https://github.com/Vandit1604/vawe/commit/f80b3869c): hit kinds and events beside the nearest sound

The repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).
