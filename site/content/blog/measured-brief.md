---
title: "Acceptance criteria for AI agents: the scoreboard that lied"
description: "Acceptance criteria for AI agents can measure the agent's own plan. Ours sat at 7 of 15 rows green for ten drafts, and 9 of 12 drafts fixed nothing."
date: 2026-10-11
updated: 2026-10-13
section: measurement
tags: "acceptance criteria, ai agents, measurement, harness, postmortem"
keywords: "acceptance criteria for ai agents, measurable brief, agent evaluation, ai agent scoreboard"
hero: /blog/measured-brief/hero.webp
heroAlt: "A loop: the brief's Spec tables feed the page the agent writes, and the acceptance script compares the draft back against the same tables. The reference film sits outside the loop."
---

| | |
|---|---|
| Impact | One film sat at 7 of 14 or 15 acceptance rows green for ten drafts in a row. 9 of the 12 drafts after the first fixed none of the rows the table named. |
| Cause | Most rows measured the film against tables the agent wrote itself, and the thresholds came from a generic range instead of the named reference. |
| Fix | Judge against the named reference at least once every three drafts, take thresholds from that reference, and default every reading tool to it. |
| Found | Reading the traces of agent sessions, not the final film. |

vawe gives agents acceptance criteria they can check after every draft, the way a test suite checks code. This postmortem covers how that scoreboard was built, the trace where it stopped steering anything, and why we did not see it sooner. It is one of our posts on [judging generated video](/blog/judge-design).

## Why we wanted a scoreboard

vawe turns one HTML page into a film. Early on, quality control was a critique pass: a reviewer looked at the frames and wrote notes. Reviewers who eyeball pass work that is plainly ugly, and they flip their advice between rounds. Worse, the agent had no number to climb. It could not tell whether draft six was closer than draft five. We liked the shape of a remake prompt with numeric acceptance: how many words, how many objects, where the cuts fall, what must not freeze.

## How the scoreboard was built, step by step

1. The brief got a fixed shape. Every `vawe new` brief carries Task, Look, Spec (with Shots, Words and Objects tables), Acceptance, Gates, Pitfalls and Deliver. A field the user did not answer is filled with a stated guess marked `(guess: change me)` ([f88915325](https://github.com/Vandit1604/vawe/commit/f88915325)). The shape lives in `harness/lib/measured-brief.mjs`.
2. The table got measured after every draft and final. `harness/lib/acceptance.mjs` parses the Spec and Acceptance tables of `brief.md`, counts frozen runs, jerky steps and jumps, and compares the words, objects and cuts in the film against the spec. It prints one table with a trend line so the agent sees whether the last edit helped ([f3855fb25](https://github.com/Vandit1604/vawe/commit/f3855fb25)). Ship uses the same table: PASS only when the judge passes and no measured row missed.
3. Rows that were wrong for honest reasons got fixed. Text inside `aria-hidden` left every text row. Product UI labels marked `data-chrome` got a 2.5% cap-height floor and no read hold. Appear, settle and object times moved onto the frame grid, so a measure no longer drifted 0.25 s per copy of an element ([7cee8cc52](https://github.com/Vandit1604/vawe/commit/7cee8cc52)).
4. Drafts and ships got one denominator. A draft prints "N of M measured green, K more at ship (15 rows)" and marks the judge row and the unrun tiers as not measured ([354e9aef3](https://github.com/Vandit1604/vawe/commit/354e9aef3)).

## What the trace showed

![Three counts from one film: 7 of 15 rows green, 9 of 12 drafts that fixed nothing, 15 of 17 dev calls with the judge skipped.](/blog/measured-brief/counts.webp)

The acceptance table stayed at 7 of 14 or 15 rows green for ten drafts. The `rules_fired` field showed "fixed none" in 9 of the 12 drafts after the first. Fifteen of the 17 `dev` calls ran with `--no-judge`. The one stills judge that did run scored 3, 2 and 2 for its three candidate frames, and no judge ran on a later draft.

The red rows were the same every time: "jumps not at a declared cut" (the film used deliberate flashes), "read hold per line" (17 short), and "cuts vs spec" (9 frames).

The trace review writes both "7 of 14" and "7 of 15" for the same table. The row count was moving while we measured it, which is why step 4 exists.

## Root cause

There were two.

The rows measured the agent's own Words and Shots tables. The agent wrote the Spec, built the page, and then the script checked the page against the Spec. That is a circle. A film can match its own plan perfectly and still look nothing like the film it was meant to match. A check that reads from an artifact the agent wrote is a consistency check: it says the work matches its plan, and nothing about whether the work is good.

The numeric range behind some rows was generic. It came from 17 reference films, not from the one reference the brief named, and its thresholds assumed films that people read at reading speed. A 0.3 s shot got a requirement of "needs 5.00 s".

## Why we missed it

Each piece looked reasonable alone. A plan-versus-page check is useful. Skipping the judge looks harmless on any one call, but 15 of 17 skipped calls removed the only independent reader. And a score whose denominator moved from 14 to 15 hid whether anything improved. We found all of it by reading what the agent did, not by looking at the final film.

## Follow-ups

The review's fix list was short:

- Judge at least once every three drafts against the named reference.
- Label final rows that reuse draft values.
- Take the reading-speed and jump thresholds from the named reference, not from the general range.

We also made `refs`, `critique` and `judge` default to the reference the brief names, so the instrument that reads the film is the one that read the reference. That change, and the same trace seen from the reference side, are in [can AI agents watch videos?](/blog/watch-a-film). The general range itself is described in [our motion graphics quality benchmark](/blog/quality-bar).

We have no before and after on the same film, so we cannot claim the scoreboard now works. We can say which rows we no longer trust, and we count how many drafts change the table: if most drafts fix nothing the rules named, the table is not steering anyone. The same cheapest-green-change habit shows up in [reward hacking in AI agents](/blog/loophole-audit), and the judge that now has to run every few drafts is described in [LLM as a judge for video](/blog/judge-design). Why the numbers repeat between drafts at all is covered in [determinism](/determinism), and the agent setup in [AI agents](/ai-agents).
