---
title: "Acceptance criteria for AI agents: a scoreboard that lied"
description: "We gave an AI agent measurable acceptance criteria. One film sat at 7 of 15 rows green for 10 drafts, because the rows measured the agent's own tables."
date: 2026-10-11
section: measurement
tags: "acceptance criteria, ai agents, measurement, harness, evaluation"
keywords: "acceptance criteria for AI agents, ai agent harness, measurable brief, agent evaluation, ai agent scoreboard"
hero: /blog/measured-brief/hero.svg
heroAlt: "A loop: the brief's Spec tables feed the page the agent writes, and the acceptance script compares the draft back against the same tables. The reference film sits outside the loop."
---

We gave agents a scoreboard, and the first thing they showed us is that a scoreboard can lie in a circle. In one trace, a film sat at 7 of 14 or 15 acceptance rows green for ten drafts in a row. The rows were built so that most of them could not move.

This post is about acceptance criteria for AI agents: what we measure after every draft in vawe, how the table was meant to work, and what a trace review told us about where it fails.

## The problem: critics who eyeball

vawe turns one HTML page into a film. Early on, quality control was a critique pass. A reviewer looked at the frames and wrote notes. Two things went wrong with that. Reviewers who eyeball pass work that is plainly ugly, and they flip their advice between rounds. And the agent had no number to climb. It could not tell whether draft six was closer than draft five.

We wanted a brief that an agent can check itself against, the way a test suite checks code. A remake prompt with numeric acceptance was the shape we liked: how many words, how many objects, where the cuts fall, what must not freeze.

## Acceptance criteria for AI agents: what we built

Every `vawe new` brief now carries the same sections: Task, Look, Spec (with Shots, Words and Objects tables), Acceptance, Gates, Pitfalls and Deliver. A field the user did not answer is filled with a stated guess marked `(guess: change me)` ([f88915325](https://github.com/Vandit1604/vawe/commit/f88915325)).

After each draft and each final, `acceptance.mjs` parses the Spec and Acceptance tables of `brief.md`. It counts frozen runs, jerky steps and jumps. It compares the words, objects and cuts in the film against the spec. Then it prints one table with a trend line, so the agent sees whether the last edit helped ([f3855fb25](https://github.com/Vandit1604/vawe/commit/f3855fb25)).

Ship uses the same table. The verdict is PASS only when the judge passes and no measured row missed.

We then fixed the rows that were wrong for honest reasons:

- Text inside `aria-hidden` is outside every text row. Product UI labels marked `data-chrome` get a 2.5% cap-height floor and no read hold. Spec appear, settle and object times are measured on the frame grid, so the measure no longer drifts 0.25 s per copy of an element ([7cee8cc52](https://github.com/Vandit1604/vawe/commit/7cee8cc52)).
- A draft and a ship now share one 15-row denominator. A draft prints "N of M measured green, K more at ship (15 rows)" and marks the judge row and the unrun tiers as not measured ([354e9aef3](https://github.com/Vandit1604/vawe/commit/354e9aef3)).

The trace review writes both "7 of 14" and "7 of 15" for the same table. The row count was moving while we measured.

## Where the scoreboard lied

We read agent traces. One film showed the failure clearly, and the numbers are in the chart below.

![Three counts from one film: 7 of 15 rows green, 9 of 12 drafts that fixed nothing, 15 of 17 dev calls with the judge skipped.](/blog/measured-brief/counts.svg)

The acceptance table stayed at 7 of 14 or 15 rows green for ten drafts. The `rules_fired` field showed "fixed none" in 9 of the 12 drafts after the first. Fifteen of the 17 `dev` calls ran with `--no-judge`, and the one stills judge that did run scored 3, 2 and 2 for its three candidate frames, and no judge ran on a later draft.

The red rows were the same ones every time: "jumps not at a declared cut" (the film used deliberate flashes), "read hold per line" (17 short), and "cuts vs spec" (9 frames).

The review gave two causes.

First, the rows measured the agent's own Words and Shots tables. The agent wrote the Spec, then built the page, then the script checked the page against the Spec. That is a circle. A film can match its own plan perfectly and still look nothing like the film it was meant to match.

Second, the numeric range behind some rows was generic. It came from 17 reference films, not from the one reference the brief named. Thresholds assumed films that people read at reading speed, so a 0.3 s shot got a requirement of "needs 5.00 s".

## What we did about it

The review's fix list was short. Judge at least once every three drafts against the named reference. Label final rows that reuse draft values. Take the reading-speed and jump thresholds from the named reference, not from the general range.

We also made `refs`, `critique` and `judge` default to the reference the brief names, so the instrument that reads the film is the one that read the reference. That change has its own post: [the agent checked its work against the plan it wrote](/blog/plan-vs-reference). The judge side, and why it never prints its score back to the author, is in [a judge that cannot be argued with](/blog/judge-design).

We have no before-and-after on the same film, so we cannot claim the scoreboard now works. We can say which rows we no longer trust.

## What we would tell you if you build this

- A check that reads from the artifact the agent wrote is a consistency check. It tells you the work matches its plan. It does not tell you the work is good. Keep one measurement that the agent cannot edit.
- Count how many drafts changed the table. If nine of twelve drafts fix nothing the rules named, the table is not steering anyone.
- Skipping the judge looks harmless on any one call. Fifteen of 17 skipped calls meant the only independent reader was gone.
- Keep the denominator stable. A score that moves from 7 of 14 to 7 of 15 hides whether anything improved.
- Read the traces. We found all of this by reading what the agent did, not by looking at the final film.

The same habit shows up in [the loophole audit](/blog/loophole-audit), where we asked each check what the cheapest green change was. The agent finds that change faster than we do. If you are building a harness around this idea, [ai-agents](/ai-agents) explains how vawe is set up for agents, and [determinism](/determinism) covers why the numbers repeat between drafts at all.

## In the code

- `harness/lib/acceptance.mjs`: the parser, the row checks and the trend line
- `harness/lib/measured-brief.mjs`: the brief shape that `vawe new` writes
- [f3855fb25](https://github.com/Vandit1604/vawe/commit/f3855fb25): measure the Acceptance table after every draft and final
- [f88915325](https://github.com/Vandit1604/vawe/commit/f88915325): the measured brief becomes the default
- [7cee8cc52](https://github.com/Vandit1604/vawe/commit/7cee8cc52): skip decorative and chrome text, measure on the frame grid
- [354e9aef3](https://github.com/Vandit1604/vawe/commit/354e9aef3): one 15-row denominator

The repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).
