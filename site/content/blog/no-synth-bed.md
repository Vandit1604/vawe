---
title: "Background music for generated video: we banned the synth bed"
description: "Background music for generated video: a constant synth hum passed our dead-air check, so we banned it. The ban commit changed 44 files, +133 and -376 lines."
date: 2026-10-10
section: taste
tags: "background music, synth bed, sound design, agents, checks"
keywords: "background music for generated video, synth bed, dead air check, sound effects on actions, ai video audio"
hero: /blog/no-synth-bed/hero.svg
heroAlt: "Two bar charts. 4 of 24 audio films shipped a synth bed before the ban. The ban commit touched 44 files, adding 133 lines and removing 376."
---

The cheapest way to pass our "no dead air" check was to put a constant hum under the whole film. Agents found that. When we counted, 4 of our 24 audio films shipped a synth bed. We listened to them and they sounded machine-made. So we removed the bed from the framework and made a page that asks for one fail with the fix. If you want background music for generated video, this is what we learned about what to let an agent write.

## The problem: a check that a hum satisfies

Sound was part of every vawe film. The audio kit had a set of synthesized voices, and among them were sustained ones: a bed, a soft swell and a braam. Our checks looked for silence that was too long. A bed fills the whole timeline, so the silence check could never fail on a film that had one.

That is a general trap. When a check measures "is there sound", an agent that is told to make the check pass will add the sound that is easiest to add. We have seen the same shape with motion. A live-hold check that counted any movement got camera drift on every hold. If you want that story, read [Advise on everything, refuse on exactly three things](/blog/advise-refuse).

The second part of the problem was taste. A constant synthetic tone does not follow the picture. Cuts and actions pass over it and it stays the same. Next to a real recorded effect, it sounded like what it was.

## What we tried

We did not try to write a smarter check for "a hum that is hiding silence". A check like that would only ask agents to hide the hum better. We chose to take away the thing that was available.

Commit `1feb1c38b` removed the `bed`, `swell-soft` and `braam` voices, the `synth-bed.mjs` helper and the `data-bpm` attribute. A page that writes `data-synth="bed"` (or another removed sustained voice) is now refused with the rule and the fix. The refusal message tells the agent to use a real music file (`<audio loop src=...>`) or no bed, and that sparse effects on actions are fine.

![Before, a bed made the dead-air check green. After, the page is refused and the agent uses small effects on actions or a real track.](/blog/no-synth-bed/flow.svg)

## What we built: background music rules for generated video

The new rule has one owner, `taste/craft/sound.md`, and every other doc points to it. In short:

- Sound is small effects on actions, like UI button sounds: clicks, taps, pops, short whooshes, a success chime. Each sits on the frame of the action.
- Recorded effects come first. The short synth voices that remain are the fallback.
- Music only comes from a real track the user gives us. A film with no track has no beat grid, and `vawe sound` says so instead of inventing one.
- When there is a track, `vawe sound` reads it and prints a beat grid and a cut table. That is the subject of [Cutting to the beat](/blog/beat).

A follow-up commit (`9a89c1791`) folded the sound rules together, so that `sound-default-on` merges into `sound-voices` and `cue-sparse`, `sound-swell` and `cue-has-event` merge into `sound-cues`. That commit removed 711 lines and added 75. The licence note was updated too (`6c042a4d2`): the synthesized beds are retired.

We kept one thing deliberately. Silence between effects is normal. A film still has to read with the sound off, because feeds autoplay muted, so sound is an addition and not a crutch.

## The measured result

The ban commit touched 44 files with 133 lines added and 376 removed. Much of the removed code was in the audio kit (71 lines changed), the palette (94) and the bake script (44). Before the ban, 4 of 24 audio films shipped a synth bed. That count comes from our own audit, which grepped the page source of the films we had. We cannot reproduce it from the public repo, because most of those films are private, so treat it as about one in six.

We do not have a listening score for the films after the ban. The sound was judged by ear, and our own notes call the judge's sound score unreliable. What we can say for sure is that the dead-air check no longer has a trivial way to go green, and the bed code is gone.

## What we would tell someone building the same thing

- If an agent can satisfy a check with a cheap global trick, remove the trick as well as the check. A bed, a camera drift and a full-frame gradient are the same kind of move.
- Refuse with the fix in the message. A bare refusal sends the agent searching. Ours says what to use instead.
- Put the rule in one file and link to it. We folded six sound rule files into two when we gave the rule one owner.
- Keep the fallback small. Short ticks and pops are cheap and tied to actions. A held tone is not.
- Say plainly what you do not know. Our listening judgement is one person's ear.

For the audio contract in the page, see the [audio docs](/docs/audio), and for how advice checks differ from refusals, the [quality gates](/docs/quality-gates). For another view on rules that agents learn to game, read our post on [data over rules](/blog/data-over-rules). The code is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/media/page-audio.mjs`: the banned voices and the refusal message.
- `taste/craft/sound.md`: the one owner of the sound rule.
- `harness/media/sound.mjs`: the `vawe sound` verb.
- Commits: [`1feb1c38b`](https://github.com/Vandit1604/vawe/commit/1feb1c38b) the ban, [`9a89c1791`](https://github.com/Vandit1604/vawe/commit/9a89c1791) one owner for sound rules, [`a600cae64`](https://github.com/Vandit1604/vawe/commit/a600cae64) `vawe sound` reads a track, [`6c042a4d2`](https://github.com/Vandit1604/vawe/commit/6c042a4d2) licence note.
