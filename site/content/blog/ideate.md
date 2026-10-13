---
title: "Verbalized sampling for agents: four ideas, one typicality score"
description: "Verbalized sampling for agents: a model writes the most typical idea first, so we ask for four ideas and a typicality score. No result yet, only a test plan."
date: 2026-10-11
section: taste
tags: "verbalized sampling, mode collapse, creative agents, ideation, motion graphics"
keywords: "verbalized sampling, mode collapse, ai creative ideas, agent ideation method, typicality"
hero: /blog/ideate/hero.svg
heroAlt: "Five steps of the ideate method: meaning, four ideas from four devices, a typicality number, a pick that is not the most typical, and a ledger row."
---

The typical idea for a beat that says "the AI is thinking" is a spinner, and a model with no guidance writes it first. A person who works on a food app would write something else: the send button grows into a wok and tosses the ingredients. That is the gap we tried to close with a written method for agents, built on verbalized sampling. We should say at the start: the method is shipped, the test that would show if it works is only planned, and we have no result.

## The problem: the most typical idea arrives first

A model with no guidance writes the most typical idea first. For one agent that is fine. For a framework that many agents use, it is a problem, because every film starts to look like the same film. This is mode collapse in the plain sense. You do not need a benchmark to see it. You only need to run the same brief a few times.

We could not fix this with a rule such as "be original". An agent will agree and then write the spinner. We needed a procedure that makes the typical idea visible as a typical idea, so the agent can choose around it.

## What we tried: verbalized sampling

The paper "Verbalized Sampling" (arXiv 2510.01171) gave us the lead. Its authors blame typicality bias in preference data for mode collapse. The fix they propose is to ask for several answers with stated probabilities instead of one. They report 1.6 to 2.1 times more diversity in creative writing, with a larger gain on stronger models. Those are the paper's numbers, in creative writing, and we have not measured them in motion graphics.

Our version is small. For each idea we ask for a number from 0 to 1 for how likely a model with no guidance would write that idea first. It is the agent's own estimate, not a measured fact, and the guide says so.

## What we built

`guides/IDEATE.md` is the one owner of the method. Commit `cbfd562d8` added it, with the Ideas ledger, six advice checks and a question for the judge and the critic. The method has five steps, run once per decision.

![The five steps: meaning, four ideas from four devices, typicality, pick, keep the ledger row.](/blog/ideate/hero.svg)

1. Write what the beat or cut must say, in one plain sentence, with no style words.
2. Write four ideas. Each uses a different device from a table of ten: metaphor, transformation, show the invisible, scale shift, personification, literalise, part for whole, reversal, collision and literal. Take every idea from the subject's own objects, materials and verbs.
3. Give each idea a typicality number from 0 to 1. Write all four numbers before the pick.
4. Pick one that is not the most typical, with one reason. If the plain `literal` idea is right, say why the story needs it.
5. Write the row in the `## Ideas` table of `brief.md`. Then build what you picked. The frame has to show it.

![Example: a spinner is the first idea. The send button that grows into a wok has typicality 0.15.](/blog/ideate/wok.svg)

The same method plans cuts. Commit `f12a9f516` added a transitions skill that runs it per cut: four ideas drawn from three of twelve handoff families, the less typical pick, a ledger. The twelve families are the subject of [Video transitions that carry the eye](/blog/transitions).

### The six checks

The ledger is data, so checks can read it. They only advise.

- `ideas-missing`: a world with no row.
- `ideas-literal`: every chosen device is `literal`.
- `ideas-variety`: one device picked for more than half the rows.
- `ideas-typical`: the pick is the most typical idea and has no reason.
- `ideas-thin`: fewer than four ideas, a repeated device or a missing number.
- `ideas-reworded`: four ideas that are one idea reworded, or one picked idea copied to another row.

The checks read the ledger, and they cannot see the film. That is a known hole. The fresh judge and the critic ask a different question for each beat: which idea is on screen? An idea in the ledger that the frames do not show is a finding.

## The measured result

There is none. The change is in the repo, and we have not run the test that would tell us whether it helps.

Our written test plan is a blind comparison. There would be 6 briefs and 2 arms (the main branch and the ideate branch), so 12 films. Three reviewers would judge each pair, which gives 18 reviews. The pass bar is that the ideate arm has higher distinctiveness in at least 4 of 6 pairs with a mean gain of at least 1.0 point, that its clarity is not more than 0.5 points lower, and that it wins at least 10 of the 18 overall picks. Six pairs is a signal, not a proof. The plan says that too.

We are publishing the plan and not a claim. If the method fails the bar, the plan lists what we would change for each kind of failure.

## What we would tell someone building the same thing

- Make the typical idea a written item. An agent cannot avoid what it has not named.
- Fix the number of options at four and the devices at different ones. Four ideas with four labels and one thought is the known trick, so compare the idea texts.
- Write the numbers before the pick. If you write the number after, it justifies the pick.
- Check that the plan shows up on screen. A ledger that the frames do not match is worse than no ledger.
- Plan the test before you ship the method, and keep the pass bar fixed before you see the data.

The method is in the open repo at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe). For the studio tools that sit around it, see [the prompting guide](/docs/prompting) and [the quality gates](/docs/quality-gates), and for another case where a plan and a film disagreed, see [Teaching an agent to watch a film](/blog/watch-a-film).

## In the code

- `guides/IDEATE.md`: the method and the devices table.
- `skills/vawe-transitions/SKILL.md`: the per-cut procedure.
- Commits: [`cbfd562d8`](https://github.com/Vandit1604/vawe/commit/cbfd562d8) the method, ledger and six checks, [`f12a9f516`](https://github.com/Vandit1604/vawe/commit/f12a9f516) transitions skill and handoff column.
