---
title: "AI agent observability with one JSONL line per command"
description: "AI agent observability the tool writes, not the agent: one JSONL line per command with stage, seconds and exit code. An agent guessed 18 min for 6.2."
date: 2026-10-10
updated: 2026-10-13
section: agent-experience
tags: "observability, run logs, ai agents, jsonl"
keywords: "ai agent observability, agent run logs, jsonl log, harness metrics"
hero: /blog/run-logs/hero.webp
heroAlt: "One JSONL log line per verb call, with stage, duration, exit code, slot wait and images, feeding a runs report for time, failures and the draft series."
---

To add observability to an AI agent workflow, make the tool log every call, so you can answer three questions without asking the agent: where the time went, what failed and why, and whether each draft fixed what the last one flagged. The end state is one JSONL line per command in `out/<film>.runs.jsonl` and a report command that reads it. That is what [vawe](https://github.com/Vandit1604/vawe) runs today.

We started on 2026-10-04, when we asked an agent to log how long each step of a 6.2-minute task took. It handed back a table that summed to about 18 minutes. It had run `date` once, typed the other timestamps by hand and guessed its own thinking time. It said so, but the numbers still looked like measurements. A language model has no clock while it thinks and sees time only in tool output, so we wrote down a rule: ask an agent what it saw and decided, never how long something took. The log is part of the [harness we build for the weaker model](/blog/weaker-model).

![Asking the agent for the duration of a 6.2 minute run produced about 18 minutes; the run log carries the measured seconds.](/blog/run-logs/diagram.webp)

## What you need for a per-command log

- One entry point that every command passes through. Ours is `bin/vawe`, described in [CLI design for AI agents](/blog/one-binary).
- An append-only file per unit of work (per film, for us).
- A way for child processes to report facts the entry point cannot see, such as a queue wait.

## Step 1: log one event per step for the main commands

[97bf133](https://github.com/Vandit1604/vawe/commit/97bf13390) (2026-10-01) wrote one event per step for `new`, `dev`, `judge` and `ship`, added `vawe runs`, and put the ship job logs under `out/ship-jobs`. This is enough to start, and it was not enough to keep. In one trace review the log held 21 lines for 162 tool calls. `strip`, `frames`, `compare`, `velocity`, `onion`, `critique` and `audio` left no record, a failed or killed draft wrote nothing, and time spent waiting for a render slot sat inside the draft's wall time.

## Step 2: log every command, including the ones that fail

[914f16f](https://github.com/Vandit1604/vawe/commit/914f16f20) (2026-10-10) made the log cover every verb. Each call appends one line with these fields:

- the verb and its arguments;
- the stage the film was in when the call started;
- a start time and the duration in seconds;
- the exit code and the error reason;
- how long the call waited for a render slot;
- the images it printed;
- a tagged field that says whether the run named an agent through `VAWE_AGENT`.

The tag lets a report tell a stray untagged run from the agent's own. Set `VAWE_AGENT=<name>` and `VAWE_MODEL=<model>` in the agent's shell.

## Step 3: measure in the tool, never in the agent

The verb measures every field itself. A child script reports facts such as the slot wait to the main process through a small notes file. The agent writes nothing to the log, so it cannot get the log wrong. The event shape lives in `harness/lib/runlog.mjs` and `harness/lib/verb-log.mjs`, and `bin/vawe` times and logs each call.

## Step 4: end every call with a result line

The same commit added a footer: `vawe: dev ok in 38.2s` or `vawe: dev FAILED (reason) in 38.2s`. Agents pipe output into `tail` and lose the exit code; the footer keeps the result visible in the last line. Failure reasons are grouped by cause, so "render slot or navigation timeout" and "browser lost" show up as counts and not as 40 different strings.

## Step 5: give the log a reader

A JSONL file nobody reads is storage. `vawe runs <film>` shows time per stage and verb, failures and why, and the draft series. `vawe runs --all` gives one row per film for the last 30 days. `vawe runs --taste` reports, per rule, how often it fired, how often it was fixed and how often it still fired in the next draft ([6cb5227](https://github.com/Vandit1604/vawe/commit/6cb52276b); [1560a60](https://github.com/Vandit1604/vawe/commit/1560a60ec) restored the per-draft lines). The report code is in `harness/lib/runs-report.mjs` and `harness/dev/runs.mjs`.

## Check that the log answers real questions

In its first weeks the log answered questions we had not planned for:

- The docs audit used `rules_fired` across 377 `dev` runs over 59 films to see which rules fired most and which never did. [How long AGENTS.md should be](/blog/read-load) shows what that audit cut.
- In one trace review, 9 of 12 later drafts fixed no rule the earlier draft had fired. Before the log we could only suspect a draft loop that does not converge; after, we could count it. It fed the work on [what an agent compares its film against](/blog/watch-a-film).
- A review of a design-systems session found 52 of 130 shell calls were polls of `ship --status --wait`, and three of five finals failed and cost 2,967 seconds (49 minutes, 45% of that session). Slot waits had been invisible until the log recorded them. [Reading AI agent traces](/blog/trace-reviews) follows that session.

None of those numbers came from asking an agent.

## Where per-command logs go wrong

- An early `vawe runs` printed "judge -" for every draft. A skip flag (`--no-judge`) had no counter, so the log could not say the judge was skipped on purpose.
- A log that records only success hides the calls you most want to see.
- A queue wait inside a duration looks like a slow tool. Give it its own field.
- The log alone lacks intent. It tells you which call took 38 seconds; the transcript beside it tells you what the agent was trying to do.

Next, read [reading AI agent traces](/blog/trace-reviews) for a full review built on this log and the transcripts, or [AI agent harness engineering](/blog/weaker-model) for the rest of the harness. The [troubleshooting page](/docs/troubleshooting) covers the failure causes the log groups, and [reading your film](/docs/reading-your-film) is the same idea applied to the film itself.
