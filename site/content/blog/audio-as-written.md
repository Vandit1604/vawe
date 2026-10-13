---
title: "Video loudness: our sound sat 9 dB too quiet"
description: "We deleted our loudness logic, mixed audio as written, and measured LUFS on every draft. The check showed our defaults sat 9 dB low: -28.8 LUFS against -20."
date: 2026-10-10
section: architecture
tags: "video loudness, lufs, audio mixing, true peak, architecture"
keywords: "video loudness lufs, integrated loudness, true peak limiter, audio tags html, measure loudness ffmpeg"
hero: /blog/audio-as-written/hero.svg
heroAlt: "A loudness scale from -34 to -14 LUFS. The colour-sting film measured -28.8 LUFS against a target near -20, a gap of about 9 dB."
---

Our sound was 9 dB too quiet, and we only knew because we finally measured it. The example film `colour-sting` came out at -28.8 LUFS when the level we aim for is near -20. We had not caught it by ear. This post is about video loudness in a pipeline where agents write the sound: what we removed, what we measure, and the one number that turned out to be wrong.

## The problem: a mixer with opinions

Early on, vawe had an audio mixer with master targets, branching for "bed" and "cue" films, and a table of transition cues. A film with only short cues and no music bed could end up nearly silent, because the mixer decided how loud the film should be. Another path could push a quiet film up toward a loud target. The author never saw the decision.

There was a second problem. Sound cannot be judged by reading a page, and an agent cannot listen, so nothing told an agent whether the mix was fine.

## What we tried

Our first change moved the decision, but kept the shape. Commit `d5a9db999` (2026-09-30) made a cue-only film master to -20 LUFS under a -9 dBTP cap: never left near silent, never pushed to -14. That worked for one class of film and kept the branching. Within the same day we replaced it.

The second change is the one that stayed: mix as written. Commit `57ccc59a3` (2026-09-30) deleted the master target and the bed and cue branching. It was a small diff: 27 insertions and 33 deletions. What remained:

- Audio is `<audio>` tags with `src`, `data-at`, `data-gain` and `data-fade-out`.
- The mix is the sum of the tags at the gains the author wrote.
- A limiter at -1 dBTP only lowers peaks. It never raises anything.
- Normalising is opt in, through a `loudness` meta in LUFS.

![The mix as written: tags go into a sum, then a limiter at -1 dBTP that only lowers peaks, then the video. Every draft measures loudness and prints it.](/blog/audio-as-written/diagram.svg)

The reasoning is the one we use elsewhere in the framework: a tool that changes your result without telling you is a tool you cannot debug. Mixing as written means the number on the tag is the number in the film. For the same reason about guards, see [Advise on everything, refuse on exactly three things](/blog/advise-refuse).

## Making quiet the default, then measuring it

We also wanted agents not to start loud. Commit `1d0424ca7` gave each voice a default gain when a tag has none: UI cues at -26 dB, swells at -22 and weight sounds at -18. It also made the audio step warn, never fail, when one cue peaks more than 6 dB above the median, and it names the `data-gain` to change.

Quiet defaults are a guess until you check the level. So we added the check. `vawe dev` now measures integrated loudness on every draft and prints it with its band. In commit `8b52cf41c` (2026-10-07) the printed line has this shape:

```
sound: <I> LUFS integrated, <TP> dBTP true peak (band -24 to -16 LUFS, peak at most -3 dBTP)
```

The commit message records `colour-sting` at -28.8 LUFS: our palette defaults sat 9 dB low.

## The measured result

The fix raised the palette gains: tap to -3 dB, tick, air, swoosh-long and sub-thump to -5, swell-soft to -6, shimmer and glass to -7, and the bed to -19. The relations hold: cues stay within 4 dB of each other, and the bed sits 12 dB under the quietest cue. A bed plus one palette cue per beat now lands near -20 LUFS, and `tests/media/sound-palette.test.mjs` asserts a result between -22 and -18 LUFS.

One more thing moved. The peak limit went from -10 to -3 dBFS, because a transient-heavy palette cannot sit at -20 LUFS and also stay under -10 dBFS at the same time. Our first peak limit was wrong in the same way our first gains were: nobody had tested the two numbers together.

The commit changed 11 files (+45 -26), and the sound check moved into the fast tier, so a draft prints the level every time.

## What we would tell you if agents write your sound

- Delete the clever mixer. Auto-targeting hides the cause of a quiet or loud result. We replaced a branching mixer with a sum and a limiter.
- Measure on every draft. Printing LUFS and true peak costs a moment and turns "sounds quiet" into a number with a band.
- Pick a band, not a point. Our draft check warns outside -24 to -16 LUFS around a -20 target.
- Check the peak and the average together. Two limits that cannot both hold are a bug in the defaults, not in the film.
- Limit down, never up. A limiter that only lowers peaks cannot surprise the author.

Later changes kept this shape. A `data-trim-end` attribute adds a short fade at each cut (`5830bedce`, 2026-10-10), and the renderer reads the page audio before the capture, so a failed mux keeps the frames (`e1b944267`). Constant synthesized beds are banned now, which we cover in [Banning the synth bed](/blog/no-synth-bed).

The audio rules are in the [audio docs](/docs/audio). The source is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe), and the page format the tags live in is in [The whole film format fits in one screen](/blog/page-contract). For other ways to put sound on a web-page video, see [/remotion-alternatives](/remotion-alternatives).

## In the code

- `harness/media/page-audio.mjs`: reads the tags, measures integrated loudness and true peak, applies the -1 dBTP limiter.
- `tests/media/sound-palette.test.mjs`: a bed plus one cue per beat lands between -22 and -18 LUFS.
- [`57ccc59a3`](https://github.com/Vandit1604/vawe/commit/57ccc59a3) (2026-09-30): the mix is as written; the master target and branching are gone.
- [`1d0424ca7`](https://github.com/Vandit1604/vawe/commit/1d0424ca7) (2026-09-30): subtle default gains per voice and a warning for a loud cue.
- [`8b52cf41c`](https://github.com/Vandit1604/vawe/commit/8b52cf41c) (2026-10-07): palette gains raised, peak limit moved to -3 dBFS, loudness measured on every draft.
