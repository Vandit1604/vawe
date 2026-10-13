---
title: "Video reference comparison: our agent never did it"
description: "Our film scored 62 and still looked wrong. The reference flashes ran 0.10 s, ours ran 0.20 s, and no tool in the agent loop knew the reference existed."
date: 2026-10-11
section: agent-experience
tags: "video reference comparison, ai agents, motion graphics, judge, measurement"
keywords: "video reference comparison, compare video to reference, ai video quality, reference-driven film"
hero: /blog/plan-vs-reference/gap.svg
heroAlt: "Two charts. Flash runs: the reference runs 0.10, 0.07 and 0.10 seconds, ours 0.20 seconds each. Frame luma split: the reference has 27 percent below Y 50, ours 80 percent."
---

An agent made a film in the style of a reference clip. Our judge scored it 62, then 61, then 62. The person who owned the reference looked at it and said the concept was right and the look was wrong. Both were true, because the judge had never seen the reference. This is a story about video reference comparison, and about how an agent can pass every check in the loop by measuring its film against its own plan.

## The problem

We read the trace of one session: an 8 s film in the style of a reference, built by a weaker model. The reference entered the work at stage 2. The agent read 5 key frames and 2 of 16 strips, and it read the top 60 lines of the reference's spec file. After that, it dropped out of every tool call. From that point on, 0 of 83 `vawe` calls carried the reference id or a `--ref` flag.

So every later check compared the film with something the agent wrote itself. The acceptance rows measured the agent's own word and shot tables. The range checks used a generic range from 17 other films. The judge printed "side-by-side comparison skipped: the film type is unknown", because it chose its comparison films from the film type, and a film that names its own reference never got compared with it.

Here is where the gap showed up, measured on the final film against the reference.

![Flash length and brightness split: reference against ours](/blog/plan-vs-reference/gap.svg)

- Flashes. The reference has 3 flashes, each a run of frame-mean luma above Y 110, lasting 0.10, 0.07 and 0.10 s. Ours were 0.20 s each, twice as long or more.
- Brightness. In the reference, 27% of frames sit below Y 50, 68% between Y 50 and 110, and 5% above 110. In ours the split was 80%, 12% and 8%. Ours was a dark and sparse film. The reference was not.
- Glow and screen. Our glow was a `text-shadow`. The reference showed halation glow, a pixel-grid screen and a lens tilt.

Each of these is a number a tool could have printed. None of them was.

## What we tried, and where it failed

Our first instinct was to blame the agent. It did read the reference. It skipped four of five design rungs with the reason "the reference defines it", and the skipped rungs were exactly where the faults were: colour (the flashes), depth (no real lens) and type (the glow). The check that accepted the skips took any non-empty reason.

The critique step failed in a quieter way. A subagent critic read three sheets, and one of them sampled 8 frames at 1 frame per second for a 16-shot film. A 0.2 s flash does not show up at 1 fps. The critic wrote that it could not find the flash frames, and the flashes were the first thing the owner of the reference had seen.

## What we built

We made the reference the default, and we gave the agent instruments to read the page the way we read the reference.

Default to the named reference. Commit [5b98da554](https://github.com/Vandit1604/vawe/commit/5b98da554) made `critique`, `compare` and `judge` default to the reference the brief names, added a reference card to `refs frames`, and made the `dev` next line name the next unmet step. 8 files changed, 214 lines added. `AGENTS.md` now says it in one line: the brief names the reference, and `critique`, `compare` and `judge` default to it.

One instrument for both sides. Commit [99916c823](https://github.com/Vandit1604/vawe/commit/99916c823) renders the page and reads it with the same reference-spec reader as the reference, so the DOM only names the elements. A mismatch between two measurers cannot create a delta.

Measure what the eye saw. Commit [bbe1d2714](https://github.com/Vandit1604/vawe/commit/bbe1d2714) added `vawe look` (flashes, clipped share, bloom, chromatic offset, screen texture, glow colour, with advice) and `vawe zoom` (a nearest-neighbour crop of one region, beside the same region of a second film). 8 files, 824 lines. `look`, `zoom` and `see` take `--vs <ref>` and print deltas. Commit [4411a2b96](https://github.com/Vandit1604/vawe/commit/4411a2b96) made flash count deltas say how many.

Blur that follows travel. The same trace review fed our render. Commit [f5789a68a](https://github.com/Vandit1604/vawe/commit/f5789a68a) measures the edge travel of a turn and an inset clip. In one test film, a clip edge moved 181 px a frame where the box moved 124 px, and the turn now gets 16 subframes, not 8. We wrote about it in [Motion blur from real travel](/blog/motion-blur). The [exposure flash move](/moves/exposure-flash) and the [lens move](/moves/lens) are the moves closest to this problem.

A tool for the whole film. [cbc71f813](https://github.com/Vandit1604/vawe/commit/cbc71f813) added `vawe see`, which reads a film completely and takes `--vs`. It is 22 files and 1,653 lines added. See [Teaching an agent to watch a film](/blog/watch-a-film).

## The result

The numbers at the top of this post are the finding, not the fix. We have no score after the change: we did not rerun that film, and we will not invent one.

What the next review showed was behaviour. In later sessions, agents used `look --vs` and `zoom --vs` 10 times and `see --vs` 3 times, and the judge's default reference worked. Before, the reference was never reused after stage 2. It is a count of use, not a measure of quality.

## What we would tell someone building the same thing

Give the reference the same instrument as the page. If you measure one with a person's eye and the other with a script, the delta is partly the difference between the two.

Default a flag, do not document it. We had a `--ref` flag. Agents skipped it. Making the brief name the reference, and every check read the brief, removed the choice.

Do not sample at a rate lower than the thing you look for. 1 fps cannot see a 0.2 s flash.

Distrust a score that compares a film with a plan. Our acceptance table counted green rows (6 or 7 of 15 every time) that measured the agent's own tables. For the next step on that problem, see [The measured brief](/blog/measured-brief) and [The quality bar is a measured set of real films](/blog/quality-bar).

The framework is open source at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/lib/refs.mjs`: reference choice for the judge and compare.
- `harness/media/see/`: `look`, `zoom` and `see`.
- [5b98da554](https://github.com/Vandit1604/vawe/commit/5b98da554): default to the named reference.
- [99916c823](https://github.com/Vandit1604/vawe/commit/99916c823): one instrument for both sides.
- [bbe1d2714](https://github.com/Vandit1604/vawe/commit/bbe1d2714): `vawe look` and `vawe zoom`.
- [f5789a68a](https://github.com/Vandit1604/vawe/commit/f5789a68a): edge travel in the blur pass.
