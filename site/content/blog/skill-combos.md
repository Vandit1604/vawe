---
title: "UI skills for AI agents: a blind test of six combos"
description: "Eleven single UI skills for AI agents all built cluttered web heroes. In a blind test of 6 skill combos on 2 frame kinds, only Warm editorial won both."
date: 2026-10-11
updated: 2026-10-13
section: taste
tags: "ui skills, ai agents, blind test, design systems, taste"
keywords: "ui skills for ai agents, frontend design skill, ai design skills, blind design test"
hero: /blog/skill-combos/hero.svg
heroAlt: "Table of six skill combos against two frame kinds. Warm editorial was picked for both. Soft light and Sparse geometry for the UI card only. Soft glass for the type frame only. Brutalist telemetry and Apple material for neither."
---

One skill combo out of six, Warm editorial, was picked in a blind test for both kinds of film frame we tried. Before that, eleven public UI skills tested one at a time all gave the same result: a decent but cluttered web hero. The unit that works is a set of skills plus your own composition rules. The full results are in [`5b64295c6`](https://github.com/Vandit1604/vawe/commit/5b64295c6).

This test fed the frame rules in our [motion design system](/blog/ten-looks).

## Why test UI skills on a film frame?

An agent that makes a film frame tends to build a web page: a nav, a pill, a small eyebrow label, a call-to-action button and generous section padding. A film frame has no use for any of that. A good frame carries about one line and two or three things, on a ground that is never flat, and the eye knows where to go. UI skills are written for web interfaces, so they pull the agent toward the web habit. We wanted to know which skills give a good frame anyway.

## Setup

Round 1, single skills. Eleven arms built the same frame: bolder, swiss-design, soft-skill, emil-design-eng, minimalist-skill, overdrive, frontend-design, landing-page, taste-skill, design-first-ui-prompting and gpt-tasteskill.

Round 2, combos. Six arms built the same two frames for a fictional product: a type frame ("Talk messy. Ship clean.") and a product UI summary card. One reviewer judged the frames blind, and we recorded the winners and each combo's reject list.

A combo is a named set of skills for four rungs: builder, type, colour and depth. The fifth rung, frame, is always vawe's own rules. Commit [`7a1f1be10`](https://github.com/Vandit1604/vawe/commit/7a1f1be10) added this ladder to the brief, to the DESIGN.md advice and to the stills judge question; its message says the frame rung rejects web-page patterns while the builder rung still builds the product UI. Commit [`39aaa85fb`](https://github.com/Vandit1604/vawe/commit/39aaa85fb) named the combos.

![The ladder. Builder, type, colour and depth take a fetched skill each. The frame rung uses our rules.](/blog/skill-combos/ladder.svg)

## Method: a skill may change the surface, never the composition

Every combo keeps the same reject list for web-page patterns (nav, CTA button, pill, eyebrow, section padding, cluttered hero), plus a list for that skill's own defaults. For example, Warm editorial ignores its builder skill's ban on gradients, because our ground rule asks for grain plus a soft light. The composition rules sit outside the skills, so a skill can change the look and never the layout.

## Results

Round 1: all eleven single skills looked decent, and all eleven were cluttered web heroes. No single skill was the answer.

Round 2:

| Combo | Type frame | Product UI card |
|---|---|---|
| Warm editorial | picked | picked |
| Soft light | not picked | picked |
| Sparse geometry | not picked | picked |
| Soft glass | picked | not picked |
| Brutalist telemetry | not picked | not picked |
| Apple material | not picked | not picked |

Warm editorial is a warm bone ground with grain and one soft warm light, 1 px hairlines, a light grotesque with hierarchy by opacity, one terracotta accent and a layered neutral card shadow.

Two results we did not expect:

- Dropping the builder rung hurt. An earlier run used a colour skill without a builder, and the product UI turned into placeholder bars. We keep the builder rung even when the colour skill is the star.
- One combo is untested, and the file says so. "Crisp product" shares its builder and colour rungs with Apple material, which was rejected, so we do not recommend it.

## What the numbers do not show

This was one reviewer and one run, with two frames for one fictional product. It tells us which sets to start from. It does not prove the rejected skills are bad. A combo proven for one kind of frame is only proven for that kind, and the doc says so in capitals; a blended score across kinds would have hidden that Soft glass wins on type and loses on product UI. An untested combo only becomes proven after a still-frame test and sign-off.

We used the same kind of blind choice for the move gallery. Commit [`b56f1349b`](https://github.com/Vandit1604/vawe/commit/b56f1349b) adds a featured bento above the gallery with five moves, chosen from a blind three-reviewer score of every clip.

## Reproduce it

The six combos, their rungs, rejects and evidence are in `prompts/skill-combos.md`. The brief template and the `DESIGN.md` advice carry the ladder, so a new film starts from it. To rerun the test, build the same two frames (type and product UI card) once per combo and judge them blind per frame kind.

The same ideas appear in our [prompting guide](/docs/prompting). For how vawe compares with another HTML video tool, see [vawe and HyperFrames](/hyperframes-alternatives). For the looks, curves and cuts that sit beside these combos, read the [motion design system](/blog/ten-looks) overview.
