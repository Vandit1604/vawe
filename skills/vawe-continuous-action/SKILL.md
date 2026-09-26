---
name: vawe-continuous-action
description: "Turns a one-line brief into a shootable plan for a short film built as one continuous action: the device to pick, from `engine-doctrine/CRAFT/FILM-STRUCTURE.md`'s ~18 devices, when the film has a single subject and a single process. Load once this device is picked, for a launch/promo/teaser under ~15s; emits a storyboard that `make storyboard-check` and `make intent` consume."
stage: plan
effort: medium
---

# vawe-continuous-action: plan the film as one action

**The contract:** name one object, write its state at every beat, and treat every cut as that
object changing state, never a jump. Work through `reference/object-and-checks.md` in the storyboard,
before writing any JSON.

The engine can build anything. What it cannot do is plan something great from a blank brief. Handed
"make a 5s launch film for an AI image tool", an agent writes a competent slideshow: hook card,
feature card, logo card. Every gate passes. Nobody watches it twice.

The reference in this repo (`higgsfield.mp4`, first 5 seconds, recreated in
`films/scene/higgsfield-recreation.json`) is not a sequence of beats. **It is one continuous action.**
You type a prompt. You press generate. The generate button itself becomes the loading dot. One object
is on screen from the first frame to the last and every cut is that object changing state.

**This is the default shape under ~15s, not the beat rotation.** `type-spines.mjs` exports
`CONTINUOUS_ACTION_MAX_S` (15s). Under that length, write the storyboard around ONE object
(`id:"spine"`), a hand-keyed track, zero `transitions`, and `object`/`object_t0`/`object_states`/
`object_last` frontmatter filled from the type's own spine (`harness/author/type-spines.mjs`'s
`continuousObject`, when the type declares one). Two types (`talking-head`, `recreation`) opt out at
every length: their content is not held by one transforming prop.

## Before you use this skill: it is one device, not the law

This skill was written from one reference, then treated as a floor for every short film. It is not.
[`FILM-STRUCTURE.md`](../../engine-doctrine/CRAFT/FILM-STRUCTURE.md) catalogues about eighteen devices
across four registers (spatial, verbal/aural, temporal, conceptual); this device is one spatial entry.
Read that catalogue first and pick. Murch's Rule of Six ranks this register last of six, at 4%, and
says to sacrifice your way up from the bottom.

**Use it when the content is genuinely continuous:** one subject, one process, a product film, a
demo where the UI is the subject. **Do not use it for** a manifesto, a vignette anthology, a
comparison whose meaning lives in the junction, or a metric-cut list film where every card is a peer.
Forcing one prop across those lies about the content.

## The one law (of this device)

> **One object. One action. Every cut is a state change of that object.**

A beat rotation gives you independent chapters, and that independence is exactly why a from-scratch
plan comes out as a slideshow. Carry a second thread from the catalogue anyway: a single thread has to
be literal and obvious to work, which is how a film ends up as a rectangle that resizes four times.

## What to read next

| Step | Read |
|---|---|
| Naming the object and running the seven anti-slop tests, before any JSON | `reference/object-and-checks.md` |
| Cuts as transforms, diegetic motion, the hook, showing the product | `reference/cuts-and-motion.md` |
| The measured second-by-second budget, plus two worked examples | `reference/budget-and-examples.md` |
| Writing the storyboard file the gates actually parse | `reference/output-format.md` |

## Where this sits

- [`FILM-STRUCTURE.md`](../../engine-doctrine/CRAFT/FILM-STRUCTURE.md) is the catalogue this skill is
  one entry in. Read it BEFORE this one.
- [`vawe-video-planning`](../vawe-video-planning/SKILL.md) collects the brief, studies the brand and
  freezes the spec table. Run it first. This skill replaces its storyboard step for any film under
  ~15s **whose subject is one thing changing**.
- [`recipes/README.md`](../../recipes/README.md) gives the motion *inside* a beat. Use it after the
  spine is fixed, never to choose the spine.
- [`TRANSITIONS.md`](../../engine-doctrine/CRAFT/TRANSITIONS.md) picks the seam once you know the
  relationship. Here the relationship is always "the X becomes the Y".
- [`DIRECTION.md`](../../engine-doctrine/CRAFT/DIRECTION.md) is the cross-cutting spine;
  [`RECREATION.md`](../../engine-doctrine/CRAFT/RECREATION.md) is the loop for copying a specific
  reference shot for shot.
- [`vawe-effects`](../vawe-effects/SKILL.md) and [`vawe-camera`](../vawe-camera/SKILL.md) pick the
  mechanism per state change.
- After rendering: `make seam-check`, then `make judge`, then the critics in
  [`SUBAGENTS.md`](../../engine-doctrine/CRAFT/SUBAGENTS.md).

## Gotchas

- `no-continuous-object` cannot see a match cut, so a match-cut seam can fail a gate that is asking
  for exactly what a match cut is. `engine-doctrine/MISTAKES.md #488`.
- A storyboard can promise a change (`becomes:`) that the rendered film never builds, and every gate
  stayed green; read the render back against the `becomes:` chain, not just the gate output.
  `engine-doctrine/MISTAKES.md #173`.
