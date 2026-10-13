---
title: "Verbalized sampling prompts for agents: a test plan"
description: "Verbalized sampling asks a model for several ideas with a typicality score instead of one. Our agent version: four ideas, a ledger, six checks, no result."
date: 2026-10-11
updated: 2026-10-13
section: taste
tags: "verbalized sampling, mode collapse, creative agents, ideation, motion graphics"
keywords: "verbalized sampling, verbalized sampling prompt, mode collapse llm, agent ideation method"
hero: /blog/ideate/hero.svg
heroAlt: "Five steps of the ideate method: meaning, four ideas from four devices, a typicality number, a pick that is not the most typical, and a ledger row."
---

Verbalized sampling is a prompting method: instead of asking a model for one answer, you ask for several answers, each with a stated probability that a model would give it. The typical answer then shows up as the typical answer, and you can choose around it. We built an agent version for film ideas. The method is shipped; the test that would show whether it helps is only planned, and we have no result.

It is one of the craft methods in our [motion design system](/blog/ten-looks), where the other posts on looks, curves and cuts are listed.

## What problem does verbalized sampling address?

A model with no guidance writes the most typical idea first. For a beat that says "the AI is thinking", that idea is a spinner. Someone who works on a food app would write something else: the send button grows into a wok and tosses the ingredients.

For one agent, the typical idea is fine. For a framework many agents use, every film starts to look like the same film. This is mode collapse in the plain sense, and you can see it without a benchmark by running the same brief a few times. A rule such as "be original" does not help, because an agent will agree and then write the spinner.

## Where does the method come from?

The paper "Verbalized Sampling" (arXiv 2510.01171) blames typicality bias in preference data for mode collapse. It proposes asking for several answers with stated probabilities and reports 1.6 to 2.1 times more diversity in creative writing, with a larger gain on stronger models. Those are the paper's numbers, for creative writing. We have not measured them in motion graphics.

Our version is smaller. For each idea we ask for a number from 0 to 1: how likely a model with no guidance would write that idea first. It is the agent's own estimate, not a measured fact, and the guide says so.

## What does the agent do, step by step?

`guides/IDEATE.md` owns the method. Commit [`cbfd562d8`](https://github.com/Vandit1604/vawe/commit/cbfd562d8) added it, with the Ideas ledger, six advice checks and a question for the judge and the critic. It runs once per decision:

![The five steps: meaning, four ideas from four devices, typicality, pick, keep the ledger row.](/blog/ideate/hero.svg)

1. Write what the beat or cut must say, in one plain sentence, with no style words.
2. Write four ideas, each with a different device from a table of ten: metaphor, transformation, show the invisible, scale shift, personification, literalise, part for whole, reversal, collision and literal. Take every idea from the subject's own objects, materials and verbs.
3. Give each idea a typicality number from 0 to 1, and write all four before the pick. A number written after the pick only justifies it.
4. Pick one that is not the most typical, with one reason. If the plain `literal` idea is right, say why the story needs it.
5. Write the row in the `## Ideas` table of `brief.md`, then build what you picked. The frame has to show it.

![Example: a spinner is the first idea. The send button that grows into a wok has typicality 0.15.](/blog/ideate/wok.svg)

The same method plans cuts. Commit [`f12a9f516`](https://github.com/Vandit1604/vawe/commit/f12a9f516) added a transitions skill that runs it per cut: four ideas drawn from three of twelve handoff families, the less typical pick, a ledger row. The families are in [motion graphics transitions](/blog/transitions).

## How is the ledger checked?

The ledger is data, so checks can read it. They advise and never block:

| Check | Fires when |
|---|---|
| `ideas-missing` | a world has no row |
| `ideas-literal` | every chosen device is `literal` |
| `ideas-variety` | one device is picked for more than half the rows |
| `ideas-typical` | the pick is the most typical idea and has no reason |
| `ideas-thin` | fewer than four ideas, a repeated device or a missing number |
| `ideas-reworded` | four ideas that are one idea reworded, or a picked idea copied to another row |

`ideas-reworded` exists because four labels on one thought is the known way around the method; the check compares the idea texts, not only the labels.

The checks cannot see the film, which is a known hole. The fresh judge and the critic ask a different question for each beat: which idea is on screen? An idea in the ledger that the frames do not show is a finding. A ledger that the frames do not match is worse than no ledger.

## How would we know it works?

We wrote the test plan before shipping, with a fixed pass bar. It is a blind comparison: 6 briefs and 2 arms (the main branch and the ideate branch), so 12 films. Three reviewers judge each pair, which gives 18 reviews. The ideate arm passes if:

- its distinctiveness is higher in at least 4 of 6 pairs, with a mean gain of at least 1.0 point;
- its clarity is not more than 0.5 points lower;
- it wins at least 10 of the 18 overall picks.

Six pairs give a signal and not a proof, and the plan says so. If the method fails the bar, the plan lists what we would change for each kind of failure.

## Limits

We are publishing a method and a plan, not a result. The typicality number is a self-estimate. The paper's diversity gain is from another domain. Until the blind test runs, the honest claim is that the typical idea is now written down where an agent and a reviewer can see it.

The method is in the [vawe repo](https://github.com/Vandit1604/vawe) at `guides/IDEATE.md`, with the per-cut procedure in `skills/vawe-transitions/SKILL.md`. For the studio tools around it, see [the prompting guide](/docs/prompting) and [the quality gates](/docs/quality-gates). For another case where a plan and a film disagreed, read [can AI agents watch videos?](/blog/watch-a-film). The rest of the craft posts are linked from the [motion design system](/blog/ten-looks) overview.
