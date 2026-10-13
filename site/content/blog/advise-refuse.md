---
title: "AI agent guardrails: when a check should refuse"
description: "AI agent guardrails that advise by default: our harness refuses only a non-repeatable render, a waiver without a reason and a final without approval."
date: 2026-10-11
updated: 2026-10-13
section: architecture
tags: "ai agent harness, guardrails, agents, rendering, architecture"
keywords: "ai agent guardrails, agent approval gate, advisory checks, harness design"
hero: /blog/advise-refuse/hero.svg
heroAlt: "Two columns. Advise: every check prints a line starting with advice and the command continues. Refuse: only a non-deterministic render, a waiver with no reason and a final without approval stop a command."
---

An AI agent guardrail should refuse only when the output would be wrong or work would be lost, and advise in every other case. In [vawe](https://github.com/Vandit1604/vawe), where an agent writes an HTML page and the harness renders it into a film, that rule leaves three refusals: a render that cannot be repeated, a waiver with no reason, and a final render without a person's approval. Every other check prints a line that starts with `advice:` and lets the command continue.

A guardrail can fail in two directions. It can stop the agent when the agent was right, or it can wave through something expensive that nobody looked at. This page explains how we placed the line between the two. It belongs to the set of harness rules collected under [AI agent harness engineering](/blog/weaker-model).

| Check | What happens | Why |
|---|---|---|
| A render that cannot be repeated | refuses, one line, exit code 2 | the film is wrong |
| A waiver with no reason | refuses | the page has not said why it breaks the rule |
| A final without approval | refuses, tells the agent to show the draft to a person | minutes of render on a film nobody has seen |
| A missing frame | refuses | a broken encode |
| A flat frame | advises | it may be a colour block or a flash |
| Every other check | advises | the check cannot see the intent |

## Why should most checks only advise?

A check does not know the context, so it cannot tell a real failure from a choice. A colour block or a white flash is a legitimate frame in a film, and a check that fails the render because "this frame is blank" is wrong for a film whose point is the flash. In commit `939c816e1` (2026-09-30) a flat frame stopped refusing and started advising. The code comment says why: "A missing frame is a broken encode; a flat frame may be a colour block or a flash, so it only advises."

Our harness rule follows from that: a guard should clamp, tolerate or reclassify. A hard refusal is kept for the cases where the output would be wrong or the work lost.

## What makes a render refuse?

Time on a page is the seek, never the clock (see [a virtual clock that seeds Math.random and freezes Date.now](/blog/page-clock)). A render that cannot be repeated is not a render. A small set of render invariants fail with one line each and exit code 2: audio tags, fonts, a missing frame, frame count, brief drift and `vawe.assert`. They came in `62ec2f450`: 14 files, 188 lines added, 7 removed.

## How does a page break a rule on purpose?

It declares a waiver in the page, with its reason. The waiver with a reason passes and the waiver without one refuses, so the author of the page stays in charge of the rule. What counts as a reason has since become stricter; [suppression comments must name a place and a number](/blog/waivers) covers that.

## Why does the final render need a person's approval?

A final render is the slow step, and agents spent it on films that no person had looked at, then waited on it. In one traced session, 12 status calls took 3,922 seconds across 4 finals, about 16 minutes per final. Three other traced finals took 390, 400 and 421 seconds. Both figures come from our trace reviews of agent sessions, not from a benchmark, and we did not try to reconcile the two sessions.

![Bars showing three traced final renders at 390, 400 and 421 seconds, and one session that spent 3,922 seconds in 12 status calls for 4 finals.](/blog/advise-refuse/diagram.svg)

Commit `f776acb65` (2026-10-11) made `vawe ship` refuse a final unless a person approved the current page: 13 files, 228 lines added and 12 removed, with a test file of 86 lines. The approval is a file keyed on a hash of the page and every file it references, so an edit changes the hash and an approved draft that changed is refused again. Unattended runs set `VAWE_UNATTENDED=1`, and the command prints that no approval was checked. If a named agent approves a draft it also worked on, the judge sees a `self-approved` flag. The refusal tells the agent what to do next: show the draft to a person and stop.

The gate does not make a final faster. It makes sure the slow render happens for a draft that someone has seen. [Reading AI agent traces](/blog/trace-reviews) has the full account of where those sessions spent their time.

## How should advice be worded so an agent does not stop?

The first word of the line has to carry the meaning. In a trace of a weaker model, the agent read lines that were only advice as if they were blocking. Commit `61ac19259` (2026-10-01) fixed the wording: every advice line starts with `advice:`, its block ends with `(advice only: the render continued)`, and an error that stops a command starts with `error:`. `harness/lib/advice.mjs` owns the format, so no check writes its own.

## What about guardrails in the shell?

The same rule applied there. We had a hook that refused `for` loops and `sed -i`, reverted it the same day, and kept guards only on the four git commands that lose work (`607cfe6f0`). [Shell for AI agents](/blog/shell) is the postmortem.

## Limits of this approach

We have numbers for the problem and no clean before-and-after for the approval gate. An advise-first harness also depends on the agent reading the advice, which a weaker model does not always do, and the draft loop numbers in [AI agent harness engineering](/blog/weaker-model) show that advice alone did not get a weaker model to a passing film.

The code lives in `harness/lib/advice.mjs` (the wording), and in `harness/lib/approval.mjs` with `harness/live/ship-approval.mjs` (the approval file, the page hash and the refusal). The commits are [`939c816e1`](https://github.com/Vandit1604/vawe/commit/939c816e1), [`62ec2f450`](https://github.com/Vandit1604/vawe/commit/62ec2f450), [`61ac19259`](https://github.com/Vandit1604/vawe/commit/61ac19259) and [`f776acb65`](https://github.com/Vandit1604/vawe/commit/f776acb65). The [quality gates docs](/docs/quality-gates) list which checks advise and which refuse, and the page format these checks read is in [render HTML to video: the whole page contract](/blog/page-contract).
