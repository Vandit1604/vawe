---
title: "LLM as a judge: ours starts at reject and keeps a ledger"
description: "Our film judge scored a silent film zero for being silent. Here is how we made an LLM as a judge fair: reference caps, a fix ledger and declared exemptions."
date: 2026-10-11
section: measurement
tags: "llm as a judge, evaluation, ai agents, motion graphics, rubric"
keywords: "llm as a judge, llm judge rubric, ai evaluation fairness, reference comparison scoring, judge ledger"
hero: /blog/judge-design/hero.svg
heroAlt: "Large number 0 with the caption sound score for a silent film, the judge that could not be argued with"
---

Our first LLM as a judge scored a deliberately silent film 0 on sound, so that film could never pass. It also docked films with no text on the type axis, and it flipped its advice between rounds. Three of the four films it judged lost the type axis by construction. This post covers how we rebuilt the judge so that it is hard to argue with and hard to be unfair to: it starts from reject, compares with reference films, keeps a ledger of its own advice and skips axes a film has declared out.

## The problem: three ways a judge fails an author

On 30 September we added `judge --fresh`, a fresh read-only agent that scores a film from a deterministic contact sheet, six change-peak frames and a loudness line (`3577db81f`). It uses the Read tool only, takes about 30 seconds and writes one JSON object. It scores eight axes from 1 to 10: hook, motion, scenes, type, colour, sound, pace and "expensive" (does it look made by a person with taste or assembled from a template).

In use it failed authors in three separate ways.

It flipped. It asked for one value in one round and a different value in the next, and our ledger commit describes a target asked back and forth over three rounds.

It punished a choice. A film whose brief declared silence got a 0 on sound. A film with no text lost points on type. Neither film could ever pass, however good the rest.

It had no outside bar, because it compared a film only with our own earlier films.

## What we tried: make the judge start from reject

The prompt now tells the judge to default to reject: 8 is good work, 10 is rare, and any score under 8 needs a fix. The judge must name the moment it looked at, so a reader can check each score.

## What we built: an LLM as a judge in four parts

<figure>
<img src="/blog/judge-design/flow.svg" alt="Flow: a read-only judge reads a contact sheet, compares with two reference films per dial, applies score caps, writes a ledger, and the next judge marks each fix" width="720" height="390" loading="lazy">
<figcaption>One pass of the fresh judge, and where the ledger and fairness rules sit.</figcaption>
</figure>

### Two reference films per dial

The judge answers a side-by-side question against two reference films on four dials: text, colour, motion and craft. The premise, written in the code comment, is that a judge asked "which is better" agrees with people more often than one that scores alone, so the scores follow the answers. If our film loses a dial to both references, the axes on that dial are capped at 6. If it loses to one, they are capped at 7. A missing answer counts as a loss, and a cap only lowers a score (`536a5ea29`, `4e4aa7ed6`). Type maps to the text dial, colour to colour, motion and pace to motion, and scenes and "expensive" to craft. The measured bar those references come from is in [the quality bar post](/blog/quality-bar).

### A ledger

Each fix the judge asks for gets an id in a file next to the film. The next judge of that film has to mark each open fix as fixed, partly or still before it may add new ones, and a fix that undoes an earlier one must say which one and why (`4246a6a53`). Each fix also names what it changes, its value now and the value it wants. When the asked value for one target moves back and forth over three rounds, for example 85, then 40, then 85, the report prints a stop line: keep this at its current value, the judge varies on this item (`30579d4af`). A fix marked stale is closed and counted (`c4bffa825`). Measured deltas go into the rubric as settled facts, so the eye judges taste and only confirms the lines we mark (`72e06339c`).

### Declared exemptions

A brief that declares silence, with a Board sound row of "none" or a line "sound none", removes the sound axis (`12618c189`). A brief that says "no text" removes the type axis and the text dial (`4639ecb5d`). The commit subjects carry the cases: the flower film "scored 0 and could never pass", and "three of four films lost it by construction".

### No score back to the author

The printed report does not show the author a score as a target. The rubric lists each known trick and needs a cited second for a claim, and it respects the film's own DESIGN.md (`cf73a1c7a`). A PASS is also never recorded by the agent that rendered the film: the verdict step refuses it.

## What the numbers say, and what they do not

The caps are fixed numbers, 6 and 7. The ledger's stop line fires after three rounds of a back-and-forth target. Our digest records the working assumption that the judge varies about 1 point per axis, and says that after three rounds that flip one note, you should keep the value you measured.

A trace review on 10 October gives two more numbers. Across six weaker-model films the median first judged total was 45 (eight axes, each out of 10) and none of the six passed. One of those films scored totals of 62, 61 and 62 while we judged its look wrong. The cause was in the harness: the film type was unknown, so the side-by-side comparison was skipped, and the judge scored a film it could not compare with its reference.

We have not measured how often the judge agrees with a person. The 1 point figure is an observed spread, not an agreement rate. We also have no before and after of judge scores for the fairness fixes, only the cases that motivated them. A judge that cannot be argued with is a goal, and we have evidence only for the specific failures we closed.

## What we would tell someone building the same thing

Give the judge a way to decline an axis. If an author can declare "no sound" and the rubric believes it, you remove the whole class of unfair zeros. The declaration has to be checkable (a Board row, a line in the brief) or it becomes a loophole, which is the story in [our loophole audit](/blog/loophole-audit).

Ask for comparisons, then derive scores. A cap that follows a head-to-head answer is easier to defend than a number the judge made up.

Make reversals expensive. A ledger with ids turns "the judge changed its mind" into a record. Without one, you cannot tell a real disagreement from noise.

Check the judge's defects before you dismiss them. Ours reported a real render bug three times and we called it a misread; see [that story](/blog/judge-defect).

For the harness these agents run in, see [building for the weaker model](/blog/weaker-model). The agent workflow is on [/ai-agents](/ai-agents).

## In the code

- `harness/media/judge-fresh.mjs`: the fresh judge run
- `harness/lib/judge-bar.mjs`: the side-by-side answers and the score caps
- `harness/lib/judge-ledger.mjs`: the ledger and the stop line
- `quality/gates/rubric.mjs`: the eight axes and the default-to-reject prompt
- [`3577db81f`](https://github.com/Vandit1604/vawe/commit/3577db81f): `judge --fresh`, a read-only judge over a deterministic sheet
- [`4e4aa7ed6`](https://github.com/Vandit1604/vawe/commit/4e4aa7ed6): two reference films per dial, with caps
- [`30579d4af`](https://github.com/Vandit1604/vawe/commit/30579d4af): the ledger keeps what, now and want, with a stop line
- [`12618c189`](https://github.com/Vandit1604/vawe/commit/12618c189): a declared silent film is not scored on sound

The repo is [Vandit1604/vawe](https://github.com/Vandit1604/vawe).
