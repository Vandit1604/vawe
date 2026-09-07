---
name: vawe-type-sting
description: "Playbook for a motion-graphic sting/bumper in this engine: one move, the mark, four to eight seconds. Load when the route table (docs/CRAFT/ROUTING.md) matches motion-graphic, or the request is a short unnarrated logo reveal, stat hit, or moving title."
---

# vawe-type-sting: the motion-graphic sting playbook

The shortest type and the least forgiving: at 4-8s there is no room for a second idea. A sting that
tries to do two things does neither. Judge every addition against "does this serve the ONE move".

## The spine

One move. No hook/build/payoff structure at all: the mark or the word arrives, resolves, holds. Pace
band: **4.0-8.0s total runtime**, not per-beat, because there is usually exactly one beat. Where the
film needs no cuts, use none: `docs/RULES/one-cut-family.md`'s floor does not fire under 8s
(`scripts/gates/direction-floor.mjs`), so a single continuous move is not a violation, it is the point.

## What this type needs that others do not

- **One move, named up front.** Before writing anything, say in one sentence what the single motion
  is (a draw-on, a scale-through, a wipe). If you cannot say it in one sentence, it is not one move.
- **The mark, not a slogan.** A sting's job is brand recognition in under 8 seconds; the wordmark or
  icon needs real size and real screen time, not a caption crawling past it.
- **`AUTHOR THE MOTION. DO NOT NAME IT.`** A sting is judged entirely on its hand-keyed motion track:
  a named preset animates one layer over one span with one curve, and that reads as generic at this
  length more than at any other. `docs/CRAFT/KEYED-MOTION.md`.
- **Black means black.** If the brief calls for a true-black bumper, write `{"preset":"black"}`
  (`#000000`, no tint) rather than a themed dark preset, which carries a colour wash.

## The blueprints to reach for

By role (`make arsenal BLUEPRINTS=1` for the full 29):
- **the one move**: `logoReveal` (draw-on + bloom + wordmark cascade), `wordmarkAssemble`, `wordBlast`,
  `wordWipe`, `morphButton`
- Chained blueprints are almost always wrong here: `kineticHook` or `statReveal` alone, never combined
  with a second beat, is the ceiling this type's route file (`docs/CRAFT/routes/motion-graphic.md`)
  already names.

## The rules that matter most

`docs/RULES/handover-glide.md` · `docs/RULES/ease-direction.md` · `docs/RULES/first-arrival.md` ·
`docs/RULES/svg-inline.md` (a mark is almost always an `svg` layer) · `docs/CRAFT/KEYED-MOTION.md`.

## Assets and how to get them

The mark itself: an inline `svg` `d` path (never a rasterised logo file for a vector mark), pulled from
the real brand asset (`assets/icons/<name>.svg` or the captured site). A sting almost never needs any
other asset; if it does, that is a sign the brief wants a different type.

## `make scaffold TYPE=sting`

```bash
make scaffold OUT=formats/scene/<name>.json TYPE=sting DUR=6
```

Composes a single `logoReveal` beat (`scripts/author/type-spines.mjs`) on a `black` bg with no
transitions: the scaffold's own continuous-object motif is still emitted by default, but for a true
one-move sting, consider removing it and letting the mark itself be the only thing that moves.

## What the judge weighs for this type

Is there genuinely one move, or did a second idea sneak in? Does the mark get real size and real time on
screen? Is the motion hand-keyed and specific, or a named preset that could belong to any brand? Does it
hold the resolved frame long enough to register, or does it end mid-motion?

## The worked example

`verify/evals/briefs/sting.json` (6s, 16:9, true black). The wave mark draws itself on stroke by stroke,
resolves to a filled shape on a hand-keyed scale track, and the wordmark settles in behind it. No cuts,
no second beat.
