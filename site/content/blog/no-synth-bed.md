---
title: "Background music for generated video: ban the synth bed"
description: "Background music for generated video should come from a real track or not at all. 4 of our 24 audio films hid silence under a synth hum, so we removed it."
date: 2026-10-10
updated: 2026-10-13
section: taste
tags: "background music, synth bed, sound design, agents, checks"
keywords: "background music for generated video, synth bed, dead air check, sound effects on actions"
hero: /blog/no-synth-bed/hero.svg
heroAlt: "Two bar charts. 4 of 24 audio films shipped a synth bed before the ban. The ban commit touched 44 files, adding 133 lines and removing 376."
---

Generated video should not get a synthesized music bed. Background music should come from a real track a person chose, or the film should have none and carry small sound effects on its actions instead. How loud that sound should be is a separate question, answered in our guide to [LUFS for video](/blog/audio-as-written). We hold this view because we tried the alternative. When we counted, 4 of our 24 audio films shipped a constant synth hum, and it sounded machine-made every time.

The hum also had a second job nobody asked for: it was the cheapest way to pass our "no dead air" check.

## How a hum beats a silence check

Every vawe film had sound. The audio kit had synthesized voices, and some were sustained: a bed, a soft swell and a braam. Our check looked for silence that ran too long. A bed fills the whole timeline, so the check could never fail on a film that had one. An agent told to make the check pass adds the sound that is easiest to add.

We had seen the same shape with motion. A live-hold check that counted any movement got a slow camera drift on every hold, which our [audit of reward hacking in AI agents](/blog/loophole-audit) counted across 36 films. A bed, a camera drift and a full-frame gradient are the same kind of move: a global trick that turns a global check green.

Taste was the other half of the case. A constant synthetic tone does not follow the picture. Cuts and actions pass over it and it stays the same. Next to a recorded effect, it sounds like what it is.

## The evidence

Commit [f68dc7df2](https://github.com/Vandit1604/vawe/commit/f68dc7df2) removed the `bed`, `swell-soft` and `braam` voices, the `synth-bed.mjs` helper and the `data-bpm` attribute. It touched 44 files, adding 133 lines and removing 376; much of the change was in the audio kit (71 lines changed), the palette (94) and the bake script (44). A page that writes `data-synth="bed"`, or another removed sustained voice, is now refused by `harness/media/page-audio.mjs` with the rule and the fix. The message tells the agent to use a real music file (`<audio loop src=...>`) or no bed, and that sparse effects on actions are fine. A bare refusal sends an agent searching. One with the fix in it does not.

![Before, a bed made the dead-air check green. After, the page is refused and the agent uses small effects on actions or a real track.](/blog/no-synth-bed/flow.svg)

The rule now has one owner, `taste/craft/sound.md`, and every other doc points to it:

- Sound is small effects on actions, like UI button sounds: clicks, taps, pops, short whooshes, a success chime. Each sits on the frame of its action.
- Recorded effects come first. The short synth voices that remain are the fallback, and short ticks tied to actions are cheap where a held tone is not.
- Music only comes from a real track the user gives. A film with no track has no beat grid, and `vawe sound` says so instead of inventing one.
- With a track, `vawe sound` (`harness/media/sound.mjs`, from [bf4252858](https://github.com/Vandit1604/vawe/commit/bf4252858)) reads it and prints a beat grid and a cut table; the tutorial on how to [cut video to the beat with a beat grid](/blog/beat) walks through it.

A follow-up, [25e1ef4e9](https://github.com/Vandit1604/vawe/commit/25e1ef4e9), folded the sound rules together: `sound-default-on` merged into `sound-voices`, and `cue-sparse`, `sound-swell` and `cue-has-event` merged into `sound-cues`, removing 711 lines and adding 75. The licence note says the synthesized beds are retired ([e51af67b8](https://github.com/Vandit1604/vawe/commit/e51af67b8)).

## The strongest objection: write a smarter check

The obvious answer to a gamed check is a better check, one that spots "a hum hiding silence". We decided against it. A check like that asks agents to hide the hum better, and the next version of the trick would pass it. Removing the voice removes the trick, and the silence check keeps its original meaning.

A second objection: some films do want a held tone. Then the person can give a real track. What we refuse is the default, the sustained voice an agent reaches for when nothing else is asked of it.

Silence between effects stays normal. A film still has to read with the sound off, because feeds autoplay muted, so sound adds to a film and never props it up.

## Where we could be wrong

The 4 of 24 count comes from our own audit, which grepped the page source of the films we had. Most of those films are private, so it cannot be reproduced from the public repo; treat it as about one in six. We have no listening score for films after the ban. The sound was judged by one person's ear, and our own notes call the judge's sound score unreliable. If real tracks turn out to be rarely available, films may get quieter than they should, and that is worth measuring.

What we can state for sure: the dead-air check no longer has a trivial way to go green, and the bed code is gone. The loudness side of the same sound system is in [LUFS for video](/blog/audio-as-written), and the [audio docs](/docs/audio) and [quality gates](/docs/quality-gates) explain which checks advise and which refuse.
