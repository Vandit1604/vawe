---
title: "Make an AI agent ask clarifying questions before it acts"
description: "How to make an AI agent ask clarifying questions before it acts: our CLI prints five questions, exits 0 and writes nothing until three are answered."
date: 2026-10-01
updated: 2026-10-13
section: agent-experience
tags: "ai agents, clarifying questions, cli design, brief"
keywords: "ai agent clarifying questions, agent asks before acting, cli prompts for agents, creative brief"
hero: /blog/new-asks/hero.svg
heroAlt: "Decision flow of vawe new: unanswered subject, message or show prints the questions and writes nothing; answers or the defaults flag write the page and brief."
---

To make an AI agent ask clarifying questions before it starts work, you need nothing but a plain command-line tool. The end state: the first command of the task prints the open questions with a reason and an example for each, writes no files, and exits 0. The agent answers in a file or asks its human, runs the command again, and only then gets a starter. We built this into `vawe new`, the first command of every [vawe](https://github.com/Vandit1604/vawe) film, on 2026-10-01.

Before that date `vawe new` filled every open detail with a default and wrote a page and a `brief.md` at once. The agent got something that rendered, then built a whole film around a subject, message and look it had guessed. Those first decisions shape every shot after them, so a guess there is the most expensive one in the process. We called the result a template film.

Asking first is one rule of the [AI agent harness we design for the weaker model](/blog/weaker-model): put the check in the command the agent must run.

## What you need for an ask-first command

- One command that every session runs first. A skill or a doc page will not do: we tried a `vawe-brief` skill on 2026-09-30 ([19ce83e](https://github.com/Vandit1604/vawe/commit/19ce83e43)), and a skill only works if the agent loads it.
- A list of the details that change the output most, in order, with a flag for which ones are required.
- A file format the agent can write with its file tool, such as `key: value` lines.

## Step 1: print the questions and write nothing

[14670012](https://github.com/Vandit1604/vawe/commit/14670012e) changed `vawe new` to stop when a required detail is missing. `vawe new demo --request "a 5 s sting"` now prints this and creates no files:

```
vawe new: 5 facts needed before a good brief

Nothing is written yet. Answer these, most film-changing first.
Skip an optional one to take a guess.

1. subject: What is the product or subject, and who is it for?
   why: every shot, word and colour follows from the real thing;
        a thin subject gives a generic film
   example: Argus, a log search tool for on-call engineers at small SaaS teams
2. message: What is the one message, and what is the one big moment?
3. show: What must the viewer see working: the product UI, a number or a process?
4. assets (optional): Which real assets exist: captures, logo, photos?
5. ending (optional): How does it end: the brand, a call to action, a URL?
```

Order the questions by how much the answer changes the result. Ours put the subject first because everything follows from it.

## Step 2: give every question a reason and an example

The `why` and `example` lines do more work than they appear to. An agent that knows why the subject comes first writes a better answer than one that sees a bare field name, and it copies the shape of the example. Keep both to one or two lines.

## Step 3: exit 0, because a question is not an error

A non-zero exit code makes the call look like a failure, and an agent may retry it in a loop or report it as broken. `vawe new` exits 0 when it only asked. The run log skips that call too, so an ask does not count as a new film and the draft counts stay honest; [AI agent observability](/blog/run-logs) explains the log.

## Step 4: accept answers in the forms the agent can produce

`vawe new` takes three:

```
vawe new demo --answers answers.txt          # key: value lines, written with the file tool
vawe new demo --detail subject="..." --detail message="..."
vawe new demo --questions-json               # structured question calls, at most four each
```

`--questions-json` arrived in [4c7636d](https://github.com/Vandit1604/vawe/commit/4c7636d1e). It is for clients with a question tool, so the human sees choices and not a wall of text.

## Step 5: keep a flag for runs with nobody to ask

Tests and unattended jobs need a way through. `--defaults` guesses every open detail and prints which ones it guessed. When the three required details (subject, message, show) are answered and an optional one is not, the command goes ahead and writes the gap into `brief.md` as a stated guess marked `(guess: change me)`. A guess is never hidden.

![The decision flow in vawe new: ask, answer, write.](/blog/new-asks/diagram.svg)

## Check that it works

- Run the command with only a request. You should see the questions, no new files, and exit code 0.
- Run it with `--answers` covering the required details. You should get the starter and a brief whose optional gaps carry the guess mark.
- Run it with `--defaults`. The output should name every guessed detail.

## Where an ask-first command goes wrong

- The question lives in a doc. The agent skips the doc. Put it in the command.
- The ask exits non-zero. The agent treats it as a crash and retries.
- The defaults path guesses silently. Nobody can then tell a guess from a fact in the brief.
- The answers feed nothing measurable. The same week, [a9a821a](https://github.com/Vandit1604/vawe/commit/a9a821aa5) made the measured brief the default file: Task, Look, Spec (with Shots, Words and Objects tables), Acceptance, Gates, Pitfalls and Deliver. Its numbers are only as good as the facts under them, and [acceptance criteria for AI agents](/blog/measured-brief) shows how that scoreboard can still go wrong.

## What we cannot prove yet

We did not A/B test asking against guessing, and we have not scored films made each way. This is a design decision with a changed default: a bare `vawe new` can no longer write a brief from guesses without `--defaults`. The cost is one extra round trip for an agent that does not know the answers, and none for one that passes `--answers` the first time.

The code is in `harness/cli/new.mjs` (the questions and the `--defaults` path) and `harness/lib/measured-brief.mjs` (the detail list, the `required` flags and the guess mark); `bin/vawe` skips the log entry when `newFilm` only asked. Next, read [agent hooks that print the next command](/blog/stage-say) for the loop after the first command, or [AI agent harness engineering](/blog/weaker-model) for the full set of harness rules. The [quickstart](/docs/quickstart) and the [prompting guide](/docs/prompting) show `vawe new` from the user's side.
