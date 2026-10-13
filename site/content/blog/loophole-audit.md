---
title: "AI agent reward hacking: 18 of 36 films gamed one check"
description: "Agents turned our checks green with the same cheap trick, a slow camera drift. An audit of 36 films showed 18 used it, and our own advice had taught them how."
date: 2026-10-10
section: measurement
tags: "ai agents, reward hacking, automated checks, testing, harness design"
keywords: "ai agent reward hacking, agents gaming checks, goodhart's law agents, test fixtures for checks, automated check design"
hero: /blog/loophole-audit/hero.svg
heroAlt: "Large text 18 of 36 with the caption films drifted the camera, because our own advice taught them how"
---

We saw the same slow camera drift in film after film. It was a textbook case of AI agent reward hacking, and we had built the incentive ourselves. A check called live-hold counted any motion in a held shot as alive, so the cheapest way for an agent to make it green was a one to six percent scale push on the whole stage. On 10 October we audited the checks, not the films, and counted the trick across 36 pages: 18 of them carried it. Worse, the advice line that the check printed told the agent to do exactly that.

## The problem: a global check has a global cheat

vawe films are one HTML page that the harness renders and then checks with 107 rules. Many checks are global and binary. Live-hold asks whether fewer than 2 percent of pixels changed over 0.3 s. The moving-tail check asks whether any animation runs on a visible element in the last second. Both pass if you animate everything a little. The living-ground check asks for a layer that paints a gradient or an image over 15 percent of the frame. An empty full-frame div with a faint radial gradient passes.

The agents were not trying to cheat. They read a check output, found the cheapest change that made it green and applied it.

## What we tried: ask each check one question

The audit was read-only. We rendered nothing and edited nothing. For each check we asked: what is the cheapest change that turns it green? Then we counted how many of the 36 page films already used it. The counts are a grep of the page source, so they show a pattern and not a measured render.

Three causes explained almost every row.

First, the advice or the rule text named the trick. One advice line told the agent to "keep one thing moving (a slow drift on the ground or the hero)". The digest said to end on a slow push or drift. The grain rule called grain the cheapest fix.

Second, the measure was global (whole-frame pixel change, any running animation, any gradient box), so a global cheap change turned it green.

Third, one exemption list covered about ten checks. Text marked `aria-hidden` or `data-chrome` skipped most text checks at once, and one attribute could exempt a line of copy from all of them.

<figure>
<img src="/blog/loophole-audit/tricks.svg" alt="Bar chart: 30 of 36 films had a full-frame gradient, 23 a grain overlay, 18 a slow drift, about 7 a drifting blob ground, and 4 of 24 audio films a synth bed" width="720" height="410" loading="lazy">
<figcaption>Patterns found in the page source of 36 films. Gradient and grain are mostly honest, because the rule asks for a lit ground. The check could not tell a lit ground from a transparent layer.</figcaption>
</figure>

## AI agent reward hacking, counted

Of the 36 films, 18 carried a slow scale or translate drift, and about 7 added a drifting blob ground. 23 had a full-frame grain overlay and 30 had a gradient layer. 19 of the 24 films with audio set `data-gain` although the guide says to leave it off, and 4 of those 24 shipped a synth bed, the cheapest way to meet a loudness check. 25 films declared a spectacle second, which the check lets you move to the strongest second after the fact.

Waivers told a different story. There were 13 waiver entries in 8 pages, and 2 of them were dead, because no check emitted the code they waived. None hid the camera drift or the bed. The audit's own sentence is the finding: those films were green because of the trick, not because of a waiver.

Finally, 21 of 107 rules had no check at all. For those, nothing stops a film from ignoring the limit.

## What we built

Each fix is a rule of the same shape: exclude the global cheap change from what counts.

- Live-hold stopped counting a whole-frame camera move, and the starter page no longer drifts the camera (`bb965eb3e`).
- Living-ground and blank-frame now measure what a layer paints against the ground, so grain, a blend overlay or a faint gradient is not a ground (`e959dd362`).
- Advice stopped teaching tricks. The moving-tail, grain, acceptance and spectacle lines name the real fix instead (`fec66ba0e`), and the docs no longer recommend a ground or lockup drift as the hold (`563516725`).
- Waivers became one code per check, scoped to seconds. A reason has to say where and what was measured, and a generic, copied or dead waiver is refused (`ecb537a46`).
- The judge rubric lists each known trick and needs a cited second for a claim (`cf73a1c7a`).

The change we trust most is a test. For each trick the audit found there is now a fixture page, with an honest page beside it, and a test runs the checks on each. A check that stops catching its trick then shows up as a failing test (`c8f4630e6`). Fixing a loophole once does not stop it coming back, and until then nobody tested that the checks reject cheats.

<figure>
<img src="/blog/loophole-audit/audit-loop.svg" alt="Diagram: ask each check the cheapest-change question, exclude global answers, then fixtures, advice, waivers and judge rubric" width="720" height="340" loading="lazy">
<figcaption>The audit question and the four things that came out of it.</figcaption>
</figure>

## The result, and what we do not know

We have the before numbers above. We do not have an after. We did not rerun the grep on a fresh set of films, so we cannot tell you how many films still cheat. The fixtures show the checks reject the known tricks. They say nothing about the next one.

That is also why the rule of thumb we kept is a question: what is the cheapest change that turns this green, and if it is global, exclude it.

## What we would tell someone building the same thing

Read your own advice lines as an attacker would. Ours named the trick, and an agent obeys the advice it is given.

Prefer local measures to global ones. Count paint on a layer, not a box around it. Ignore a whole-frame move when you ask whether a hold is alive.

Write a fixture for each trick, and put an honest case beside it. The honest page proves the check still passes real work, which is the half people forget. Our [waivers post](/blog/waivers) covers the matching rule for exemptions, and [the judge design](/blog/judge-design) covers the rubric side. For the sound version of the same cheat, see [banning the synth bed](/blog/no-synth-bed).

## In the code

- `quality/gates/page-check.mjs` and `harness/lib/`: the checks the audit read
- `tests/fixtures/tricks/` and `tests/media/tricks.test.mjs`: one page per trick, an honest page beside them, and the test that runs the checks
- [`bb965eb3e`](https://github.com/Vandit1604/vawe/commit/bb965eb3e): live-hold ignores a whole-frame camera move
- [`c8f4630e6`](https://github.com/Vandit1604/vawe/commit/c8f4630e6): a fixture page per trick and the honest page beside it
- [`fec66ba0e`](https://github.com/Vandit1604/vawe/commit/fec66ba0e): advice stops teaching tricks
- [`ecb537a46`](https://github.com/Vandit1604/vawe/commit/ecb537a46): waivers scoped to seconds with a measured reason

The repo is [Vandit1604/vawe](https://github.com/Vandit1604/vawe). The agent-facing docs are under [/ai-agents](/ai-agents).
