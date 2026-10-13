---
title: "An AI agent harness that refuses only three things"
description: "Our AI agent harness advises on every check and refuses only for determinism, a missing waiver reason and an unapproved final. Why, and what the guards cost."
date: 2026-10-11
section: architecture
tags: "ai agent harness, guardrails, agents, rendering, architecture"
keywords: "ai agent harness, agent guardrails, advisory checks, agent approval gate, harness design"
hero: /blog/advise-refuse/hero.svg
heroAlt: "Two columns. Advise: every check prints a line starting with advice and the command continues. Refuse: only a non-deterministic render, a waiver with no reason and a final without approval stop a command."
---

An agent harness can fail in two ways. It can stop the agent when the agent was right, or it can wave through something expensive that nobody has looked at. In vawe we settled on a rule for our AI agent harness: every check advises, and only three things refuse. This post explains how we got there, what the guards look like in code, and the one gate we added late because an expensive step kept running on films nobody had seen.

## The problem: rigid guards on intentional choices

We started with strict checks. A flat frame failed the render. A rule that looked wrong to the check but was a deliberate choice by the agent stopped the run. A check does not know the context, so it cannot tell a real failure from a choice.

A colour block or a white flash is a legitimate frame in a film. A check that fails the render because "this frame is blank" is wrong for a film whose point is the flash. So in commit `939c816e1` (2026-09-30) a flat frame stopped refusing and started advising. The code comment says it: "A missing frame is a broken encode; a flat frame may be a colour block or a flash, so it only advises."

The second problem came later. A final render is the slow step. Agents spent it on films that no person had looked at, and then waited on it. One session we traced spent 3,922 seconds on 12 status calls across 4 finals, about 16 minutes per final.

## What we tried

Our rule for the harness: a guard should clamp, tolerate or reclassify. It should not refuse. A hard refusal is for the cases where the output would be wrong or the work lost.

We also found the wording mattered more than we expected. In a trace of a weaker model (more in [Building the harness for the weaker model](/blog/weaker-model)), the agent read lines that were only advice as if they were blocking. Commit `61ac19259` (2026-10-01) fixed the wording: every advice line starts with `advice:`, its block ends with `(advice only: the render continued)`, and an error that stops a command starts with `error:`. The module `harness/lib/advice.mjs` owns the format, so no check writes its own.

A related lesson came from shell guards. We had a hook that refused `for` loops and `sed -i`. We reverted it the same day, and kept guards only on the four git commands that lose work (`607cfe6f0`). The longer story is in [Stop fighting the agent shell](/blog/shell).

## What we built: three refusals and a clear line

1. Determinism. Time on a page is the seek, never the clock ([Time is the seek, never the clock](/blog/page-clock)). A render that cannot be repeated is not a render, so it refuses. A small set of render invariants fail with one line each and exit code 2: audio tags, fonts, a missing frame, frame count, brief drift and `vawe.assert` (`62ec2f450`, 14 files, +188 -7).
2. A waiver with no reason. A page can break a rule for cause if it says why, in the page. The waiver without the reason refuses; the waiver with a reason passes.
3. A final without approval. `vawe ship` refuses to render a final unless a person approved the current page. Commit `f776acb65` (2026-10-11) added the gate: 13 files, +228 -12.

The approval is a file keyed on a hash of the page and every file it references. An edit changes the hash, so a draft that was approved and then changed is refused again. Unattended runs set `VAWE_UNATTENDED=1`, and the command prints that no approval was checked. If a named agent approves a draft it also worked on, the judge sees a `self-approved` flag, because no person approved it. A refusal also tells the agent what to do next: show the draft to a person and stop.

Everything else advises. A check can say a lot, and the render keeps going.

## The measured result

We have numbers for the problem, not a clean before and after for the fix.

![Bars showing three traced final renders at 390, 400 and 421 seconds, and one session that spent 3,922 seconds in 12 status calls for 4 finals.](/blog/advise-refuse/diagram.svg)

Three traced finals took 390, 400 and 421 seconds. The 3,922-second session is a different one, and we did not try to reconcile the two. Both figures come from our own trace reviews of agent sessions, not from a benchmark. The gate itself is small: 13 files, +228 -12, with a test file of 86 lines. It cannot make a final faster. It makes sure the slow render happens for a draft that a person has seen.

## What we would tell you if you are designing the same thing

- Start with advice. Add a refusal only when you can say what is broken without the check. For us that was three cases, and a missing frame.
- Make the word at the start of the line carry the meaning. Agents read the first word. `advice:` and `error:` cost nothing and removed a class of mistakes.
- Let the page explain itself. A waiver with a reason keeps the author of the page in charge of the rule.
- Spend the expensive step on a human yes. If a step takes minutes and cannot be undone, gate it on something an agent cannot supply for itself.
- Hash the thing you approved. Approval of "the film" goes stale at the first edit. Approval of a hash of the files does not.

For the framework as a whole, see [the docs on quality gates](/docs/quality-gates). The code is open at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe), and the page format that these checks read is in [The whole film format fits in one screen](/blog/page-contract).

## In the code

- `harness/lib/advice.mjs`: the one wording for advice and errors.
- `harness/lib/approval.mjs` and `harness/live/ship-approval.mjs`: the approval file, the page hash and the refusal.
- [`939c816e1`](https://github.com/Vandit1604/vawe/commit/939c816e1) (2026-09-30): a flat frame advises, only a missing frame refuses.
- [`62ec2f450`](https://github.com/Vandit1604/vawe/commit/62ec2f450) (2026-09-30): render invariants fail with one line each and exit 2.
- [`61ac19259`](https://github.com/Vandit1604/vawe/commit/61ac19259) (2026-10-01): `advice:` and `error:` wording.
- [`f776acb65`](https://github.com/Vandit1604/vawe/commit/f776acb65) (2026-10-11): `vawe ship` refuses a final without approval.
