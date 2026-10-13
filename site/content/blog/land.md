---
title: "Merge a git worktree branch to main in one command"
description: "Merge a git worktree branch to main in one command: rebase, refuse files over 5 MB in the range, run the tests and push with an ssh keep-alive."
date: 2026-10-11
updated: 2026-10-13
section: agent-experience
tags: "git worktree, rebase, ai agents, merge workflow"
keywords: "git worktree merge to main, git worktree workflow, rebase and push, big file scan"
hero: /blog/land/hero.webp
heroAlt: "The five steps of vawe land: rebase onto origin main, scan the range for files over 5 MB, run the tests, push with an ssh keep-alive, then print the e2e line and the pushed range."
---

You can merge a git worktree branch to `main` with one command that rebases, scans for big files, runs the tests, pushes and reports, and that stops cleanly at the first failure. It is how agents land work on [vawe](https://github.com/Vandit1604/vawe), where several agents run at once, each in its own worktree on its own topic branch, and every branch is pushed straight to `main`. The command is `bin/vawe land`, added on 2026-10-11 in [82b68c3](https://github.com/Vandit1604/vawe/commit/82b68c3c7).

By hand, a clean landing was about six steps: fetch, rebase onto `origin/main`, check that no huge file went in, run the tests, push, and read the pre-push e2e result. Agents rarely failed one step. They failed the sequence: in our own notes, agents on worktrees pushed stale branches, forgot the tests, pushed big files, and lost ssh pushes that dropped while the pre-push hook ran the e2e suite. Turning that ritual into a verb follows the rule behind our [agent harness for the weaker model](/blog/weaker-model): one command per step, with the fix in the output.

## What the landing command needs

- A repository where branches land on `main` by rebase and push, with no merge commits.
- A pre-push hook that runs the slow suite (ours runs `vawe e2e`, about 5 seconds according to its help text).
- Test files that run with `node --test` (ours sit in `tests/lib` and `tests/hooks`).
- A size limit for files in history. Ours is 5 MB.

## Step 1: refuse a dirty tree, then rebase onto origin/main

The command refuses to start if a tracked file has uncommitted edits. Then it fetches `origin main` and rebases onto `origin/main`. On a conflict it names the conflicted files, aborts the rebase and leaves the branch as it was. It never continues half rebased, and it never resolves a conflict for the agent.

## Step 2: scan the pushed range for big files

It lists every object in `origin/main..HEAD` and refuses any file over 5 MB by name, even when a later commit deletes it. Scan the range and not the working tree: a push sends history, so a big file in an old commit still goes up.

## Step 3: run the tests

It runs every test file in `tests/lib` and `tests/hooks` with `node --test`, and a failure lists up to five failing tests.

## Step 4: push with an ssh keep-alive

It pushes `HEAD` to `main` with an ssh command that adds two options:

```
ssh -o ServerAliveInterval=20 -o ServerAliveCountMax=60
```

Together they tolerate an idle connection for about 20 minutes, which covers the time the pre-push hook spends on e2e. The command never passes `--no-verify`.

## Step 5: report the e2e line and the pushed range

It prints the e2e result line from the hook, or from the e2e report file when that report is for the same commit, then the pushed range with the commit count. After a good landing, the next-step line says to delete the merged branch and its worktree.

![What each stop of vawe land leaves behind.](/blog/land/diagram.webp)

## Check that it works

`tests/lib/land.test.mjs` feeds text to the pure helpers in `harness/lib/land.mjs`, and it also builds a real repository to check three paths end to end:

- a rebase conflict aborts and names the file;
- a 5 MB file is refused even when a later commit deletes it;
- a clean branch runs the tests, then prints the e2e line and the range.

In daily use, every stop ends in the shape every vawe verb uses: `land: FAILED at <step>: <reason>`, exit code 1.

## Failures you will see, and what to do

- A conflict. The message ends with "Run git rebase origin/main by hand, resolve it, then run bin/vawe land again". The branch is as it was before the command.
- A big file. The message names the file and ends with "Remove it from the history, then run bin/vawe land again".
- A stale checkout before you even start. [61dd23b](https://github.com/Vandit1604/vawe/commit/61dd23b33), two minutes before the landing verb, makes the stage hook print a line at the next prompt (the number is an example):

```
this checkout is 3 commits behind origin/main: new guides, verbs and
checks are missing; run git rebase origin/main (...)
```

That line only warns. The landing command is what stops a stale push.

- A jammed machine. On 2026-10-10 three e2e runs, four test suites and about fifteen renders ran at the same time because agents ran the full e2e suite on every branch. They jammed the render slots and nothing landed. The rule we keep since then: no e2e per branch, one e2e on merged `main` at the end.

## What is not measured

`vawe land` is new and we have not compared landing failures before and after it. If you add a command like this, count the pushes per week that needed a retry or a revert, and watch that number afterwards.

The five steps and the `LandError` stops live in `harness/dev/land.mjs`, and `guides/ENGINE-CHANGES.md` has a "Landing a change" section. Next, read [CLI design for AI agents](/blog/one-binary) for the shape every verb shares, or go back to [AI agent harness engineering](/blog/weaker-model) for the other parts of the harness. The [CLI reference](/docs/cli) lists all verbs.
