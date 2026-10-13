---
title: "Agent hooks that print the next command: a trace study"
description: "Agent hooks that name the next command: our agent followed every line from brief to Board, then dev printed one line 13 times in a row. What we changed."
date: 2026-10-11
updated: 2026-10-13
section: agent-experience
tags: "agent hooks, ai agents, workflow, harness"
keywords: "agent hooks, ai agent hooks, next step hook, agent workflow"
hero: /blog/stage-say/hero.webp
heroAlt: "Flow of the stage-say hook: git status finds the changed page, the hook reads the brief, design and render files, picks the first unmet stage and prints one next command."
---

In a trace review on 2026-10-10, an agent building a film followed every "next command" line our tools printed, in order, from the brief to the Board. Then the same agent got the line "strip the cuts and read every one" after 13 of 13 draft renders, including the ones after it had already read 18 strips. This is the story of the agent hook that prints those lines, how we checked whether agents obey it, and the one line that turned into noise.

The hook is one piece of the [harness we build for the weaker model](/blog/weaker-model). A strong model can hold a ten-stage process in mind. A weaker one cannot, and that is where this started.

## Ten stages and a model that skips two

A [vawe](https://github.com/Vandit1604/vawe) film goes through about ten stages, listed in a table in AGENTS.md: brief, reference study, design system and kit, states, board, draft, motion pass, critique, fix and final. A weaker model forgets which stage comes next. It skips the brief and the Board and goes straight to a draft render, or it runs the motion pass before the states exist. The cost shows up late, in a render that looks generic, which is the most expensive place to find it.

More text in AGENTS.md did not help. The agent reads it once at the start, and the stage table is one of dozens of things in context. [How long AGENTS.md should be](/blog/read-load) covers what each added word costs.

## From a gate to a hook that only speaks

The flow from the JSON era had two hooks. `stage-gate` ran before file writes and checked the film against its stage; its source says it "used to deny unconditionally" and by then only printed the reason, unless an environment variable restored the old behaviour. `stage-say` named the next step. When we moved to HTML pages we removed the gate in the same merge ([fba98e1](https://github.com/Vandit1604/vawe/commit/fba98e191)), so `stage-say` became the only owner of the stage order. Two places that know the order will drift apart.

`harness/live/stage-say.mjs` runs on each prompt and works in four steps:

1. It asks `git status` which `films/*/page.html` changed or is new. A fresh checkout rewrites file times, so only a page git sees as changed counts as the film in progress ([c0a3933](https://github.com/Vandit1604/vawe/commit/c0a3933f1)). If no page changed in the last three hours it stays silent, so a framework session never sees it.
2. It reads the film's state from files: whether `brief.md` exists, how many frames the "Taken from" table names, whether `DESIGN.md` is newer than the page, whether a frames sheet or a draft exists, and whether the Board and Motion pass tables are filled.
3. It picks the first unmet stage. State lives in files, so the hook holds none of its own.
4. It prints one line with the reason, such as `bin/vawe frames films/<name>/page.html`.

`tests/hooks/stage-say.test.mjs` keeps that order under test.

The verbs carry the same text. `harness/cli/verbs.mjs` (where each verb's `next` function lives, including `devNext`) imports a `SAY` table from the hook and prints its line after each run, so a verb and the hook cannot name different steps ([1374501](https://github.com/Vandit1604/vawe/commit/137450108)). `frames`, `dev`, `strip` and `critique` all do this, and `ship` warns when the Board or the Motion pass is still empty. A later commit adds a line when the checkout is behind `origin/main`, with the command to update it and the fetch cached for 10 minutes ([61dd23b](https://github.com/Vandit1604/vawe/commit/61dd23b33)).

## What the 2026-10-10 transcripts showed

We read the transcripts line by line and checked whether the agent did what each next line said.

For the early stages the answer was yes. Every verb's `next:` was followed for brief, reference study, design, states and board, in order. The agent stopped only where its prompt told it to stop.

![Which next lines the agent followed in the 2026-10-10 review.](/blog/stage-say/diagram.webp)

Three things went wrong.

The hook turned out to be the weaker channel. It fires once per prompt, and a headless run with one prompt sees it between one and four times. The verb output arrives after every command, at the moment of the work, so we now treat the verbs as the main channel and the hook as the backstop.

Some lines asked for things the agent could not or did not do. After `strip` the line said to compare against the reference, and 0 of 6 `compare` calls carried the reference the brief named. After `critique` the line asked for a fresh-session judge; the agent skipped it and shipped two minutes later.

And one line never changed. After 13 of 13 `dev` results the agent read "strip the cuts and read every one", even after it had stripped every cut and read 18 strips. `dev` kept no state. An agent that sees the same advice 13 times learns to skip the line, which is worse than no line.

## The fix for the repeated line

[5b98da5](https://github.com/Vandit1604/vawe/commit/5b98da554) made `dev` ask the same state function as the hook. `nextStep` now checks whether `out/strip/<name>` changed since the last draft, and when it did, the line moves on to the next unmet stage. The same commit made critique, compare and judge default to the reference the brief names, which answers the 0 of 6 `compare` calls from the other side; [can AI agents watch videos](/blog/watch-a-film) tells that part.

## What we still do not know

We have not run a trace review since the fix, so we cannot say how often the agent now follows the line after `dev`, or whether a stateful line holds up over a 20-draft session. The early-stage result (every line followed, in order) comes from one review of one film's sessions. The lesson we draw so far is narrow: the line a tool prints after it runs reaches the agent, and the same line printed by a per-prompt hook mostly does not. The rest of the harness that grew from the same traces is listed in [AI agent harness engineering](/blog/weaker-model), and the verbs themselves are in the [CLI reference](/docs/cli).
