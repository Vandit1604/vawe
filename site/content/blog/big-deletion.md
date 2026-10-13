---
title: "How to delete dead code: our 205,163-line commit"
description: "The most useful commit of our month added 65 lines and deleted 205,163. How to delete dead code safely: the order we used, and the restore tag we kept."
date: 2026-10-07
section: architecture
tags: "delete dead code, refactoring, git, agents, architecture"
keywords: "delete dead code, remove legacy code, large deletion commit, git restore tag, codebase cleanup"
hero: /blog/big-deletion/hero.svg
heroAlt: "Bar chart of lines deleted by folder in one commit: core 34,139, films 33,733, tests 29,864, quality 29,733, harness 23,501, blocks 17,221."
---

The most useful commit we made in a month had 65 additions and 205,163 deletions. It touched 1,415 files. Nothing in it makes a film look better, and it still changed every film we made afterwards. This post is about how to delete dead code when the dead code is a whole product direction, and why leaving it in place costs more than it seems.

## The problem: the old path kept pulling agents back

In [the A/B test](/blog/html-over-json) HTML beat our JSON scene format, and we decided to drop JSON. Deciding is cheap. The JSON engine, its gates, its skills, its tests and its Go renderer were all still in the tree, and our agents read the tree.

An agent that greps for "how do I add a layer" finds a layer system. An agent that opens `skills/` finds a skill for a format we no longer wanted anyone to use. Every leftover file is an instruction. A doc that says "do this" is hard to out-vote with a different doc that says "do that", so we did not try. We removed the old path.

## What we tried

Our first step was to stop new work on JSON and mark it frozen. That is not the same as deleting it. For the site, we did exactly that for about 20 hours: commit `1c2d3e8fc` froze a vendored copy of the engine into `site/public` (+50,586 lines) so the pages built on it kept working while we sorted out what to keep. Freezing added a lot of code. It did not remove any pull on agents. At 21:19 the same day we deleted it as well.

The lesson from the freeze is plain: a frozen copy is still code, and it still counts.

## What we built: one big commit, then ordered follow-ups

We split the work by how safe each piece was to remove.

1. One commit for the core. `ef1da265d` deleted the format, the engine, the tools, the gates, the tests, the skills and the Go renderer. The result was 1,415 files changed, +65 and -205,163. Tracked files fell from 3,534 to 2,133.
2. A restore tag. The tag `json-final` marks the last state with the format. Any file comes back with `git checkout json-final -- <path>`. That gives a cheap answer to "what if we need it".
3. Hooks next. `5572e9736` dropped the JSON gates from the pre-commit and pre-push hooks, so commits no longer ran checks for a format that was gone (-107 lines).
4. Scripts and routers. `b4be7483b` made the Makefile a set of thin aliases and deleted routers and dead scripts: 70 files, -2,481 lines.
5. The site. `2d5c905fb` removed the frozen engine copy, its data and the pages built on it: 1,792 files, -127,750 lines. `bdbbb91a0` then removed the JSON-era films and every mention of the format.
6. The leftovers. A week later we stripped the scene registries, the three.js layer builder and the theme colour markers (`804f86f64`, `3253f53ef`, `708e79447`). These were small, but they were the bits an agent could still stumble into.

![Timeline of the deletion commits on 2026-09-30 with the lines each one added or removed.](/blog/big-deletion/diagram.svg)

Across the repo the deleted lines were not concentrated in one place. `core/` lost 34,139 lines, `films/` 33,733, `tests/` 29,864, `quality/` 29,733, `harness/` 23,501 and `blocks/` 17,221. A migration plan would have taken each of those one by one. A single deletion did not need a plan for each.

## The measured result

The numbers we can stand behind come straight from `git show --shortstat`:

| Commit | Files | Added | Removed |
|---|---|---|---|
| `ef1da265d` delete the format | 1,415 | 65 | 205,163 |
| `2d5c905fb` remove the site engine copy | 1,792 | 511 | 127,750 |
| `b4be7483b` thin Makefile, hooks, scripts | 70 | 158 | 2,481 |

We do not have a before-and-after number for agent success that isolates this commit. Other changes landed the same week, so we will not claim one. What we can say is what the agents can no longer find: layer types, JSON validators and the old make targets are gone from the tree.

## What we would tell you if you are about to delete a lot of code

- Tag before you delete. A restore tag turns "are we sure?" into a cheap question. It also removes the strongest reason to keep the files.
- Delete, do not freeze. A frozen copy kept our site building for about 20 hours and then cost us a second deletion of 127,750 lines.
- Remove the guards at the same time. Gates and hooks that check a deleted thing get in the way of every other commit. We dropped ours two minutes after the main commit.
- Do the small leftovers too. A registry with one stale entry is a trap for the next agent. They are worth a short follow-up each.
- If agents read your repo, your repo is your prompt. Dead code is dead prompt. For more on that idea see [Documentation as a budget](/blog/read-load) and [One owner per rule](/blog/one-owner).

The rest of the move to a plain web page is in [The whole film format fits in one screen](/blog/page-contract). The code is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe), and the current page format is in the [docs](/docs/the-page). If you are comparing frameworks, see [/remotion-alternatives](/remotion-alternatives).

## In the code

- `git checkout json-final -- <path>`: restore any deleted file.
- [`ef1da265d`](https://github.com/Vandit1604/vawe/commit/ef1da265d) (2026-09-30): the 1,415-file deletion.
- [`2d5c905fb`](https://github.com/Vandit1604/vawe/commit/2d5c905fb) (2026-09-30): the site loses its engine copy and the pages built on it.
- [`b4be7483b`](https://github.com/Vandit1604/vawe/commit/b4be7483b) (2026-09-30): thin Makefile aliases and fast hooks.
- [`708e79447`](https://github.com/Vandit1604/vawe/commit/708e79447) (2026-10-07): the last theme markers and stage CSS go.
