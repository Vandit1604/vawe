---
title: "Long-running commands for AI agents: make the wait cheap"
description: "Long-running commands for AI agents: a draft spent 357 of 427 s in line behind a final. A background ship, one blocking wait and a canvas path cut idle time."
date: 2026-10-11
section: speed
tags: "ai agents, long-running commands, polling, background jobs, render queue"
keywords: "long-running commands for AI agents, agent polling, background render job, render slot, ai agent harness"
hero: /blog/cheap-wait/hero.svg
heroAlt: "Bar chart of draft time spent waiting for a render slot in five films, for example 357 seconds of 427."
---

Our draft spent 357 of its 427 seconds waiting in line behind a final. The agent was in a queue, not doing slow work. This post is about long-running commands for AI agents: what a harness should do while the agent waits, and what it should not make the agent do.

## The problem: the agent's day is a progress bar

Our trace reviews show it. A final render takes about 16 minutes, and the agent waited for it by polling.

In one 110-minute session, ship and waiting took 81.5 minutes. That is 74% of the wall time. The agent made 52 `ship --status --wait` calls out of 130 shell calls. It often sent three or four in one message, and they ran one after another, each blocking for up to 100 s. Polls were 43% of that session's cache-read tokens (17.6M of 40.7M). In another session, 12 status calls took 3,922 s for four finals.

Two more costs sat behind the polling:

- Drafts waited behind finals. A machine has two render slots by default, and a final could hold one for minutes. The slot wait inside `dev` was 357 s of 427 s in one film, 339 of 395 in another, 172 of 200, 155 of 243 and 133 of 247. The five add up to 1,156 s.
- A canvas film spent time on nothing. Per-frame DOM probes ran on a film that draws on one canvas, where there is no DOM to probe. `dev --fast` on that film took 109 s.

## What we tried

A final that blocks the shell is a poor fit for an agent: a Bash call over 120 s moves to the background, and the agent loses the thread. So we made the wait a command of its own.

## Long-running commands: what we built

Ship runs in the background. By default `ship` starts a job and returns. `--wait` blocks. `--status` reports progress or the result ([a5d092c22](https://github.com/Vandit1604/vawe/commit/a5d092c22)). A later commit checks the final first and cancels a duplicate job ([6e74cd5a5](https://github.com/Vandit1604/vawe/commit/6e74cd5a5)).

One call blocks for a long time. `ship --status --wait` blocks for up to 9 minutes and prints a progress line each minute ([e3e504636](https://github.com/Vandit1604/vawe/commit/e3e504636)). The result names the next call and how many calls are left ([6bea1e806](https://github.com/Vandit1604/vawe/commit/6bea1e806)). An agent reads that line and knows what to do next, so it does not guess.

`vawe wait` blocks on any render of a film. Draft or final, same behaviour: it blocks, prints a progress line a minute, and ends with its result line ([f0ab4f483](https://github.com/Vandit1604/vawe/commit/f0ab4f483)). AGENTS.md names it for waiting, and says to run it once and not in parallel.

![Before: many polls, each blocking up to 100 s. After: one call up to 9 minutes with a progress line each minute.](/blog/cheap-wait/polls.svg)

A final never takes the last free slot. Slots 0 to count minus 2 are the finals' share, and a draft can take slots from the top. A draft no longer sits behind finals ([05aa73d9c](https://github.com/Vandit1604/vawe/commit/05aa73d9c)). When a slot is busy, the waiting line names the holder and its age, and a navigation timeout is retried once ([37749a58a](https://github.com/Vandit1604/vawe/commit/37749a58a)).

Canvas films skip the DOM probes. There is nothing to probe, so the draft does not look. `dev` also names why a page never loads after 30 s, so the agent is not left guessing at a blank wait ([6bea1e806](https://github.com/Vandit1604/vawe/commit/6bea1e806)).

## The measured result

![A canvas film's dev --fast run: 109 s before, 26 s after.](/blog/cheap-wait/fast.svg)

- `dev --fast` on the canvas film: **109 s to 26 s** (from the commit subject).
- Slot waits before the slot rule: **357 of 427 s** and **339 of 395 s** in the two worst drafts, 1,156 s in total across five films.

The commit messages carry the canvas number. The slot waits are from our trace review, taken before the fix. We have no after-measurement of the slot rule and we will not quote one.

![Draft time spent waiting for a render slot in five films.](/blog/cheap-wait/hero.svg)

## What we would tell you if you build this

- Give the agent one command that waits. Without it, the agent will write a polling loop, and polls cost tokens: they were 43% of the cache-read tokens in one of our sessions.
- Tell the agent what to do next in the same output. "Next call: `ship --status --wait`, 2 left" removes a decision.
- Let the wait print a line a minute. A silent block looks like a hang.
- Protect the short jobs. If long and short jobs share a queue, the short ones will wait behind the long ones. Keep one slot out of reach of the long ones.
- Do not do work you can prove has no result. A canvas film has no DOM to probe, and a check that cannot find anything should not run.
- Read the traces and add up the waits. Ours came to 74% of one session.

Waiting is half the story, the other half is making the render itself survive. See [resumable finals](/blog/resumable-finals) for that, and [the traces behind these numbers](/blog/trace-reviews) for how we found them. If you want to know how vawe is set up for agents, [AI agents](/ai-agents) has the overview.

## In the code

- `harness/media/ship-job.mjs`, `harness/lib/ship-status.mjs`: the background job, the status lines and the wait
- `harness/lib/render-slots.mjs`: the render slots and the rule that a final leaves one free
- [a5d092c22](https://github.com/Vandit1604/vawe/commit/a5d092c22): `ship` runs in the background by default
- [e3e504636](https://github.com/Vandit1604/vawe/commit/e3e504636): `--status --wait` blocks up to 9 minutes
- [05aa73d9c](https://github.com/Vandit1604/vawe/commit/05aa73d9c): a final never takes the last free slot
- [6bea1e806](https://github.com/Vandit1604/vawe/commit/6bea1e806): canvas films skip DOM probes; the wait names the next call

The repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).
