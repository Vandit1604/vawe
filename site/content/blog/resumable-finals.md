---
title: "Resumable video rendering: stop losing a final to one slice"
description: "Resumable video rendering: a final died at 97% and left 3.7 GB of orphans. Slice markers, four attempts and a content key fixed it. One session lost 49 min."
date: 2026-10-10
section: speed
tags: "resumable rendering, checkpoints, headless chrome, retries, agents"
keywords: "resumable video rendering, resume failed render, render checkpoint, headless chrome render video, ffmpeg mux failure"
hero: /blog/resumable-finals/hero.svg
heroAlt: "Eight capture slices: six have finish markers, one is marked lost after four attempts, one has not run. A resume skips the six and runs the last two."
---

Our worst render died at 97%, and the only record of it was 3.7 GB of orphaned PNGs. The film had captured 20,768 of 21,504 subframes. The frames stayed on disk, and nothing could tell which film they belonged to.

This post covers resumable video rendering in vawe: how a final survives one dead slice, and what we found when it still failed in other ways.

## The problem

A final render takes about 16 minutes. The renderer cuts the film into slices, captures each slice on a page in headless Chrome, and encodes at the end. If a slice lost its page twice, the final exited with code 2 and left its frames behind. Nothing reported them, and a new run had no way to reuse them.

## What we built: resumable video rendering

The fix has four parts, all in `render-page.mjs` ([5eb3dcca5](https://github.com/Vandit1604/vawe/commit/5eb3dcca5)):

- The frames directory is named by the page and a key of its settings, so the same film at the same settings finds its own frames.
- A finished slice leaves a marker. The next run skips every slice that has one.
- A slice gets four attempts, each on a fresh page. Only after the fourth does the render throw.
- A failed final records its percent and its reason in the ship event. `ship --status`, `dev`, `runs` and `new` print one line that names the failure and the command that resumes it.

After a successful encode the frames are removed. Frames directories untouched for three days are swept, so a forgotten failure does not keep gigabytes forever.

![Eight capture slices: six with markers, one lost after four attempts, one not run. A resume skips the six.](/blog/resumable-finals/hero.svg)

## Where it still failed

The marker design assumed that the key would be stable. It was not.

The key hashed the size and the mtime of every file in the page folder and in `core/`. A checkout, a rebase or an edit by another session changed the hash between a failed final and its resume. The resume opened a new directory and captured from 0%. We changed the hash to cover file bytes instead ([8069d09c7](https://github.com/Vandit1604/vawe/commit/8069d09c7)).

![Before: the key hashed size and mtime, so a rebase changed it and the resume started over. After: the key hashes file bytes, so the same content finds the same directory.](/blog/resumable-finals/key.svg)

Two smaller cases followed:

- If a lane's browser died, the retry had no page to use. A final now opens a new Chrome for that lane ([d3532ffb6](https://github.com/Vandit1604/vawe/commit/d3532ffb6)).
- Some finals were 100% captured and then lost at the last step, mixing the page audio. We read the page audio before the capture, keep the frames when the mux fails, and record the real stage in the ship event ([544693435](https://github.com/Vandit1604/vawe/commit/544693435)). A test (`render-mux-retry.test.mjs`) covers the retry.

## The cost, measured in a trace

We read the trace of one 110-minute session. Three of its five ships failed. The failed finals cost 2,967 s, which is 49 minutes and 45% of the session.

![A 110 minute session bar: 49 minutes in failed finals, 61 minutes everything else.](/blog/resumable-finals/cost.svg)

Two of the failures sat at "0%" in the record, after the log had shown `capturing 19198/19200`. The capture was finished. The last step lost its browser frame while mixing the audio ("detached Frame"), and the ship record said 0%. The two ships ran for 1,411.5 s and 1,034.2 s and both ended with a recorded failure at 0. The agent also wrote a keep-alive of its own to stop the preview server from going idle.

That trace also shows a bug in the record, not only in the render. A film that is fully captured should not be reported as 0%. The mux commit above records the real stage.

We did not measure the time the fixes save, and the commit messages carry no figure for it. What we have is the cost before the fix: 49 minutes in one session, and the 97% film that would have been resumable instead of lost.

## What we would tell you if you build this

- Name your intermediate output by what produced it. A directory called `frames/` with no key cannot be resumed, only deleted.
- Make the key depend on content. Anything that a git checkout, a rebase or another session can touch (mtimes, paths, sizes) will move the key and you will start from zero.
- Give each retry a fresh page. A page that failed once is a bad page.
- Record the true state when a final fails. The percent in the log is read by the next person, and by the next agent, who will decide whether to start over.
- Look at the last step. Our captures were fine and the audio mux killed the render, so the cheapest work to protect was the frames.
- Keep a hung step from becoming a silent failure: [the stall watchdog](/blog/stall-watchdog) covers a step that makes no progress for 60 s.

Resumability sits next to how the machine is shared. [Render slots and the reaper](/blog/slots-reaper) cover the other half, and [making the wait cheap](/blog/cheap-wait) covers what the agent does while the final runs. For the rendering model behind all of it, see [determinism](/determinism).

## In the code

- `harness/media/render-page.mjs`: the frames key, slice markers, `SLICE_ATTEMPTS = 4`, the sweep and the mux path
- `tests/media/render-resume.test.mjs`, `tests/media/render-mux-retry.test.mjs`
- [5eb3dcca5](https://github.com/Vandit1604/vawe/commit/5eb3dcca5): resumable finals, four slice attempts, loud failures
- [8069d09c7](https://github.com/Vandit1604/vawe/commit/8069d09c7): key the kept frames on file bytes
- [d3532ffb6](https://github.com/Vandit1604/vawe/commit/d3532ffb6): a new Chrome for a lane whose browser died
- [544693435](https://github.com/Vandit1604/vawe/commit/544693435): read the page audio before capture, keep frames when the mux fails

The repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).
