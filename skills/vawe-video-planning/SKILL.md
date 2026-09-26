---
name: vawe-video-planning
description: "PLAN BEFORE AUTHORING any video in this repo: collect the brief, derive a per-brand style (from a brand site, OR from a manufactured taste anchor when there is no site), storyboard, THEN write JSON. Use whenever the user asks to 'make a video' and the goal/platform/duration/tone aren't pinned down."
stage: plan
effort: medium
---

# Video planning: brief first, JSON second

Authoring without a brief produces the same generic video for everyone. This skill front-loads the
decisions that change the output, then derives a per-brand style so no two brands ship the same look.

## The goal: decide before you author, not while authoring

Planning and generating are two phases. Decide the spec first; execution then transcribes it
precisely, not exploration. "Trying things" in the JSON means the plan was never really finished: go
back and finish it.

1. **Study + brief**: WITH a brand site -> study it, derive the design language
   (`reference/site-study.md`). WITHOUT one -> manufacture the four things a site gives: a taste
   anchor `profile`, real assets, a story spine, real copy (`reference/no-site.md`). Either way you
   arrive at a filled brief; a no-site video is not exempt from having a design language, it just
   synthesizes one instead of reading it.
2. **Storyboard**: the beat table + per-beat archetype/copy/motion (`reference/storyboard.md`).
3. **The spec table**: the full spec, theme colours/fonts, per-beat copy (exact words), layout
   archetype, coordinates band, image/treatment per beat, motion personality, cuts/stings, CTA
   (`reference/spec-table.md`). Change only what a new fact changes.
4. **Author and verify**: write the JSON to match the spec table exactly, then run the verify ladder
   (`reference/verify.md`). No new creative decisions here; if one is needed, it means the spec table
   had a gap, so amend it there, don't improvise in the JSON.

The plan leads straight into design and authoring: nothing here waits on a separate sign-off step.

## Before you build

Six checks belong before any storyboard: the angle, the one object, a real source for every claim,
the eye path, the rhythm, motion in plain words. The full table with each check's tell is
`reference/storyboard.md`; read it before drafting a beat.

## What to read, and when

| Situation | Read |
|---|---|
| A brand site exists | `reference/site-study.md` |
| No brand site | `reference/no-site.md` |
| Writing the beat table, choreography, or the value gate | `reference/storyboard.md` |
| Freezing the spec before authoring | `reference/spec-table.md` |
| Authoring the JSON, then verifying the render | `reference/verify.md` |
| Film under ~15s, one continuous subject | [`vawe-continuous-action`](../vawe-continuous-action/SKILL.md) instead of the beat table |

There is ONE module: **scene** (the open canvas, layers/cuts/stings/bg windows/camera;
`films/scene/schema.json` is the contract). No templates: compose every video from the primitive
vocabulary in `engine-doctrine/PRIMITIVES.md`, from recipes (`make arsenal Q="…"`), never from a
copied JSON structure.

## Gotchas

- Dominance is decided by looking, never by a field: a mislabeled dominance ships a dark video for a
  white site. `engine-doctrine/MISTAKES.md #1`.
- A site study can read every heading and still throw the words away if the brief-building script
  drops the collapsed heading text. `engine-doctrine/MISTAKES.md #358`.
- An unauthored theme silently inherits another brand's default colours; check that `bg` is actually
  derived from THIS theme, not the engine default. `engine-doctrine/MISTAKES.md #366`.
- `theme-remix` can emit an incomplete `bg` block (light pair present, dark pair missing) and crash a
  dark-preset render; verify both pairs exist before shipping a remixed theme. `engine-doctrine/MISTAKES.md #152`.
