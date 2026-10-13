---
title: "Can AI agents watch videos? What ours missed, measured"
description: "Can AI agents watch videos? Ours read 5 reference frames, then made 0.20 s flashes where the reference ran 0.07 to 0.10 s. These tools fixed it."
date: 2026-10-11
updated: 2026-10-13
section: agent-experience
tags: "ai video analysis, agents, reference video, video comparison, measurement"
keywords: "can ai agents watch videos, video reference comparison, video analysis for agents, frame extraction"
hero: /blog/watch-a-film/hero.svg
heroAlt: "Bar chart. The reference film's three flashes lasted 0.10, 0.07 and 0.10 seconds. The agent's three flashes lasted 0.20 seconds each. In the reference 27 percent of pixels were darker than Y 50, in the agent's film 80 percent."
---

An AI agent can watch a video only as well as its tools let it measure one. Ours was asked to make an 8 s film in the style of a reference clip. It read 5 of the reference's key frames and 2 of its 16 cut strips, wrote down what it saw in words, and built a film whose flashes ran 0.20 s each where the reference's ran 0.10, 0.07 and 0.10 s. Our judge scored the result 62, then 61, then 62. The person who owned the reference said the concept was right and the look was wrong.

Both verdicts were honest, because the judge never saw the reference either. This case study follows that one session through its trace, shows where the reference dropped out, and describes the tools we built so an agent can compare a film with a reference in numbers. It is part of our series on [judging generated video](/blog/judge-design).

## Where the reference dropped out of the session

The film was built by a weaker model. The reference entered the work at stage 2 of the loop. The agent read 5 key frames, 2 of 16 strips and the top 60 lines of the reference's spec file. Of 53 file reads in the session, 7 were reference images, and the last came at 20:17 on the session clock. From then on, 0 of 83 `vawe` calls carried the reference id or a `--ref` flag.

The brief template had told the agent to pick 4 to 6 reference frames and run strips on two reference films. The agent did exactly that and stopped. The instruction worked as a ceiling, and reading frames is not measuring them.

## The gap between the film and its reference, measured

The agent saw reference frames downscaled and turned them into sentences. Sentences lose the details that decide whether a film looks right: it missed halation (the soft glow where a bright edge meets dark), a CRT pixel-grid mask, and flashes that last two or three frames. Measured on the final film against the reference:

| | Reference | Agent's film |
|---|---|---|
| Flashes (runs of frame-mean luma above Y 110) | 3, lasting 0.10, 0.07 and 0.10 s | 3, lasting 0.20 s each |
| Share below Y 50 | 27% | 80% |
| Share between Y 50 and 110 | 68% | 12% |
| Share above Y 110 | 5% | 8% |
| Glow and screen | halation, a pixel-grid screen, a lens tilt | a `text-shadow` |

![Flash length and brightness split: reference against ours](/blog/plan-vs-reference/gap.svg)

The agent described its film as "dark and sparse". That is true of both films, so nothing told it that one was far darker. Our own docs warn that an exposure flash held for 6 frames or more is a strobe, and 0.20 s is 6 frames at 30 per second. Every row in that table is a number a tool could have printed, and none was.

## Why every check stayed quiet

Every later check compared the film with something the agent wrote itself. The acceptance rows measured the agent's own word and shot tables; that failure has its own postmortem in [acceptance criteria for AI agents](/blog/measured-brief). The range checks used a generic range from 17 other films. The judge printed "side-by-side comparison skipped: the film type is unknown", because it chose its comparison films by film type, and a film that names its own reference never got compared with it.

The design ladder failed too. The agent skipped four of five design rungs with the reason "the reference defines it", and the skipped rungs were exactly where the faults were: colour (the flashes), depth (no real lens) and type (the glow). The check that accepted the skips took any non-empty reason.

The critique step failed more quietly. A subagent critic read three sheets, and one of them sampled 8 frames at 1 frame per second for a 16-shot film. A 0.2 s flash does not show up at 1 fps. The critic wrote that it could not find the flash frames, and the flashes were the first thing the owner of the reference had noticed.

## Six tools that let an agent watch a video

We set two rules. If you cannot measure it, you cannot improve it. And there is no token cap on reading a reference: a shot gets a full-size frame, not a thumbnail. Each tool answers a question the agent used to guess at.

![Six verbs: refs frames, strip, onion, velocity, spec and see, from one frame to a whole film.](/blog/watch-a-film/verbs.svg)

- `vawe refs frames` writes the settled full-size frame of each shot ([ca91ebcb9](https://github.com/Vandit1604/vawe/commit/ca91ebcb9)). The judge and the refs verb share one key-frame extractor, so both see the same frames.
- `vawe strip` shows the frames through a moment or through every cut, with the motion start and the settle ([d68b6a56c](https://github.com/Vandit1604/vawe/commit/d68b6a56c)). Reading every cut with `vawe strip --cuts` is now a step in the loop.
- `vawe onion` blends the frames of one move into a single image, newest strongest and older ones fainter, tinted from cool to warm. `vawe velocity` samples a page at 120 a second and reports start, peak, settle, overshoot and ease shape for each element, with a graph ([4cc29c417](https://github.com/Vandit1604/vawe/commit/4cc29c417)). At 120 samples a second, a 3-frame flash covers many samples.
- `vawe spec` measures where the eye goes (eye point, jump at a cut, travel, centre bias) and what the ground does (edge tone, change at a cut, light drift) in each shot ([2aeb3d688](https://github.com/Vandit1604/vawe/commit/2aeb3d688)).
- `vawe look` reports flashes, clipped share, bloom, chromatic offset, screen texture and glow colour, with advice, and `vawe zoom` shows a nearest-neighbour crop of one region beside the same region of a second film ([6af606c6c](https://github.com/Vandit1604/vawe/commit/6af606c6c): 8 files, 824 lines). Flash-count deltas say how many ([c2e51a48c](https://github.com/Vandit1604/vawe/commit/c2e51a48c)).
- `vawe see` reads a film completely: structure, motion, look, type, sound and images ([86b51bd17](https://github.com/Vandit1604/vawe/commit/86b51bd17): 22 files, 1,653 lines). A ground-truth suite grades it; see [test measurement tools against ground truth fixtures](/blog/see-truth).

`look`, `zoom` and `see` take `--vs <ref>` and print deltas. The tools live in `harness/media/see/`, and the verb table in `harness/cli/verbs.mjs`.

<figure>
<video src="/blog/watch-a-film/exposure-flash.mp4" poster="/blog/watch-a-film/exposure-flash.hd.webp" muted loop playsinline controls></video>
<figcaption>A 3-frame exposure flash from our move library. At 30 frames a second that is 0.10 s. The agent's 0.20 s runs were twice as long.</figcaption>
</figure>

The clip is the [exposure-flash move](/moves/exposure-flash).

## Making the reference the default

Two commits changed where the reference sits in the loop.

[b5df5ed98](https://github.com/Vandit1604/vawe/commit/b5df5ed98) made `critique`, `compare` and `judge` default to the reference the brief names, added a reference card to `refs frames`, and made the `dev` next line name the next unmet step (8 files, 214 lines added). AGENTS.md now says it in one line. We had a `--ref` flag before, and agents skipped it; a default removes the choice. Reference choice lives in `harness/lib/refs.mjs`.

[fa9c2ddd2](https://github.com/Vandit1604/vawe/commit/fa9c2ddd2) renders the page and reads it with the same reference-spec reader as the reference, so the DOM only names the elements. When one side is measured by a script and the other by an eye, part of the delta is the difference between the two measurers. One instrument for both sides removes that.

## Blur that follows travel

The same trace review fed the renderer. [97b39b871](https://github.com/Vandit1604/vawe/commit/97b39b871) measures the edge travel of a turn and of an inset clip. In one test film a clip edge moved 181 px a frame where the box moved 124 px, and the turn now gets 16 subframes, not 8. The details are in [motion blur for HTML animation](/blog/motion-blur), and the [lens move](/moves/lens) is the move closest to the missing depth.

## What changed in later sessions

In later sessions, agents used `look --vs` and `zoom --vs` 10 times and `see --vs` 3 times, and the judge's default reference worked. Before, the reference was never reused after stage 2. That is a count of use, not a measure of quality.

## What is still unknown

We have no score after the change: we did not rerun that film, and we will not invent a number. The flash, luma and read-count figures come from one trace of one session, so read them as an example and not as a rate. What the tools give an agent is numbers where it had words. Whether films made with them pass the judge more often is the next thing to measure, against the ranges in [our motion graphics quality benchmark](/blog/quality-bar) and with the [LLM judge for video](/blog/judge-design). The [docs on reading your film](/docs/reading-your-film) show the tools in the agent loop, and [motion graphics transitions](/blog/transitions) covers the related gap between a planned cut and the cut that rendered.
