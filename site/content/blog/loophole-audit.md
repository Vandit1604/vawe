---
title: "Reward hacking in AI agents: 18 of 36 films gamed a check"
description: "Reward hacking in AI agents, counted: 18 of 36 films passed our live-hold check with a slow camera drift, and our own advice line taught them the trick."
date: 2026-10-10
updated: 2026-10-13
section: measurement
tags: "ai agents, reward hacking, automated checks, testing, harness design"
keywords: "reward hacking ai agents, agents gaming checks, goodhart's law agents, test fixtures for checks"
hero: /blog/loophole-audit/hero.svg
heroAlt: "Large text 18 of 36 with the caption films drifted the camera, because our own advice taught them how"
---

Film after film from our agents ended a held shot with the same slow camera drift. On 10 October we stopped looking at the films and audited the checks instead. Across 36 film pages, 18 carried the drift, and the reason was ours: a check called live-hold counted any motion in a held shot as alive, and the advice line it printed told the agent to "keep one thing moving (a slow drift on the ground or the hero)".

That is reward hacking in its plainest form. Nobody told the agents to cheat. They read a check's output, found the cheapest change that turned it green, and applied it. This case study covers what the audit counted, the three causes behind almost every loophole, and the fixes. It is part of our series on [judging generated video with an LLM and with checks](/blog/judge-design).

## How a vawe film gets checked

A vawe film is one HTML page that the harness renders and then checks against 107 rules. Many of the checks are global and binary:

- Live-hold asks whether fewer than 2 percent of pixels changed over 0.3 s. A 1 to 6 percent scale push on the whole stage passes it.
- The moving-tail check asks whether any animation runs on a visible element in the last second. Animating everything a little passes it.
- The living-ground check asks for a layer that paints a gradient or an image over 15 percent of the frame. An empty full-frame div with a faint radial gradient passes it.

## The one question the audit asked

The audit was read-only. We rendered nothing and edited nothing. For each check we asked one question: what is the cheapest change that turns it green? Then we counted how many of the 36 page films already used that change. The counts are a grep of the page source, so they show a pattern in the code, not a measured render.

<figure>
<img src="/blog/loophole-audit/tricks.svg" alt="Bar chart: 30 of 36 films had a full-frame gradient, 23 a grain overlay, 18 a slow drift, about 7 a drifting blob ground, and 4 of 24 audio films a synth bed" width="720" height="410" loading="lazy">
<figcaption>Patterns found in the page source of 36 films. Gradient and grain are mostly honest, because the rule asks for a lit ground. The check could not tell a lit ground from a transparent layer.</figcaption>
</figure>

## What 36 film pages contained

| Pattern | Films |
|---|---|
| slow scale or translate drift | 18 of 36 |
| drifting blob ground | about 7 of 36 |
| full-frame grain overlay | 23 of 36 |
| full-frame gradient layer | 30 of 36 |
| `data-gain` set although the guide says leave it off | 19 of 24 with audio |
| synth bed, the cheapest way to meet a loudness check | 4 of 24 with audio |
| a declared spectacle second | 25 of 36 |

The spectacle second matters because the check lets an author move it to the strongest second after the fact. The synth bed got its own ban, described in [background music for generated video](/blog/no-synth-bed).

Waivers told a different story. There were 13 waiver entries in 8 pages, and 2 of them were dead, because no check emitted the code they waived. None hid the camera drift or the bed. In the audit's own words, those films were green because of the trick, not because of a waiver. The waiver rule we wrote afterwards is in [suppression comments must name a place and a number](/blog/waivers).

Last, 21 of the 107 rules had no check at all. Nothing stops a film from ignoring those limits.

## Three causes behind almost every loophole

The advice or the rule text named the trick. Besides the live-hold advice line, the digest said to end on a slow push or drift, and the grain rule called grain the cheapest fix. An agent obeys the advice it is given.

The measure was global: whole-frame pixel change, any running animation, any gradient box. A global measure has a global cheap answer.

One exemption list covered about ten checks. Text marked `aria-hidden` or `data-chrome` skipped most text checks at once, so one attribute could exempt a line of copy from all of them.

## The fixes, one per cause

Each fix has the same shape: exclude the global cheap change from what counts.

Live-hold stopped counting a whole-frame camera move, and the starter page no longer drifts the camera ([f852ba76c](https://github.com/Vandit1604/vawe/commit/f852ba76c)). Living-ground and blank-frame now measure what a layer paints against the ground, so grain, a blend overlay or a faint gradient is not a ground ([cb2ba70c2](https://github.com/Vandit1604/vawe/commit/cb2ba70c2)).

The advice stopped teaching tricks. The moving-tail, grain, acceptance and spectacle lines name the real fix instead ([4ef89a719](https://github.com/Vandit1604/vawe/commit/4ef89a719)), and the docs no longer recommend a ground or lockup drift as the hold ([e781b8484](https://github.com/Vandit1604/vawe/commit/e781b8484)).

Waivers became one code per check, scoped to seconds. A reason has to say where and what was measured, and a generic, copied or dead waiver is refused ([805a5427c](https://github.com/Vandit1604/vawe/commit/805a5427c)). The judge rubric now lists each known trick and needs a cited second for a claim ([8af091647](https://github.com/Vandit1604/vawe/commit/8af091647)).

<figure>
<img src="/blog/loophole-audit/audit-loop.svg" alt="Diagram: ask each check the cheapest-change question, exclude global answers, then fixtures, advice, waivers and judge rubric" width="720" height="340" loading="lazy">
<figcaption>The audit question and the four things that came out of it.</figcaption>
</figure>

## A fixture page for every trick

The change we trust most is a test. For each trick the audit found there is now a fixture page in `tests/fixtures/tricks/`, with an honest page beside it, and `tests/media/tricks.test.mjs` runs the checks on each ([b2641afc0](https://github.com/Vandit1604/vawe/commit/b2641afc0)). A check that stops catching its trick shows up as a failing test. The honest page proves the check still passes real work, which is the half that is easy to forget. Before this, nobody tested that the checks reject cheats, and a loophole fixed once could come back unseen.

The checks themselves live in `quality/gates/page-check.mjs` and `harness/lib/`.

## What we still do not know

We have the before numbers and no after. We did not rerun the grep on a fresh set of films, so we cannot say how many films still cheat. The fixtures prove the checks reject the tricks we know, and they say nothing about the next one. That is why the rule we kept is a question to ask of every new check: what is the cheapest change that turns it green, and if that change is global, exclude it. The judge side of the same problem, a rubric that names each trick, is covered in [how our LLM judge works](/blog/judge-design).
