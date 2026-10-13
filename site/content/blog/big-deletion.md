---
title: "How to delete dead code safely: a 205,163-line commit"
description: "How to remove dead code when it is a whole product direction: tag first, delete in one commit, drop the hooks, then leftovers. We removed 205,163 lines."
date: 2026-10-07
updated: 2026-10-13
section: architecture
tags: "delete dead code, refactoring, git, agents, architecture"
keywords: "how to remove dead code, delete legacy code, git restore tag, large deletion commit"
hero: /blog/big-deletion/hero.webp
heroAlt: "Bar chart of lines deleted by folder in one commit: core 34,139, films 33,733, tests 29,864, quality 29,733, harness 23,501, blocks 17,221."
---

Removing dead code is hardest when the dead code is a whole product direction: an engine, its tests, its hooks and the docs that teach it. You end with a tree that no longer mentions the old path, and a tag that can bring any file back in one command. We did it on 2026-09-30 for our JSON scene format. The main commit touched 1,415 files, added 65 lines and deleted 205,163.

Why bother, if the code is unused? Because our authors are agents, and agents read the tree. An agent that greps for "how do I add a layer" finds a layer system. An agent that opens `skills/` finds a skill for a format nobody should use. Every leftover file is an instruction, and a doc that says "do this" is hard to out-vote with another doc that says "do that". Its replacement is one web page per film, set out in the [HTML to video page contract](/blog/page-contract). The decision to drop the format came from a [blind A/B test of HTML against our JSON video format](/blog/html-over-json); this post is the cleanup.

## What you need before you start

- A decision that is final. Ours was made on 2026-09-29.
- A list of everything that only exists for the old path: engine, tools, gates, tests, skills, renderer, site pages.
- A list of the hooks and CI checks that test the old path, since they break first.
- Agreement that nothing gets "frozen" (Step 2 says why).

## Step 1: tag the last good state

Create a tag on the last commit that still has the old code. Ours is `json-final`. Any file comes back with:

```
git checkout json-final -- <path>
```

The tag turns "what if we need it?" into a cheap question, and it removes the strongest reason to keep the files.

## Step 2: do not freeze a copy

Our first move was to freeze, and it was a mistake. Commit `44be6195f` vendored a copy of the engine into `site/public` (+50,586 lines) so the site pages built on it kept working while we sorted out what to keep. The copy added code and removed no pull on agents. At 21:19 the same day we deleted it as well. A frozen copy is still code, and it still counts.

## Step 3: delete the core in one commit

[420928c23](https://github.com/Vandit1604/vawe/commit/420928c23) deleted the format, the engine, the tools, the gates, the tests, the skills and the Go renderer: 1,415 files changed, +65 and -205,163. Tracked files fell from 3,534 to 2,133.

The deleted lines were spread across the repo: `core/` lost 34,139, `films/` 33,733, `tests/` 29,864, `quality/` 29,733, `harness/` 23,501 and `blocks/` 17,221. A migration plan would have handled each folder one at a time. One deletion needed no plan per folder.

## Step 4: drop the guards in the same hour

Gates and hooks that check a deleted thing block every other commit. `000366b1a` dropped the JSON gates from the pre-commit and pre-push hooks (-107 lines), two minutes after the main commit.

## Step 5: remove scripts, routers and the site copy

[3913b499c](https://github.com/Vandit1604/vawe/commit/3913b499c) made the Makefile a set of thin aliases and deleted routers and dead scripts: 70 files, -2,481 lines. [170c70020](https://github.com/Vandit1604/vawe/commit/170c70020) removed the frozen engine copy, its data and the pages built on it: 1,792 files, -127,750 lines. `6506927c7` then removed the JSON-era films and every mention of the format.

![Timeline of the deletion commits on 2026-09-30 with the lines each one added or removed.](/blog/big-deletion/diagram.webp)

## Step 6: hunt the small leftovers

A week later we stripped the scene registries, the three.js layer builder and the theme colour markers (`70b79ef66`, `a5619a0d6`, and [d70663eaa](https://github.com/Vandit1604/vawe/commit/d70663eaa) on 2026-10-07, which removed the last theme markers and stage CSS). Each was small. Each was a place where the next agent could still stumble into the old path, because a registry with one stale entry reads like a live feature.

## Check that the deletion worked

Read the size of each commit straight from `git show --shortstat`:

| Commit | Files | Added | Removed |
|---|---|---|---|
| `420928c23` delete the format | 1,415 | 65 | 205,163 |
| `170c70020` remove the site engine copy | 1,792 | 511 | 127,750 |
| `3913b499c` thin Makefile, hooks, scripts | 70 | 158 | 2,481 |

Then grep for the old vocabulary. In our tree, layer types, JSON validators and the old make targets no longer turn up. We have no agent success number that isolates this commit, because other changes landed the same week, so we do not claim one.

The deletion also paid off somewhere we did not plan for: the end-to-end suite mostly tested the old format, and [the e2e run fell from about 175 s to 4.3 s](/blog/test-suite) once it was gone.

## Where this goes wrong

- The freeze trap. A vendored copy kept our site building for about 20 hours, then cost a second deletion of 127,750 lines.
- Hooks left behind. A pre-push hook that runs checks for a deleted format fails every unrelated push.
- Stale docs. If agents read your repo, the repo is your prompt, and dead code is dead prompt. Keeping the agent's reading short is its own discipline, covered in [how long AGENTS.md should be](/blog/read-load).
- A second copy of a rule that survives in a helper somewhere. [One owner per rule](/blog/one-owner) is how we find those.

What replaced the old format is one web page with a few agreed tags: the [page contract for rendering HTML to video](/blog/page-contract) describes all of it. If you are comparing frameworks, see [/remotion-alternatives](/remotion-alternatives).
