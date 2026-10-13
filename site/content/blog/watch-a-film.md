---
title: "How an AI agent watches a video: frames, strips, velocity"
description: "How an AI agent watches a video: ours read 5 reference frames and 2 of 16 strips. Its flashes ran 0.20 s; the reference's ran 0.07 to 0.10. Then we fixed it."
date: 2026-10-11
section: agent-experience
tags: "ai video analysis, agents, reference video, film analysis, measurement"
keywords: "how an ai agent watches a video, video analysis for agents, reference video analysis, frame extraction, motion measurement"
hero: /blog/watch-a-film/hero.svg
heroAlt: "Bar chart. The reference film's three flashes lasted 0.10, 0.07 and 0.10 seconds. The agent's three flashes lasted 0.20 seconds each. In the reference 27 percent of pixels were darker than Y 50, in the agent's film 80 percent."
---

An agent that tries to match a reference film often compares its draft to its own plan, and the reference never comes back after step two. We found this in a trace. The agent had read 5 reference key frames and 2 of the 16 cut strips. It then spent five rounds comparing its own flash frames with each other. The reference flashes were three runs of 0.10, 0.07 and 0.10 seconds. The agent's flashes were three runs of 0.20 seconds. This post is about how an AI agent watches a video once it has the right tools.

## The problem: frames shrunk to words

The agent saw reference frames downscaled and turned them into sentences. Sentences lose exactly the details that decide whether a film looks right. In that trace the agent missed halation (the soft glow where a bright edge meets dark), a CRT pixel-grid mask and flashes that last two or three frames.

The numbers show how far off it was. In the reference, 27 percent of pixels were darker than Y 50, 68 percent were between Y 50 and 110, and 5 percent were above 110. In the agent's film the split was 80, 12 and 8. The agent described its film as "dark and sparse", which is true of both, so nothing told it that one was far darker.

The trace also showed where the effort went. Of 53 file reads, 7 were reference images, and the last came at 20:17 on the session clock. After that the reference stayed closed.

## What we tried

The brief template had already told the agent to pick 4 to 6 reference frames and run strips on two reference films. The agent did that and stopped. The instruction was a ceiling, and reading frames is not measuring them.

We set a different rule: if you cannot measure it you cannot improve it. There is also no token cap on reading a reference. A shot gets a full-size frame, not a thumbnail. That changed what we built.

## What we built: how an AI agent watches a video

Each verb answers a question the agent used to guess at.

![Six verbs: refs frames, strip, onion, velocity, spec and see, from one frame to a whole film.](/blog/watch-a-film/verbs.svg)

- `vawe refs frames` writes the settled full-size frame of each shot (commit `a6a9444cb`). The judge and the refs verb share one key-frame extractor, so both see the same frames.
- `vawe strip` shows the frames through a moment or through every cut, with the motion start and the settle (`a2c426abc`). Reading every cut is a step in the loop now.
- `vawe onion` blends the frames of one move into a single image, with the newest strongest and older ones fainter and tinted from cool to warm. `vawe velocity` samples a page at 120 a second and reports start, peak, settle, overshoot and ease shape for each element, with a graph (`fc117b598`).
- `vawe spec` measures where the eye goes (eye point, jump at a cut, travel, centre bias) and what the ground does (edge tone, change at a cut, light drift) for each shot (`576d7c9ff`).
- `vawe see` reads a film completely: structure, motion, look, type, sound, images, and a `--vs` comparison (`cbc71f813`). It added 1,653 lines in 22 files, and a ground-truth suite grades it.

Last, commit `5b98da554` makes critique, compare and judge default to the reference that the brief names. The agent no longer has to remember to bring it back.

<figure>
<video src="/blog/watch-a-film/exposure-flash.mp4" poster="/blog/watch-a-film/exposure-flash.hd.webp" muted loop playsinline controls></video>
<figcaption>A 3-frame exposure flash from our move library. At 30 frames a second that is 0.10 s. The agent's 0.20 s runs were twice as long.</figcaption>
</figure>

The clip is the [exposure-flash move](/moves/exposure-flash).

## The measured result

So far the result is a set of measurements and no film scores. The tools give the agent numbers where it had words: motion through each cut, speed and overshoot for each element, where the eye goes and what the ground does in each shot. Velocity is graphed at 120 samples a second, so a 3-frame flash covers many samples. Our own docs warn that an exposure flash held for 6 frames or more is a strobe, and 0.20 s is 6 frames at 30 per second.

We do not have a before-and-after score for these verbs. We cannot yet say that a film made with them passes the judge more often. We have the trace that showed the gap and the verbs that close it. Of the numbers above, the 1,653 lines and the 120 samples a second come from the commits. The flash, luma and read-count numbers come from one trace review of one session, so read them as an example and not as a rate.

## What we would tell someone building the same thing

- Give the agent a number to compare. A flash length or a luma split is hard to argue with.
- Let the reference come back at every step. Defaults that point at the reference are better than a reminder.
- Show motion at the cuts. `vawe strip --cuts` reads every one.
- Keep the tools cheap to call. A strip for every cut is one command.
- Grade the tools too. A truth suite grades `vawe see`; [the post on the truth suite](/blog/see-truth) has the detail.

If you want to see how an agent uses these in the loop, read [the docs on reading your film](/docs/reading-your-film). For the related problem of planning versus measured result, see [Transitions as handoffs](/blog/transitions). The code is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/media/see/`: the `vawe see` reader.
- `harness/cli/verbs.mjs`: the verb table (refs, strip, onion, velocity, spec, see).
- Commits: [`a6a9444cb`](https://github.com/Vandit1604/vawe/commit/a6a9444cb) settled full-size frames, [`a2c426abc`](https://github.com/Vandit1604/vawe/commit/a2c426abc) strips through every cut, [`fc117b598`](https://github.com/Vandit1604/vawe/commit/fc117b598) onion and velocity, [`cbc71f813`](https://github.com/Vandit1604/vawe/commit/cbc71f813) `vawe see`.
