---
title: "LUFS for video: why our sound sat 9 dB too quiet"
description: "LUFS for video, measured on every draft: our example film came out at -28.8 LUFS against a -20 target. How a plain mix, a limiter and one check fixed it."
date: 2026-10-10
updated: 2026-10-13
section: architecture
tags: "lufs, video loudness, audio mixing, true peak, architecture"
keywords: "lufs for video, video loudness, true peak limiter, measure loudness ffmpeg, audio tags html"
hero: /blog/audio-as-written/hero.svg
heroAlt: "A loudness scale from -34 to -14 LUFS. The colour-sting film measured -28.8 LUFS against a target near -20, a gap of about 9 dB."
---

LUFS (loudness units relative to full scale) measures how loud a whole video sounds, averaged the way an ear hears it, and it is the number to check when you ask whether a film is too quiet. Ours was. The example film `colour-sting` came out at -28.8 LUFS when we aim near -20, about 9 dB low, and nobody had caught it by ear. In vawe the sound is written by agents, who cannot listen at all, so the measurement has to be the ear.

This page explains how our films are mixed, what we measure on every draft, and the two default numbers that turned out to be wrong. It is also the starting point for our posts on sound for generated video.

## What should a video's loudness be?

We aim near -20 LUFS integrated and warn outside a band of -24 to -16 LUFS. True peak must stay at or under -3 dBTP. A band is easier to hit than a point and still catches a film that is far off. The draft line looks like this (from commit `153d26463`, 2026-10-07):

```
sound: <I> LUFS integrated, <TP> dBTP true peak (band -24 to -16 LUFS, peak at most -3 dBTP)
```

Integrated loudness and true peak answer different questions. Loudness is the average the ear hears. True peak is the highest point of the waveform after reconstruction, which is what clips. You need both, and they can fight each other, as the peak limit below shows.

## How is a film mixed in vawe?

As written. Audio is `<audio>` tags in the page with `src`, `data-at`, `data-gain` and `data-fade-out`. The mix is the sum of the tags at the gains the author wrote, and a limiter at -1 dBTP only lowers peaks. It never raises anything. Normalising is opt in, through a `loudness` meta in LUFS. The tags are part of the [page contract for rendering HTML to video](/blog/page-contract), and the [audio docs](/docs/audio) list the attributes.

![The mix as written: tags go into a sum, then a limiter at -1 dBTP that only lowers peaks, then the video. Every draft measures loudness and prints it.](/blog/audio-as-written/diagram.svg)

## Why not let a mixer pick the level?

We had one. Early vawe had an audio mixer with master targets, separate branches for "bed" and "cue" films, and a table of transition cues. A film with only short cues and no music bed could end up nearly silent, because the mixer decided how loud the film should be. Another path could push a quiet film up toward a loud target. The author never saw the decision.

Commit `2314015eb` (2026-09-30) first tried to fix one case: a cue-only film mastered to -20 LUFS under a -9 dBTP cap, never near silent and never pushed to -14. It kept the branching, and the same day we replaced it. [ab64bae14](https://github.com/Vandit1604/vawe/commit/ab64bae14) deleted the master target and the bed and cue branches in a diff of 27 insertions and 33 deletions. A tool that changes your result without telling you is a tool you cannot debug; with a plain sum, the number on the tag is the number in the film. The same thinking shaped our [AI agent guardrails](/blog/advise-refuse), which advise far more than they refuse.

## What were the defaults, and why were they wrong?

We wanted agents not to start loud. [0a0787c04](https://github.com/Vandit1604/vawe/commit/0a0787c04) gave each voice a default gain when a tag has none: UI cues at -26 dB, swells at -22 and weight sounds at -18. It also made the audio step warn, never fail, when one cue peaks more than 6 dB above the median, and name the `data-gain` to change.

Those quiet defaults were a guess. Once `vawe dev` printed loudness on every draft, the guess showed: `colour-sting` at -28.8 LUFS.

[153d26463](https://github.com/Vandit1604/vawe/commit/153d26463) raised the palette gains:

| Voice | New default gain |
|---|---|
| tap | -3 dB |
| tick, air, swoosh-long, sub-thump | -5 dB |
| swell-soft | -6 dB |
| shimmer, glass | -7 dB |
| bed | -19 dB |

The relations hold: cues stay within 4 dB of each other, and the bed sits 12 dB under the quietest cue. A bed plus one palette cue per beat now lands near -20 LUFS, and `tests/media/sound-palette.test.mjs` asserts a result between -22 and -18 LUFS.

The peak limit was wrong too. It moved from -10 to -3 dBFS, because a transient-heavy palette cannot sit at -20 LUFS and also stay under -10 dBFS. Nobody had tested the two numbers together, and two limits that cannot both hold are a bug in the defaults. The commit changed 11 files (+45 -26) and moved the sound check into the fast tier, so a draft prints the level every time. `harness/media/page-audio.mjs` reads the tags, measures integrated loudness and true peak, and applies the limiter.

## What changed after

Later changes kept this shape. A `data-trim-end` attribute adds a short fade at each cut (`fc011a509`, 2026-10-10), and the renderer reads the page audio before the capture, so a failed mux keeps the frames (`544693435`). The bed in the table above did not last: constant synthesized beds are now banned.

The measurement has a limit. LUFS tells you a film is loud enough. It cannot tell you the sound fits the picture, or that a cue lands on the action it belongs to.

## More on sound for generated video

- [Cut video to the beat in code with a beat grid](/blog/beat): how an agent that cannot hear reads a track as a beat grid and checks every cut against it.
- [Background music for generated video: ban the synth bed](/blog/no-synth-bed): why a constant hum passed our dead-air check, and why we banned it.

For other ways to put sound on a web-page video, see [/remotion-alternatives](/remotion-alternatives).
