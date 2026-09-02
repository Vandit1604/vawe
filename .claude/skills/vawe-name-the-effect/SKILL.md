---
name: vawe-name-the-effect
description: "A reference image or clip shows a look you cannot immediately construct. Find out what the effect is CALLED, read its real recipe, build it once, then put it in the arsenal so the next author inherits the name instead of the guess. Use whenever somebody hands you a picture and says 'make this' and your first instinct is to approximate it by eye."
---

# Name the effect before you build it

An effect a designer has made before has a name. The name leads to a recipe. The recipe has a step you
would never have guessed, and that step is the reason your approximation failed.

This skill exists because of a measured failure in this repo, `docs/MISTAKES.md` #505. A reference frame
showed white text with an orange body and a blue rim. It was built four times by stacking coloured,
offset, blurred copies of the same text, and rejected four times, because a stack of copies cannot make
a continuous transition between three colours. One search returned the answer: the effect is a **thermal
blur**, its recipe is white text, Fast Box Blur, **Colorama**, glow, and the colour comes from a
**gradient map on luminance**, not from paint, so the blur's own grey falloff is remapped, bright to
white, mid to orange, dim to blue. That one fact also explained every symptom the stack could not
produce: the continuous transition, the organic edge, and the letters being eaten, all of which are the
ramp acting on the glyph's own edge. Four renders bought nothing. The name bought everything.

## When this fires

A reference arrives (an image, a frame, a clip) and you cannot name what you are looking at. That is
the trigger, and it is the only one you need. The tell that you are about to fail is the feeling of
having understood enough to start.

Do NOT reach for this when the look is plainly a thing the engine already names. Search first:

```bash
make arsenal Q="<what you mean, in plain english>"
```

337 named things, one query. If the answer is in there, use it and stop.

## Why guessing feels like progress, so you can watch for it

Iterating produces a render you can show. Searching produces nothing to show and has no obvious
stopping point, so under any pressure to make progress it is the step that gets cut. But an
approximation converges on whatever the first guess was near, which is why four attempts can leave you
exactly where one did.

## The three questions, in order

**1. What is it called?** Describe it in plain words and search the web. Motion work has a shared
vocabulary, nearly all of it borrowed from After Effects. If the description you type is the thing you
see ("white text, orange body, blue outer glow, letters eaten away"), the name usually comes back in
one result.

Some of the vocabulary, so a plain-words description can be turned into a search term:

| what you see | what it is called |
|---|---|
| colour that slides through a range with the subject's own falloff | gradient map · Colorama |
| a subject smeared along its own motion | echo · directional blur |
| one shape flowing into another, unreadable in the middle | goo morph · metaball morph |
| colour fringing at the edges | chromatic aberration |
| a texture pushed around by another image | displacement map |
| a shape revealed by another shape's brightness | luma matte |
| motion that steps rather than flows | posterize time · animate on twos |
| a bright subject bleeding light past its edges | bloom · glow |
| a surface that looks lit and carved | emboss · bump map · relief |

**2. What are its steps?** A recipe is a chain of operations in an order, and the order is usually
load-bearing. Write the chain down BEFORE you write any markup.

**3. Which step could you not have guessed?** There is nearly always one. Say it out loud. In the
thermal blur it is that the colour comes from a MAP and not from paint, and everything the stacked
version could not produce follows from that single fact.

Then build it once.

## Where it goes, and this half is not optional

**An effect built inside one film is an effect the next author will rebuild by guessing.** So when the
look is right, put it where it can be found. In this repo that means one of two homes, and the choice
is decided by what the effect IS, not by how much work it was:

- **A filter chain over a layer's own pixels** goes in `core/filters.js` as a `FILTER_PRESETS` entry
  with a builder and a `FILTER_BLURBS` line. It is then reachable as `"filter": "<name>"` on any layer,
  and `make arsenal` finds it. The thermal blur is `thermalBlur` there.
- **A stack of existing passes** goes in `core/looks.js` as a `LOOKS` entry: an ordered pass list plus
  default knobs and a blurb. Cheaper, but it only works when the passes compose; three chained CSS
  `url()` filters clip each other's regions, and the thermal blur was built as a look first and came out
  grey for exactly that reason.

Two rules that decide whether this helps or hurts:

1. **One owner for the recipe.** If the effect needs a second mount (a playground card, a hand-written
   fragment), author the primitives ONCE as a pure function and have both mounts read it.
   `thermalPrimitives` in `core/filters.js` is the shape to copy. Two hand-written copies of an
   eight-primitive chain is the drift this codebase logs more than any other defect.
2. **Say what it cannot do.** Every effect has a construction it needs. The thermal blur's blue rim
   requires the type on an opaque black plate under `mix-blend-mode: screen`, because on a transparent
   layer the ramp's bottom stops land where the alpha has already gone. That limitation is written in
   the blurb, so nobody spends an afternoon rediscovering it.

Then give it a card. A `core/generators.js` entry puts the effect in the playground with its dial on
screen, which is the difference between an author knowing the name and an author knowing what the
number does.

## The receipt

- `docs/MISTAKES.md` gets an entry when the effect took more than one attempt: what was guessed, what
  the name turned out to be, and which step was the unguessable one.
- The implementation carries the recipe in its own comments, so the next author inherits the name
  beside the code rather than having to search again.

## If you are reading this in a copy of vawe that is not the original

You have just built an effect the arsenal does not have. **Contribute it back.** Open an issue or a PR
against the upstream repo with the effect's name, its recipe, and the preset or look you wrote. An
effect that lives in one fork is an effect every other author rebuilds from a picture, which is the
exact failure this whole skill exists to end.
