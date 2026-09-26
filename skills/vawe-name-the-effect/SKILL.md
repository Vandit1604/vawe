---
name: vawe-name-the-effect
description: "Identifies, names, and builds an effect from a reference image or clip that cannot be constructed by eye, then adds it to the arsenal so the next author inherits the name instead of a guess. Use whenever a reference arrives with 'make this' and the instinct is to approximate it."
stage: design
effort: medium
---

# Name the effect before you build it

An effect a designer has made before has a name. The name leads to a recipe. The recipe has a step you
would never have guessed, and that step is the reason your approximation failed. (The full story of the
measured failure this skill is built from, a thermal blur rebuilt four times, is in
`reference/vocabulary-and-story.md`.)

## When this fires

A reference arrives (an image, a frame, a clip) and you cannot name what you are looking at. That is
the trigger, and it is the only one you need. The tell that you are about to fail is the feeling of
having understood enough to start.

Do NOT reach for this when the look is plainly a thing the engine already names. Search first:

```bash
make arsenal Q="<what you mean, in plain english>"
```

337 named things, one query. If the answer is in there, use it and stop.

## The three questions, in order

**1. What is it called?** Describe it in plain words and search the web. Motion work has a shared
vocabulary, nearly all of it borrowed from After Effects. If the description you type is the thing you
see ("white text, orange body, blue outer glow, letters eaten away"), the name usually comes back in
one result. `reference/vocabulary-and-story.md` has a starter table.

**2. What are its steps?** A recipe is a chain of operations in an order, and the order is usually
load-bearing. Write the chain down BEFORE you write any markup.

**3. Which step could you not have guessed?** There is nearly always one. Say it out loud. In the
thermal blur it is that the colour comes from a MAP and not from paint, and everything the stacked
version could not produce follows from that single fact.

Then build it once.

## Where it goes, and this half is not optional

**An effect built inside one film is an effect the next author will rebuild by guessing.** A filter
chain over a layer's own pixels goes in `core/looks/filters.js`; a stack of existing passes goes in
`core/looks/index.js`. Which home, the two rules that decide whether it helps or hurts, the receipt in
`engine-doctrine/MISTAKES.md`, and what to do in a fork: `reference/homes-and-receipt.md`.

## Gotchas

- A named GSAP fx/exit typo degraded silently instead of erroring; validate a new name against the
  real registry exports before shipping it. `engine-doctrine/MISTAKES.md #137`.
- The generated arsenal map (`engine-doctrine/EFFECTS.md`) is only as complete as the registries it
  reads; a newly added effect that isn't wired into a registry is invisible to search, not merely
  hard to find. `engine-doctrine/MISTAKES.md #357`.
