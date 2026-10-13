---
title: "One CLI for AI agents: one binary, one verb per step"
description: "We gave agents one command with verbs instead of a Makefile and scripts. It grew from 9 to 42 verbs, each one added after a trace showed hand-rolled work."
date: 2026-10-10
section: agent-experience
tags: "cli, ai agents, harness, developer experience"
keywords: "ai agent cli, cli for ai agents, agent harness, one command, usage errors"
hero: /blog/one-binary/hero.svg
heroAlt: "Before and after diagram: a 156 line Makefile with routers and scripts becomes one command, bin/vawe, with a 19 line Makefile that only forwards."
---

Our agents ran 5,520 shell commands in one audit window, and 443 of them failed. That is about one in twelve. We could not split those 443 by cause, but the pattern was clear enough: the agent met a Makefile target in one place, a router script in another and a raw `ffmpeg` line in a third, and each had its own calling shape. This post is about the part we could fix with design: a CLI for AI agents that has one entry point, one verb per step and one way to fail.

## The problem: five ways to call the same framework

[vawe](https://github.com/Vandit1604/vawe) turns one HTML page into one film. Until 2026-09-30 an author could reach the renderer through a Makefile with 156 lines of targets, through four router modules (`dev-tool`, `gen-tool`, `media-tool` and `study-tool`) that the Makefile called, through loose scripts under `harness/`, and through raw `ffmpeg` and Chrome calls. A human learns that map once. An agent starts every session with no map, reads the docs and guesses.

The same audit that gave us the 443 figure is why [AGENTS.md](https://github.com/Vandit1604/vawe/blob/main/AGENTS.md) carries a Shell section today. Most of those failures were shell habits (an unquoted zsh glob, `sed -i` without `''`), and we wrote about that fight in [the shell post](/blog/shell). What a better interface could remove was the other half: the calls that failed because the agent used the wrong tool, the wrong flag order or the wrong script.

## What we tried first

We tried documentation first. The Shell section of AGENTS.md lists the habits that fail in our shell, and we cut it later to what traces proved. It helped, but the next trace reviews still found the same `sed -i` and `cat a b` failures in every session. A rule in prose does not stop an agent from calling a tool the wrong way. The tool has to refuse the wrong call, say what the right one is, and be the only tool.

## What we built

On 2026-09-30 we added `bin/vawe` in commit [29daa32](https://github.com/Vandit1604/vawe/commit/29daa32ba). It had nine verbs (`new`, `dev`, `ship`, `critique`, `spec`, `studio`, `check`, `test`, `judge`), a `--help` on every verb and one-line usage errors. Six minutes later [3913b49](https://github.com/Vandit1604/vawe/commit/3913b499c) turned the Makefile into thin aliases (156 lines became 19) and deleted the routers and dead scripts. That commit touched 70 files and removed 2,481 lines.

Three rules shaped the interface.

The verb is the step. `vawe dev` is the draft render, `vawe frames` is the key-frame sheet, `vawe ship` is the final. The stage table in AGENTS.md names one verb per stage, so the agent never has to translate a stage into a command.

The error fits on one line. A missing argument prints what is missing and the usage, and nothing else:

```
vawe: missing <page>; usage: vawe frames <page> [flags]
vawe: frames FAILED (missing <page>; usage: vawe frames <page> [flags]) in 0.0s
```

An unknown verb lists the valid verbs. Since [03dcbf6](https://github.com/Vandit1604/vawe/commit/03dcbf68e) it also says when the checkout is stale, because an agent that asks for a verb that exists on `main` but not in its worktree should get that answer and not a puzzle.

The last line always says ok or FAILED. We added that after a review of agent transcripts (see [the run logs post](/blog/run-logs)) found that 134 of 140 `vawe` calls were piped into `tail`, `head` or `grep`. A pipe hides the exit code. The tool flag for errors showed 2 failures in that review, and the real count was at least 8. The footer is the last thing a verb prints, so `tail -1` still shows it.

![One failed call: a usage error, a FAILED footer with the reason and the seconds, and the exit code. The footer survives a pipe.](/blog/one-binary/diagram.svg)

## Missing verbs come from traces, not from a plan

The first nine verbs were a guess. The next 33 were not. Each time a trace review showed an agent hand-rolling something, we checked whether a verb existed and added one if not. In one review an agent found the beat of a music file with a Python and NumPy script, because `vawe see` answered "no readable video stream" for an audio file. We added `vawe sound`, and in the sessions of the next review one film called it 21 times. The same loop produced `sheet`, `sfx`, `zoom`, `look`, `strip`, `wait` and `land`. At the time of writing the list is 42 verbs long.

We also wrote the rule down where the agent reads it. AGENTS.md says to use `bin/vawe` before any raw `ffmpeg`, Chrome or script, to run `bin/vawe <verb> --help` first, and, if a verb is missing what you need, to say so in the report and not to hand-roll it. That last clause turns every gap into a visible bug report. The commit that added the sentence is [3d1a494](https://github.com/Vandit1604/vawe/commit/3d1a49464).

## The measured result

We have fewer clean before and after numbers than we would like, so here is what we can stand behind.

- The Makefile went from 156 lines to 19, and the interface from several calling shapes to one.
- The piped-call rate in agent sessions fell from 134 of 140 in one review to 9 of 32 across three sessions of one film and 12 of 87 across eight sessions of another. The later prompts also told the agent not to pipe, so we cannot credit the footer alone.
- The bench ratchet counts the `vawe` commands between a new brief and the first draft render. It read 2 on 2026-10-01, 5 on 2026-10-07 and 6 today. It went up because we added real stages (reference study, a Board). We do not count that as a failure, but it is the number to watch.
- We have no clean after-count for the 443 of 5,520 figure. The next trace reviews still found `sed -i` and `cat a b` failures in every session.

## What we would tell you if you build the same thing

Make the CLI the only documented path and keep the old paths as aliases that forward to it, so nothing can drift. Put the usage in the error, not in a link. Print a status line that survives `tail`. Review transcripts after every batch of runs and ask one question of each hand-rolled command: why was there no verb for this?

For the commands themselves see the [CLI reference](/docs/cli). For how an agent gets from one verb to the next, read [a loop that names its own next command](/blog/stage-say). The wider case for building tools around the agent is on the [AI agents page](/ai-agents).

## In the code

- `bin/vawe`: the entry point, the call log and the footer.
- `harness/cli/verbs.mjs`: every verb, with its flags, example and next line.
- `harness/cli/parse.mjs`: argument parsing and the one-line usage errors.
- `Makefile`: 19 lines of aliases.
- Commits: [29daa32](https://github.com/Vandit1604/vawe/commit/29daa32ba) (the CLI), [3913b49](https://github.com/Vandit1604/vawe/commit/3913b499c) (thin Makefile), [a610943](https://github.com/Vandit1604/vawe/commit/a61094320) (verbs for sheet, sfx and more), [3d1a494](https://github.com/Vandit1604/vawe/commit/3d1a49464) (use verbs before raw tools).
