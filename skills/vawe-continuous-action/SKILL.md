---
name: vawe-continuous-action
description: "Turns a one-line brief into a shootable plan for a short film built as one continuous action: the device to pick, from `engine-doctrine/CRAFT/FILM-STRUCTURE.md`'s ~18 devices, when the film has a single subject and a single process. Load once this device is picked, for a launch/promo/teaser under ~15s; emits a storyboard that `make storyboard-check` and `make intent` consume."
stage: plan
effort: medium
---

# vawe-continuous-action: plan the film as one action

**The contract:** name one object, write its state at every beat, and treat every cut as that
object changing state, never a jump. Work through the checks below, in the storyboard, before
writing any JSON.

The engine can build anything. What it cannot do is plan something great from a blank brief.
Handed "make a 5s launch film for an AI image tool", an agent writes a competent slideshow: hook
card, feature card, logo card. Every gate passes. Nobody watches it twice.

The reference in this repo (`higgsfield.mp4`, first 5 seconds, recreated in
`films/scene/higgsfield-recreation.json`) is not a sequence of beats. **It is one continuous
action.** You type a prompt. You press generate. The generate button itself becomes the loading
dot. One object is on screen from the first frame to the last and every cut is that object
changing state.

That is the grammar this skill plans in.

**This is the default shape under ~15s, not the beat rotation.** `type-spines.mjs` exports
`CONTINUOUS_ACTION_MAX_S` (15s, the same bound `storyboard-check.mjs`/`direction-floor.mjs` use).
Under that length, write the storyboard around ONE object (`id:"spine"`), a hand-keyed track, zero
`transitions`, and `object`/`object_t0`/`object_states`/`object_last` frontmatter filled from the
type's own spine (`harness/author/type-spines.mjs`'s `continuousObject`, when the type declares one).

Two types (`talking-head`, `recreation`) opt out at every length, for the same reason "Before you
use this skill" below gives: their content is not held by one transforming prop. The checks below
decide whether the object, the states and the transform are the right ones for a given brief; no
spine can know that in advance.

## Before you use this skill: it is one device, not the law

This skill was written from one reference, then treated as a floor for every short film. It is not.
[`FILM-STRUCTURE.md`](../../engine-doctrine/CRAFT/FILM-STRUCTURE.md) catalogues about eighteen devices
across four registers (spatial, verbal/aural, temporal, conceptual); this device is one spatial entry.
Read that catalogue first and pick. Murch's Rule of Six ranks this register last of six, at 4%, and
says to sacrifice your way up from the bottom.

**Use it when the content is genuinely continuous:** one subject, one process, a product film, a
demo where the UI is the subject. Then the object really does transform, and everything below is
right.

**Do not use it for** a manifesto, a vignette anthology ("three customers, three problems"), a
comparison whose meaning lives in the junction, or a metric-cut list film where every card is a peer.
Forcing one prop across those lies about the content.

## The one law (of this device)

> **One object. One action. Every cut is a state change of that object.**

A beat rotation gives you independent chapters, and that independence is exactly why a from-scratch
plan comes out as a slideshow: three good beats with nothing travelling between them. This skill
decides what survives *across* the cuts: when the answer is an object. Carry a second thread from
the catalogue anyway: a single thread has to be literal and obvious to work, which is how a film ends
up as a rectangle that resizes four times.

## Name the object, then write its state at each beat

Do this before any JSON or copy exists. If you cannot fill this table, there is no film yet.

| | Answer |
|---|---|
| **The object** | one noun. The prompt box, the button, a token, a card, a row, a cursor. |
| **Why it** | it is the thing the user touches to get the value. |
| **State at t=0** | what it looks like before anything happens |
| **State at each cut** | what it has become |
| **State at the last frame** | the payoff, or the moment just before it |

Rules for picking the object:

- **Pick something the user acts on**, not something the product outputs. The higgsfield object
  is the generate button, not the generated image. The button is the verb.
- **It must survive a transform.** A logo cannot transform into anything, which is why a logo
  makes a terrible spine and a fine last frame.
- **One object, not two.** A second travelling element is a subplot. At 5 seconds there is no
  room for a subplot.
- **It may change category.** Button becomes dot becomes spinner is legal and is the best move in
  the reference film. Button cuts to an unrelated dashboard is not.

**The object-death test:** name a frame where your object is off screen. If one exists before the
final beat, the spine is broken. Go back to the table.

## What to read next

| Step | Read |
|---|---|
| Cuts as transforms, diegetic motion, the hook, showing the product | `reference/cuts-and-motion.md` |
| The measured second-by-second budget, plus two worked examples | `reference/budget-and-examples.md` |
| Writing the storyboard file the gates actually parse | `reference/output-format.md` |

## Anti-slop: kill a bad plan before a frame renders

Run all seven against the beat table. Any failure is a rewrite of the plan, not a note for later.

1. **Reorder test.** Swap beats 2 and 3. If the film still parses, the beats are unrelated and
   you wrote a slideshow. A continuous action cannot be reordered.
2. **Object-death test.** Is there a frame before the last beat where the object is gone? Broken
   spine.
3. **Pixel-jump test.** At each seam, what is in the same place on both sides? No answer means a
   jump cut.
4. **Who-moved-it test.** For every moving element, name the in-world cause. More than one
   "the editor did" means the motion is decoration on a static frame.
5. **Logo end-card test.** If the last beat is a mark and a URL, the film ends where it should
   have started. At 5 seconds a logo is a watermark, not a beat.
6. **Unbacked-claim test.** For each on-screen line, name the UI visible in the same frame that
   proves it. No UI, cut the line.
7. **Payoff test.** Does the last frame answer the question, or sit one moment before the answer?
   Prefer the moment before. If you must show the result, show it for the final 0.6s and cut.

Then, and only then, write JSON.

## Where this sits

- [`engine-doctrine/CRAFT/FILM-STRUCTURE.md`](../../engine-doctrine/CRAFT/FILM-STRUCTURE.md) is the catalogue this skill
  is one entry in, with the sources and the six questions that pick a register. Read it BEFORE this one.
- [`vawe-video-planning`](../vawe-video-planning/SKILL.md) collects the brief, studies the brand
  and freezes the spec table. Run it first. This skill replaces its storyboard step for any film
  under ~15s **whose subject is one thing changing**.
- [`recipes/README.md`](../../recipes/README.md) gives the motion *inside* a beat, measured off a
  real film. Use it after the spine is fixed, never to choose the spine.
- [`engine-doctrine/CRAFT/TRANSITIONS.md`](../../engine-doctrine/CRAFT/TRANSITIONS.md) picks the seam once you know
  the relationship. Here the relationship is always "the X becomes the Y".
- [`engine-doctrine/CRAFT/DIRECTION.md`](../../engine-doctrine/CRAFT/DIRECTION.md) is the cross-cutting spine, and
  [`engine-doctrine/CRAFT/RECREATION.md`](../../engine-doctrine/CRAFT/RECREATION.md) is the loop for copying a
  specific reference shot for shot.
- [`vawe-effects`](../vawe-effects/SKILL.md) and [`vawe-camera`](../vawe-camera/SKILL.md) pick the
  mechanism per state change.
- After rendering: `make seam-check`, then `make judge`, then the critics in
  [`engine-doctrine/CRAFT/SUBAGENTS.md`](../../engine-doctrine/CRAFT/SUBAGENTS.md).

## Gotchas

- `no-continuous-object` cannot see a match cut, so a match-cut seam can fail a gate that is asking
  for exactly what a match cut is. `engine-doctrine/MISTAKES.md #488`.
- A storyboard can promise a change (`becomes:`) that the rendered film never builds, and every gate
  stayed green; read the render back against the `becomes:` chain, not just the gate output.
  `engine-doctrine/MISTAKES.md #173`.
