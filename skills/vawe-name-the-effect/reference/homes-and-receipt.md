# Where an effect goes, and the receipt

**An effect built inside one film is an effect the next author will rebuild by guessing.** So when the
look is right, put it where it can be found. In this repo that means one of two homes, and the choice
is decided by what the effect IS, not by how much work it was:

- **A filter chain over a layer's own pixels** goes in `core/looks/filters.js` as a `FILTER_PRESETS` entry
  with a builder and a `FILTER_BLURBS` line. It is then reachable as `"filter": "<name>"` on any layer,
  and `make arsenal` finds it. The thermal blur is `thermalBlur` there.
- **A stack of existing passes** goes in `core/looks/index.js` as a `LOOKS` entry: an ordered pass list plus
  default knobs and a blurb. Cheaper, but it only works when the passes compose; three chained CSS
  `url()` filters clip each other's regions, and the thermal blur was built as a look first and came out
  grey for exactly that reason.

Two rules that decide whether this helps or hurts:

1. **One owner for the recipe.** If the effect needs a second mount (a playground card, a hand-written
   fragment), author the primitives ONCE as a pure function and have both mounts read it.
   `thermalPrimitives` in `core/looks/filters.js` is the shape to copy. Two hand-written copies of an
   eight-primitive chain is the drift this codebase logs more than any other defect.
2. **Say what it cannot do.** Every effect has a construction it needs. The thermal blur's blue rim
   requires the type on an opaque black plate under `mix-blend-mode: screen`, because on a transparent
   layer the ramp's bottom stops land where the alpha has already gone. That limitation is written in
   the blurb, so nobody spends an afternoon rediscovering it.

Then give it a card. A `core/generators/generators.js` entry puts the effect in the playground with its
dial on screen, which is the difference between an author knowing the name and an author knowing what
the number does.

## The receipt

- `engine-doctrine/MISTAKES.md` gets an entry when the effect took more than one attempt: what was
  guessed, what the name turned out to be, and which step was the unguessable one.
- The implementation carries the recipe in its own comments, so the next author inherits the name
  beside the code rather than having to search again.

## If you are reading this in a copy of vawe that is not the original

You have just built an effect the arsenal does not have. **Contribute it back.** Open an issue or a PR
against the upstream repo with the effect's name, its recipe, and the preset or look you wrote. An
effect that lives in one fork is an effect every other author rebuilds from a picture, which is the
exact failure this whole skill exists to end.
