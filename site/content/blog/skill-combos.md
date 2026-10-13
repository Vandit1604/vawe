---
title: "Blind test of UI skills for AI agents: one combo won"
description: "UI skills for AI agents, tested blind: 11 single skills gave cluttered web heroes. Of 6 combos, one won both frame kinds and two were rejected for both."
date: 2026-10-11
section: taste
tags: "ui skills, ai agents, blind test, design systems, taste"
keywords: "ui skills for ai agents, ai design skills, blind design test, agent frontend design, skill combos"
hero: /blog/skill-combos/hero.svg
heroAlt: "Table of six skill combos against two frame kinds. Warm editorial was picked for both. Soft light and Sparse geometry for the UI card only. Soft glass for the type frame only. Brutalist telemetry and Apple material for neither."
---

We tested eleven public UI skills, one at a time, on the same video frame. All eleven gave us a decent but cluttered web hero. Then we tested six combinations of skills on two kinds of frame. One combo was picked for both kinds, two were picked for one kind each, and two were picked for neither. This post is about that test, and about why UI skills for AI agents work as a set and rarely as a single skill.

## The problem: a web hero is the wrong shape for a film frame

An agent that makes a film frame has a habit: it builds a web page. There is a nav, a pill, a small eyebrow label, a call-to-action button and generous section padding. A film frame has no use for any of that. A good frame carries about one line and two or three things, on a ground that is never flat, and the eye knows where to go.

UI skills are written for web interfaces, so they pull the agent toward the habit. We wanted to know which set of skills gives a good frame anyway.

## What we tried

First, the single-skill round. Eleven arms (bolder, swiss-design, soft-skill, emil-design-eng, minimalist-skill, overdrive, frontend-design, landing-page, taste-skill, design-first-ui-prompting, gpt-tasteskill) each built the same frame. The result in our notes: all eleven looked decent, and all eleven were cluttered web heroes. No single skill was the answer.

Second, the combo round. Six arms built the same two frames for a fictional product: a type frame ("Talk messy. Ship clean.") and a product UI summary card. A single reviewer judged the frames blind. We recorded the winners and the reject list for each combo.

## UI skills for AI agents: a ladder with five rungs

A combo is a named set of skills for four rungs: builder, type, colour and depth. The fifth rung, frame, is always vawe's own rules. Commit `edc7f6e0e` added the ladder to the brief, to the DESIGN.md advice and to the stills judge question. Its message says the frame rung rejects web-page patterns while the builder rung still builds the product UI.

![The ladder. Builder, type, colour and depth take a fetched skill each. The frame rung uses our rules.](/blog/skill-combos/ladder.svg)

The rule that took the most thought is the last one: a skill changes the surface, not the composition. Every combo keeps the same reject list for web-page patterns (nav, CTA button, pill, eyebrow, section padding, cluttered hero), plus a per-combo list for that skill's own defaults. For example, our warm editorial combo ignores its builder skill's ban on gradients, because our ground rule asks for grain plus a soft light.

## The result

| Combo | Type frame | Product UI card |
|---|---|---|
| Warm editorial | picked | picked |
| Soft light | not picked | picked |
| Sparse geometry | not picked | picked |
| Soft glass | picked | not picked |
| Brutalist telemetry | not picked | not picked |
| Apple material | not picked | not picked |

Warm editorial was the only combo picked for both frame kinds. Its look is a warm bone ground with grain and one soft warm light, 1 px hairlines, a light grotesque with hierarchy by opacity, one terracotta accent and a layered neutral card shadow. A combo proven for one kind of frame is only proven for that kind, and the doc says so in capitals.

Two details came out of the test that we did not expect.

- Dropping the builder rung hurt. One earlier run used a colour skill without a builder, and the product UI turned into placeholder bars. We keep the builder rung even when the colour skill is the star.
- One combo is still untested, and we say so in the file. "Crisp product" shares its builder and colour rungs with Apple material, which was rejected, so we do not recommend it.

We made the same kind of blind choice for the move gallery. Commit `3587ae495` adds a featured bento above the gallery with five moves, chosen from a blind three-reviewer score of every clip.

Remember the limits. This was one reviewer and one test run, with two frames for one fictional product. It tells us which sets to start from. It does not prove that the losers are bad skills.

## What we would tell someone building the same thing

- Test sets of skills. Single skills each gave a web hero, so the unit that matters is the combination plus your own frame rules.
- Judge blind and judge per frame kind. A combo that wins on type can lose on product UI, and one blended score hides it.
- Write down the rejects. Each combo in our file lists what to ignore in each skill. Without the list the next agent re-imports the default and calls it house style.
- Keep a status on every combo: proven for which kind, rejected, untested. An untested combo only becomes proven after a still-frame test and sign-off.
- Put the composition rules outside the skills, so a skill can change the look and never the layout.

If you build the frames with agents, the same ideas appear in our [prompting guide](/docs/prompting) and in [One design system, ten looks, 70 clips](/blog/ten-looks). For the base framework, see [how vawe compares with HyperFrames](/hyperframes-alternatives). The code and docs are in the repo at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `prompts/skill-combos.md`: the six combos, rungs, rejects and evidence.
- The brief template and `DESIGN.md` advice carry the ladder.
- Commits: [`edc7f6e0e`](https://github.com/Vandit1604/vawe/commit/edc7f6e0e) the ladder, [`8fcb51ee2`](https://github.com/Vandit1604/vawe/commit/8fcb51ee2) named combos, [`bce59c817`](https://github.com/Vandit1604/vawe/commit/bce59c817) blind test results, [`3587ae495`](https://github.com/Vandit1604/vawe/commit/3587ae495) featured moves.
