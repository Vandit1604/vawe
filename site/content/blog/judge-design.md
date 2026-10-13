---
title: "LLM as a judge for video: start at reject, keep a ledger"
description: "An LLM as a judge for generated video: ours starts from reject, caps scores against two reference films per dial and keeps a ledger. Silent films scored 0."
date: 2026-10-11
updated: 2026-10-13
section: measurement
tags: "llm as a judge, evaluation, ai agents, motion graphics, rubric"
keywords: "llm as a judge, llm judge rubric, llm judge reference comparison, judge ledger"
hero: /blog/judge-design/hero.webp
heroAlt: "Large number 0 with the caption sound score for a silent film, the judge that could not be argued with"
---

An LLM as a judge is a language model that scores another model's output against a rubric, in place of a person. In vawe it scores a rendered film on eight axes, and the hard part is fairness: our first version gave a deliberately silent film 0 on sound, so that film could never pass.

This page explains how the judge works now. It starts from reject, it answers side-by-side questions against reference films and turns the answers into score caps, it keeps a ledger of its own advice, and it skips any axis a film has declared out. It is also the hub for everything else we use to check a generated film; the list is at the end.

## What does the judge read and score?

On 30 September we added `judge --fresh` ([3577db81f](https://github.com/Vandit1604/vawe/commit/3577db81f)). It is a fresh, read-only agent. It reads a deterministic contact sheet, six change-peak frames and a loudness line, uses the Read tool only, takes about 30 seconds and writes one JSON object. The run lives in `harness/media/judge-fresh.mjs`.

It scores eight axes from 1 to 10:

| Axis | What it asks |
|---|---|
| hook | does the opening hold attention |
| motion | how things move |
| scenes | how the shots are built |
| type | the text treatment |
| colour | palette and light |
| sound | the mix and the cues |
| pace | the rhythm of cuts and holds |
| expensive | does it look made by a person with taste, or assembled from a template |

The prompt in `quality/gates/rubric.mjs` tells the judge to default to reject. An 8 is good work, a 10 is rare, and any score under 8 needs a fix. The judge must also name the moment it looked at, so a reader can check each score against the frame.

## Why did our first judge fail authors?

It failed in three separate ways.

It flipped. It asked for one value in one round and a different value in the next. The ledger commit describes one target asked back and forth over three rounds.

It punished choices. A film whose brief declared silence got 0 on sound. A film with no text lost points on type. Neither could ever pass, however good the rest was. The commit subjects carry the cases: the flower film "scored 0 and could never pass", and on type "three of four films lost it by construction".

It had no outside bar. It compared a film only with our own earlier films, so a habit shared by all of them looked normal. How we built that outside bar from 167 measured cuts is in [a motion graphics quality benchmark built from reference films](/blog/quality-bar).

## How does the judge compare a film with reference films?

The judge answers a side-by-side question against two reference films on four dials: text, colour, motion and craft. The premise, written in the code comment, is that a judge asked "which is better" agrees with people more often than one that scores alone. So the scores follow the answers.

If our film loses a dial to both references, the axes on that dial are capped at 6. If it loses to one, they are capped at 7. A missing answer counts as a loss, and a cap can only lower a score ([536a5ea29](https://github.com/Vandit1604/vawe/commit/536a5ea29), [4e4aa7ed6](https://github.com/Vandit1604/vawe/commit/4e4aa7ed6)). The mapping is fixed: type to the text dial, colour to colour, motion and pace to motion, scenes and "expensive" to craft. The code is `harness/lib/judge-bar.mjs`.

<figure>
<img src="/blog/judge-design/flow.webp" alt="Flow: a read-only judge reads a contact sheet, compares with two reference films per dial, applies score caps, writes a ledger, and the next judge marks each fix" width="720" height="390" loading="lazy">
<figcaption>One pass of the fresh judge, and where the ledger and fairness rules sit.</figcaption>
</figure>

## How does a ledger stop the judge changing its mind?

Each fix the judge asks for gets an id in a file next to the film. The next judge of that film has to mark each open fix as fixed, partly or still before it may add new ones. A fix that undoes an earlier one must say which one and why ([4246a6a53](https://github.com/Vandit1604/vawe/commit/4246a6a53)).

Each fix also names what it changes, its value now and the value it wants. When the asked value for one target moves back and forth over three rounds (85, then 40, then 85, for example), the report prints a stop line: keep this at its current value, the judge varies on this item ([30579d4af](https://github.com/Vandit1604/vawe/commit/30579d4af)). A fix marked stale is closed and counted ([c4bffa825](https://github.com/Vandit1604/vawe/commit/c4bffa825)). Measured deltas go into the rubric as settled facts, so the model judges taste and only confirms the lines we mark ([72e06339c](https://github.com/Vandit1604/vawe/commit/72e06339c)). The ledger code is `harness/lib/judge-ledger.mjs`.

Our digest records the working assumption that the judge varies by about 1 point per axis. After three rounds that flip one note, keep the value you measured.

## How can an author decline an axis?

By declaring it in the brief, in a form the harness can check. A brief that declares silence, with a Board sound row of "none" or a line "sound none", removes the sound axis ([12618c189](https://github.com/Vandit1604/vawe/commit/12618c189)). A brief that says "no text" removes the type axis and the text dial ([4639ecb5d](https://github.com/Vandit1604/vawe/commit/4639ecb5d)).

The declaration has to be checkable, a Board row or a line in the brief. A free-text excuse would become a loophole, and agents find loopholes fast: [18 of 36 films gamed one of our checks](/blog/loophole-audit).

## Why does the author never see the score?

A score shown to the author becomes a target. The printed report does not show one. The rubric lists each known trick, needs a cited second for each claim, and respects the film's own DESIGN.md ([cf73a1c7a](https://github.com/Vandit1604/vawe/commit/cf73a1c7a)). A PASS is never recorded by the agent that rendered the film either: the verdict step refuses it.

## How well does it work?

The fixed numbers are easy to state: caps at 6 and 7, and a stop line after three rounds of a back-and-forth target.

A trace review on 10 October gives two more. Across six weaker-model films the median first judged total was 45 (eight axes, each out of 10), and none of the six passed. One of those films scored totals of 62, 61 and 62 while we judged its look wrong. The cause was in the harness: the film type was unknown, so the side-by-side comparison was skipped, and the judge scored a film it never compared with its reference. That trace, and the fix that made every check default to the named reference, are in [can AI agents watch videos?](/blog/watch-a-film)

We have not measured how often the judge agrees with a person. The 1 point figure is an observed spread, not an agreement rate. We also have no before and after of judge scores for the fairness fixes, only the cases that led to them.

## When is an LLM judge the wrong tool?

When a script can measure the thing. A flash length, a luma split or a cut time is a number, and a model that eyeballs a contact sheet will get it wrong more often than a measuring tool that was itself tested. We push those into measured deltas and let the judge confirm them.

It is also the wrong tool when you dismiss what it says. Our judge reported a shrinking box three times and we called it a misread. It was a real render bug: [the Puppeteer default viewport](/blog/judge-defect) was resetting our render tabs.

## Other ways we check a generated film

The judge is one reader. These posts cover the rest of the checking in vawe:

- [Reward hacking in AI agents](/blog/loophole-audit): how 18 of 36 films turned one check green with a camera drift, and the fixture pages that now catch each trick.
- [Suppression comments must name a place and a number](/blog/waivers): the rule for waiving a check on purpose.
- [Test measurement tools against ground truth fixtures](/blog/see-truth): how we graded the tools that measure a film, and the error bar on every number.
- [Motion graphics quality benchmark](/blog/quality-bar): 167 cuts from 17 reference films, the ranges behind the judge's outside bar.
- [Acceptance criteria for AI agents](/blog/measured-brief): a scoreboard that sat at 7 green rows for ten drafts, and why.
- [Can AI agents watch videos?](/blog/watch-a-film): what an agent missed in a reference film, measured, and the six tools we gave it.

The harness these judges run in is described in [AI agent harness engineering](/blog/weaker-model), and the agent workflow is on [/ai-agents](/ai-agents).
