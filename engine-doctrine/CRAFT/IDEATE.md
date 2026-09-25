---
when: turning a reference video or a raw idea into a film, before any storyboard or JSON exists
answers: "what `make ideate` writes, the two ways to run it, and how to fill what it cannot measure"
group: story
---

# IDEATE: the film, in plain words, before any JSON

Stage 1.5 in AGENTS.md's eight stages: between **brief** (what the film is about) and **plan** (the
beat table). It writes ONE human-readable file, the film prompt: the film described act by act, in
plain words, what is on screen, how it enters and leaves, the ground and its colour, the camera, the
pace, and which recipe (`recipes/README.md`) each joint uses. The owner reads it, edits it by hand,
and only then does the agent write it up into a storyboard (engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md).
`harness/author/ideate.mjs` writes the prompt;
`make ideate` is the front door.

## Two ways to run it

**From a reference video**, once it has been studied (`make study`, `engine-doctrine/CRAFT/REFERENCE-STUDY.md`):

```bash
make ideate REF=example-madera
```

Writes `grammar/example-madera.prompt.md`. Every number (durations, seam gaps, axis, direction,
ground colour) comes from `grammar/<ref>.json`, never invented. If that file is missing or has no
measured seams, `make ideate` refuses and prints the exact `make study` command to run first
(including `STRIPS=`/`STRIPFPS=` for the dense sampling a real motion read needs).

**From an idea**, with nothing studied yet:

```bash
make ideate NAME=<film> IDEA="a quick sting for a dev tool called Loom, dark ground, one word landing hard"
```

Writes `films/scene/<film>.prompt.md`. The acts are left as `<fill: ...>` (nothing about a new idea
is measured), and under every joint it prints the recipe menu, every promoted recipe's name, kind,
blurb and first source, so structure is picked from a real measured recipe instead of invented. Add
`REF=<ref>` to copy that reference's act count and joint axes as structure, with the content still
left to fill: "a film like that reference," never a copy of its content.

## What it cannot measure, and the `<look:>` convention

A study measures numbers: shot boundaries, seam timing, axis, ground colour. It does not, and should
not, guess what is literally on screen, how something moves, what the camera does, or what carries the
type: a tool that guessed those would hand back a confident wrong answer dressed as a measurement
(`engine-doctrine/CRAFT/REFERENCE-STUDY.md` says the same about `study.md`'s own columns).

So reference-mode ideate writes a marked placeholder instead:

```
on screen: <look: 4.54s to 6.00s, see refs/example-madera/ideate-strips/act2.png>
```

and extracts the frames that answer it: one dense strip (`make filmstrip`, 10 to 20fps) per act and
per joint, written to `refs/<ref>/ideate-strips/` (gitignored, same rule as everything else under
`refs/`: a reference's frames are studied, never published, `AGENTS.md` "never embed copyrighted
material"). Fill every `<look:>` marker by opening its strip and describing what it actually shows.
Filling it from memory, or from what the reference "probably" does, defeats the entire mechanism.

## The recipe line

Every joint's line is the exact syntax `harness/lib/contract.mjs`'s `parseRecipeLine` reads, so it
carries straight into a storyboard beat once the plan stage starts:

```
recipe: flow-seam out=act1 in=act2 axis=x
```

`out`/`in` are placeholder act ids (`act1`, `act2`, ...); rename them to real layer ids once the
storyboard names the layers. `axis` (and every other param) is measured off the reference's seam, not
guessed.

## Change me

The prompt always ends with a `## Change me` section naming which lines are the author's to rewrite
(`on screen`, `camera`, `type`, the one-breath opening paragraph) and which are measured and should
change only for a deliberately different reference feel (`ground`, `enters`, `leaves`, the recipe
lines). Read it before editing.

## Asking for detail: `ASK=1` and `ANSWERS=`

Once the acts are known (measured, from `--ref`, or placeholder, from `--name`/`--idea`), a second pass
asks the detail a good plan needs before any frame is drawn: what fills each frame, where the product
lives, how text arrives, which cursor, how an act hands off, what the ground does. Every option traces
to a real registry (a recipe, a kinetic preset, a camera move, a `make screen` KIND) or to the
reference's own measurement (`shots[].content`); a question with no registry to answer it is dropped,
never answered with an invented option. `harness/author/ideate-ask.mjs` owns this half.

```bash
make ideate REF=example-madera ASK=1              # prints the question payload, one batch per act
make ideate REF=example-madera ANSWERS=<file.json> # applies saved answers into the prompt's lines
```

Neutral form (no AskUserQuestion tool): run `ASK=1`, print the questions from the JSON it emits, save
the author's picks as `{ film: {where, text, ground}, acts: [{frame, cursor, handoff, ...}, ...] }` to
a file, then re-run with `ANSWERS=` pointing at it. Claude Code asks each batch with AskUserQuestion
instead of printing it.
