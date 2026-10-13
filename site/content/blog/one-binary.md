---
title: "CLI design for AI agents: one binary, one verb per step"
description: "CLI design for AI agents, as a reference: the rules behind one binary with 42 verbs, one-line usage errors and a result line that survives a pipe."
date: 2026-10-10
updated: 2026-10-13
section: agent-experience
tags: "cli, ai agents, harness, developer experience"
keywords: "cli design for ai agents, cli for ai agents, ai agent cli, usage errors"
hero: /blog/one-binary/hero.webp
heroAlt: "Before and after diagram: a 156 line Makefile with routers and scripts becomes one command, bin/vawe, with a 19 line Makefile that only forwards."
---

This page lists the design rules of `bin/vawe`, the one command that agents use to drive [vawe](https://github.com/Vandit1604/vawe), with the output each rule produces and the commit that added it. It is a reference for anyone designing a CLI that an AI agent will call more often than a person will.

| Rule | What the agent sees | Added in |
|---|---|---|
| One entry point | `bin/vawe <verb>` for every step; the Makefile only forwards | [29daa32](https://github.com/Vandit1604/vawe/commit/29daa32ba), [3913b49](https://github.com/Vandit1604/vawe/commit/3913b499c) |
| The verb is the step | one verb per stage of the loop | [29daa32](https://github.com/Vandit1604/vawe/commit/29daa32ba) |
| Usage in the error | one line: what is missing, then the usage | [29daa32](https://github.com/Vandit1604/vawe/commit/29daa32ba) |
| Unknown verb lists verbs | the valid verbs, and a note if the checkout is stale | [03dcbf6](https://github.com/Vandit1604/vawe/commit/03dcbf68e) |
| A result line last | `vawe: <verb> ok` or `FAILED (<reason>) in <s>s` | after a transcript review |
| Verbs come from traces | a new verb for each hand-rolled command | [a610943](https://github.com/Vandit1604/vawe/commit/a61094320) and later |
| Verbs before raw tools | AGENTS.md: use `bin/vawe` before `ffmpeg`, Chrome or a script | [3d1a494](https://github.com/Vandit1604/vawe/commit/3d1a49464) |

These rules are one part of a harness built for the weaker model; the [AI agent harness engineering](/blog/weaker-model) pillar explains that approach and links the other parts.

## Why one binary

Our agents ran 5,520 shell commands in one audit window, and 443 failed, about one in twelve. We could not split the 443 by cause. Many were shell habits (an unquoted zsh glob, `sed -i` without `''`), which [the shell post](/blog/shell) covers. The rest came from an interface with too many shapes.

Until 2026-09-30 an author could reach the renderer through a Makefile with 156 lines of targets, four router modules that the Makefile called (`dev-tool`, `gen-tool`, `media-tool` and `study-tool`), loose scripts under `harness/`, and raw `ffmpeg` and Chrome calls. A person learns that map once. An agent starts each session without it.

Documentation did not close the gap. AGENTS.md got a Shell section, and the next trace reviews still found the same `sed -i` and `cat a b` failures in every session. A tool has to refuse the wrong call, name the right one, and be the only tool.

## One entry point

`bin/vawe` arrived on 2026-09-30 in [29daa32](https://github.com/Vandit1604/vawe/commit/29daa32ba) with nine verbs: `new`, `dev`, `ship`, `critique`, `spec`, `studio`, `check`, `test` and `judge`. Six minutes later [3913b49](https://github.com/Vandit1604/vawe/commit/3913b499c) cut the Makefile from 156 lines to 19 aliases and deleted the routers and dead scripts: 70 files, 2,481 lines removed. Old paths forward to the CLI, so they cannot drift from it.

## The verb is the step

`vawe dev` is the draft render, `vawe frames` the key-frame sheet, `vawe ship` the final. The stage table in AGENTS.md names one verb per stage, so the agent never translates a stage into a command. How the next verb gets named is in [agent hooks that print the next command](/blog/stage-say).

## The error fits on one line

A missing argument prints what is missing and the usage, and nothing else. Every verb has `--help`.

```
vawe: missing <page>; usage: vawe frames <page> [flags]
vawe: frames FAILED (missing <page>; usage: vawe frames <page> [flags]) in 0.0s
```

An unknown verb lists the valid verbs. Since [03dcbf6](https://github.com/Vandit1604/vawe/commit/03dcbf68e) it also says when the checkout is stale: an agent that asks for a verb that exists on `main` but not in its worktree gets that answer.

## A result line that survives a pipe

A review of agent transcripts found 134 of 140 `vawe` calls piped into `tail`, `head` or `grep`. A pipe hides the exit code. The tool's error flag showed 2 failures in that review, and the real count was at least 8. So the last line of every verb says ok or FAILED, with the reason and the seconds, and `tail -1` still shows it. The run log records the same fields; see [AI agent observability with one JSONL line per command](/blog/run-logs).

![One failed call: a usage error, a FAILED footer with the reason and the seconds, and the exit code. The footer survives a pipe.](/blog/one-binary/diagram.webp)

Later reviews counted fewer pipes: 9 of 32 calls across three sessions of one film, and 12 of 87 across eight sessions of another. The later prompts also told the agent not to pipe, so the footer cannot take all the credit.

## Verbs come from traces

The first nine verbs were a guess. The next 33 came from trace reviews: each time an agent hand-rolled something, we checked for a verb and added one if it was missing. One agent found the beat of a music file with a Python and NumPy script, because `vawe see` answered "no readable video stream" for an audio file. We added `vawe sound`, and in the next review one film called it 21 times. The same loop produced `sheet`, `sfx`, `zoom`, `look`, `strip`, `wait` and `land`. The list is 42 verbs long at the time of writing.

## Verbs before raw tools

AGENTS.md says to use `bin/vawe` before any raw `ffmpeg`, Chrome or script, to run `bin/vawe <verb> --help` first, and, if a verb is missing what you need, to say so in the report and not hand-roll it ([3d1a494](https://github.com/Vandit1604/vawe/commit/3d1a49464)). The last clause turns each gap into a visible bug report.

## What the numbers do and do not show

- The Makefile went from 156 lines to 19, and the interface from several calling shapes to one.
- The bench ratchet counts the `vawe` commands between a new brief and the first draft render: 2 on 2026-10-01, 5 on 2026-10-07 and 6 today. It rose because we added real stages (reference study, a Board). It is the number to watch.
- There is no clean after-count for the 443 of 5,520 figure.

The full verb list with flags is in the [CLI reference](/docs/cli). For the reasoning behind the whole harness, read [why we build the agent harness for the weaker model](/blog/weaker-model).

## Source files

| File | What it holds |
|---|---|
| `bin/vawe` | the entry point, the call log and the footer |
| `harness/cli/verbs.mjs` | every verb, with its flags, example and next line |
| `harness/cli/parse.mjs` | argument parsing and the one-line usage errors |
| `Makefile` | 19 lines of aliases |
