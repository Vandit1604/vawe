---
title: "An agent hook that names the next command"
description: "A hook reads the film in progress and prints the next command. The agent followed it from brief to board, until dev printed one line 13 times in a row."
date: 2026-10-11
section: agent-experience
tags: "agent hooks, ai agents, workflow, harness"
keywords: "ai agent hooks, agent workflow, next step hook, ai agent harness, stage hook"
hero: /blog/stage-say/hero.svg
heroAlt: "Flow of the stage-say hook: git status finds the changed page, the hook reads the brief, design and render files, picks the first unmet stage and prints one next command."
---

The best documentation for a long agent task is the line the tool prints at the moment the agent needs it. We built an AI agent hook that does one thing: after each prompt it reads the film the agent is working on and names the next command. In a trace review the agent followed every one of those lines from the brief to the Board. Then we found that one verb had printed the same line 13 times in a row.

## The problem: ten stages, and the agent skips two

A [vawe](https://github.com/Vandit1604/vawe) film goes through about ten stages. The table in AGENTS.md lists them: brief, reference study, design system and kit, states, board, draft, motion pass, critique, fix, final. A strong agent can hold that table in mind. A weaker one forgets which stage comes next, skips the brief and the Board and goes straight to a draft render, or does the motion pass before the states exist. The cost of a skipped stage shows up late, in a render that looks generic, which is the most expensive place to find it.

Adding more text to AGENTS.md did not help. The agent reads it once at the start and the stage table is one of dozens of things in context (see [the read-load post](/blog/read-load) for what that costs).

## What we tried first

The JSON-era flow had two hooks. `stage-gate` ran before file writes and checked the film against its stage, and `stage-say` named the next step. The gate had already been turned from a refusal into advice: its source says it "used to deny unconditionally" and now allows the write and prints the reason, unless an environment variable restores the old behaviour. When we moved to HTML pages we removed the gate in the same merge ([75b2c57](https://github.com/Vandit1604/vawe/commit/75b2c5731)) and left `stage-say` as the only owner of the stage order. A second place that knew the order would have drifted from the first.

## What we built

`harness/live/stage-say.mjs` is a hook that runs on each prompt. It works in four steps.

1. It asks `git status` which `films/*/page.html` changed or is new. A fresh checkout rewrites file times, so only a page git sees as changed counts as the film in progress ([6afb94a](https://github.com/Vandit1604/vawe/commit/6afb94a17)). If no page changed in the last three hours the hook stays silent, so a framework session sees none of it.
2. It reads the state of the film from files: whether `brief.md` exists, how many frames the "Taken from" table names, whether `DESIGN.md` is newer than the page, whether a frames sheet or a draft exists, whether the Board and Motion pass tables are filled.
3. It returns the first unmet stage and the command for it. State lives in files, so the hook holds none of its own.
4. It prints one line, such as `bin/vawe frames films/<name>/page.html`, with the reason.

The same text reaches the agent through a second channel. The verbs in `harness/cli/verbs.mjs` import a `SAY` table from the hook and print its line after they run, so a verb and the hook cannot name different steps ([39a3932](https://github.com/Vandit1604/vawe/commit/39a3932f3)). `frames`, `dev`, `strip` and `critique` all do this, and `ship` warns when the Board or the Motion pass is still empty. Later commits added a line that says when the checkout is behind `origin/main` and names the command to update it, with the fetch cached for 10 minutes ([b5ab6f2](https://github.com/Vandit1604/vawe/commit/b5ab6f217)).

## What the traces showed

We read agent transcripts on 2026-10-10 and checked, line by line, whether the agent did what the next line said.

For the early stages it worked: every verb's `next:` was followed for brief, reference study, design, states and board, in order. The agent stopped only where its prompt told it to stop.

Three things did not work.

- The hook is the weaker channel. It fires once per prompt, so a headless run that takes one prompt sees it between one and four times. The verb output, printed after each command, is the one that reaches the agent at the right moment. We now treat the verbs as the primary channel and the hook as the backstop.
- Some lines were not satisfiable. After `strip` the line said to compare against the reference, and 0 of 6 `compare` calls carried the reference named in the brief. After `critique` the line asked for a fresh-session judge, which the agent skipped before shipping two minutes later.
- One line never changed. After every `dev` result (13 of 13) the agent got "strip the cuts and read every one", even after it had stripped all the cuts and read 18 strips. The `dev` verb kept no state. An agent that sees the same advice 13 times learns to ignore the line, which is a worse outcome than having no line.

![Which next lines the agent followed in the 2026-10-10 review.](/blog/stage-say/diagram.svg)

The fix for the third one is in [b5df5ed](https://github.com/Vandit1604/vawe/commit/b5df5ed98): `dev` now asks the same state function as the hook, and `nextStep` checks whether `out/strip/<name>` changed since the last draft. If it did, the line moves on. We have not yet re-run a trace review that measures the effect, so we cannot give you an after-count.

## What we would tell you if you build the same thing

Derive the stage from files, not from a counter that can drift. Keep one owner of the order, and have every other place import its text. Print the line from the tool, because the tool runs at the moment of the work, and use the hook as a safety net. Make the line stateful, since a repeated line is noise. And read transcripts to check whether the line was followed, as we did: the answer is partly yes and partly no for every hook we have written.

If you want the commands themselves, the [CLI reference](/docs/cli) lists the verbs. For why the verbs have one shape and a final `ok` or `FAILED` line, read [one binary, one verb per step](/blog/one-binary). The [quickstart](/docs/quickstart) walks the loop from the first command.

## In the code

- `harness/live/stage-say.mjs`: the hook, the `SAY` table and `nextStep`.
- `harness/cli/verbs.mjs`: each verb's `next` function, including `devNext`.
- `tests/hooks/stage-say.test.mjs`: the stage order under test.
- Commits: [75b2c57](https://github.com/Vandit1604/vawe/commit/75b2c5731) (stage-gate removed), [6afb94a](https://github.com/Vandit1604/vawe/commit/6afb94a17) (only a changed page counts), [39a3932](https://github.com/Vandit1604/vawe/commit/39a3932f3) (verbs print the next line), [b5df5ed](https://github.com/Vandit1604/vawe/commit/b5df5ed98) (dev names the next unmet step).
