---
title: "Make an AI agent ask clarifying questions first"
description: "vawe new prints five questions and writes nothing until subject, message and show are answered. Why we stopped letting an AI agent guess a film brief."
date: 2026-10-01
section: agent-experience
tags: "ai agents, clarifying questions, cli design, brief"
keywords: "ai agent clarifying questions, agent asks before acting, cli prompts for agents, creative brief"
hero: /blog/new-asks/hero.svg
heroAlt: "Decision flow of vawe new: unanswered subject, message or show prints the questions and writes nothing; answers or the defaults flag write the page and brief."
---

The first command of a vawe film now asks what the film is about, and it refuses to write anything until it has the answer. If you run `vawe new demo --request "a 5 s sting"` you get five questions and no files. This post covers why we built that, how an AI agent can ask clarifying questions through a plain CLI, and what we still cannot prove about it.

## The problem: a brief written from guesses

Before 2026-10-01, `vawe new` took a name and a one-line request and wrote a complete starter, a page and a `brief.md`, with every open detail filled by a default. That looked helpful. The agent got something that rendered at once.

The cost showed up later. An agent that was never told the subject, the message or the look assumed them, then built a film around its own assumptions. The result was what we called a template film. The earliest decisions in a film (what is it, what must the viewer remember, what must they see working) shape every shot, word and colour after. A guess there is the most expensive guess in the whole process, and the default starter made it invisible.

## What we tried

We first handled it as a skill. On 2026-09-30 we added a `vawe-brief` skill ([19ce83e](https://github.com/Vandit1604/vawe/commit/19ce83e43)) that describes an interview: ask from a bank of questions, take defaults for the rest, write the brief in the right shape and name the first draft. A skill depends on the agent loading it, and the first command of the loop is the one place we can be sure every agent runs. So we moved the interview into the command.

## What we built

[14670012](https://github.com/Vandit1604/vawe/commit/14670012e) changed `vawe new` so that it prints the unanswered details and writes nothing. Run today it looks like this, and the exit code is 0, because a question is not an error:

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

Each question carries a reason and an example. The reason matters more than it seems: an agent that knows why `subject` comes first will write a better answer than one that sees a bare field name. Three details are required (subject, message, show). If they are all answered, the command goes ahead, and each optional gap becomes a stated guess in `brief.md`, marked `(guess: change me)`.

![The decision flow in vawe new: ask, answer, write.](/blog/new-asks/diagram.svg)

There are three ways to answer, and each has a use.

- `--answers <file>` takes a `key: value` file. An agent writes the file with its file tool and re-runs the command.
- `--detail key=value`, repeated, answers inline.
- `--questions-json` prints the questions as structured question calls (at most four each) for a client that has a question tool, so the human sees choices and not a wall of text. This arrived in [4c7636d](https://github.com/Vandit1604/vawe/commit/4c7636d1e).

A fourth path exists for runs with nobody to ask: `--defaults` guesses every open detail and prints which ones it guessed. We kept it because unattended jobs and tests need it. The guess is never hidden: each one is marked in the brief and named in the command output. A call that only asks is also not logged as a new film in the run log, so the draft counts stay honest (see [run logs](/blog/run-logs)).

The same week, [a9a821a](https://github.com/Vandit1604/vawe/commit/a9a821aa5) made the measured brief the default shape of the file `vawe new` writes. At that commit it carried Task, Look, Spec (with Shots, Words and Objects tables), Acceptance, Gates, Pitfalls and Deliver. The tables hold numbers an agent can check against later drafts, which is why the questions up front matter: the numbers are only as good as the facts under them. We wrote about that scoreboard in [the measured brief](/blog/measured-brief).

## The measured result

We do not have one. We did not run an A/B test on asking versus guessing, and we have not scored a set of films made each way. What we have is a design argument and a changed default: a bare `vawe new` can no longer write a brief from guesses unless the caller passes `--defaults`. If you want to cite this, cite it as a design decision, not as a result.

The thing we can report is the interface cost. The ask adds one round trip for an agent that does not know the answers, and none for one that passes `--answers` the first time. An agent that sees the questions can also decide to stop and ask its human instead of writing a file, which is the behaviour we wanted.

## What we would tell you if you build the same thing

Put the question in the tool the agent must run, not in a document it may skip. Return exit code 0 for a question, so it does not look like a failure and does not trigger a retry loop. Print a reason and an example with every question, because the agent copies the shape of the example. Keep a flag for unattended runs, and make it mark its guesses, so nobody mistakes a guess for a fact. And write down the limit of what you know: we have the mechanism and no score.

For the loop that follows the first command, read [a loop that names its own next command](/blog/stage-say). The [quickstart](/docs/quickstart) shows `vawe new` in context, and the [prompting guide](/docs/prompting) covers what to put in the request. The framework is on [GitHub](https://github.com/Vandit1604/vawe).

## In the code

- `harness/cli/new.mjs`: `newFilm`, the questions text and the `--defaults` path.
- `harness/lib/measured-brief.mjs`: the detail list, the `required` flags and the guess mark.
- `bin/vawe`: skips the run-log entry when `newFilm` only asked.
- Commits: [19ce83e](https://github.com/Vandit1604/vawe/commit/19ce83e43) (the brief interview skill), [1467001](https://github.com/Vandit1604/vawe/commit/14670012e) (ask before writing), [4c7636d](https://github.com/Vandit1604/vawe/commit/4c7636d1e) (questions as JSON), [a9a821a](https://github.com/Vandit1604/vawe/commit/a9a821aa5) (measured brief by default).
