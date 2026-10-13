---
title: "One verb to land a git worktree branch on main"
description: "Landing a worktree branch took about six manual steps and agents skipped some. vawe land rebases, scans for big files, runs tests and pushes in one call."
date: 2026-10-11
section: agent-experience
tags: "git worktree, rebase, ai agents, merge workflow"
keywords: "git worktree, git worktree workflow, rebase and push, ai agent merge, big file scan"
hero: /blog/land/hero.svg
heroAlt: "The five steps of vawe land: rebase onto origin main, scan the range for files over 5 MB, run the tests, push with an ssh keep-alive, then print the e2e line and the pushed range."
---

Landing a branch used to be a list of about six manual steps. Now it is one command that prints what it did. This post is about landing a git worktree branch safely when the person running the steps is an agent, and about why we put the whole ritual in a verb instead of a paragraph in the docs.

## The problem: agents in worktrees skip steps

We run several agents at once, each in its own git worktree on its own topic branch. [vawe](https://github.com/Vandit1604/vawe) is pushed straight to `main`, so every branch ends the same way. By our count, a clean landing was six steps by hand: fetch, rebase onto `origin/main`, check that no huge file went in, run the tests, push, and read the result of the pre-push e2e run to see whether it passed.

The agents did not fail at any one of them. They failed at the sequence. In the words of our own notes, agents on worktrees pushed stale branches, forgot the tests, pushed big files, and lost ssh pushes that dropped. The last one has a plain cause: the pre-push hook runs the e2e suite, and that is slow enough for an idle connection to time out.

Each of these costs a retry, and a retry in a shared repository is a chance to make a second mistake. Another problem sat beside them. Agents were running the full e2e suite on every branch. In one wave three e2e runs, four test suites and about fifteen renders ran at the same time, jammed the render slots, and every agent waited while nothing landed. That is in our notes from 2026-10-10 and it is the origin of a rule we now keep: no e2e per branch, one e2e on merged `main` at the end.

## What we tried first

The stale-checkout part has a lighter tool. [b5ab6f2](https://github.com/Vandit1604/vawe/commit/b5ab6f217), two minutes before the landing verb, makes the stage hook say when a checkout is behind `origin/main` and name the command that updates it (the fetch is cached for 10 minutes). A line like this appears at the start of the next prompt (the number is an example):

```
this checkout is 3 commits behind origin/main: new guides, verbs and
checks are missing; run git rebase origin/main (...)
```

That tells an agent that it is stale. It does not stop an agent from pushing from a stale branch. The landing itself had to be a single call.

## What we built

`bin/vawe land` ([685fe28](https://github.com/Vandit1604/vawe/commit/685fe284b), 2026-10-11) is `harness/dev/land.mjs` with its pure helpers in `harness/lib/land.mjs`. It runs five steps in a fixed order, and it stops at the first one that fails.

1. Rebase. It refuses to start if a tracked file has uncommitted edits. Then it fetches `origin main` and rebases onto `origin/main`. On a conflict it names the conflicted files, aborts the rebase, and leaves the branch as it was. It never goes on half rebased.
2. Scan for big files. It lists every object in `origin/main..HEAD` and refuses any file over 5 MB by name, even if a later commit deletes it. The scan reads the whole range because the history is what a push sends.
3. Test. It runs every test file in `tests/lib` and `tests/hooks` with `node --test`. A failure lists up to five failing tests.
4. Push. It pushes `HEAD` to `main` with an ssh command that adds `ServerAliveInterval=20` and `ServerAliveCountMax=60`, which tolerates an idle connection for about 20 minutes. The pre-push hook runs the e2e suite (`vawe e2e`, about 5 seconds in the help text) during this step. We never use `--no-verify`.
5. Report. It prints the e2e result line from the hook, or from the e2e report file if the report is for the same commit, and then the pushed range with the commit count.

Every stop ends in the same shape as every other verb: `land: FAILED at <step>: <reason>`, exit code 1. The reasons are written to be acted on. A conflict message ends with "Run git rebase origin/main by hand, resolve it, then run bin/vawe land again". A big-file message ends with "Remove it from the history, then run bin/vawe land again". After a good landing the next-step line says to delete the merged branch and its worktree.

![What each stop of vawe land leaves behind.](/blog/land/diagram.svg)

The helper functions are pure, so the unit tests can feed them text. `tests/lib/land.test.mjs` also builds a real repository and checks three paths: a rebase conflict aborts and names the file, a 5 MB file refused even when a later commit deletes it, and a clean branch that runs the tests and then prints the e2e line and the range.

## The measured result

We have no number. `vawe land` is new, and we have not compared landing failures before and after. What we can show is that the main failure paths (conflict, big file, clean push) are tested end to end, and that the order is fixed. If you want a number from your own setup, count how many pushes a week needed a retry or a revert, and watch it after you add the verb.

## What we would tell you if you build the same thing

Make the ritual a program the moment two people (or an agent and a human) do it differently. Fix the order, and make each stop leave the repository as it was, so a failed landing never needs cleanup. Scan the range and not the tree, because a big file can hide in a commit that a later commit removes. Keep the hook that runs the slow suite in the push, and make your tool print its result, so the agent does not need to find it. Last, do not let the tool decide what the agent might want to override in a conflict. Ours stops and hands the conflict back.

If you use worktrees for several agents at once, [the stale-checkout line](/blog/stage-say) and [one binary, one verb per step](/blog/one-binary) show the other two pieces of the same design. The [CLI reference](/docs/cli) lists all the verbs. The repo is on [GitHub](https://github.com/Vandit1604/vawe).

## In the code

- `harness/dev/land.mjs`: the five steps and the `LandError` stops.
- `harness/lib/land.mjs`: conflict parsing, the big-blob scan, the e2e line and the ssh keep-alive.
- `tests/lib/land.test.mjs`: the unit tests and three repository tests.
- `guides/ENGINE-CHANGES.md`: the "Landing a change" section.
- Commits: [685fe28](https://github.com/Vandit1604/vawe/commit/685fe284b) (the verb), [b5ab6f2](https://github.com/Vandit1604/vawe/commit/b5ab6f217) (stale checkout line).
